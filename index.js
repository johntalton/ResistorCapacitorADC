"use strict";

const { Gpio } = require('onoff');

class ResistorCapacitorADC {
  /**
   * reads a pin using the RC timing method
   **/
  static read(pin, config) {
    const max = config.max !== undefined ? config.max : 1 * 1000 * 1000;
    return ResistorCapacitorADC._read_async(pin, max)
      .then(raw => ResistorCapacitorADC.convert(raw, config));
  }

  // read using gpio sync methods
  static _read_sync(pin, max) {
    console.log('sync impl');
    return new Promise((resolve, reject) => {
      // create pin as ouptput (write 0 to force)
      // to trigger capacitor drain
      // and unexport for next step
      const startT = Date.now();
      const led = new Gpio(pin, 'out');
      led.writeSync(0);
      led.unexport();

      // switch and create the input in
      // capacitor should be filling from
      // resistor feed input.
      // leading to pin high state (or 63%[ref?] analog)
      const cap = new Gpio(pin, 'in', 'both');
      let i = 0;
      while(cap.readSync() === 0) {
        i++;
        if(i >= max) {
          console.log('1mil break out .. its dark');
          break;
        }
      }

      const stopT = Date.now();
      const delta = stopT - startT;

      cap.unexport(); // cleanup

      // console.log('raw delta', delta);
      resolve({ delta: delta, benchmark: i });
    });
  }

  // read using gpio async methods
  static _read_async(pin, max) {
    console.log('async impl');
    return new Promise((resolve, reject) => {
      try {
        // create pin as ouptput (write 0 to force)
        // to trigger capacitor drain
        // and unexport for next step
        const startT = Date.now();
        const drain = new Gpio(pin, 'out');
        drain.write(0, (err) => {
          //drain.unexport(); // !
          if(err) { reject(err); return; }

          // switch and create the input in
          // capacitor should be filling from
          // resistor feed input.
          // leading to pin high state
          // (note: using setDirection may be
          // a quicker solution, though it does cause
          // some unexpected quirks.  this is simple for now
          const meas = new Gpio(pin, 'in', 'both');
          meas.watch((err, value) => {
          console.log('wathc');
            meas.unexport(); // !
            if(err) { reject(err); return; }
            const stopT = Date.now();

            resolve({
              delta: stopT - startT
            });
          });
        });
      } catch(e) {
        reject(e);
      }
    });
  }

  static convert(raw, config) {
    //console.log('convert', raw, config);
    // T = R * C
    const resistor_Ohms = config.rKOhms * 1000;
    const capacitor_F = config.cuF / 1000.0 / 1000.0;
    const estT = (resistor_Ohms) * (capacitor_F) * 1000.0;

    // remaining time is enduced by the resistance under measure
    // time used to return digital-high (63% full analog)
    const remainingMs = raw.delta - estT;
    const scaledMs = remainingMs * (100 / 63);
    // revers calc est Ohms
    const estOhms = ((scaledMs / 1000.0) / capacitor_F);

    return {
      baseMs: estT,
      measuredMs: raw.delta,
      scalledMs: scaledMs,
      estimateOhms: estOhms
    };
  }
}




if(module.parent === null) {
  ResistorCapacitorADC.read(17, { rKOhms: 20, cuF: 1, maxKOhms: 200 }).then(result => {
    //console.log('results', result);
    console.log('measure time (ms)', result.measuredMs);
    console.log('\test base charge time (ms)', result.baseMs);
    console.log('\testimate (Kohms)', result.estimateOhms / 1000.0);
  })
  .catch(e => {
    console.log('top level error', e);
  });
}

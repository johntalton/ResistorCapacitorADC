"use strict";

const { Gpio } = require('onoff');

class ResistorCapacitorADC {
  /**
   * reads a pin using the RC timing method
   **/
  static read(pin, config) {
    return ResistorCapacitorADC.readType(pin, config)
      .then(raw => ResistorCapacitorADC.convert(raw, config));
  }

  static readType(pin, config) {
    if(config.type === 'sync') {
      const max = config.max !== undefined ? config.max : 1 * 1000 * 1000; // look cnt for sync
      return ResistorCapacitorADC._read_sync(pin, max);
    }

    const max = config.timeoutMs !== undefined ? config.timeoutMs : 1 * 1000; // ms timout
    return ResistorCapacitorADC._read_async(pin, max);
  }

  /**
   * attempts to own and tests availability of the pin.
   * Attempting to perform `read` without first calling this may lead to errors (but also may not).
   **/
  static available(pin) {
    // future onoff lib may expose accessible
    if(Gpio.accessible === false) { return Promise.resolve([false, 'gpio accessible']); }

    let testpin;
    try { testpin = new Gpio(pin, 'out'); } catch(e) { return Promise.resolve([false, 'new gpio']); }

    if(testpin.direction() !== 'out') {
      testpin.unexport();
      try { testpin = new Gpio(pin, 'out'); } catch(e) { return Promise.resolve([false, 'err after re-new']); }
      if(testpin.direction() !== 'out') { testpin.unexport(); return Promise.resolve([false, 'after unexport fix']); }
      console.log('successfull gpio direction reset via unexport');
    }

    try { testpin.setDirection('in'); } catch(e) { testpin.unexport(); return Promise.resolve([false, 'in set']); }
    try { testpin.setDirection('out'); } catch(e) { testpin.unexport(); return Promise.resolve([false, 'out set']); }

    testpin.unexport();

    console.log(' seemingly available');
    return Promise.resolve([true, 'ok']);
  }

  // read using gpio sync methods
  static _read_sync(pin, max) {
    //console.log('sync impl');
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
          cap.unexport();
          reject(Error('maxout')); return;
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
  static _read_async(pin, timeoutMs) {
    function hint(drain, err) {
      if(drain.direction() !== 'out') { console.log('out missmatch') }
      return err;
    }

    return new Promise((resolve, reject) => {
      try {
        // create pin as ouptput (write 0 to force)
        // to trigger capacitor drain
        // and unexport for next step
        const startT = Date.now();
        const drain = new Gpio(pin, 'out'); // trigger start here
        drain.write(0, (err) => {
          //drain.unexport(); // no need as new Gpio replaces it (true?)
          if(err) { reject(hint(drain, err)); return; }

          // switch and create the input in
          // capacitor should be filling from
          // resistor feed input.
          // leading to pin high state
          // (note: using setDirection may be
          // a quicker solution, though it does cause
          // some unexpected quirks.  this is simple for now
          const meas = new Gpio(pin, 'in', 'both');
          //
          const timeout = setTimeout(() => {
            meas.unexport(); // cleanup and exit watch
            reject(Error('timeout'));
          }, timeoutMs);
          // wait / watch for pin change
          meas.watch((err, value) => {
            const stopT = Date.now();

            clearTimeout(timeout); // ! claer timer
            meas.unexport(); // ! cleanup
            if(value !== 1) { console.log(' *** pin bounch issue?', value, typeof value); }
            if(err) { reject(err); return; }

            resolve({
              delta: stopT - startT
            });
          });
        });
      } catch(e) {
        console.log('via try/catch');
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

module.exports.ResistorCapacitorADC = ResistorCapacitorADC;

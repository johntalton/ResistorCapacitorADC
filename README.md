# Resistor Capacitor ADC

Basic Resistor / Capacitor circit used to simulate Analog over Digital pin.

[As made popular by this Adafruit post](https://learn.adafruit.com/basic-resistor-sensor-reading-on-raspberry-pi?view=all)

### Concept

"[...]the capacitor acts like a bucket and the resistor is like a thin pipe. To fill a bucket up with a very thin pipe takes enough time that you can figure out how wide the pipe is by timing how long it takes to fill the bucket up halfway" - Adafruit

As noted in the link, this can only be used on for reads of resistor-like sensors (like our photocell).

### Basic usage

Setup of a photocell read on pin 17 with a 1uF capacitor and 
two base resistors: 20 KOhms, and a photocell that we expect ot max at 200KOhm.

```
 ResistorCapacitorADC.read(17, { rKOhms: 20, cuF: 1, maxKOhms: 200 }).then(result => {
   console.log('measure time (ms)', result.measuredMs);
   console.log('\test base charge time (ms)', result.baseMs);
   console.log('\testimate (Kohms)', result.estimateOhms / 1000.0);
 });
```

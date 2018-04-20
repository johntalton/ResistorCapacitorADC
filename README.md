# Resistor Capacitor ADC

Basic Resistor / Capacitor circit used to simulate Analog over Digital pin.

[As made popular by this Adafruit post](https://learn.adafruit.com/basic-resistor-sensor-reading-on-raspberry-pi?view=all)

### Concept

"[...]the capacitor acts like a bucket and the resistor is like a thin pipe. To fill a bucket up with a very thin pipe takes enough time that you can figure out how wide the pipe is by timing how long it takes to fill the bucket up halfway" - Adafruit

As noted in the link, this can only be used on for reads of resistor-like sensors (like our photocell).

While this method can be used to generate results reliably - system (code timeing etc) and setup (exact wire layout) introduce the need for compensation on the application side.  Thus, it is recommended to use proper ADC in all(?) cases.

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
Returned result contains the following properties:

 - `baseMs` expected milliseconds delay calculated from config (static for config)
 - `measuredMs` raw millisecond count used by read 
 - `scalledMs` &plusmn; delta between `baseMs` and `measuredMs` scalled to 63% digital pin fill time.
 - `estimateOhms` measured resistance reverse calculated from `scalledMs` time (most common externaly used value)
 
 (currently negative scalledMs values result in negative est Ohm values)

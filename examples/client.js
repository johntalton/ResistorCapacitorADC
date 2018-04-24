"use strict";


const mqtt = require('mqtt');
const { ResistorCapacitorADC } = require('../');

const config = {
  pins: [
    { pin: 17, config: { type: 'async', rKOhms: 20, cuF: 1, maxKOhms: 200, timeoutMs: 500 }, pollIntervalS: 1 }
  ],
  mqtt: {
    url: process.env.mqtturl,
    reconnectS: 10
  }
};

function poll(app, pin) {
  console.log('poll');
 // if(pin.config.type === 'sync') { pin.config.type = 'async'; } else { pin.config.type = 'sync'; }
  ResistorCapacitorADC.read(pin.pin, pin.config).then(result => {
    console.log(result);
  })
  .catch(e => {
    console.log('poll error, continuing', e.message);
  });
}

function startClients(app) {
  console.log('start clients');
  return Promise.all(app.pins.map(pin => {
    return ResistorCapacitorADC.available(pin.pin).then(([available, why]) => {
      if(available) { return [true, why]; }
      console.log('client make available');
      return ResistorCapacitorADC.makeAvailable(pin.pin);
    })
    .then(([available, why]) => {
      if(!available) { console.log('not available', why); return; }
      pin.client = setInterval(poll, pin.pollIntervalS * 1000, app, pin);
    });
  }));
}

function stopClients(app) {
  console.log('stop clients');
  return Promise.all(app.pins.map(pin => {
    if(pin.client === undefined) { return; }
      clearInterval(pin.client);
  }));
}

function setupStore(app) {
  console.log('setup store ', app.mqtt.url);
  if(app.mqtt.url === undefined) { return Promise.reject('undefined mqtt url'); }
  app.mqtt.client = mqtt.connect(app.mqtt.url, { reconnectPeriod: app.mqtt.reconnectS });
  app.mqtt.client.on('connect', () => { startClients(app).catch(e => console.log('start client error', e)) });
  app.mqtt.client.on('reconnect', () => { });
  app.mqtt.client.on('close', () => { });
  app.mqtt.client.on('offline', () => { stopClients(app).catch(e => console.log('stop client error', e)); });
  app.mqtt.client.on('error', (error) => { console.log(error); process.exit(-1); });

  return Promise.resolve(app);
}

Promise.resolve(config)
.then(setupStore)
.catch(e => {
  console.log('top level error', e);
});

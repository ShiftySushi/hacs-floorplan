import {test} from 'node:test';
import assert from 'node:assert/strict';
import {heatingState,roomTemperature,roomReadoutPoint,temperatureTone} from '../src/heating.js';
import {normaliseConfig} from '../src/lights.js';

test('heat mode alone is not evidence of active heating',()=>{
  assert.equal(heatingState({state:'heat',attributes:{hvac_action:'idle'}}),'idle');
  assert.equal(heatingState({state:'heat',attributes:{hvac_action:'heating'}}),'heating');
  assert.equal(heatingState({state:'heat'}),'unknown');
  assert.equal(heatingState({state:'unavailable',attributes:{hvac_action:'heating'}}),'unknown');
  assert.equal(heatingState({state:'on'}),'heating');
  assert.equal(heatingState({state:'off'}),'idle');
});
test('room reading uses actual temperature and hides missing readings',()=>{
  const room={temperature_entity:'climate.room'};
  assert.equal(roomTemperature(room,{'climate.room':{state:'heat',attributes:{current_temperature:20.2,temperature:25,temperature_unit:'°C'}}}),'20.2 °C');
  assert.equal(roomTemperature(room,{'climate.room':{state:'heat',attributes:{current_temperature:null}}}),'');
  assert.equal(roomTemperature({temperature_entity:'sensor.room'},{'sensor.room':{state:'unavailable'}}),'');
  assert.equal(roomTemperature({temperature_entity:'sensor.room'},{'sensor.room':{state:'68',attributes:{unit_of_measurement:'°F'}}}),'68.0 °F');
});
test('heating bindings survive scene validation and reject wrong domains',()=>{
  const config={floors:[{id:'ground',rooms:[{id:'room',name:'Room',points:[[0,0],[100,0],[100,100]],temperature_entity:'sensor.room'}],objects:[{id:'rad',type:'radiator',x:20,y:30,heating_entity:'climate.room'}]}]};
  const output=normaliseConfig(config);assert.equal(output.floors[0].objects[0].heating_entity,'climate.room');
  config.floors[0].objects[0].heating_entity='light.room';assert.throws(()=>normaliseConfig(config),/thermostat/);
});
test('temperature readout avoids a central light',()=>{
  const point=roomReadoutPoint({points:[[0,0],[100,0],[100,100],[0,100]]},{aspect_ratio:1,entities:[{x:50,y:50}]});
  assert.ok(Math.hypot(point[0]-50,point[1]-50)>=12);
  assert.ok(point.every(n=>n>0&&n<100));
});
test('temperature tint recognises Celsius and Fahrenheit without colouring unavailable values',()=>{
  assert.equal(temperatureTone('sensor.t',{state:'16',attributes:{unit_of_measurement:'°C'}}),'cool');
  assert.equal(temperatureTone('sensor.t',{state:'80',attributes:{unit_of_measurement:'°F'}}),'warm');
  assert.equal(temperatureTone('sensor.t',{state:'21'}),'neutral');
  assert.equal(temperatureTone('sensor.t',{state:'unavailable'}),'neutral');
});

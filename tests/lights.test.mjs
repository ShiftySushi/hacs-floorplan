import test from 'node:test';
import assert from 'node:assert/strict';
import { capabilities, serviceCalls, normaliseConfig } from '../src/lights.js';
const light = (modes, state = 'on', extra = {}) => ({ state, attributes: { supported_color_modes: modes, ...extra } });
const states = { 'light.relay': light(['onoff']), 'light.dim': light(['brightness']), 'light.rgb': light(['rgb']), 'light.white': light(['color_temp'], 'off', { min_color_temp_kelvin: 2700, max_color_temp_kelvin: 4000 }), 'light.dead': light(['rgb'], 'unavailable') };
test('on/off, dimmable, tunable white and coloured lights expose distinct controls', () => {
  assert.deepEqual(capabilities(states['light.relay']), { brightness:false, colour:false, temperature:false });
  assert.deepEqual(capabilities(states['light.white']), { brightness:true, colour:false, temperature:true });
  for (const mode of ['rgb','rgbw','rgbww','hs','xy']) assert.equal(capabilities(light([mode])).colour,true);
  assert.equal(capabilities(undefined).brightness,false);
});
test('mixed selections send colour only to available colour lights', () => {
  assert.deepEqual(serviceCalls(states,Object.keys(states),'colour',[255,0,30]), [{ service:'turn_on',data:{entity_id:['light.rgb'],rgb_color:[255,0,30]} }]);
});
test('brightness excludes relay, missing and offline lights; deduplicates groups', () => {
  const calls = serviceCalls(states,[...Object.keys(states),'light.rgb','light.missing'],'brightness',42);
  assert.deepEqual(calls.map(c=>c.data.entity_id[0]),['light.dim','light.rgb','light.white']);
  assert.ok(calls.every(c=>c.data.brightness_pct===42));
});
test('power can control mixed selections without unsupported attributes', () => {
  const calls=serviceCalls(states,[...Object.keys(states),'sensor.temp'],'off');
  assert.deepEqual(calls,[{service:'turn_off',data:{entity_id:['light.relay','light.dim','light.rgb','light.white']}}]);
});
test('temperature is clamped per light', () => {
  assert.equal(serviceCalls(states,Object.keys(states),'temperature',6500)[0].data.color_temp_kelvin,4000);
  assert.equal(serviceCalls(states,Object.keys(states),'temperature',1000)[0].data.color_temp_kelvin,2700);
});
test('invalid payloads are rejected',()=> { assert.throws(()=>serviceCalls(states,['light.rgb'],'colour',[NaN,0,0])); assert.throws(()=>serviceCalls(states,['light.dim'],'brightness',NaN)); });
test('config is cloned and invalid positions, duplicate floors and unsafe URLs are rejected',()=>{
  const config={floors:[{id:'ground',image:'/local/ground.svg',entities:[{entity:'light.rgb',x:50,y:20}]}]};
  const copy=normaliseConfig(config);copy.floors[0].entities[0].x=30;assert.equal(config.floors[0].entities[0].x,50);
  for(const image of ['javascript:alert(1)','//example.com/a.svg']) assert.throws(()=>normaliseConfig({floors:[{id:'a',image}]}));
  assert.throws(()=>normaliseConfig({floors:[...config.floors,...config.floors]}));
  config.floors[0].entities[0].x=101; assert.throws(()=>normaliseConfig(config));
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {roomLightSources,lightAppearance,roomDarkness} from '../src/illumination.js';

test('footprints follow placed fixtures and use a room fallback for unplaced lights',()=>{
  const room={points:[[0,0],[100,0],[100,100],[0,100]],lights:['light.corner','light.ceiling','light.corner']};
  const sources=roomLightSources({entities:[{entity:'light.corner',x:12,y:18,fixture:'spot'}]},room);
  assert.equal(sources.length,2);assert.equal(sources[0].x,12);assert.equal(sources[0].y,18);
  assert.equal(sources[1].x,50);assert.equal(sources[1].y,50);
  assert.ok(sources[0].radius<sources[1].radius);
  const raised=roomLightSources({entities:[{entity:'light.corner',x:12,y:18,fixture:'spot',height_m:3.5}]},room)[0];
  assert.equal(raised.height,3.5);assert.ok(raised.radius>sources[0].radius);assert.ok(raised.strength<sources[0].strength);
});
test('off and unavailable lights emit nothing; brightness and colour follow entity state',()=>{
  assert.equal(lightAppearance({state:'off',attributes:{brightness:255}}).level,0);
  assert.equal(lightAppearance({state:'unavailable'}).level,0);
  assert.deepEqual(lightAppearance({state:'on',attributes:{brightness:128,rgb_color:[255,0,64]}}),{level:128/255,colour:[255,0,64]});
  assert.deepEqual(lightAppearance({state:'on',attributes:{hs_color:[120,100]}}).colour,[0,255,0]);
});
test('switching one light on does not remove darkness from the entire room',()=>{
  const room={lights:['light.a','light.b']},states={'light.a':{state:'off'},'light.b':{state:'off'}};
  assert.equal(roomDarkness(room,states),.64);
  states['light.a'].state='on';assert.equal(roomDarkness(room,states),.64);
  assert.equal(roomDarkness({lights:[]},{}),.18);
});

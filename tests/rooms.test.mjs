import test from 'node:test';
import assert from 'node:assert/strict';
import { roomState, validPolygon, orientation, orientPoint } from '../src/rooms.js';
import { normaliseConfig } from '../src/lights.js';
const room={id:'living',name:'Living room',lights:['light.a','light.b'],presence:['binary_sensor.motion'],points:[[10,10],[80,10],[80,80],[10,80]]};
test('rooms follow actual lights and show presence separately',()=>{
  const states={'light.a':{state:'off',attributes:{}},'light.b':{state:'on',attributes:{brightness:128}},'binary_sensor.motion':{state:'on',attributes:{}}};
  assert.equal(roomState(room,states).lightState,'Lit');assert.equal(roomState(room,states).presence,'Presence detected');
  states['light.b'].state='off';assert.equal(roomState(room,states).lightState,'Dark');assert.equal(roomState(room,states).occupied,true);
});
test('offline entities are unknown rather than falsely dark or empty',()=>{
  const states={'light.a':{state:'off',attributes:{}},'binary_sensor.motion':{state:'unavailable',attributes:{}}};
  assert.equal(roomState(room,states).lightState,'Lighting unknown');assert.equal(roomState(room,states).presence,'Presence unknown');
  assert.equal(roomState({...room,lights:[],presence:[]},{}).lightState,'No lights assigned');
});
test('rotations preserve point placement through inverse mapping',()=>{
  for(const ratio of [.5,.6875,1,1.7])for(const degrees of [0,37,90,180,270,359])for(const point of [[0,0],[10,75],[50,50],[100,100]]){
    const t=orientation(ratio,degrees);const restored=orientPoint(orientPoint(point,t),t,true);
    restored.forEach((v,i)=>assert.ok(Math.abs(v-point[i])<1e-9));
  }
  const t=orientation(.5,90);assert.ok(Math.abs(t.width/t.height-2)<1e-9);
});
test('room polygons reject crossing edges, duplicates, zero area and invalid coordinates',()=>{
  assert.equal(validPolygon(room.points),true);
  for(const points of [[[0,0],[50,50],[100,100]],[[0,0],[100,100],[0,100],[100,0]],[[0,0],[100,0],[100,100],[0,0]],[[0,0],[101,0],[50,50]]])assert.equal(validPolygon(points),false);
});
test('room and rotation configuration round trips without losing fields',()=>{
  const config=normaliseConfig({floors:[{id:'a',image:'/local/a.svg',rotation:90,rooms:[room]}]});
  assert.deepEqual(normaliseConfig(JSON.parse(JSON.stringify(config))),config);
  assert.throws(()=>normaliseConfig({floors:[{id:'a',image:'/a.svg',rotation:NaN}]}));
});

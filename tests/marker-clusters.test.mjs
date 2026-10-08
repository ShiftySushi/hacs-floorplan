import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clusterLights} from '../src/marker-clusters.js';

const square=(x,y)=>[[x,y],[x+40,y],[x+40,y+40],[x,y+40]];
test('a room with several lights becomes one cluster at their middle',()=>{
  const floor={rooms:[{id:'kitchen',points:square(0,0),lights:['light.a']},{id:'hall',points:square(50,0)},{id:'unshaped',lights:['light.e']}],entities:[
    {entity:'light.a',x:90,y:90},{entity:'light.b',x:10,y:10},{entity:'light.c',x:30,y:20},
    {entity:'light.d',x:60,y:10},{entity:'light.e',x:95,y:95},{entity:'sensor.t',x:12,y:12}]};
  const clusters=clusterLights(floor);
  assert.equal(clusters.length,1);
  // light.a is listed by the kitchen although its marker stands elsewhere.
  assert.deepEqual(clusters[0].items.map(item=>item.entity),['light.a','light.b','light.c']);
  assert.equal(clusters[0].room.id,'kitchen');
  assert.ok(Math.abs(clusters[0].x-130/3)<1e-9&&Math.abs(clusters[0].y-40)<1e-9);
});
test('floors without rooms or lights have no clusters',()=>{
  assert.deepEqual(clusterLights({}),[]);
  assert.deepEqual(clusterLights({rooms:[{id:'a',points:square(0,0)}],entities:[{entity:'light.a',x:5,y:5}]}),[]);
});

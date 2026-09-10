import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseScene, floorDimensions } from '../src/scene.js';
import { CATALOGUE } from '../src/catalogue.js';

test('legacy floors gain scene defaults and preserve image and entity coordinates',()=>{
  const floor={id:'test',image:'/local/private.svg',aspect_ratio:2,entities:[{entity:'light.a',x:15,y:70}]};
  const config=normaliseScene({floors:[floor]});
  assert.equal(config.scene_version,1);assert.equal(config.appearance.mode,'clean');
  assert.deepEqual(floorDimensions(floor),{width:10,depth:5});
  assert.equal(floor.image,'/local/private.svg');assert.equal(floor.entities[0].x,15);
  assert.deepEqual(normaliseScene(JSON.parse(JSON.stringify(config))),config);
});
test('catalogue covers common house furniture with physical dimensions',()=>{
  for(const type of ['piano','tv','tv_bench','side_table','display_cabinet','bookshelf','sofa','bed','dining_table','chair','toilet','sink','bath','shower','desk','office_chair'])assert.ok(CATALOGUE.find(o=>o.type===type));
  assert.equal(new Set(CATALOGUE.map(o=>o.type)).size,CATALOGUE.length);
  assert.ok(CATALOGUE.every(o=>o.width>0&&o.depth>0&&o.height>0));
});
test('furniture dimensions and rotation normalise without moving anchors',()=>{
  const config=normaliseScene({floors:[{id:'a',objects:[{id:'sofa1',type:'sofa',x:20,y:80,rotation:-90}]}]});
  assert.deepEqual(config.floors[0].objects[0],{id:'sofa1',type:'sofa',x:20,y:80,rotation:270,width:2.1,depth:.9,height:.85});
  for(const patch of [{x:101},{width:0},{height:NaN},{colour:'url(foo)'},{type:'unsupported'}])assert.throws(()=>normaliseScene({floors:[{objects:[{id:'x',type:'bed',x:50,y:50,...patch}]}]}));
});
test('wall openings must fit the calibrated wall and cannot overlap',()=>{
  const scene=()=>({floors:[{width_m:10,aspect_ratio:1,walls:[{id:'wall',a:[0,0],b:[50,0],openings:[{id:'door',type:'door',offset:.2},{id:'window',type:'window',offset:.7}]}]}]});
  assert.doesNotThrow(()=>normaliseScene(scene()));
  const edge=scene();edge.floors[0].walls[0].openings[0].offset=0;assert.throws(()=>normaliseScene(edge),/inside/);
  const overlap=scene();overlap.floors[0].walls[0].openings[1].offset=.2;assert.throws(()=>normaliseScene(overlap),/overlap/);
  const tall=scene();tall.floors[0].walls[0].openings[1].height=3;assert.throws(()=>normaliseScene(tall),/inside/);
});
test('unsupported versions and duplicate scene ids fail before silent data loss',()=>{
  assert.throws(()=>normaliseScene({scene_version:2}),/version/);
  assert.throws(()=>normaliseScene({floors:[{objects:[{id:'same',type:'bed',x:20,y:30},{id:'same',type:'tv',x:30,y:40}]}]}),/unique/);
});
test('room materials and colours round trip and reject unsupported artwork inputs',()=>{
  const config={floors:[{rooms:[{material:'carpet',colour:'#bdc4a3'}]}]};
  assert.equal(normaliseScene(config).floors[0].rooms[0].colour,'#bdc4a3');
  assert.throws(()=>normaliseScene({floors:[{rooms:[{material:'metal'}]}]}),/wood, tile or carpet/);
  assert.throws(()=>normaliseScene({floors:[{rooms:[{colour:'url(unsafe)'}]}]}),/room colour/);
});

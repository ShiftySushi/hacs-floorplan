import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {normaliseScene} from '../src/scene.js';

test('door and blind options survive scene export; invalid options fail',()=>{
  const wall={id:'wall',a:[0,0],b:[100,0],wardrobe_doors:{finish:'mirror',side:-1,count:4},openings:[{id:'window',type:'window',offset:.5,width:1,blinds:false}]};
  const scene=normaliseScene({floors:[{width_m:5,depth_m:5,walls:[wall]}]});assert.deepEqual(normaliseScene(JSON.parse(JSON.stringify(scene))),scene);
  for(const front of [{finish:'glass',side:1,count:4},{finish:'mirror',side:0,count:4},{finish:'plain',side:1,count:0}])assert.throws(()=>normaliseScene({floors:[{walls:[{...wall,wardrobe_doors:front}]}]}),/Wardrobe/);
});

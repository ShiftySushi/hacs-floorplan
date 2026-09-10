import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {windowBlinds} from '../src/window-blinds3d.js';

test('blinds tilt smoothly, reverse mid-animation and honour reduced motion',()=>{
  const room={points:[[0,0],[100,0],[100,100],[0,100]]},floor={rooms:[room]},parent=new THREE.Group();
  const blind=windowBlinds(parent,{width:1.5,height:1.2,sill:.9},4,{a:[0,0],b:[100,0]},floor);
  assert.equal(blind.room,room);assert.equal(blind.value,0);
  blind.toggle();assert.equal(blind.update(performance.now()+200,false),true);
  assert.ok(blind.value>0&&blind.value<1);
  const midway=blind.value;blind.toggle();blind.update(performance.now()+200,false);
  assert.ok(blind.value<midway&&blind.value>0);
  assert.equal(blind.update(performance.now()+800,false),false);assert.equal(blind.value,0);
  blind.toggle();blind.update(performance.now(),true);assert.equal(blind.value,1);
  assert.ok(parent.children[0].children.some(mesh=>mesh.rotation.x===Math.PI/2));
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {windowBlinds} from '../src/window-blinds3d.js';
import {blindTransmission} from '../src/wall-occlusion3d.js';
test('grey rooflight blind slides across its inclined frame and restores state',()=>{
  const parent=new THREE.Group();parent.rotation.x=-Math.PI/4;
  const changes=[],blind=windowBlinds(parent,{width:.66,height:1.18,sill:0,sliding:true},.66,{a:[0,0],b:[0,0]},{rooms:[]},{closed:true,onChange:v=>changes.push(v)});
  const panel=blind.hit.children[2];assert.equal(panel.material.color.getHexString(),'85898d');assert.equal(panel.scale.y,1);assert.equal(panel.rotation.x,0);
  blind.toggle();blind.update(performance.now()+800,true);assert.equal(panel.scale.y,.015);assert.equal(blind.value,0);assert.deepEqual(changes,[false]);
  blind.toggle();blind.update(performance.now()+800,true);assert.equal(panel.scale.y,1);assert.equal(blind.value,1);
  parent.updateMatrixWorld();const normal=new THREE.Vector3(0,0,1).transformDirection(panel.matrixWorld);assert.ok(Math.abs(normal.y-Math.SQRT1_2)<1e-6);
});

test('restored blinds begin closed without an opening flash and save their target immediately',()=>{
  const changes=[],blind=windowBlinds(new THREE.Group(),{width:1,height:1},2,{a:[0,0],b:[100,0]},{rooms:[]},{closed:true,onChange:value=>changes.push(value)});
  assert.equal(blind.closed,true);assert.equal(blind.value,1);assert.equal(blind.hit.children[1].position.y,-.5);
  blind.toggle();assert.deepEqual(changes,[false]);assert.equal(blind.value,1);
  blind.update(performance.now()+1500,false);assert.equal(blind.value,0);
});
test('daylight is weighted by glazed area, including windows without blinds',()=>{
  assert.equal(blindTransmission([{area:1,value:0}]),1);
  assert.ok(Math.abs(blindTransmission([{area:1,value:1}])-.08)<1e-9);
  assert.ok(Math.abs(blindTransmission([{area:1,value:1},{area:3,value:0}])-.77)<1e-9);
  assert.equal(blindTransmission([]),0);
  assert.equal(blindTransmission(undefined),1);
});

test('a window without blinds has no slats, headrail or interactive target',()=>{
  const parent=new THREE.Group();
  assert.equal(windowBlinds(parent,{blinds:false},4,{a:[0,0],b:[100,0]},{rooms:[]}),null);
  assert.equal(parent.children.length,0);
});

test('blinds tilt smoothly, reverse mid-animation and honour reduced motion',()=>{
  const room={points:[[0,0],[100,0],[100,100],[0,100]]},floor={rooms:[room]},parent=new THREE.Group();
  const blind=windowBlinds(parent,{width:1.5,height:1.2,sill:.9},4,{a:[0,0],b:[100,0]},floor);
  assert.equal(blind.room,room);assert.equal(blind.value,0);
  blind.toggle();assert.equal(blind.update(performance.now()+200,false),true);
  assert.ok(blind.value>0&&blind.value<1);
  const midway=blind.value;blind.toggle();blind.update(performance.now()+200,false);
  assert.ok(blind.value<midway&&blind.value>0);
  assert.equal(blind.update(performance.now()+1500,false),false);assert.equal(blind.value,0);
  blind.toggle();blind.update(performance.now(),true);assert.equal(blind.value,1);
  assert.ok(parent.children[0].children.some(mesh=>mesh.rotation.x===Math.PI/2));
  const bottom=parent.children[0].children[1];
  assert.equal(bottom.position.y,-.6);
  blind.setClosed(false);blind.update(performance.now(),true);
  assert.equal(blind.closed,false);assert.ok(bottom.position.y>.35);
  blind.setClosed(true);blind.update(performance.now(),true);
  assert.equal(blind.closed,true);assert.equal(bottom.position.y,-.6);
});

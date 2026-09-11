import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {nearestRoom,wallDaylight,roomDaylightWindows} from '../src/wall-daylight.js';
import {normaliseScene} from '../src/scene.js';

test('connected room zones share blind daylight without lighting an enclosed cupboard',()=>{
  const rooms=[{id:'sleeping',daylight_group:'suite',points:[[0,0],[50,0],[50,100],[0,100]]},{id:'dressing',daylight_group:'suite',points:[[50,0],[80,0],[80,100],[50,100]]},{id:'cupboard',points:[[80,0],[100,0],[100,100],[80,100]]}];
  const floor={id:'floor',width_m:6,depth_m:4,rooms},group=new THREE.Group(),wall=new THREE.Mesh(new THREE.BoxGeometry(.15,2.4,4),new THREE.MeshStandardMaterial());group.add(wall);group.updateMatrixWorld(true);
  const window={floor,room:rooms[0],area:2,value:1},windows=[window],binding=wallDaylight({floor,group},windows,[wall]);
  assert.deepEqual(roomDaylightWindows(windows,floor,rooms[1]),[window]);assert.deepEqual(roomDaylightWindows(windows,floor,rooms[2]),[]);
  for(const closed of [1,.5,0]){window.value=closed;binding.update();const values=wall.material.userData.wallDaylight.ft.value.image.data;assert.equal(values[0],values[4]);assert.ok(Math.abs(values[4]-(1-.92*closed))<1e-6);assert.equal(values[8],0);}
  const saved=normaliseScene(JSON.parse(JSON.stringify({floors:[floor]})));assert.equal(saved.floors[0].rooms[1].daylight_group,'suite');
  binding.dispose();wall.geometry.dispose();wall.material.dispose();
});

test('opposite faces of a shared wall resolve their own room, including boundary returns',()=>{
  const rooms=[{points:[[0,0],[50,0],[50,100],[0,100]]},{points:[[50,0],[100,0],[100,100],[50,100]]}];
  assert.equal(nearestRoom(49.9,30,rooms),0);assert.equal(nearestRoom(50.1,30,rooms),1);
  assert.equal(nearestRoom(-1,30,rooms),0);assert.equal(nearestRoom(101,30,rooms),1);
  const floor={width_m:8,depth_m:10,rooms},group=new THREE.Group();group.position.set(3,6,4);group.rotation.y=.4;
  const wall=new THREE.Mesh(new THREE.BoxGeometry(.15,2.4,8),new THREE.MeshStandardMaterial());group.add(wall);group.updateMatrixWorld(true);
  const window={floor,room:rooms[0],area:1,value:1},binding=wallDaylight({floor,group},[window],[wall]);binding.update();
  const uniforms=wall.material.userData.wallDaylight,mask=uniforms.fm.value.image.data,light=uniforms.ft.value.image.data;
  assert.equal(mask[(128*256+126)*4],0);assert.equal(mask[(128*256+129)*4],1);
  assert.ok(Math.abs(light[0]-.08)<1e-6);assert.equal(light[4],0);
  window.value=0;binding.update();assert.equal(light[0],1);assert.equal(light[4],0);
  const origin=new THREE.Vector3().applyMatrix4(group.matrixWorld).applyMatrix4(uniforms.fi.value);assert.ok(origin.length()<1e-9);
  binding.dispose();wall.geometry.dispose();wall.material.dispose();
});

test('corner skirting outside the room boundary shares the wall daylight mask',()=>{
  const room={points:[[5,5],[95,5],[95,85],[85,85],[85,95],[5,95]]};
  const floor={width_m:4,depth_m:4,rooms:[room]},group=new THREE.Group();
  const wall=new THREE.Mesh(new THREE.BoxGeometry(.4,2.4,.1),new THREE.MeshStandardMaterial());
  const skirt=new THREE.Mesh(new THREE.BoxGeometry(.4,.09,.125),new THREE.MeshStandardMaterial());
  wall.position.set(1.6,1.2,1.4);skirt.position.set(1.6,.045,1.4);group.add(wall,skirt);group.updateMatrixWorld(true);
  const window={floor,room,area:1,value:1},binding=wallDaylight({floor,group},[window],[wall,skirt]);binding.update();
  assert.equal(skirt.material.userData.wallDaylight,wall.material.userData.wallDaylight);
  const {fm,ft}=skirt.material.userData.wallDaylight;
  assert.equal(fm.value.image.data[(230*256+230)*4],0);
  assert.ok(Math.abs(ft.value.image.data[0]-.08)<1e-6);
  window.value=0;binding.update();assert.equal(ft.value.image.data[0],1);
  binding.dispose();for(const mesh of [wall,skirt]){mesh.geometry.dispose();mesh.material.dispose();}
});

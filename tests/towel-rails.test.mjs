import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {furniture3D} from '../src/furniture3d.js';
import {normaliseScene} from '../src/scene.js';
test('chrome towel rails have open round rungs and preserve heating bindings on export',()=>{
  const object={id:'rail',type:'radiator',variant:'towel_rail',x:50,y:50,width:.5,depth:.1,height:1.1,rotation:0,heating_entity:'climate.towel_rail'};
  const model=furniture3D(object),pipes=model.children.filter(m=>m.geometry.type==='CylinderGeometry');
  assert.equal(pipes.length,14);assert.ok(model.children.every(m=>m.material.metalness>.6&&m.material.roughness<.2));
  const bounds=new THREE.Box3().setFromObject(model);assert.ok(Math.abs(bounds.max.y-object.height)<1e-6);assert.ok(Math.abs(bounds.max.x-bounds.min.x-object.width)<1e-6);
  const scene=normaliseScene({floors:[{objects:[object]}]});assert.deepEqual(normaliseScene(JSON.parse(JSON.stringify(scene))),scene);
  assert.equal(scene.floors[0].objects[0].heating_entity,'climate.towel_rail');
  assert.equal(furniture3D({...object,variant:''}).children.some(m=>m.geometry.type==='CylinderGeometry'),false);
});

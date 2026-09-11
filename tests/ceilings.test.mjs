import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {normaliseScene} from '../src/scene.js';
import {ceilingMeshes} from '../src/ceilings3d.js';

const slope=()=>({id:'slope',vertices:[[0,0,1],[30,0,2.4],[30,100,2.4],[0,100,1]]});
test('slopes retain metre heights and floor-local calibration through scene round trips',()=>{
  const config=normaliseScene({floors:[{width_m:8,depth_m:10,ceiling_slopes:[slope()]}]});
  const copy=normaliseScene(JSON.parse(JSON.stringify(config)));
  assert.deepEqual(copy,config);
  const [mesh]=ceilingMeshes(copy.floors[0],([x,y],height)=>new THREE.Vector3(x*.08,height,y*.1));
  mesh.updateMatrixWorld();const bounds=new THREE.Box3().setFromObject(mesh);
  assert.ok(Math.abs(bounds.min.y-1)<1e-6);assert.ok(Math.abs(bounds.max.y-2.4)<1e-6);
  assert.ok(Math.abs(bounds.max.x-2.4)<1e-6);assert.equal(bounds.max.z,10);
  assert.equal(mesh.geometry.index.count,6);assert.equal(mesh.userData.ceiling,true);
  mesh.geometry.dispose();mesh.material.dispose();
});
test('invalid slope coordinates and degenerate surfaces fail validation',()=>{
  for(const vertices of [[],[[0,0,1],[101,0,2],[30,100,2],[0,100,1]],[[0,0,-1],[30,0,2],[30,100,2],[0,100,1]],[[0,0,1],[0,10,2],[0,20,2],[0,30,1]]])assert.throws(()=>normaliseScene({floors:[{ceiling_slopes:[{id:'bad',vertices}]}]}),/Ceiling/);
});
test('rooflight replaces its ceiling surface with framed glazing',()=>{
  const floor=normaliseScene({floors:[{ceiling_slopes:[{...slope(),type:'rooflight'}]}]}).floors[0];
  const [mesh]=ceilingMeshes(floor,([x,y],h)=>new THREE.Vector3(x,h,y));
  assert.equal(mesh.userData.rooflight,true);assert.equal(mesh.castShadow,false);assert.equal(mesh.children.length,1);
  assert.equal(mesh.children[0].type,'LineSegments');assert.ok(mesh.material.roughness<.2);
  mesh.geometry.dispose();mesh.material.dispose();mesh.children[0].geometry.dispose();mesh.children[0].material.dispose();
});

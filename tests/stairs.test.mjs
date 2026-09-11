import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {furniture3D} from '../src/furniture3d.js';
import {normaliseScene} from '../src/scene.js';

test('sloping stairs leave a continuous storage void without changing their footprint or rise',()=>{
  const item={id:'stairs',type:'stairs',variant:'understairs',x:50,y:50,width:.8,depth:3,height:2.6};
  assert.equal(normaliseScene({floors:[{id:'fictional',objects:[item]}]}).floors[0].objects[0].variant,'understairs');
  for(const rotation of [0,270]){
    const model=furniture3D({...item,rotation});model.updateMatrixWorld(true);
    const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    const expected=rotation?[3,2.6,.8]:[.8,2.6,3];
    size.toArray().forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-6));
    for(const fraction of [.25,.55,.85]){
      const origin=new THREE.Vector3(0,-1,item.depth*(fraction-.5)).applyMatrix4(model.matrixWorld);
      const ray=new THREE.Raycaster(origin,new THREE.Vector3(0,1,0)),hits=ray.intersectObject(model,true);
      assert.ok(hits.length);assert.ok(Math.abs(hits[0].point.y-(item.height*fraction-.2))<1e-6);
    }
    model.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});
  }
});

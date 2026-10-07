import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Box3,Raycaster,Vector3} from 'three';
import {furniture3D} from '../src/furniture3d.js';
import {normaliseScene} from '../src/scene.js';

test('glass shaker cupboard has transparent inset and pegboard remains a thin wall object',()=>{
  const model=furniture3D({type:'kitchen_unit',front_style:'shaker',variant:'glass',width:.45,depth:.3,height:.7});
  assert.equal(model.children.filter(n=>n.material.transparent).length,1);
  const board=furniture3D({type:'pegboard',width:.76,depth:.035,height:.56});
  const b=new Box3().setFromObject(board);assert.ok(b.max.z-b.min.z<.13);
});

test('diner sideboard has two left doors and three right drawers',()=>{
  const m=furniture3D({type:'tv_bench',product_id:'lyla-sideboard',width:1.4,height:.78,depth:.43});
  const doors=m.children.filter(n=>n.userData.storagePart==='door'),drawers=m.children.filter(n=>n.userData.storagePart==='drawer');
  assert.equal(doors.length,2);assert.equal(drawers.length,3);
  assert.ok(doors.every(d=>d.position.x<drawers[0].position.x));
});

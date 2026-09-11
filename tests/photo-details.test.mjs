import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Box3,Raycaster,Vector3} from 'three';
import {openingFrame} from '../src/opening-frame3d.js';
test('centre door glass and a fixed fanlight transmit light through actual openings',()=>{
  const group=new Group(),o={type:'door',frame:'solid',width:1,height:2.38,offset:.5,transom_height:.28,glazing:{width:.29,height:1.28,sill:.46}};
  const parts=openingFrame(group,o,2);group.updateMatrixWorld(true);
  for(const y of [1.1,2.23]){const ray=new Raycaster(new Vector3(1,y,1),new Vector3(0,0,-1));const hits=ray.intersectObject(group,true);assert.ok(hits.length);assert.ok(hits.every(hit=>hit.object.userData.glazing));}
  assert.ok(parts.door.transmission>.15&&parts.door.transmission<.3);
  const transom=parts.find(m=>m.userData.glazing);const position=transom.position.clone();parts.door.toggle();parts.door.update(performance.now()+1500,false);
  assert.ok(parts.door.transmission>.9);assert.deepEqual(transom.position,position);
});
import {furniture3D} from '../src/furniture3d.js';
import {normaliseScene} from '../src/scene.js';

test('French-door glazing has two leaves and passes daylight without a blind',()=>{
  const o={id:'doors',type:'door',width:1.6,height:2.1,offset:.5,frame:'french',blinds:false},group=new Group();
  const parts=openingFrame(group,o,2);
  assert.equal(parts.door.leaves.filter(p=>p.material.transparent).length,2);
  group.updateMatrixWorld(true);const leaf=parts.door.leaves[0],before=new Box3().setFromObject(leaf);
  assert.equal(parts.door.transmission,.75);parts.door.toggle();
  assert.equal(parts.door.open,true);assert.equal(parts.door.transmission,.75);
  parts.door.update(performance.now()+700,false);assert.ok(parts.door.transmission>.75&&parts.door.transmission<1);
  parts.door.update(performance.now()+1500,false);assert.equal(parts.door.transmission,1);
  group.updateMatrixWorld(true);assert.ok(!before.equals(new Box3().setFromObject(leaf)));
  const scene=normaliseScene({floors:[{id:'test',width_m:5,depth_m:5,walls:[{id:'wall',a:[0,0],b:[100,0],height:2.4,openings:[o]}]}]});
  assert.equal(normaliseScene(JSON.parse(JSON.stringify(scene))).floors[0].walls[0].openings[0].frame,'french');
});

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

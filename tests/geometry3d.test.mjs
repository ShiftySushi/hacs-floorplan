import test from 'node:test';
import assert from 'node:assert/strict';
import { wallSections, storeyPlacement, selectSceneLights } from '../src/plan3d.js';
import { furniture3D } from '../src/furniture3d.js';
import { CATALOGUE } from '../src/catalogue.js';

test('wall solids preserve lintels and sills while subtracting actual openings',()=>{
  const sections=wallSections(8,2.4,[{type:'door',offset:.25,width:1,height:2.1},{type:'window',offset:.75,width:2,height:1,sill:1}]);
  assert.ok(Math.abs(sections.reduce((s,r)=>s+r.width*r.height,0)-(8*2.4-2.1-2))<1e-9);
  assert.ok(sections.some(r=>r.x===2&&r.y>2.1));
  assert.ok(sections.some(r=>r.x===6&&r.y<1));
  assert.ok(sections.every(r=>r.width>0&&r.height>0));
});
test('every catalogue object creates finite original 3D geometry',()=>{
  for(const object of CATALOGUE){const group=furniture3D({...object,rotation:37});let vertices=0;group.traverse(node=>{if(node.geometry){const values=node.geometry.attributes.position.array;assert.ok(values.every(Number.isFinite),object.type);vertices+=values.length;node.geometry.dispose();}if(node.material)node.material.dispose();});assert.ok(vertices>0,object.type);}
});
test('exploded storeys preserve explicit alignment and elevation',()=>{
  assert.deepEqual(storeyPlacement({},2),{x:0,y:12,z:0});
  assert.deepEqual(storeyPlacement({offset_x_m:1.2,offset_z_m:-.4,elevation_m:2.7},1),{x:1.2,y:5.7,z:-.4});
  assert.deepEqual(storeyPlacement({elevation_m:2.7},1,false),{x:0,y:2.7,z:0});
});
test('furniture variants produce distinct geometry',()=>{
  for(const [type,variant] of [['piano','grand'],['bed','single'],['sofa','corner']]){
    const base=CATALOGUE.find(item=>item.type===type),a=furniture3D(base),b=furniture3D({...base,variant});
    assert.notEqual(a.children.length,b.children.length,`${type} variant should change its model`);
    for(const group of [a,b])group.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
  }
});
test('GPU light budget prioritises selected storey and includes unassigned markers',()=>{
  const floors=['ground','upper'].map(id=>({id,entities:Array.from({length:10},(_,i)=>({entity:`light.${id}${i}`,x:i*9,y:40})),rooms:[]}));
  assert.equal(selectSceneLights(floors,'upper','low').length,0);
  assert.equal(selectSceneLights(floors,'upper','high').length,6);
  const automatic=selectSceneLights(floors,'upper');assert.equal(automatic.length,3);
  assert.deepEqual(automatic[0],{floorId:'upper',id:'light.upper0',point:[0,40]});
  assert.ok(automatic.every(light=>light.floorId==='upper'));
});

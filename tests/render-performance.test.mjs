import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Ray,Vector3} from 'three';
import {furniture3D} from '../src/furniture3d.js';
import {batchStaticModel} from '../src/static-model3d.js';
import {wallBVH} from '../src/wall-bvh.js';

test('static batching retains transformed bounds and materials with fewer draw meshes',()=>{
  const model=furniture3D({type:'side_table',variant:'sword',width:1.025,depth:.16,height:.2,rotation:67});model.position.set(4,2,7);
  const before=new Box3().setFromObject(model,true),materials=new Set();let oldCount=0;model.traverse(n=>{if(n.isMesh){oldCount++;materials.add(n.material);}});
  batchStaticModel(model);const after=new Box3().setFromObject(model,true);let count=0;model.traverse(n=>{if(n.isMesh){count++;assert.ok(materials.has(n.material));}});
  assert.ok(count<oldCount/2);assert.ok(before.min.distanceTo(after.min)<1e-6&&before.max.distanceTo(after.max)<1e-6);
});
test('worktop sits above every base cabinet body surface, without coplanar side/back strips',()=>{
  const m=furniture3D({type:'kitchen_unit',front_style:'shaker',width:1.2,depth:.6,height:.9});const top=m.children.find(n=>n.userData.worktop),bounds=new Box3().setFromObject(top);
  assert.ok(Math.abs(bounds.max.y-.9)<1e-6);
  for(const part of m.children.filter(n=>n!==top)){const b=new Box3().setFromObject(part);assert.ok(b.max.y<=bounds.min.y+1e-6,`Part reaches worktop at ${b.max.y}`);}
});
test('wall tree escape links retain every blocker and bound all descendants',()=>{
  const walls=Array.from({length:80},(_,index)=>({index,min:[index%10,0,Math.floor(index/10)],max:[index%10+.1,2.4,Math.floor(index/10)+.7]})),nodes=wallBVH(walls);
  assert.equal(nodes.length,159);assert.deepEqual(nodes.filter(n=>n.wall>=0).map(n=>n.wall).sort((a,b)=>a-b),walls.map(w=>w.index));
  nodes.forEach((n,i)=>{assert.ok(n.escape>i&&n.escape<=nodes.length);for(const descendant of nodes.slice(i+1,n.escape))for(let a=0;a<3;a++)assert.ok(descendant.min[a]>=n.min[a]&&descendant.max[a]<=n.max[a]);});
  for(let i=0;i<100;i++){
    const ray=new Ray(new Vector3(-1,(i%5)*.7,-1),new Vector3(1,.01,(i%19)/10).normalize()),hit=b=>ray.intersectsBox(new Box3(new Vector3(...b.min),new Vector3(...b.max))),actual=[];
    for(let cursor=0;cursor<nodes.length;){const n=nodes[cursor];if(!hit(n)){cursor=n.escape;continue;}cursor++;if(n.wall>=0)actual.push(n.wall);}
    assert.deepEqual(actual.sort((a,b)=>a-b),walls.filter(hit).map(w=>w.index));
  }
});

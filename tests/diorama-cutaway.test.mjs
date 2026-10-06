import test from 'node:test';
import assert from 'node:assert/strict';
import {planCutaway,isHung,KERB,LOW} from '../src/diorama-cutaway.js';

// A fictional 10 m square of two rooms split by a wall at y=50, seen from the south-east.
const towards=[Math.SQRT1_2,Math.SQRT1_2];
const wall=(id,a,b,extra={})=>({id,a,b,thickness:.1,height:2.4,...extra});
function floor({objects=[],split=[wall('split',[0,50],[100,50])]}={}){
  return {width_m:10,depth_m:10,objects,
    rooms:[{id:'north',points:[[0,0],[100,0],[100,50],[0,50]]},{id:'south',points:[[0,50],[100,50],[100,100],[0,100]]}],
    walls:[wall('n',[0,0],[100,0]),wall('e',[100,0],[100,100]),wall('s',[100,100],[0,100]),wall('w',[0,100],[0,0]),...split]};
}
const heights=plans=>Object.fromEntries(plans.map(plan=>[plan.wall.id,plan.height]));

test('outside walls stand on the far side and drop to a kerb on the near side',()=>{
  const plans=planCutaway(floor(),towards),roles=Object.fromEntries(plans.map(plan=>[plan.wall.id,plan.role]));
  assert.deepEqual(roles,{n:'far',w:'far',e:'near',s:'near',split:'partition'});
  assert.deepEqual(heights(plans),{n:2.4,w:2.4,e:KERB,s:KERB,split:LOW});
});

test('a partition drops to a kerb only when it would hide the foot of something behind it',()=>{
  const bed=(y)=>({id:'bed',type:'bed',x:50,y,width:1.4,depth:2,height:.6});
  // Hard against the far side of the wall: hidden. Well clear of it, or in front of it: not.
  assert.equal(heights(planCutaway(floor({objects:[bed(38)]}),towards)).split,KERB);
  assert.equal(heights(planCutaway(floor({objects:[bed(15)]}),towards)).split,LOW);
  assert.equal(heights(planCutaway(floor({objects:[bed(62)]}),towards)).split,LOW);
});

test('rugs and wall-hung things never lower a wall',()=>{
  const objects=[{id:'rug',type:'rug',x:50,y:44,width:2,depth:1,height:.02},{id:'art',type:'picture',x:50,y:49,width:1,depth:.04,height:.6,elevation_m:1.3}];
  assert.equal(heights(planCutaway(floor({objects}),towards)).split,LOW);
  assert.ok(isHung(objects[1]));assert.ok(!isHung(objects[0]));
  assert.ok(isHung({type:'kitchen_unit',variant:'wall'}));assert.ok(!isHung({type:'kitchen_unit'}));
});

test('pieces of one straight wall share a height, whatever order they are stored in',()=>{
  const pieces=[wall('left',[0,50],[40,50]),wall('door',[40,50],[50,50],{openings:[{type:'door',width:.8,offset:.5}]}),wall('right',[50,50],[100,50])];
  const objects=[{id:'desk',type:'desk',x:85,y:44,width:1.4,depth:.7,height:.75}];
  for(const split of [pieces,[...pieces].reverse()]){
    const result=heights(planCutaway(floor({objects,split}),towards));
    assert.deepEqual([result.left,result.door,result.right],[KERB,KERB,KERB]);
  }
});

test('a short nib never stands taller than the wall it joins',()=>{
  // The long wall is lowered by the chest behind it; the 0.4 m return off it must follow.
  const split=[wall('split',[0,50],[100,50]),wall('nib',[30,50],[30,54])];
  const objects=[{id:'chest',type:'side_table',x:70,y:45,width:1,depth:.5,height:.8}];
  const result=heights(planCutaway(floor({objects,split}),towards));
  assert.equal(result.split,KERB);assert.equal(result.nib,KERB);
  // With nothing behind the long wall, both stay at partition height.
  const clear=heights(planCutaway(floor({split}),towards));
  assert.equal(clear.split,LOW);assert.equal(clear.nib,LOW);
});

test('turning the camera swaps which outside walls are cut',()=>{
  const roles=Object.fromEntries(planCutaway(floor(),[-Math.SQRT1_2,-Math.SQRT1_2]).map(plan=>[plan.wall.id,plan.role]));
  assert.deepEqual([roles.n,roles.w,roles.e,roles.s],['near','near','far','far']);
});

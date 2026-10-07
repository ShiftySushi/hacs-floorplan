import test from 'node:test';
import assert from 'node:assert/strict';
import {acrossView,spreadClearance,spreadLayout,coveredPoint,insidePolygon} from '../src/diorama-spread.js';
import {ELEVATION} from '../src/diorama-cutaway.js';

// Seen from the south-east, as the card draws it.
const towards=[Math.SQRT1_2,Math.SQRT1_2],pitch=2.68,reach=pitch/Math.tan(ELEVATION);
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} is not ${expected}`);

test('screen right is perpendicular to the viewing direction',()=>{
  const across=acrossView(towards);
  close(across[0]*towards[0]+across[1]*towards[1],0);close(Math.hypot(...across),1);
  close(acrossView([0,1])[0],1);close(acrossView([0,1])[1],0);
});

test('a storey clears the one below as soon as either side of the footprint is clear',()=>{
  // The storey above hides a footprint-sized patch `lean` behind it. Sliding right from the
  // south-east moves east and north: east has to clear the width plus the lean, north the
  // depth less the lean, and the first of the two to clear decides.
  const lean=towards[0]*reach,right=spreadClearance(towards,pitch,[8,12],1),left=spreadClearance(towards,pitch,[8,12],-1);
  close(right,Math.min(8+lean,12-lean)/Math.SQRT1_2);close(left,Math.min(8-lean,12+lean)/Math.SQRT1_2);
  assert.ok(left<right);
  // Turning the footprint a quarter turn swaps which way is shorter.
  assert.ok(spreadClearance(towards,pitch,[12,8],1)<spreadClearance(towards,pitch,[12,8],-1));
  // A taller storey leans further, so the short way gets shorter still.
  assert.ok(spreadClearance(towards,pitch*1.5,[8,12],-1)<left);
});

test('the compact row takes the shorter slide and centres the storeys',()=>{
  const layout=spreadLayout({towards,pitch,footprint:[8,12],count:3});
  assert.equal(layout.direction,-1);
  close(layout.stride,-(spreadClearance(towards,pitch,[8,12],-1)+2));
  close(layout.offsets[1][0],0);close(layout.offsets[1][1],0);
  for(const axis of [0,1])close(layout.offsets[0][axis]+layout.offsets[2][axis],0);
  // Sliding left puts the top storey on the left of the screen.
  const across=acrossView(towards),screen=index=>layout.offsets[index][0]*across[0]+layout.offsets[index][1]*across[1];
  assert.ok(screen(2)<screen(1)&&screen(1)<screen(0));
  assert.equal(spreadLayout({towards,pitch,footprint:[12,8],count:3}).direction,1);
});

test('ground-left steps upwards to the right whatever the footprint',()=>{
  for(const footprint of [[12,8],[8,12],[10,10]]){
    const layout=spreadLayout({towards,pitch,footprint,count:3,order:'ground-left',gap:1}),across=acrossView(towards),screen=index=>layout.offsets[index][0]*across[0]+layout.offsets[index][1]*across[1];
    assert.equal(layout.direction,1);close(layout.stride,spreadClearance(towards,pitch,footprint,1)+1);
    assert.ok(screen(0)<screen(1)&&screen(1)<screen(2));
  }
});

test('a single storey never moves',()=>{
  const {offsets}=spreadLayout({towards,pitch:0,footprint:[10,10],count:1});
  assert.equal(offsets.length,1);close(offsets[0][0],0);close(offsets[0][1],0);
});

test('a point is covered when its sight line meets a room on a storey above',()=>{
  const square=[[0,0],[100,0],[100,100],[0,100]],above=[{base:pitch,width:10,depth:10,rooms:[{points:square}]}],slab=.28;
  assert.ok(insidePolygon(50,50,square));assert.ok(!insidePolygon(101,50,square));
  // The middle of the floor looks out through the storey above.
  assert.equal(coveredPoint([0,.35,0],0,above,towards,{slab}),true);
  // Close to the near corner the sight line leaves the building before reaching the slab.
  assert.equal(coveredPoint([4.8,.35,4.8],0,above,towards,{slab}),false);
  // Exactly where the sight line meets the slab's near edge decides it.
  const edge=5-towards[0]*(pitch-slab-.35)/Math.tan(ELEVATION);
  assert.equal(coveredPoint([edge-.05,.35,0],0,above,towards,{slab}),true);
  assert.equal(coveredPoint([edge+.05,.35,0],0,above,towards,{slab}),false);
  // Nothing above, a point above the slab, or a storey with a void there, covers nothing.
  assert.equal(coveredPoint([0,.35,0],0,[],towards,{slab}),false);
  assert.equal(coveredPoint([0,pitch,0],0,above,towards,{slab}),false);
  assert.equal(coveredPoint([0,.35,0],0,[{base:pitch,width:10,depth:10,rooms:[{points:[[0,0],[20,0],[20,20],[0,20]]}]}],towards,{slab}),false);
});

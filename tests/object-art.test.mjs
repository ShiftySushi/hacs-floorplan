import test from 'node:test';
import assert from 'node:assert/strict';
import { objectArtwork } from '../src/object-art.js';

function artwork(item,width,depth) {
  const previous=globalThis.document;
  globalThis.document={createElementNS:(_ns,tag)=>({tag,attrs:{},children:[],setAttribute(key,value){this.attrs[key]=String(value);},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;}})};
  try {return objectArtwork(item,'clean',width,depth);} finally {globalThis.document=previous;}
}
const flatten=node=>[node,...node.children.flatMap(flatten)];

test('long cabinet runs add bays while retaining handle proportions',()=>{
  const short=flatten(artwork({type:'tv_bench',width:.6,depth:.6},60,60));
  const long=flatten(artwork({type:'tv_bench',width:3,depth:.6},300,60));
  const handles=nodes=>nodes.filter(n=>n.tag==='line' && n.attrs.y1===n.attrs.y2);
  assert.equal(handles(short).length,1);assert.equal(handles(long).length,5);
  const length=n=>Number(n.attrs.x2)-Number(n.attrs.x1);
  assert.ok(Math.abs(length(handles(short)[0])-length(handles(long)[0]))<1e-9);
});
test('kitchen runs have a full-bleed continuous worktop in the chosen colour',()=>{
  const nodes=flatten(artwork({type:'kitchen_unit',width:3,depth:.6,colour:'#aabbcc'},300,60));
  const top=nodes.find(n=>n.tag==='rect'&&n.attrs.fill==='#aabbcc');
  assert.deepEqual(top.attrs,{x:'0',y:'0',width:'300',height:'60',fill:'#aabbcc',stroke:'none'});
  assert.equal(nodes.filter(n=>n.tag==='line').length,0);
});
test('a separate worktop finish overrides cabinet colour in the top-down view',()=>{
  const nodes=flatten(artwork({type:'kitchen_unit',width:2,depth:.6,colour:'#eee9d8',worktop_colour:'#444544'},200,60));
  assert.ok(nodes.some(n=>n.tag==='rect'&&n.attrs.fill==='#444544'&&n.attrs.width==='200'&&n.attrs.height==='60'));
  assert.ok(!nodes.some(n=>n.attrs.fill==='#eee9d8'));
});
test('fixture artwork uses uniform scale and stays centred in a long footprint',()=>{
  const nodes=flatten(artwork({type:'lamp',width:3,depth:.4},300,40));
  const transform=nodes.find(n=>n.attrs.transform)?.attrs.transform;
  assert.equal(transform,'translate(130 0) scale(0.4)');
});
test('longer stairs add treads rather than stretching a fixed stair glyph',()=>{
  const count=(depth,height)=>flatten(artwork({type:'stairs',width:.9,depth},90,height)).filter(n=>n.tag==='line'&&n.attrs.y1===n.attrs.y2).length;
  assert.equal(count(2,200),7);assert.equal(count(4,400),15);
});
test('bath drain stays circular as the bath length changes',()=>{
  for(const depth of [120,240]) {
    const drain=flatten(artwork({type:'bath',width:.75,depth:depth/100},75,depth)).find(n=>n.tag==='circle');
    assert.equal(drain.attrs.r,'1.875');
  }
});

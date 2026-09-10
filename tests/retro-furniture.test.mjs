import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retroFurniture} from '../src/retro-furniture.js';
function draw(item,mode){
  const previous=globalThis.document;
  globalThis.document={createElementNS:(_ns,tag)=>({tag,attrs:{},children:[],setAttribute(k,v){this.attrs[k]=String(v);},append(...nodes){this.children.push(...nodes);}})};
  try{return retroFurniture(item,mode,160,90);}finally{globalThis.document=previous;}
}
function geometry(node){if(!node)return null;return {tag:node.tag,attrs:Object.fromEntries(Object.entries(node.attrs).filter(([k])=>!['fill','stroke','data-retro-furniture'].includes(k))),children:node.children.map(geometry)};}
test('common furniture has separate geometry in each retro style and preserves its configuration',()=>{
  for(const type of ['sofa','dining_table','desk','bed','bookshelf','chair','rug','tv']){
    const item={type,width:2,depth:1,colour:'#777777'},before=structuredClone(item);
    const a=draw(item,'pokemon'),b=draw(item,'zelda');
    assert.ok(a&&b,type);assert.notDeepEqual(geometry(a),geometry(b),`${type} must differ beyond colours`);
    assert.deepEqual(item,before);
  }
});
test('standard mode and reactive panel artwork keep their existing renderers',()=>{
  assert.equal(draw({type:'sofa'},'clean'),null);
  assert.equal(draw({type:'nanoleaf_panels'},'pokemon'),null);
});

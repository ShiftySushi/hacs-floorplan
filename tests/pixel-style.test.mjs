import test from 'node:test';
import assert from 'node:assert/strict';
import { pixelPattern, pixelRoomTrim } from '../src/pixel-style.js';
import { normaliseConfig } from '../src/lights.js';
function draw(callback) {
  const old=globalThis.document;
  globalThis.document={createElementNS:(_ns,tag)=>({tag,attrs:{},children:[],setAttribute(k,v){this.attrs[k]=String(v);},append(...nodes){this.children.push(...nodes);}})};
  try{return callback();}finally{globalThis.document=old;}
}
test('retro styles use different tile construction rather than only recolouring',()=>{
  const handheld=draw(()=>pixelPattern('a','pokemon','tile'));
  const adventure=draw(()=>pixelPattern('b','zelda','tile'));
  assert.equal(handheld.attrs.width,'64');
  assert.ok(adventure.children.length>handheld.children.length,'adventure tiles have their own inlaid stone motif');
  assert.equal(handheld.attrs['shape-rendering'],'crispEdges');
});
test('room trim follows the top edge without modifying or rounding floor geometry',()=>{
  const points=[[12.5,23.5],[121.5,23.5],[142,145],[12.5,145]],before=structuredClone(points);
  const trim=draw(()=>pixelRoomTrim(points,'pokemon'));
  assert.deepEqual(points,before);assert.equal(trim.children[0].attrs.x,'12.5');assert.equal(trim.children[0].attrs.width,'109');
  assert.equal(trim.attrs['pointer-events'],'none');
});
test('custom room colour remains the underlying retro floor colour',()=>{
  for(const material of ['wood','tile','carpet']) {
    const pattern=draw(()=>pixelPattern('a','zelda',material,'#aabbcc'));
    assert.ok(pattern.children.some(n=>n.attrs.fill==='#aabbcc'));
  }
});
test('private style images round trip and reject unsafe URLs or unsupported keys',()=>{
  const config=normaliseConfig({floors:[{id:'test',style_images:{pokemon:'/local/private-pokemon.svg',zelda:'data:image/png;base64,YQ=='}}]});
  assert.equal(normaliseConfig(JSON.parse(JSON.stringify(config))).floors[0].style_images.pokemon,'/local/private-pokemon.svg');
  for(const style_images of [{pokemon:'javascript:alert(1)'},{zelda:'//example.org/tiles.png'},{clean:'/local/file.png'}])assert.throws(()=>normaliseConfig({floors:[{id:'test',style_images}]}));
});
test('furniture sprite images round trip without changing object dimensions',()=>{
  const item={id:'bed',type:'bed',x:30,y:40,width:1.5,depth:2,height:.6,style_images:{pokemon:'/local/bed.svg'}};
  const config=normaliseConfig({floors:[{id:'test',objects:[item]}]});
  assert.equal(config.floors[0].objects[0].width,1.5);assert.equal(config.floors[0].objects[0].style_images.pokemon,'/local/bed.svg');
  assert.deepEqual(normaliseConfig(JSON.parse(JSON.stringify(config))),config);
  assert.throws(()=>normaliseConfig({floors:[{id:'test',objects:[{...item,style_images:{zelda:'javascript:alert(1)'}}]}]}));
});

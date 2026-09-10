import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {kenneyFurniture} from '../src/kenney-furniture.js';
import {normaliseConfig} from '../src/lights.js';
test('Sims-like mode survives configuration export and import',()=>{
  const config=normaliseConfig({appearance:{mode:'sims'},floors:[]});assert.equal(normaliseConfig(JSON.parse(JSON.stringify(config))).appearance.mode,'sims');
});
test('licensed furniture fits its configured footprint without stretching or moving it',()=>{
  for(const type of ['chair','sofa','bed','dining_table','plant','toilet','sink','bath','bookshelf']){
    const item={type,width:1.5,depth:1.2,height:1},before=structuredClone(item),model=kenneyFurniture(item);assert.ok(model,type);
    const b=new THREE.Box3().setFromObject(model),s=b.getSize(new THREE.Vector3());assert.ok(s.x<=1.50001&&s.y<=1.00001&&s.z<=1.20001,type);assert.ok(Math.abs(b.min.y)<.0001);assert.deepEqual(item,before);
    model.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});
  }
  assert.equal(kenneyFurniture({type:'tv'}),null);assert.equal(kenneyFurniture({type:'sofa',variant:'corner'}),null);
});

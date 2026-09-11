import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3,Group} from 'three';
import {PRODUCT_PRESETS,applyProductPreset} from '../src/product-catalogue.js';
import {furniture3D} from '../src/furniture3d.js';
import {windowBlinds} from '../src/window-blinds3d.js';
import {placeOnSurface} from '../src/furniture-support.js';
import {lavaAppearance,lavaColours} from '../src/lava3d.js';
test('Mathmos models have luminous wax, metal bases and measured bounds on a surface',()=>{
  for(const p of PRODUCT_PRESETS.filter(p=>p.id.startsWith('mathmos-'))){const item=applyProductPreset({id:'lamp',x:50,y:50},p),m=furniture3D(item),size=new Box3().setFromObject(m).getSize(new Vector3());
    assert.ok(Math.abs(size.x-.14)<1e-6&&Math.abs(size.y-.43)<1e-6);assert.equal(m.children.filter(n=>n.userData.lightEmitter).length,7);
    placeOnSurface({objects:[{id:'bench',type:'tv_bench',x:50,y:50,width:1.4,depth:.43,height:.6}]},item);assert.equal(item.elevation_m,.6);assert.equal(item.support_id,'bench');}
});
test('lava presets preserve distinct liquid and wax colours and change the emitted light',()=>{
  const spill=new Set();for(let i=0;i<lavaColours.length;i++){
    const m=furniture3D({type:'lamp',product_id:'mathmos-vinyl',lava_colour:i}),liquid=m.children.find(n=>n.userData.lavaLiquid),wax=m.children.find(n=>n.userData.lava===0);
    assert.equal('#'+liquid.material.color.getHexString(),lavaColours[i][1]);assert.equal('#'+wax.material.color.getHexString(),lavaColours[i][2]);
    const appearance=lavaAppearance({lava_colour:i});spill.add(appearance.light.map(v=>Math.round(v)).join(','));
    for(let c=0;c<3;c++)assert.ok(appearance.light[c]>=Math.min(appearance.liquid[c],appearance.wax[c])-1e-6&&appearance.light[c]<=Math.max(appearance.liquid[c],appearance.wax[c])+1e-6);
  }assert.equal(spill.size,lavaColours.length);
});
test('window slats clear both sides of a casement divider throughout their travel',()=>{
  for(const side of [-1,1]){const room={points:[[0,side],[100,side],[100,side*50],[0,side*50]]},blind=windowBlinds(new Group(),{width:.91,height:1.2,sill:.9},4,{a:[0,0],b:[100,0],thickness:.19},{rooms:[room]});
    for(const closed of [true,false]){blind.setClosed(closed);blind.update(performance.now(),true);const bounds=new Box3().setFromObject(blind.hit);assert.ok(side>0?bounds.min.z>.0375:bounds.max.z<-.0375);}
  }
});
test('Hue Sync strip edges can display independent screen colours',()=>{
  const model=furniture3D({type:'tv_lightstrip',width:1.4,height:.8,depth:.04,sync_media_entity:'media_player.tv'});
  assert.equal(new Set(model.children.map(n=>n.material)).size,4);
  model.children[0].material.emissive.set('#ff0000');assert.equal(model.children[1].material.emissive.getHex(),0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGUE, TV_SIZES, tvDimensions } from '../src/catalogue.js';
import { furniture3D } from '../src/furniture3d.js';
import { normaliseScene } from '../src/scene.js';

test('TV presets use inch diagonals and consistent 16:9 screen and strip dimensions',()=>{
  for(const size of TV_SIZES){const dims=tvDimensions(size);assert.ok(Math.abs(Math.hypot(dims.width,dims.height)-size*.0254)<.0001);assert.ok(Math.abs(dims.width/dims.height-16/9)<.0002);}
  for(const type of ['tv','tv_lightstrip']){const item=CATALOGUE.find(i=>i.type===type);assert.equal(item.width,tvDimensions(65).width);assert.equal(item.height,tvDimensions(65).height);}
  assert.throws(()=>tvDimensions(62),/supported/);
});
test('normalisation keeps custom TV dimensions and validates panel effects and marker height',()=>{
  const config={floors:[{id:'example',entities:[{entity:'light.ceiling',x:50,y:50,height_m:2.35}],objects:[{id:'screen',type:'tv',x:50,y:50,width:1.22,height:.7,depth:.12}]}]};
  normaliseScene(config);assert.equal(config.floors[0].objects[0].width,1.22);assert.equal(config.floors[0].objects[0].height,.7);
  for(const panel_effect of ['static','breathe','wave','rainbow'])assert.doesNotThrow(()=>normaliseScene({floors:[{objects:[{id:'panels',type:'nanoleaf_panels',x:50,y:50,panel_effect}]}]}));
  assert.throws(()=>normaliseScene({floors:[{objects:[{id:'panels',type:'nanoleaf_panels',x:50,y:50,panel_effect:'unsupported'}]}]}),/panel light effect/);
  config.floors[0].entities[0].height_m=-1;assert.throws(()=>normaliseScene(config),/Light height/);
});
test('Nanoleaf panels have independent indexed materials for animation',()=>{
  const group=furniture3D({type:'nanoleaf_panels',width:1.8,height:.8,depth:.05,panel_layout:[[0,0],[1,0],[1,1]]});
  const meshes=group.children.filter(node=>node.isMesh);assert.equal(meshes.length,3);assert.equal(new Set(meshes.map(node=>node.material)).size,3);
  assert.deepEqual(meshes.map(node=>node.userData.panelIndex),[0,1,2]);assert.deepEqual(meshes.map(node=>node.material.userData.panelIndex),[0,1,2]);
  meshes.forEach(node=>{node.geometry.dispose();node.material.dispose();});
});
test('TV media binding is optional, validated and independent of reactive light through a scene round trip',()=>{
  const config={floors:[{id:'example',objects:[{id:'screen',type:'tv',x:40,y:50,media_entity:'media_player.living_tv',light_entity:'light.tv_strip',width:1.22,height:.7,depth:.12}]}]};
  const imported=normaliseScene(JSON.parse(JSON.stringify(normaliseScene(config))));
  const tv=imported.floors[0].objects[0];assert.equal(tv.media_entity,'media_player.living_tv');assert.equal(tv.light_entity,'light.tv_strip');assert.equal(tv.width,1.22);
  tv.media_entity='';assert.doesNotThrow(()=>normaliseScene(imported));assert.equal(tv.light_entity,'light.tv_strip');
  for(const value of ['light.tv','media_player.bad name','media_player.UPPER',null,12,{}]){tv.media_entity=value;assert.throws(()=>normaliseScene(imported),/media player/);}
  delete tv.media_entity;assert.doesNotThrow(()=>normaliseScene(imported));
});

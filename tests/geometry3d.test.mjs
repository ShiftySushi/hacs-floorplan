import test from 'node:test';
import assert from 'node:assert/strict';
import { wallSections, storeyPlacement, selectSceneLights, wallJoins, illuminationUV } from '../src/plan3d.js';
import { furniture3D } from '../src/furniture3d.js';
import { CATALOGUE, panelArrangement } from '../src/catalogue.js';
import { roomLightSources } from '../src/illumination.js';
import { normaliseScene } from '../src/scene.js';
import { blendAppearance, panelFrame } from '../src/light-animation.js';
import { tvIsOn, drawTVFrame } from '../src/tv-animation.js';

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
test('wall joins close shared corners without bridging endpoint openings',()=>{
  const walls=[{a:[0,0],b:[50,0],thickness:.2,height:2.4},{a:[50,0],b:[70,40],thickness:.2,height:2.4}];
  assert.deepEqual(wallJoins(walls,10,10),[{x:0,z:-5,radius:.1,height:2.4}]);
  walls[0].openings=[{type:'door',offset:.9,width:1,height:2.1}];
  assert.deepEqual(wallJoins(walls,10,10),[]);
});
test('long cabinet runs repeat standard doors rather than stretching handles',()=>{
  const small=furniture3D({type:'kitchen_unit',width:.6,depth:.6,height:.9}),long=furniture3D({type:'kitchen_unit',width:3,depth:.6,height:.9});
  const handles=group=>group.children.filter(mesh=>mesh.geometry.parameters.height===.02);
  assert.equal(handles(small).length,1);assert.equal(handles(long).length,5);
  assert.ok(handles(long).every(mesh=>mesh.geometry.parameters.width===.16));
  for(const group of [small,long])group.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
});
test('room illumination UVs preserve physical floor coordinates without tiling',()=>{
  assert.deepEqual(illuminationUV(-5,10,10,20),[0,1]);
  assert.deepEqual(illuminationUV(5,-10,10,20),[1,0]);
  assert.deepEqual(illuminationUV(-2.5,5,10,20),[.25,.75]);
});
test('radiators retain shallow depth and add fins as their width grows',()=>{
  const definition=CATALOGUE.find(item=>item.type==='radiator');assert.equal(definition.depth,.12);assert.equal(definition.height,.6);
  const narrow=furniture3D(definition),wide=furniture3D({...definition,width:2});
  assert.ok(wide.children.length>narrow.children.length);
  const fins=wide.children.filter(mesh=>mesh.geometry.parameters.depth===.12);
  assert.ok(fins.length>30);assert.ok(fins.every(mesh=>mesh.geometry.parameters.width<.05));
  for(const group of [narrow,wide])group.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
});
test('hexagon layouts use one scale and preserve axial neighbours',()=>{
  const {radius,centres}=panelArrangement({panel_layout:[[0,0],[1,0]]},2,.8);
  assert.ok(Math.abs(centres[1][0]-centres[0][0]-Math.sqrt(3)*radius)<1e-9);
  assert.equal(centres[0][1],centres[1][1]);
  assert.equal(panelArrangement({},2,1).centres.length,21);
});
test('bound TV strip uses object position and a local light radius',()=>{
  const floor={objects:[{type:'tv_lightstrip',light_entity:'light.tv',x:20,y:30}]},room={lights:['light.tv'],points:[[0,0],[100,0],[100,100],[0,100]]};
  const [source]=roomLightSources(floor,room);assert.equal(source.x,20);assert.equal(source.y,30);assert.equal(source.radius,1.3);
});
test('plain desk and cube storage respect explicit colour and omit built-in contents',()=>{
  for(const [type,variant] of [['desk','plain'],['bookshelf','cubes']]){const definition=CATALOGUE.find(item=>item.type===type),normal=furniture3D(definition),plain=furniture3D({...definition,variant,colour:'#303738'});assert.ok(plain.children.length<normal.children.length);assert.equal(plain.children[0].material.color.getHexString(),'303738');for(const group of [normal,plain])group.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});}
});
test('scene validates raised reactive objects and panel arrangements',()=>{
  const config={floors:[{objects:[{id:'panel',type:'nanoleaf_panels',x:50,y:50,elevation_m:1.2,light_entity:'light.panels',panel_layout:[[0,0],[1,0]]}]}]};
  assert.equal(normaliseScene(config).floors[0].objects[0].elevation_m,1.2);
  const invalid=structuredClone(config);invalid.floors[0].objects[0].panel_layout=[[0,0],[0,0]];assert.throws(()=>normaliseScene(invalid),/unique integer/);
  invalid.floors[0].objects[0].panel_layout=[[0,0]];invalid.floors[0].objects[0].elevation_m=-1;assert.throws(()=>normaliseScene(invalid),/elevation/);
});
test('light transitions fade smoothly without whitening a coloured light',()=>{
  const red={level:1,colour:[255,0,0]},off={level:0,colour:[255,255,255]};
  assert.deepEqual(blendAppearance(red,off,.5),{level:.5,colour:[255,0,0]});
  assert.equal(blendAppearance(red,off,1).level,0);
  assert.deepEqual(blendAppearance(off,red,.5),{level:.5,colour:[255,0,0]});
});
test('panel effects vary across panels while preserving power and static colour',()=>{
  const base={level:.6,colour:[20,180,230]};assert.deepEqual(panelFrame('static',3,21,1000,base),base);
  assert.notEqual(panelFrame('wave',0,21,1000,base).level,panelFrame('wave',10,21,1000,base).level);
  assert.equal(panelFrame('rainbow',5,21,1000,{...base,level:0}).level,0);
});
test('TV screen follows media activity rather than lighting or standby',()=>{
  for(const state of ['on','playing','paused','idle','buffering'])assert.equal(tvIsOn({state}),true);
  for(const state of ['off','standby','unknown','unavailable'])assert.equal(tvIsOn({state}),false);
  assert.equal(tvIsOn(undefined),false);
  const model=furniture3D(CATALOGUE.find(item=>item.type==='tv'));assert.equal(model.children.filter(mesh=>mesh.userData.tvScreen).length,1);model.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
});
test('local TV programmes change every eight seconds and animate between changes',()=>{
  const capture=time=>{const calls=[],context={};for(const method of ['save','scale','fillRect','beginPath','arc','fill','moveTo','lineTo','closePath','restore'])context[method]=(...args)=>{assert.ok(args.every(Number.isFinite));calls.push([method,context.fillStyle,...args]);};drawTVFrame(context,160,90,time);assert.equal(calls.at(-1)[0],'restore');return calls;};
  assert.notDeepEqual(capture(0),capture(1000));assert.notDeepEqual(capture(0),capture(8000));assert.notDeepEqual(capture(8000),capture(16000));
});

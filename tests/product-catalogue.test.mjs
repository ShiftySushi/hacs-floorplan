import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {PRODUCT_PRESETS,applyProductPreset} from '../src/product-catalogue.js';
import {furniture3D} from '../src/furniture3d.js';
import {normaliseScene} from '../src/scene.js';
import {kenneyFurniture} from '../src/kenney-furniture.js';

test('Edifier pair has separate drivers and active-only rear controls',()=>{
  for(const side of ['left','right']){
    const preset=PRODUCT_PRESETS.find(p=>p.id===`edifier-s1000db-${side}`),model=furniture3D(applyProductPreset({},preset)),parts=[];
    assert.deepEqual([preset.width,preset.depth,preset.height],[.2032,.2667,.3429]);
    model.traverse(n=>{if(n.userData.speakerPart)parts.push(n.userData.speakerPart);});
    for(const part of ['woofer','tweeter','port'])assert.equal(parts.filter(p=>p===part).length,1);
    assert.equal(parts.filter(p=>p==='control').length,side==='right'?3:0);
    model.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});
  }
});

test('Aeron has curved mesh, lumbar pads and ten castor wheels',()=>{
  const model=furniture3D(applyProductPreset({},PRODUCT_PRESETS.find(p=>p.id==='aeron-b')));
  for(const [part,count] of [['mesh-seat',1],['mesh-back',1],['lumbar-pad',2],['castor',10],['arm-pad',2]])assert.equal(model.children.filter(n=>n.userData.aeronPart===part).length,count);
  const back=model.children.find(n=>n.userData.aeronPart==='mesh-back');assert.ok(back.material.alphaMap);assert.ok(new Set(Array.from(back.geometry.attributes.position.array).filter((_,i)=>i%3===2)).size>20);
  model.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});
});

test('MALM chests have handleless drawer counts and a separate white glass top',()=>{
  for(const [id,drawers,glass] of [['malm-2',2,0],['malm-6-glass',6,1]]){
    const model=furniture3D(applyProductPreset({},PRODUCT_PRESETS.find(p=>p.id===id)));
    assert.equal(model.children.filter(n=>n.userData.storagePart==='drawer').length,drawers);
    const tops=model.children.filter(n=>n.userData.storagePart==='glass-top');assert.equal(tops.length,glass);
    if(glass){assert.equal(tops[0].material.color.getHexString(),'f4f5f2');assert.ok(tops[0].material.roughness<.1);}
    model.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});
  }
});

test('Dreams bed headboards have distinct padding without scaling up the mattress',()=>{
  for(const [id,width,depth,count] of [['dreams-sutton-king',1.54,2.14,3],['dreams-ealing-double',1.38,2.04,6]]){
    const preset=PRODUCT_PRESETS.find(p=>p.id===id);
    assert.deepEqual([preset.width,preset.depth,preset.height],[width,depth,1.16]);
    const model=furniture3D(applyProductPreset({},preset));
    assert.equal(model.children.filter(n=>n.userData.bedPart==='padding').length,count);
    const mattress=new Box3().setFromObject(model.children.find(n=>n.userData.bedPart==='mattress'));
    assert.ok(mattress.max.y<.65&&mattress.min.y>.3);
    model.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});
  }
});

test('dining finishes and integrated cabinetry survive export and reach the 3D models',()=>{
  const objects=[
    {id:'table',type:'dining_table',width:1,depth:2,height:.75,colour:'#929497',leg_colour:'#202122',surface_finish:'speckled'},
    {id:'chair',type:'chair',width:.5,depth:.5,height:.85,colour:'#85888b',leg_colour:'#202122'},
    {id:'fridge',type:'fridge',width:.6,depth:.6,height:1.8,colour:'#eee9d8',variant:'integrated'},
    {id:'upper',type:'kitchen_unit',width:1,depth:.3,height:.7,elevation_m:1.5,variant:'wall',colour:'#eee9d8',handle_colour:'#c0c4c5'},
  ].map(o=>({...o,x:50,y:50}));
  const scene=normaliseScene({floors:[{id:'fictional',objects}]});
  assert.deepEqual(normaliseScene(JSON.parse(JSON.stringify(scene))).floors[0].objects,objects);
  for(const item of objects){
    assert.equal(kenneyFurniture(item),null);
    const model=furniture3D(item);
    assert.equal(model.children[0].material.color.getHexString(),(item.leg_colour || item.colour).slice(1));
    if(item.type==='dining_table')assert.ok(model.children.find(n=>n.userData.surfaceFinish==='speckled').material.map.isDataTexture);
    if(item.variant==='wall')assert.ok(new Box3().setFromObject(model).max.y<=item.height+1e-6);
    model.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
  }
});

test('independent cabinet, worktop and handle finishes render and survive export/import',()=>{
  const item={id:'test-kitchen',type:'kitchen_unit',x:50,y:50,width:2,depth:.6,height:.9,colour:'#eee9d8',worktop_colour:'#444544',handle_colour:'#c0c4c5'};
  const scene=normaliseScene({floors:[{id:'fictional',width_m:8,depth_m:12,objects:[item]}]});
  const restored=normaliseScene(JSON.parse(JSON.stringify(scene))).floors[0].objects[0];
  assert.deepEqual(restored,item);
  const model=furniture3D(restored),colours=model.children.map(mesh=>mesh.material.color.getHexString());
  for(const colour of ['eee9d8','444544','c0c4c5'])assert.ok(colours.includes(colour));
  assert.equal(model.children[1].material.color.getHexString(),'444544');
  for(const key of ['worktop_colour','handle_colour'])assert.throws(()=>normaliseScene({floors:[{id:'fictional',objects:[{...item,[key]:'invalid'}]}]}),/finish colour/);
  model.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
});

test('measured products fill their specified 3D bounds before and after rotation',()=>{
  for(const preset of PRODUCT_PRESETS)for(const rotation of [0,90]){
    const item=applyProductPreset({id:preset.id,x:25,y:70,rotation},preset),model=furniture3D(item);
    const bounds=new Box3().setFromObject(model),size=bounds.getSize(new Vector3()),centre=bounds.getCenter(new Vector3());
    const expected=rotation?[item.depth,item.height,item.width]:[item.width,item.height,item.depth];
    size.toArray().forEach((value,i)=>assert.ok(Math.abs(value-expected[i])<1e-6,`${preset.id}: axis ${i}`));
    assert.ok(Math.abs(centre.x)<1e-6&&Math.abs(centre.z)<1e-6&&Math.abs(bounds.min.y)<1e-6,preset.id);
    model.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
  }
});
test('product calibration, finishes and custom dimensions survive a portable scene round trip',()=>{
  const objects=PRODUCT_PRESETS.map(p=>({...applyProductPreset({id:p.id,x:23.4,y:61.2,rotation:90,elevation_m:.6},p),colour:p.colours.at(-1)[1],width:p.width+.015}));
  const scene=normaliseScene({floors:[{id:'fictional',width_m:8,depth_m:12,objects}]});
  assert.deepEqual(normaliseScene(JSON.parse(JSON.stringify(scene))),scene);
  assert.deepEqual(scene.floors[0].objects,objects);
  assert.equal(new Set(PRODUCT_PRESETS.map(p=>p.id)).size,PRODUCT_PRESETS.length);
  for(const p of PRODUCT_PRESETS){assert.match(p.source,/^https:\/\//);assert.ok(p.colours.length);}
});

test('cabinet fronts retain the product drawer and door arrangements',()=>{
  for(const [id,drawers,doors,glass] of [['lyla-display',3,0,1],['lyla-tv-bench',0,2,0],['dunelm-fulton-extra-wide-pine',2,2,0]]){
    const p=PRODUCT_PRESETS.find(p=>p.id===id),model=furniture3D(applyProductPreset({},p));
    const count=part=>model.children.filter(n=>n.userData.storagePart===part).length;
    assert.equal(count('drawer'),drawers,id);assert.equal(count('door'),doors,id);assert.equal(count('glass'),glass,id);
    if(id==='lyla-display'){
      const glassBottom=new Box3().setFromObject(model.children.find(n=>n.userData.storagePart==='glass')).min.y;
      for(const drawer of model.children.filter(n=>n.userData.storagePart==='drawer'))assert.ok(new Box3().setFromObject(drawer).max.y<glassBottom);
    }
  }
});

test('Noah wood has rounded front corners and small round knobs',()=>{
  for(const [id,knobs] of [['lyla-display',4],['lyla-tv-bench',2],['lyla-sideboard',5],['lyla-bookcase',0]]){
    const preset=PRODUCT_PRESETS.find(p=>p.id===id),model=furniture3D(applyProductPreset({},preset));
    const handles=model.children.filter(n=>n.geometry.type==='SphereGeometry');
    assert.equal(handles.length,knobs,id);
    handles.forEach(n=>assert.equal(n.geometry.parameters.radius,.012));
    const wood=model.children.find(n=>n.geometry.type==='BoxGeometry'&&n.geometry.parameters.widthSegments===16);
    assert.ok(wood,id);
    const {width,depth}=wood.geometry.parameters,p=wood.geometry.attributes.position;
    assert.ok(!Array.from({length:p.count},(_,i)=>i).some(i=>Math.abs(p.getX(i)-width/2)<1e-6&&Math.abs(p.getZ(i)-depth/2)<1e-6),id);
    model.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});
  }
});

test('sheathed iaito has curved saya, cream same, black ito and sageo',()=>{
  const model=furniture3D({type:'side_table',variant:'sword',width:1,depth:.16,height:.2,colour:'#171717'});
  const parts=name=>{const found=[];model.traverse(n=>{if(n.userData.swordPart===name)found.push(n);});return found;},saya=parts('saya');
  assert.equal(saya.length,1);
  const vertices=saya[0].geometry.attributes.position;
  // The tip drops away from the horizontal hilt tangent: convex edge up.
  const heelY=vertices.getY(vertices.count-2),tipY=vertices.getY(vertices.count-1);
  assert.ok(heelY-tipY>.06&&heelY-tipY<.075);
  assert.ok(Math.abs(vertices.getX(vertices.count-1)-vertices.getX(vertices.count-2)-.759)<1e-6);
  const middleY=(vertices.getY(48*20)+vertices.getY(48*20+10))/2;
  assert.ok(middleY>(heelY+tipY)/2+.015);
  assert.ok(parts('tsuba').length>7);assert.equal(parts('kashira').length,1);
  assert.equal(parts('same')[0].material.color.getHexString(),'e7d9b4');
  for(const name of ['saya','ito','sageo']){assert.ok(parts(name).length);parts(name).forEach(n=>assert.equal(n.material.color.getHexString(),'171717'));}
  const bounds=new Box3().setFromObject(model).getSize(new Vector3());assert.ok(bounds.x<1.01&&bounds.y<=.2&&bounds.z<.161);
  model.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});
});

test('framed artwork keeps measured bounds and portable mounting height',()=>{
  const item={id:'art',type:'picture',name:'Framed display',width:.734,depth:.0355,height:.4724,elevation_m:1.3138,x:50,y:50,rotation:90,colour:'#c4a27a'};
  const scene=normaliseScene({floors:[{id:'gallery',objects:[item]}]});
  assert.deepEqual(normaliseScene(JSON.parse(JSON.stringify(scene))).floors[0].objects[0],item);
  const model=furniture3D(item),size=new Box3().setFromObject(model).getSize(new Vector3());
  size.toArray().forEach((value,i)=>assert.ok(Math.abs(value-[item.depth,item.height,item.width][i])<1e-6));
  assert.equal(model.children[0].material.color.getHexString(),'c4a27a');
  model.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
});

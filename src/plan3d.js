import {artwork3D} from './artwork3d.js';
import { windowBlinds } from './window-blinds3d.js';
import {wallOcclusion} from './wall-occlusion3d.js';
import * as THREE from 'three';
import { furniture3D } from './furniture3d.js';
import { kenneyFurniture } from './kenney-furniture.js';
import { renderPlan } from './plan.js';
import { element, button } from './dom.js';
import { floorDimensions } from './scene.js';
import { roomLightSources, lightAppearance } from './illumination.js';
import { heatingState } from './heating.js';
import { blendAppearance, panelFrame } from './light-animation.js';
import { daylightLevel } from './daylight.js';
import { tvIsOn, drawTVFrame, tvSlideshow, tvSceneIndex } from './tv-animation.js';
import { createSimsStyle } from './sims-style.js';

/** Split a wall into solid rectangles; openings are real holes, not painted doors. */
export function wallSections(length, height, openings = []) {
  const holes = openings.map(o => ({x0: Math.max(0, length*(o.offset ?? .5)-(o.width || .9)/2), x1: Math.min(length,length*(o.offset ?? .5)+(o.width || .9)/2), y0: Math.max(0,o.type==='window'?(o.sill ?? .9):0), y1: Math.min(height,(o.type==='window'?(o.sill ?? .9):0)+(o.height || (o.type==='window'?1.2:2.1)))})).filter(o=>o.x1>o.x0&&o.y1>o.y0);
  const xs=[...new Set([0,length,...holes.flatMap(o=>[o.x0,o.x1])])].sort((a,b)=>a-b);
  const ys=[...new Set([0,height,...holes.flatMap(o=>[o.y0,o.y1])])].sort((a,b)=>a-b), result=[];
  for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++){const x=(xs[i-1]+xs[i])/2,y=(ys[j-1]+ys[j])/2;if(!holes.some(o=>x>o.x0&&x<o.x1&&y>o.y0&&y<o.y1))result.push({x,y,width:xs[i]-xs[i-1],height:ys[j]-ys[j-1]});}
  return result;
}

export function storeyPlacement(floor,index,exploded=true) {
  return {x:floor.offset_x_m ?? 0,z:floor.offset_z_m ?? 0,y:(floor.elevation_m ?? index*3)+(exploded?index*3:0)};
}

/** Small shared endpoint caps close angled wall joins without extending any opening. */
export function wallJoins(walls,width,depth) {
  const nodes=[];
  for(const wall of walls){const length=Math.hypot((wall.b[0]-wall.a[0])*width/100,(wall.b[1]-wall.a[1])*depth/100);
    for(const [point,end] of [[wall.a,0],[wall.b,length]]){
      const x=(point[0]/100-.5)*width,z=(point[1]/100-.5)*depth;
      let node=nodes.find(n=>Math.hypot(n.x-x,n.z-z)<.025);if(!node){node={x,z,walls:[],blocked:false};nodes.push(node);}
      node.walls.push(wall);node.blocked ||= (wall.openings || []).some(o=>Math.abs((o.offset ?? .5)*length-end)<=(o.width || .9)/2+.001);
    }
  }
  return nodes.filter(n=>n.walls.length>1&&!n.blocked).map(n=>({x:n.x,z:n.z,radius:Math.max(...n.walls.map(w=>w.thickness || .15))/2,height:Math.min(...n.walls.map(w=>w.height || 2.4))}));
}

export function selectSceneLights(floors,selectedId,quality='auto') {
  const limit=quality==='low'?16:quality==='high'?64:48,lights=[],seen=new Set();
  for(const floor of [...floors].sort((a,b)=>Number(b.id===selectedId)-Number(a.id===selectedId))) {
    const markers=(floor.entities || []).filter(e=>e.entity.startsWith('light.'));
    const objects=(floor.objects || []).filter(o=>o.light_entity),ids=new Set([...markers.map(e=>e.entity),...objects.map(o=>o.light_entity),...(floor.rooms || []).flatMap(r=>r.lights || [])]);
    for(const id of ids){if(seen.has(id))continue;seen.add(id);const anchor=markers.find(e=>e.entity===id)||objects.find(o=>o.light_entity===id),room=(floor.rooms || []).find(r=>r.lights?.includes(id)),points=room?.points || [];
      const point=anchor?[anchor.x,anchor.y]:points.length?points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]):[50,50];
      if(lights.length<limit)lights.push({floorId:floor.id,id,point});
    }
  }
  return lights;
}

export function illuminationUV(x,y,width,depth) {return [x/width+.5,y/depth+.5];}

export function render3D(floor, states, options = {}) {
  const plan=element('div',{className:'plan plan-3d'});plan.style.cssText='position:relative;aspect-ratio:1.15;min-height:320px;overflow:hidden;background:var(--fp-stage-background,transparent);isolation:isolate';
  let renderer;
  try { renderer=new THREE.WebGLRenderer({antialias:options.quality!=='low',alpha:true,powerPreference:'low-power'}); }
  catch {const fallback=renderPlan(floor,states,{...options,mode:'clean'});fallback.prepend(element('p',{className:'hint',text:'3D is unavailable on this device. Showing the 2D floorplan.'}));fallback.update ||= ()=>{};fallback.dispose ||= ()=>{};return fallback;}
  const scene=new THREE.Scene(), world=new THREE.Group();scene.add(world);
  const sims=options.mode==='sims'?createSimsStyle():null,home=sims?{azimuth:Math.PI/4,elevation:.615,zoom:1.25}:{azimuth:.4,elevation:1,zoom:1.35};
  const floors=options.building&&options.allFloors?.length?options.allFloors:[floor];
  if(floors.length>1)home.zoom=.95;
  const gpuLights=selectSceneLights(floors,floor.id,options.quality);
  const assignedIds=[...new Set(floors.flatMap(f=>[...(f.entities || []).filter(e=>e.entity.startsWith('light.')).map(e=>e.entity),...(f.objects || []).map(o=>o.light_entity).filter(Boolean),...(f.rooms || []).flatMap(r=>r.lights || [])]))];
  const sourceFor=(f,id)=>roomLightSources(f,(f.rooms || []).find(r=>r.lights?.includes(id)) || {lights:[id],points:[[0,0],[100,0],[100,100],[0,100]]}).find(source=>source.id===id);
  const placements=floors.map((f,i)=>floors.length>1?storeyPlacement(f,i):{x:0,y:0,z:0});
  const centreY=(Math.min(...placements.map(p=>p.y))+Math.max(...placements.map(p=>p.y)))/2;
  const {width,depth}=floorDimensions(floor), span=Math.max(...floors.map((f,i)=>{const d=floorDimensions(f);return Math.max(d.width+Math.abs(placements[i].x)*2,d.depth+Math.abs(placements[i].z)*2);}),centreY*2+4);
  const markerSpaces=new Map(),artworks=[];
  const camera=new THREE.OrthographicCamera(-span,span,span,-span,.1,span*10);
  let {azimuth,elevation,zoom}={...home,...options.viewState};let frame=0,disposed=false,visible=true,markers=[],pointer,fallback;
  const transitions=new Map(),reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;let lastPaint=0,lastInteraction=performance.now(),lastOrbit=performance.now(),idleOffset=0;
  let hovering=false,returnOrbit=null;
  plan.pauseIdle=()=>{
    lastInteraction=performance.now();
    if(idleOffset&&!returnOrbit){
      // Return by the shortest arc without changing the saved manual camera.
      idleOffset=Math.atan2(Math.sin(idleOffset),Math.cos(idleOffset));
      returnOrbit={from:idleOffset,start:lastInteraction};schedule();
    }
  };
  const manualOrbit=()=>{azimuth+=idleOffset;idleOffset=0;returnOrbit=null;lastInteraction=performance.now();};
  plan.addEventListener('pointerenter',e=>{if(e.pointerType==='touch')return;hovering=true;plan.pauseIdle();});
  plan.addEventListener('pointerleave',()=>{hovering=false;lastInteraction=performance.now();schedule();});
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1,options.quality==='high'?2:1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.domElement.style.cssText='width:100%;height:100%;display:block;touch-action:none';renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','3D floorplan. Arrow keys orbit; plus and minus zoom; Home resets.');
  plan.append(renderer.domElement);
  const ambient=new THREE.HemisphereLight('#fff6e8','#6f8291',2);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff3de',2.2);sun.position.set(-span,span*2,span);sun.castShadow=options.quality!=='low';sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,far:span*5});sun.shadow.normalBias=.04;scene.add(sun);
  const skirtings=[],blinds=[],roomMeshes=[],lightMeshes=[],wallMeshes=[],storeyLabels=[],radiators=[],reactiveObjects=[],fixtures=[],televisions=[];
  const boards=document.createElement('canvas');boards.width=128;boards.height=128;
  const ink=boards.getContext('2d');ink.fillStyle='#d4c3a8';ink.fillRect(0,0,128,128);
  for(let row=0;row<8;row++){ink.fillStyle=row%2?'#cbb898':'#d4c3a8';ink.fillRect(0,row*16,128,16);ink.fillStyle='#b5a081';ink.fillRect(0,row*16,128,1);ink.fillRect(row%2?64:0,row*16,1,16);}
  const woodTexture=new THREE.CanvasTexture(boards);woodTexture.wrapS=woodTexture.wrapT=THREE.RepeatWrapping;woodTexture.colorSpace=THREE.SRGBColorSpace;woodTexture.repeat.set(.65,.65);
  function surfaceTexture(type) {
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const context=canvas.getContext('2d');
    context.fillStyle=type==='tile'?'#f2f1eb':'#d8d3ca';context.fillRect(0,0,128,128);
    if(type==='tile'){context.fillStyle='#b9b9b2';context.fillRect(0,0,128,3);context.fillRect(0,0,3,128);}
    else for(let i=0;i<2048;i++){const x=(i*47)%128,y=(i*31+Math.floor(i/128)*17)%128;context.fillStyle=i%2?'#c3beb6':'#e8e3da';context.fillRect(x,y,1,2);}
    const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.repeat.set(type==='tile'?2:1,type==='tile'?2:1);return texture;
  }
  const textures={wood:woodTexture,tile:surfaceTexture('tile'),carpet:surfaceTexture('carpet')};
  const heatCanvas=document.createElement('canvas');heatCanvas.width=heatCanvas.height=64;const heatInk=heatCanvas.getContext('2d'),heatGradient=heatInk.createRadialGradient(32,32,0,32,32,32);heatGradient.addColorStop(0,'rgba(255,64,30,.7)');heatGradient.addColorStop(.45,'rgba(255,50,20,.25)');heatGradient.addColorStop(1,'rgba(255,40,10,0)');heatInk.fillStyle=heatGradient;heatInk.fillRect(0,0,64,64);textures.heat=new THREE.CanvasTexture(heatCanvas);textures.heat.colorSpace=THREE.SRGBColorSpace;
  function material(colour) {return new THREE.MeshStandardMaterial({color:colour,roughness:.88});}
  function box(w,h,d,x,y,z,colour,parent=world) {const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(colour));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function buildStorey(floor,index) {
  const root=world,storey=new THREE.Group();root.add(storey);
  const {width,depth}=floorDimensions(floor),placement=placements[index];
  storey.position.set(placement.x,placement.y,placement.z);storey.rotation.y=-(floor.rotation || 0)*Math.PI/180;
  const localWorld=storey;
  if(sims&&index===0)sims.lawn(localWorld,width,depth);
  const position=(p,y=0)=>new THREE.Vector3((p[0]/100-.5)*width,y,(p[1]/100-.5)*depth);
  markerSpaces.set(floor.id,{floor,position,group:storey});
  if(floors.length>1){const node=element('span',{text:floor.name || floor.id});node.style.cssText='position:absolute;pointer-events:none;padding:4px 8px;border-radius:8px;background:#ffffffdc;color:#263b48;font-size:12px;font-weight:700;transform:translate(-50%,-50%);z-index:2';plan.append(node);storeyLabels.push({node,point:position([50,100],.1),group:storey});}
  // Each room uses its actual outline, including non-rectangular rooms.
  for(const room of floor.rooms || []) {
    if(!room.points?.length)continue;
    const shape=new THREE.Shape(room.points.map(p=>new THREE.Vector2((p[0]/100-.5)*width,-(p[1]/100-.5)*depth)));
    const surface=room.material || 'wood',colour=room.colour || ({wood:'#cbb89a',tile:'#c8d2d1',carpet:'#c4ada2'}[surface] || '#cbb89a');
    const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.1,bevelEnabled:false}),material(colour));mesh.rotation.x=-Math.PI/2;mesh.position.y=-.09;mesh.receiveShadow=true;localWorld.add(mesh);
    mesh.material.map=textures[surface] || woodTexture;mesh.material.roughness=surface==='tile'?.45:surface==='carpet'?1:.88;
    mesh.material.userData.room=room;
    // Fine board seams add scale without downloading textures.
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:'#9c8d79'}));mesh.add(edges);
    const centre=room.points.reduce((a,p)=>[a[0]+p[0]/room.points.length,a[1]+p[1]/room.points.length],[0,0]);
    const presence=sims?.presence(localWorld,position(centre,Math.max(2.4,...(floor.walls || []).map(w=>w.height || 2.4))+.35));
    roomMeshes.push({room,mesh,edges,presence,base:new THREE.Color(colour)});
  }
    for(const marker of (floor.entities || []).filter(e=>e.entity.startsWith('light.'))){
      if((floor.objects || []).some(o=>o.light_entity===marker.entity))continue;
      const source=sourceFor(floor,marker.entity),height=source?.height ?? (marker.fixture==='pendant'?2.1:2.4),spot=marker.fixture!=='pendant';
      const fitting=new THREE.Group();fitting.position.copy(position([marker.x,marker.y],height));localWorld.add(fitting);
      const shade=new THREE.Mesh(new THREE.CylinderGeometry(spot?.09:.1,spot?.09:.16,spot?.055:.16,16),material('#e8e6de'));shade.position.y=spot?0:.07;fitting.add(shade);
      if(!spot){const ceiling=Math.max(2.4,...(floor.walls || []).map(w=>w.height || 2.4)),length=Math.max(.03,ceiling-height-.15);const cord=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,length,6),material('#485052'));cord.position.y=length/2+.15;fitting.add(cord);}
      const lens=new THREE.Mesh(new THREE.CircleGeometry(spot?.075:.14,16),material('#ddd8c8'));lens.material.side=THREE.DoubleSide;lens.rotation.x=Math.PI/2;lens.position.y=-.03;fitting.add(lens);fixtures.push({id:marker.entity,lens,shade});
    }
    for(const {id,point} of gpuLights.filter(light=>light.floorId===floor.id)) {
      const source=sourceFor(floor,id),radius=source?.radius || 2,height=Math.max(.02,source?.height ?? 2.1);
      const accent=(floor.objects || []).some(o=>o.light_entity===id),glow=accent?new THREE.PointLight('#ffe5b0',0,radius*2,2):new THREE.SpotLight('#ffe5b0',0,height+radius*2,Math.atan(radius/height),.75,2);glow.position.copy(position(point,height));if(glow.target)glow.target.position.copy(position(point,.01));
      glow.castShadow=lightMeshes.length<(options.quality==='high'?6:options.quality==='low'?0:3);const shadowSize=options.quality==='high'?512:256;glow.shadow.mapSize.set(shadowSize,shadowSize);glow.shadow.normalBias=.005;glow.shadow.camera.near=.02;
      localWorld.add(glow);if(glow.target)localWorld.add(glow.target);lightMeshes.push({id,glow,accent});
    }
  if(!floor.rooms?.length)box(width,.1,depth,0,-.05,0,'#cbb89a',localWorld);
  for(const wall of floor.walls || []) {
    if(!wall.a || !wall.b)continue;const a=position(wall.a),b=position(wall.b),length=a.distanceTo(b);if(length<.01)continue;
    const group=new THREE.Group();group.position.copy(a);group.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x);localWorld.add(group);
    const height=wall.height || 2.4;
    for(const r of wallSections(length,height,wall.openings)) {const mesh=box(r.width,r.height,wall.thickness || .15,r.x,r.y,0,sims?.wallColour || '#ece8dc',group);wallMeshes.push(mesh);}
    for(const opening of wall.openings || [])if(opening.type==='window')blinds.push(windowBlinds(group,opening,length,wall,floor));
    // Low skirting defines the floor perimeter even when tall walls are cut away.
    for(const r of wallSections(length,.09,(wall.openings || []).filter(o=>o.type==='door')))skirtings.push(box(r.width,r.height,(wall.thickness || .15)+.025,r.x,r.y,0,'#fdfbf2',group));
  }
  for(const join of wallJoins(floor.walls || [],width,depth)){
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(join.radius,join.radius,join.height,16),material(sims?.wallColour || '#ece8dc'));mesh.position.set(join.x,join.height/2,join.z);mesh.castShadow=true;mesh.receiveShadow=true;localWorld.add(mesh);wallMeshes.push(mesh);
  }
  for(const object of floor.objects || []) {const model=(sims?kenneyFurniture(object):null) || furniture3D(object);model.position.copy(position([object.x,object.y],.025+(object.elevation_m || 0)));localWorld.add(model);
    sims?.furniture(model);
    if(object.type==='picture')artworks.push(artwork3D(object,model,options.viewState ||= {},`${floor.id}:${object.id}`,schedule));
    if(object.type==='tv'&&object.media_entity){const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const context=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const screens=[];model.traverse(node=>{if(node.userData.tvScreen){node.material.map=texture;node.material.emissiveMap=texture;node.material.color.set('#ffffff');node.material.emissive.set('#ffffff');screens.push(node);}});const tv={object,canvas,context,texture,screens,lastFrame:-1,started:performance.now()};tv.slides=tvSlideshow(object.tv_scenes,()=>{tv.lastFrame=-1;schedule();});if(tv.slides.count)tv.timer=setInterval(schedule,300000);televisions.push(tv);
    }
    if(object.light_entity)reactiveObjects.push({object,model});
    if(object.type==='radiator'){
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:textures.heat,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.position.set(0,(object.height || .6)/2,0);glow.scale.set((object.width || 1)*1.5,(object.height || .6)*2,1);model.add(glow);radiators.push({object,model,glow});
    }
  }
  }
  floors.forEach(buildStorey);
  for(const space of markerSpaces.values()){
    const relevant=blinds.filter(b=>b.floor===space.floor),rooms=space.floor.rooms || [];
    space.group.updateMatrixWorld(true);
    space.group.traverse(node=>{if(!node.material?.isMeshStandardMaterial)return;
      const p=space.group.worldToLocal(node.getWorldPosition(new THREE.Vector3())),d=floorDimensions(space.floor),x=(p.x/d.width+.5)*100,y=(p.z/d.depth+.5)*100;
      const room=node.material.userData.room || rooms.find(r=>inside(x*.998+.1,y*.998+.1,r.points));node.material.userData.blinds=relevant.filter(b=>b.room===room);
    });
  }
  function inside(x,y,points=[]){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
  const disposeWallOcclusion=wallOcclusion(scene,wallMeshes,camera,ambient);
  const toolbar=element('div',{className:'three-toolbar'});toolbar.style.cssText='position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:5px;padding:5px;border-radius:14px;background:var(--card-background-color,#fff);box-shadow:0 2px 12px #0002;z-index:5';
  function control(text,label,action) {return button(text,()=>{manualOrbit();action();},{'aria-label':label,title:label});}
  let cutaway=options.viewState?.cutaway ?? true,hideWalls=!!options.viewState?.hideWalls;
  let lastWallFrame=0;
  toolbar.append(control('↶','Orbit left',()=>{azimuth-=.25;schedule();}),control('↷','Orbit right',()=>{azimuth+=.25;schedule();}),control('−','Zoom out',()=>{zoom=Math.max(.5,zoom/1.2);schedule();}),control('+','Zoom in',()=>{zoom=Math.min(3,zoom*1.2);schedule();}),control('⌂','Reset 3D view',()=>{({azimuth,elevation,zoom}=home);schedule();}),control('▱','Toggle cutaway walls',()=>{cutaway=!cutaway;schedule();}));const hideWallButton=control('Hide all walls','Hide all walls',()=>{hideWalls=!hideWalls;schedule();});toolbar.append(hideWallButton);for(const art of artworks)toolbar.append(control('▣','Rotate artwork',()=>art.toggle()));plan.append(toolbar);
  // Rotation is disabled by default and explicitly opted into via Display settings.
  // Honour that choice even when decorative animations are reduced by the OS.
  function draw(){frame=0;const orbitTime=performance.now(),idleEnabled=options.idleRotation===true;
    if(returnOrbit){
      const progress=Math.min(1,(orbitTime-returnOrbit.start)/900),ease=progress*progress*(3-2*progress);
      idleOffset=returnOrbit.from*(1-ease);
      if(progress===1){idleOffset=0;returnOrbit=null;}
    }else if(idleEnabled&&!hovering&&!pointer&&orbitTime-lastInteraction>8000)idleOffset+=(orbitTime-Math.max(lastOrbit,lastInteraction+8000))*Math.PI*2/600000;
    lastOrbit=orbitTime;plan.dataset.idleAngle=String(idleOffset);
    plan.dataset.idleState=!idleEnabled?'disabled':returnOrbit?'returning':!hovering&&!pointer&&orbitTime-lastInteraction>8000?'rotating':'waiting';
    plan.dataset.viewAzimuth=String(azimuth+idleOffset);
    const viewAzimuth=azimuth+idleOffset;if(disposed||!visible||document.hidden||!plan.isConnected)return;const rect=plan.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.setSize(rect.width,rect.height,false);camera.position.set(Math.sin(viewAzimuth)*Math.cos(elevation)*span*2,Math.sin(elevation)*span*2+centreY,Math.cos(viewAzimuth)*Math.cos(elevation)*span*2);camera.lookAt(0,centreY+.3,0);camera.updateMatrixWorld();
    world.updateMatrixWorld(true);
    // Fit the projected building bounds to the actual canvas, at any orbit angle.
    const corners=[];
    for(const space of markerSpaces.values()){
      const top=Math.max(2.4,...(space.floor.walls || []).map(w=>w.height || 2.4));
      for(const x of [0,100])for(const y of [0,100])for(const height of [-.1,top])corners.push(space.position([x,y],height).applyMatrix4(space.group.matrixWorld).applyMatrix4(camera.matrixWorldInverse));
    }
    const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),aspect=rect.width/rect.height;
    const extent=Math.max((maxX-minX)/aspect,maxY-minY)*.62/(zoom/home.zoom),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
    camera.left=cx-extent*aspect;camera.right=cx+extent*aspect;camera.top=cy+extent;camera.bottom=cy-extent;camera.updateProjectionMatrix();
    plan.dataset.fittedBounds=JSON.stringify(corners.map(p=>p.clone().applyMatrix4(camera.projectionMatrix)).map(p=>[p.x,p.y]));
    // Foreground walls become low partitions; back walls retain room definition.
    let wallsAnimating=false;
    const wallBlend=lastWallFrame?1-Math.exp(-(orbitTime-lastWallFrame)/140):1;lastWallFrame=orbitTime;
    for(const mesh of wallMeshes){
      const point=mesh.getWorldPosition(new THREE.Vector3()),front=point.x*camera.position.x+point.z*camera.position.z>span*.7,target=hideWalls?0:cutaway&&front&&mesh.position.y>.35?.08:1;
      const next=mesh.material.opacity+(target-mesh.material.opacity)*wallBlend;
      mesh.material.opacity=Math.abs(next-target)<.002?target:next;
      if(mesh.material.opacity!==target)wallsAnimating=true;
      const transparent=mesh.material.opacity<1;if(mesh.material.transparent!==transparent){mesh.material.transparent=transparent;mesh.material.needsUpdate=true;}mesh.material.depthWrite=!transparent;
    }
    hideWallButton.textContent=hideWalls?'Show walls':'Hide all walls';hideWallButton.setAttribute('aria-label',hideWallButton.textContent);hideWallButton.setAttribute('aria-pressed',String(hideWalls));
    for(const mesh of skirtings)mesh.visible=!hideWalls;for(const blind of blinds)blind.hit.visible=!hideWalls;
    plan.dataset.wallOpacities=JSON.stringify(wallMeshes.map(mesh=>mesh.material.opacity));
    for(const marker of markers){const space=markerSpaces.get(marker.floorId || floor.id);if(!space)continue;const height=marker.height ?? (marker.entity?.startsWith('light.')?sourceFor(space.floor,marker.entity)?.height ?? 2.1:.35);const p=space.position([marker.x,marker.y],height).applyMatrix4(space.group.matrixWorld).project(camera);marker.node.style.left=`${(p.x*.5+.5)*100}%`;marker.node.style.top=`${(-p.y*.5+.5)*100}%`;}
    for(const label of storeyLabels){label.node.hidden=!!options.hideOverlays;const p=label.point.clone().applyMatrix4(label.group.matrixWorld).project(camera);label.node.style.left=`${(p.x*.5+.5)*100}%`;label.node.style.top=`${(-p.y*.5+.5)*100}%`;}
    const now=performance.now();if(now-lastPaint<30){schedule();return;}lastPaint=now;
    const blindsMoving=blinds.map(b=>b.update(now,reducedMotion)).some(Boolean);
    const animate=present(now);renderer.render(scene,camera);if(blindsMoving||animate||idleEnabled||returnOrbit||wallsAnimating)schedule();
  }
  function schedule(){if(options.viewState){const next={azimuth,elevation,zoom,cutaway,hideWalls};if(JSON.stringify(options.viewState)!==JSON.stringify(next)){Object.assign(options.viewState,next);options.onViewChange?.();}}if(!frame&&!disposed&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
  function sample(id,now){const entry=transitions.get(id);if(!entry)return lightAppearance(states[id]);return blendAppearance(entry.from,entry.to,reducedMotion?1:(now-entry.start)/600);}
  function present(now){
    let animate=false;const visualStates={...states};
    for(const id of assignedIds){const appearance=sample(id,now),entry=transitions.get(id);if(entry&&!reducedMotion&&now-entry.start<600)animate=true;visualStates[id]={...states[id],state:appearance.level>0?'on':states[id]?.state || 'off',attributes:{...states[id]?.attributes,brightness:appearance.level*255,color_mode:'rgb',rgb_color:appearance.colour}};}
    for(const {object,model,glow} of radiators){const active=heatingState(states[object.heating_entity])==='heating';glow.visible=active;model.traverse(node=>{if(node.material?.emissive){node.material.emissive.set(active?'#f34b24':'#000000');node.material.emissiveIntensity=active?.7:0;}});}
    for(const {object,model} of reactiveObjects){const appearance=lightAppearance(visualStates[object.light_entity]),effect=reducedMotion?'static':object.panel_effect || 'static',panels=model.children.filter(node=>node.userData.panelIndex!==undefined),count=panels.length || 1;if(appearance.level>0&&effect!=='static')animate=true;
      model.traverse(node=>{if(node.material?.emissive&&(object.type!=='wall_light'||node.userData.lightEmitter)){const {level,colour}=panelFrame(effect,node.userData.panelIndex || 0,count,now,appearance);node.material.emissive.setRGB(colour[0]/255,colour[1]/255,colour[2]/255,THREE.SRGBColorSpace);node.material.emissiveIntensity=level*1.1;}});}
    for(const tv of televisions){const on=tvIsOn(states[tv.object.media_entity]),time=tv.slides.count?now-tv.started:reducedMotion?0:now,bucket=on?(tv.slides.count?tvSceneIndex(time,tv.slides.count):Math.floor(time/100)):-2;if(on&&!reducedMotion&&!tv.slides.count)animate=true;
      if(tv.lastFrame!==bucket){tv.lastFrame=bucket;if(on)(tv.slides.count?tv.slides.draw:drawTVFrame)(tv.context,tv.canvas.width,tv.canvas.height,time);else{tv.context.fillStyle='#080e14';tv.context.fillRect(0,0,tv.canvas.width,tv.canvas.height);}tv.texture.needsUpdate=true;}
      for(const screen of tv.screens){screen.material.emissive.set('#ffffff');screen.material.emissiveIntensity=on?.7:0;}
    }
    const daylight=Math.max(0,Math.min(1,Number.isFinite(options.daylight)?options.daylight:daylightLevel(states)));
    ambient.intensity=.55+daylight*.85;sun.intensity=.06+daylight*1.44;
    for(const {room,mesh,edges,base,illumination,presence} of roomMeshes){mesh.material.color.copy(base).multiplyScalar(.85);
      const occupied=(room.presence || []).some(id=>states[id]?.state==='on');if(presence)presence.visible=occupied&&!options.hideOverlays;
      edges.material.color.set(occupied?'#00b58b':'#9c8d79');}
    for(const {id,glow,accent} of lightMeshes){const {level,colour}=lightAppearance(visualStates[id]);glow.color.setRGB(colour[0]/255,colour[1]/255,colour[2]/255,THREE.SRGBColorSpace);glow.intensity=level*(accent?4:32);}
    for(const {id,lens,shade} of fixtures){const {level,colour}=lightAppearance(visualStates[id]);lens.material.emissive.setRGB(colour[0]/255,colour[1]/255,colour[2]/255,THREE.SRGBColorSpace);lens.material.emissiveIntensity=level*.8;shade.material.emissive.copy(lens.material.emissive);shade.material.emissiveIntensity=level*.2;}
    return animate;
  }
  function update(nextStates,nextOptions={}){for(const art of artworks)art.update(nextStates);const now=performance.now();for(const id of assignedIds){const to=lightAppearance(nextStates[id]),entry=transitions.get(id);if(!entry)transitions.set(id,{from:to,to,start:now-600});else if(JSON.stringify(entry.to)!==JSON.stringify(to))transitions.set(id,{from:sample(id,now),to,start:now});}states=nextStates;options={...options,...nextOptions};if(fallback){fallback.update?.(states,options);return;}for(const marker of markers)marker.node.remove();markers=options.markers || [];for(const marker of markers)plan.append(marker.node);
    schedule();}
  const down=e=>{if(e.button!==0)return;manualOrbit();pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);};
  const move=e=>{if(!pointer)return;azimuth-=(e.clientX-pointer.x)*.008;elevation=Math.min(1.45,Math.max(.3,elevation+(e.clientY-pointer.y)*.006));pointer.x=e.clientX;pointer.y=e.clientY;schedule();};
  const up=e=>{if(pointer&&e.type==='pointerup'&&Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)<5){const rect=renderer.domElement.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*2-1,y=1-(e.clientY-rect.top)/rect.height*2;
    const ray=new THREE.Raycaster();ray.setFromCamera({x,y},camera);const hit=ray.intersectObjects(artworks.map(a=>a.model),true)[0],art=artworks.find(a=>hit&&a.model.children.includes(hit.object));if(art){art.toggle();pointer=null;return;}
    const hits=blinds.filter(b=>b.hit.visible).map(b=>({b,points:[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>new THREE.Vector3(x*b.width/2,y*b.height/2,0).applyMatrix4(b.hit.matrixWorld).project(camera))})).filter(h=>inside(x,y,h.points.map(p=>[p.x,p.y]))).sort((a,b)=>a.points[0].z-b.points[0].z);if(hits[0]){hits[0].b.toggle();schedule();}}pointer=null;};
  const wheel=e=>{e.preventDefault();manualOrbit();zoom=Math.max(.5,Math.min(3,zoom*Math.exp(-e.deltaY*.001)));schedule();};
  const key=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;e.preventDefault();manualOrbit();if(e.key==='ArrowLeft')azimuth-=.15;if(e.key==='ArrowRight')azimuth+=.15;if(e.key==='ArrowUp')elevation=Math.min(1.45,elevation+.1);if(e.key==='ArrowDown')elevation=Math.max(.3,elevation-.1);if(['+','='].includes(e.key))zoom=Math.min(3,zoom*1.15);if(e.key==='-')zoom=Math.max(.5,zoom/1.15);if(e.key==='Home')({azimuth,elevation,zoom}=home);schedule();};
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);renderer.domElement.addEventListener('wheel',wheel,{passive:false});renderer.domElement.addEventListener('keydown',key);
  const resize=new ResizeObserver(schedule);resize.observe(plan);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){lastOrbit=performance.now();lastInteraction=lastOrbit;schedule();}});intersection.observe(plan);
  const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else {lastOrbit=performance.now();lastInteraction=lastOrbit;schedule();}};document.addEventListener('visibilitychange',visibility);
  const contextLost=e=>{e.preventDefault();dispose();fallback=renderPlan(floor,states,{...options,mode:'clean'});plan.replaceChildren(element('p',{className:'hint',text:'3D graphics were interrupted. Showing 2D.'}),fallback);};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  function dispose(){fallback?.dispose?.();disposeWallOcclusion();if(disposed)return;disposed=true;cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);const geometries=new Set(),materials=new Set();scene.traverse(node=>{node.shadow?.dispose();if(node.geometry)geometries.add(node.geometry);if(node.material)for(const m of Array.isArray(node.material)?node.material:[node.material])materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());televisions.forEach(tv=>{clearInterval(tv.timer);tv.slides.dispose();tv.texture.dispose();});artworks.forEach(a=>a.dispose());Object.values(textures).forEach(texture=>texture.dispose());sims?.dispose();renderer.dispose();}
  plan.update=update;plan.dispose=dispose;update(states,options);return plan;
}

import * as THREE from 'three';
import { furniture3D } from './furniture3d.js';
import { renderPlan } from './plan.js';
import { element, button } from './dom.js';
import { floorDimensions } from './scene.js';
import { roomLightSources, lightAppearance } from './illumination.js';
import { heatingState } from './heating.js';

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
  const limit=quality==='low'?0:quality==='high'?6:3,lights=[],seen=new Set();
  for(const floor of [...floors].sort((a,b)=>Number(b.id===selectedId)-Number(a.id===selectedId))) {
    const markers=(floor.entities || []).filter(e=>e.entity.startsWith('light.'));
    const ids=new Set([...markers.map(e=>e.entity),...(floor.rooms || []).flatMap(r=>r.lights || [])]);
    for(const id of ids){if(seen.has(id))continue;seen.add(id);const anchor=markers.find(e=>e.entity===id),room=(floor.rooms || []).find(r=>r.lights?.includes(id)),points=room?.points || [];
      const point=anchor?[anchor.x,anchor.y]:points.length?points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]):[50,50];
      if(lights.length<limit)lights.push({floorId:floor.id,id,point});
    }
  }
  return lights;
}

export function illuminationUV(x,y,width,depth) {return [x/width+.5,y/depth+.5];}

function roomIllumination(floor,room,width,depth,quality) {
  const canvas=document.createElement('canvas'),size=quality==='high'?512:256;
  canvas.width=Math.max(64,Math.round(size*width/Math.max(width,depth)));canvas.height=Math.max(64,Math.round(size*depth/Math.max(width,depth)));
  const context=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.channel=1;texture.colorSpace=THREE.SRGBColorSpace;
  const sources=roomLightSources(floor,room);let previous;
  return {texture,update(states){
    const lights=sources.map(source=>({...source,...lightAppearance(states[source.id])})),key=JSON.stringify(lights);
    if(key===previous)return;previous=key;context.globalCompositeOperation='source-over';context.fillStyle='#000';context.fillRect(0,0,canvas.width,canvas.height);context.globalCompositeOperation='lighter';
    for(const light of lights){if(!light.level)continue;const x=light.x/100*canvas.width,y=light.y/100*canvas.height,rx=light.radius/width*canvas.width,ry=light.radius/depth*canvas.height;
      context.save();context.translate(x,y);context.scale(rx,ry);const gradient=context.createRadialGradient(0,0,0,0,0,1),rgb=light.colour.join(',');
      gradient.addColorStop(0,`rgba(${rgb},${light.level*.9})`);gradient.addColorStop(.25,`rgba(${rgb},${light.level*.7})`);gradient.addColorStop(.65,`rgba(${rgb},${light.level*.22})`);gradient.addColorStop(1,`rgba(${rgb},0)`);
      context.fillStyle=gradient;context.fillRect(-1,-1,2,2);context.restore();
    }
    texture.needsUpdate=true;
  }};
}

export function render3D(floor, states, options = {}) {
  const plan=element('div',{className:'plan plan-3d'});plan.style.cssText='position:relative;aspect-ratio:1.15;min-height:320px;overflow:hidden;background:#e5e9e6;isolation:isolate';
  let renderer;
  try { renderer=new THREE.WebGLRenderer({antialias:options.quality!=='low',alpha:true,powerPreference:'low-power'}); }
  catch {const fallback=renderPlan(floor,states,{...options,mode:'clean'});fallback.prepend(element('p',{className:'hint',text:'3D is unavailable on this device. Showing the 2D floorplan.'}));fallback.update ||= ()=>{};fallback.dispose ||= ()=>{};return fallback;}
  const scene=new THREE.Scene(), world=new THREE.Group();scene.add(world);
  const floors=options.building&&options.allFloors?.length?options.allFloors:[floor];
  const gpuLights=selectSceneLights(floors,floor.id,options.quality);
  const assignedIds=[...new Set(floors.flatMap(f=>[...(f.entities || []).filter(e=>e.entity.startsWith('light.')).map(e=>e.entity),...(f.rooms || []).flatMap(r=>r.lights || [])]))];
  const placements=floors.map((f,i)=>floors.length>1?storeyPlacement(f,i):{x:0,y:0,z:0});
  const centreY=(Math.min(...placements.map(p=>p.y))+Math.max(...placements.map(p=>p.y)))/2;
  const {width,depth}=floorDimensions(floor), span=Math.max(...floors.map((f,i)=>{const d=floorDimensions(f);return Math.max(d.width+Math.abs(placements[i].x)*2,d.depth+Math.abs(placements[i].z)*2);}),centreY*2+4);
  const position=(p,y=0)=>new THREE.Vector3((p[0]/100-.5)*width,y,(p[1]/100-.5)*depth);
  let selectedWorld=world;
  const camera=new THREE.OrthographicCamera(-span,span,span,-span,.1,span*10);
  let azimuth=.4,elevation=1.0,zoom=1.35,frame=0,disposed=false,visible=true,markers=[],pointer,fallback;
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1,options.quality==='high'?2:1.5));
  renderer.shadowMap.enabled=options.quality!=='low';renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.domElement.style.cssText='width:100%;height:100%;display:block;touch-action:none';renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','3D floorplan. Arrow keys orbit; plus and minus zoom; Home resets.');
  plan.append(renderer.domElement);
  const ambient=new THREE.HemisphereLight('#fff6e8','#6f8291',2);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff3de',2.2);sun.position.set(-span,span*2,span);sun.castShadow=options.quality!=='low';sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,far:span*5});sun.shadow.normalBias=.04;scene.add(sun);
  const roomMeshes=[],lightMeshes=[],wallMeshes=[],storeyLabels=[],radiators=[];
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
  if(floor.id===selectedId)selectedWorld=storey;
  const localWorld=storey;
  const position=(p,y=0)=>new THREE.Vector3((p[0]/100-.5)*width,y,(p[1]/100-.5)*depth);
  if(floors.length>1){const node=element('span',{text:floor.name || floor.id});node.style.cssText='position:absolute;pointer-events:none;padding:4px 8px;border-radius:8px;background:#ffffffdc;color:#263b48;font-size:12px;font-weight:700;transform:translate(-50%,-50%);z-index:2';plan.append(node);storeyLabels.push({node,point:position([50,100],.1),group:storey});}
  // Each room uses its actual outline, including non-rectangular rooms.
  for(const room of floor.rooms || []) {
    if(!room.points?.length)continue;
    const shape=new THREE.Shape(room.points.map(p=>new THREE.Vector2((p[0]/100-.5)*width,-(p[1]/100-.5)*depth)));
    const surface=room.material || 'wood',colour=room.colour || ({wood:'#cbb89a',tile:'#c8d2d1',carpet:'#c4ada2'}[surface] || '#cbb89a');
    const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.1,bevelEnabled:false}),material(colour));mesh.rotation.x=-Math.PI/2;mesh.position.y=-.09;mesh.receiveShadow=true;localWorld.add(mesh);
    mesh.material.map=textures[surface] || woodTexture;mesh.material.roughness=surface==='tile'?.45:surface==='carpet'?1:.88;
    const illumination=roomIllumination(floor,room,width,depth,options.quality),positions=mesh.geometry.attributes.position,uv=new Float32Array(positions.count*2);
    for(let i=0;i<positions.count;i++)uv.set(illuminationUV(positions.getX(i),positions.getY(i),width,depth),i*2);
    mesh.geometry.setAttribute('uv1',new THREE.BufferAttribute(uv,2));mesh.material.emissiveMap=illumination.texture;mesh.material.emissive.set('#ffffff');mesh.material.emissiveIntensity=.9;
    // Fine board seams add scale without downloading textures.
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:'#9c8d79'}));mesh.add(edges);
    roomMeshes.push({room,mesh,edges,illumination,base:new THREE.Color(colour)});
  }
    for(const {id,point} of gpuLights.filter(light=>light.floorId===floor.id)) {
      const radius=(floor.entities || []).find(e=>e.entity===id)?.fixture==='spot'?2:3;
      const glow=new THREE.SpotLight('#ffe5b0',0,Math.hypot(2.2,radius)+.3,Math.atan(radius/2.2),.75,2);glow.position.copy(position(point,2.2));glow.target.position.copy(position(point,.01));
      glow.castShadow=true;glow.shadow.mapSize.set(512,512);glow.shadow.normalBias=.03;
      localWorld.add(glow,glow.target);lightMeshes.push({id,glow});
    }
  if(!floor.rooms?.length)box(width,.1,depth,0,-.05,0,'#cbb89a',localWorld);
  for(const wall of floor.walls || []) {
    if(!wall.a || !wall.b)continue;const a=position(wall.a),b=position(wall.b),length=a.distanceTo(b);if(length<.01)continue;
    const group=new THREE.Group();group.position.copy(a);group.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x);localWorld.add(group);
    const height=wall.height || 2.4;
    for(const r of wallSections(length,height,wall.openings)) {const mesh=box(r.width,r.height,wall.thickness || .15,r.x,r.y,0,'#ece8dc',group);wallMeshes.push(mesh);}
    // Low skirting defines the floor perimeter even when tall walls are cut away.
    for(const r of wallSections(length,.09,(wall.openings || []).filter(o=>o.type==='door')))box(r.width,r.height,(wall.thickness || .15)+.025,r.x,r.y,0,'#fdfbf2',group);
  }
  for(const join of wallJoins(floor.walls || [],width,depth)){
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(join.radius,join.radius,join.height,16),material('#ece8dc'));mesh.position.set(join.x,join.height/2,join.z);mesh.castShadow=true;mesh.receiveShadow=true;localWorld.add(mesh);wallMeshes.push(mesh);
  }
  for(const object of floor.objects || []) {const model=furniture3D(object);model.position.copy(position([object.x,object.y],.025));localWorld.add(model);
    if(object.type==='radiator'){
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:textures.heat,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.position.set(0,(object.height || .6)/2,0);glow.scale.set((object.width || 1)*1.5,(object.height || .6)*2,1);model.add(glow);radiators.push({object,model,glow});
    }
  }
  }
  const selectedId=floor.id;floors.forEach(buildStorey);
  const toolbar=element('div',{className:'three-toolbar'});toolbar.style.cssText='position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:5px;padding:5px;border-radius:14px;background:var(--card-background-color,#fff);box-shadow:0 2px 12px #0002;z-index:5';
  function control(text,label,action) {return button(text,action,{'aria-label':label,title:label});}
  let cutaway=true;
  toolbar.append(control('↶','Orbit left',()=>{azimuth-=.25;schedule();}),control('↷','Orbit right',()=>{azimuth+=.25;schedule();}),control('−','Zoom out',()=>{zoom=Math.max(.5,zoom/1.2);schedule();}),control('+','Zoom in',()=>{zoom=Math.min(3,zoom*1.2);schedule();}),control('⌂','Reset 3D view',()=>{azimuth=.4;elevation=1.0;zoom=1.35;schedule();}),control('▱','Toggle cutaway walls',()=>{cutaway=!cutaway;schedule();}));plan.append(toolbar);
  function draw(){frame=0;if(disposed||!visible||document.hidden||!plan.isConnected)return;const rect=plan.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.setSize(rect.width,rect.height,false);const extent=span*.75/zoom;camera.left=-extent*rect.width/rect.height;camera.right=-camera.left;camera.top=extent;camera.bottom=-extent;camera.updateProjectionMatrix();camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*span*2,Math.sin(elevation)*span*2+centreY,Math.cos(azimuth)*Math.cos(elevation)*span*2);camera.lookAt(0,centreY+.3,0);camera.updateMatrixWorld();
    world.updateMatrixWorld(true);
    // Foreground walls become low partitions; back walls retain room definition.
    for(const mesh of wallMeshes){const point=mesh.getWorldPosition(new THREE.Vector3());const front=point.x*camera.position.x+point.z*camera.position.z>span*.7;mesh.material.transparent=cutaway&&front&&mesh.position.y>.35;mesh.material.opacity=mesh.material.transparent?.08:1;mesh.material.depthWrite=!mesh.material.transparent;}
    for(const marker of markers){const p=position([marker.x,marker.y],.35).applyMatrix4(selectedWorld.matrixWorld).project(camera);marker.node.style.left=`${(p.x*.5+.5)*100}%`;marker.node.style.top=`${(-p.y*.5+.5)*100}%`;}
    for(const label of storeyLabels){const p=label.point.clone().applyMatrix4(label.group.matrixWorld).project(camera);label.node.style.left=`${(p.x*.5+.5)*100}%`;label.node.style.top=`${(-p.y*.5+.5)*100}%`;}
    renderer.render(scene,camera);
  }
  function schedule(){if(!frame&&!disposed&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
  function update(nextStates,nextOptions={}){states=nextStates;options={...options,...nextOptions};if(fallback){fallback.update?.(states,options);return;}for(const marker of markers)marker.node.remove();markers=options.markers || [];for(const marker of markers)plan.append(marker.node);
    for(const {object,model,glow} of radiators){const active=heatingState(states[object.heating_entity])==='heating';glow.visible=active;model.traverse(node=>{if(node.material?.emissive){node.material.emissive.set(active?'#f34b24':'#000000');node.material.emissiveIntensity=active?.7:0;}});}
    ambient.intensity=assignedIds.length?.65:1.5;sun.intensity=assignedIds.length?.45:1.5;
    for(const {room,mesh,edges,base,illumination} of roomMeshes){const lights=(room.lights || []).map(id=>states[id]),known=lights.length&&lights.every(s=>s&&['on','off'].includes(s.state));mesh.material.color.copy(base).multiplyScalar(known?.4:.8);
      illumination.update(states);edges.material.color.set((room.presence || []).some(id=>states[id]?.state==='on')?'#00b58b':'#9c8d79');}
    for(const {id,glow} of lightMeshes){const {level,colour}=lightAppearance(states[id]);glow.color.setRGB(colour[0]/255,colour[1]/255,colour[2]/255,THREE.SRGBColorSpace);glow.intensity=level*30;}
    schedule();}
  const down=e=>{if(e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);};
  const move=e=>{if(!pointer)return;azimuth-=(e.clientX-pointer.x)*.008;elevation=Math.min(1.45,Math.max(.3,elevation+(e.clientY-pointer.y)*.006));pointer.x=e.clientX;pointer.y=e.clientY;schedule();};
  const up=()=>{pointer=null;};
  const wheel=e=>{e.preventDefault();zoom=Math.max(.5,Math.min(3,zoom*Math.exp(-e.deltaY*.001)));schedule();};
  const key=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')azimuth-=.15;if(e.key==='ArrowRight')azimuth+=.15;if(e.key==='ArrowUp')elevation=Math.min(1.45,elevation+.1);if(e.key==='ArrowDown')elevation=Math.max(.3,elevation-.1);if(['+','='].includes(e.key))zoom=Math.min(3,zoom*1.15);if(e.key==='-')zoom=Math.max(.5,zoom/1.15);if(e.key==='Home'){azimuth=.4;elevation=1.0;zoom=1.35;}schedule();};
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);renderer.domElement.addEventListener('wheel',wheel,{passive:false});renderer.domElement.addEventListener('keydown',key);
  const resize=new ResizeObserver(schedule);resize.observe(plan);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();});intersection.observe(plan);
  const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();};document.addEventListener('visibilitychange',visibility);
  const contextLost=e=>{e.preventDefault();dispose();fallback=renderPlan(floor,states,{...options,mode:'clean'});plan.replaceChildren(element('p',{className:'hint',text:'3D graphics were interrupted. Showing 2D.'}),fallback);};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  function dispose(){fallback?.dispose?.();if(disposed)return;disposed=true;cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);const geometries=new Set(),materials=new Set();scene.traverse(node=>{node.shadow?.dispose();if(node.geometry)geometries.add(node.geometry);if(node.material)for(const m of Array.isArray(node.material)?node.material:[node.material])materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());roomMeshes.forEach(({illumination})=>illumination.texture.dispose());Object.values(textures).forEach(texture=>texture.dispose());renderer.dispose();}
  plan.update=update;plan.dispose=dispose;update(states,options);return plan;
}

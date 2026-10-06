import * as THREE from 'three';
import {element} from './dom.js';
import {lightAppearance} from './illumination.js';
import {tvIsOn,drawTVFrame} from './tv-animation.js';
import {createInk} from './diorama-ink.js';
import {createAssets} from './diorama-assets.js';
import {floorDimensions} from './scene.js';
import {buildShell,nearestWall,SLAB} from './diorama-shell.js';
import {stairFlight,stairGuard,stairFootprint} from './diorama-stairs.js';
import {createOverlay} from './diorama-overlay.js';
import {halo} from './diorama-textures.js';
import {createLightmap} from './diorama-lightmap.js';
import {consolidate} from './diorama-merge.js';
import {isHung,ELEVATION} from './diorama-cutaway.js';

export {ELEVATION};
const STAGE='#15161a';

/**
 * Fixed-angle illustrated view of one storey or the whole stacked house. The
 * camera never orbits, so the cutaway, asset detail and lighting are all
 * composed for this single angle.
 *
 * Options: `azimuth` (radians; the default looks from the south-east), `weather`
 * ({temperature, high, low, humidity, wind} as display text), `readouts: false`
 * to omit room readouts, `storeyOffset` when `input` is not the lowest storey,
 * `alwaysRender` to keep drawing in a hidden document, and the layout tunings
 * `partition`, `gap`, `margin`, `spreadMargin` and `explode`.
 * The returned element has `update(states, options)`, `dispose()` and `stats()`.
 */
export function renderDiorama(input,states,options={}){
  const floors=[].concat(input),house=floors.length>1;
  const plan=element('div',{className:'plan plan-diorama'});plan.style.cssText=`position:relative;width:100%;height:100%;overflow:hidden;background:${STAGE};container-type:size`;
  const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.domElement.style.cssText='width:100%;height:100%;display:block';renderer.domElement.setAttribute('aria-label','Illustrated floorplan');plan.append(renderer.domElement);
  const scene=new THREE.Scene(),ink=createInk(renderer,{stage:STAGE}),assets=createAssets(),overlay=createOverlay(plan,{compact:house}),reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const azimuth=options.azimuth??Math.PI/4,towards=new THREE.Vector3(Math.sin(azimuth),0,Math.cos(azimuth));

  // Night base: cool, never black, so warm lamps have something to push against.
  scene.add(new THREE.HemisphereLight('#8793c8','#54413a',.92));
  const moon=new THREE.DirectionalLight('#8da2dc',.3);moon.position.copy(towards).multiplyScalar(4).add(new THREE.Vector3(-towards.z*3,7,towards.x*3));scene.add(moon);
  // A soft fill from the viewer keeps the backs of foreground furniture readable.
  const fill=new THREE.DirectionalLight('#d8c2ad',.7);fill.position.copy(towards).multiplyScalar(5).setY(3.2);scene.add(fill);

  const haloMap=halo(),lights=[],animated=[],televisions=[],shells=[],pills=[],slabs=[],storeys=[];
  function glowSprite(parent,at,size){
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:haloMap,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:0}));
    sprite.position.copy(at);sprite.scale.setScalar(size);sprite.layers.set(1);parent.add(sprite);return sprite;
  }
  const lambert=colour=>new THREE.MeshLambertMaterial({color:colour});
  const planPosition=floor=>{const {width,depth}=floorDimensions(floor);return (p,y=0)=>new THREE.Vector3((p[0]/100-.5)*width,y,(p[1]/100-.5)*depth);};
  const stairsOf=floor=>(floor?.objects||[]).filter(o=>o.type==='stairs'),ceilingOf=floor=>Math.max(2.4,...(floor.walls||[]).map(w=>w.height||2.4));
  let elevation=0;
  // Lamps are painted into a light map rather than added as real lights: see diorama-lightmap.js.
  const lightmap=createLightmap(floors.map(floor=>{const base=elevation;elevation+=ceilingOf(floor)+SLAB+(options.explode||0);return {...floorDimensions(floor),base};}));elevation=0;
  const insideRoom=(x,y,points)=>{let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
  floors.forEach((floor,index)=>{
    const ceiling=ceilingOf(floor),pitch=ceiling+SLAB,below=floors[index-1],arriving=stairsOf(below),top=house&&index===floors.length-1;
    // Every flight from the storey below needs its well cut through this slab.
    const shell=buildShell(floor,towards,{holes:arriving.map(o=>stairFootprint(o,planPosition(below))),partition:options.partition});
    shell.group.position.y=elevation;scene.add(shell.group);shells.push(shell);const {position}=shell,base=elevation;slabs.push(...shell.slabs);
    const pool=(point,radius)=>{const room=(floor.rooms||[]).find(r=>insideRoom(point[0],point[1],r.points)),at=position(point);return lightmap.add({storey:index,x:at.x,z:at.z,radius,clip:room?.points.map(p=>{const v=position(p);return [v.x,v.z];})});};elevation+=pitch+(options.explode||0);
    const overhead=o=>stairsOf(floor).some(own=>position([own.x,own.y]).distanceTo(planPosition(below)([o.x,o.y]))<1.2);
    for(const o of arriving)if(top||!overhead(o)){const guard=stairGuard(o);guard.position.copy(planPosition(below)([o.x,o.y]));shell.group.add(guard);}

    for(const [i,marker] of (floor.entities||[]).filter(e=>e.entity.startsWith('light.')&&!(floor.objects||[]).some(o=>o.light_entity===e.entity)).entries()){
      const pendant=marker.fixture==='pendant',spot=marker.fixture==='spot';if(!pendant&&!spot)continue;
      const height=marker.height_m??(pendant?ceiling-.3:ceiling-.04),at=position([marker.x,marker.y],height),entry={id:marker.entity,phase:(index*7+i)*1.9};
      if(pendant){
        const fitting=new THREE.Group();fitting.position.copy(at);shell.group.add(fitting);
        const cord=new THREE.Mesh(new THREE.CylinderGeometry(.007,.007,ceiling-height,6),lambert('#2b2726'));cord.position.y=(ceiling-height)/2+.12;fitting.add(cord);
        const shade=new THREE.Mesh(new THREE.LatheGeometry([[.03,.14],[.05,.13],[.15,.02],[.17,-.02]].map(([r,y])=>new THREE.Vector2(r,y)),24),new THREE.MeshLambertMaterial({color:'#d9b27a',side:THREE.DoubleSide,emissive:'#ffb866',emissiveIntensity:0}));fitting.add(shade);
        const bulb=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),new THREE.MeshBasicMaterial({color:'#3a332c'}));bulb.position.y=.02;fitting.add(bulb);
        entry.pool=pool([marker.x,marker.y],3.9);entry.power=.92;
        entry.sprite=glowSprite(shell.group,at,1.5);entry.shade=shade;entry.bulb=bulb;
      }else{entry.pool=pool([marker.x,marker.y],2.7);entry.power=.9;}
      lights.push(entry);
    }

    for(const object of floor.objects||[]){
      const at=position([object.x,object.y],object.elevation_m||0);
      if(object.type==='stairs'){
        // On the top storey a stairs object only marks the well; its guard is already in place.
        // A flight above the lowest storey always spans a well, even when that storey is shown alone.
        if(!top){const flight=stairFlight(object,pitch,{open:object.variant==='understairs'||arriving.length>0||(options.storeyOffset||0)+index>0});flight.position.copy(at);shell.group.add(flight);}
        continue;
      }
      // There is no ceiling to carry a ceiling fitting, and wall-hung things go with a wall
      // that has been cut down below them.
      if(object.type==='extractor_fan'&&object.variant!=='wall')continue;
      if(isHung(object)){const wall=nearestWall(at,shell.walls);if(wall.distance<.45&&wall.height<(object.elevation_m||0)+(object.height||.3)*.8)continue;}
      const model=assets.build(object);
      model.position.copy(at);shell.group.add(model);
      if(model.userData.animate)animated.push({object,model});
      if(object.light_entity&&object.type!=='tv_lightstrip'){
        const glow=model.userData.glow,centre=at.clone().setY(at.y+(glow?glow.height:(object.height||.3)/2));
        const entry={id:object.light_entity,fixedColour:glow?.colour,phase:lights.length*1.3,power:.7,emitters:[],pool:pool([object.x,object.y],1.5)};
        if(!glow)model.traverse(node=>{if(node.material?.emissive&&(!['wall_light','lamp'].includes(object.type)||node.userData.lightEmitter))entry.emitters.push(node.material);});
        entry.sprite=glowSprite(shell.group,centre,.7);lights.push(entry);
      }
      if(object.type==='tv'&&object.media_entity){
        const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;const context=canvas.getContext('2d',{willReadFrequently:true}),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
        const screens=[];model.traverse(node=>{if(node.userData.tvScreen){node.material.map=texture;screens.push(node);}});
        // The picture throws its own shifting light into the room and onto the wall behind.
        const facing=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),model.rotation.y),middle=at.clone().setY(at.y+(object.height||.8)/2);
        const {width,depth}=shell,ahead=at.clone().addScaledVector(facing,1.1),spill=pool([(ahead.x/width+.5)*100,(ahead.z/depth+.5)*100],2.7),back=pool([object.x,object.y],1.2);
        const strip=(floor.objects||[]).find(o=>o.type==='tv_lightstrip'&&o.sync_media_entity===object.media_entity);
        televisions.push({object,context,canvas,texture,screens,spill,back,strip,sprite:glowSprite(shell.group,middle.clone().addScaledVector(facing,.32),(object.width||1.4)*1.35),bucket:-1,colour:new THREE.Color()});
      }
    }
    consolidate(shell.group);lightmap.tag(shell.group,index);
    const storey={floor,index,group:shell.group,home:new THREE.Vector3(0,base,0),away:new THREE.Vector3(0,base,0),corners:[],width:shell.width,depth:shell.depth};storeys.push(storey);
    for(const room of floor.rooms||[]){
      for(const p of room.points)for(const y of [-SLAB,ceiling])storey.corners.push(position(p,y));
      if(room.temperature_entity||room.humidity_entity){const local=position(room.readout||room.points.reduce((a,p)=>[a[0]+p[0]/room.points.length,a[1]+p[1]/room.points.length],[0,0]),house?1.3:2.1);pills.push({room,anchor:()=>local.clone().add(shell.group.position)});}
    }
  });

  scene.traverse(node=>{for(const material of [node.material].flat())if(material)lightmap.apply(material);});
  // The angle is fixed for good; only the framing changes, between the stack and the spread.
  const across=new THREE.Vector3(towards.z,0,-towards.x),footprint=[Math.max(...storeys.map(s=>s.width)),Math.max(...storeys.map(s=>s.depth))];
  // Spread: storeys slide sideways across the view, each keeping its true height, so they
  // step up across the screen. Seen from above the camera, a storey hides whatever lies
  // `lean` behind it on the storey below, so sliding one way clears it much sooner than
  // the other. Take the shorter slide: the floors then nest closely and fill a wide screen.
  const pitch=storeys.length>1?storeys[1].home.y-storeys[0].home.y:0,lean=towards.clone().multiplyScalar(pitch/Math.tan(ELEVATION));
  const clear=sign=>Math.min(...[[across.x*sign,lean.x,footprint[0]],[across.z*sign,lean.z,footprint[1]]].map(([step,offset,size])=>step?Math.max((size+offset)/step,(-size+offset)/step):Infinity).filter(s=>s>0));
  const direction=clear(1)<=clear(-1)?1:-1,stride=(clear(direction)+(options.gap??2))*direction;
  for(const storey of storeys)storey.away.addScaledVector(across,stride*(storey.index-(storeys.length-1)/2));
  const cornersAt=key=>storeys.flatMap(storey=>storey.corners.map(p=>p.clone().add(storey[key])));
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,200),centre=new THREE.Box3().setFromPoints(cornersAt('home')).getCenter(new THREE.Vector3());
  camera.position.copy(centre).add(new THREE.Vector3(towards.x*Math.cos(ELEVATION),Math.sin(ELEVATION),towards.z*Math.cos(ELEVATION)).multiplyScalar(100));camera.lookAt(centre);camera.updateMatrixWorld();
  const boundsOf=key=>new THREE.Box2().setFromPoints(cornersAt(key).map(p=>{const v=p.applyMatrix4(camera.matrixWorldInverse);return new THREE.Vector2(v.x,v.y);})),bounds={home:boundsOf('home'),away:boundsOf('away')};
  function fit(box,aspect,margin){
    const size=box.getSize(new THREE.Vector2()),middle=box.getCenter(new THREE.Vector2()),half=Math.max(size.x/aspect,size.y)*.5*margin;
    // Nudge the picture down a little so the weather block has clear sky.
    return [middle.x-half*aspect,middle.x+half*aspect,middle.y+half*1.08,middle.y-half*.92];
  }
  function frame(aspect,spread){
    const a=fit(bounds.home,aspect,options.margin??1.07),b=fit(bounds.away,aspect,options.spreadMargin??1.12),mix=i=>a[i]+(b[i]-a[i])*spread;
    camera.left=mix(0);camera.right=mix(1);camera.top=mix(2);camera.bottom=mix(3);camera.updateProjectionMatrix();
  }
  overlay.setLabels(house?storeys.map(storey=>{const local=new THREE.Vector3(Math.sign(towards.x)*storey.width/2,-SLAB,Math.sign(towards.z)*storey.depth/2);return {text:storey.floor.name||storey.floor.id,anchor:()=>local.clone().add(storey.group.position)};}):[]);

  // A readout whose room sits under another storey from this angle would label the wrong floor.
  scene.updateMatrixWorld(true);const sight=new THREE.Raycaster(),outward=camera.position.clone().sub(centre).normalize();
  for(const pill of pills){sight.set(pill.anchor(),outward);pill.covered=sight.intersectObjects(slabs,false).length>0;}
  const reading=(id,digits,unit)=>{const value=Number(states[id]?.state);return id&&Number.isFinite(value)?`${value.toFixed(digits)}${unit}`:'';};
  function readouts(){
    overlay.setWeather(options.weather);
    overlay.setPills((options.readouts===false?[]:pills).map(({room,anchor,covered})=>({anchor,covered,facts:[['temperature',reading(room.temperature_entity,1,' °C')],['humidity',reading(room.humidity_entity,1,'%')],['air',reading(room.co2_entity,0,' ppm')]].filter(([,text])=>text)})).filter(p=>p.facts.length));
  }

  let frameId=0,disposed=false,visible=true,last=0,width=0,height=0;
  // Spread state: hovering opens the stack, a click or Enter pins it open.
  let hovering=false,pinned=false,spread=0,spreadFrom=0,spreadStart=-1e9;const SPREAD_MS=850;
  const wanted=()=>house&&(pinned||hovering)?1:0,ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
  function retarget(){const now=performance.now(),target=wanted();if(target!==Math.round(spreadGoal)){spreadFrom=spread;spreadGoal=target;spreadStart=now;}plan.dataset.spread=String(target);renderer.domElement.setAttribute('aria-pressed',String(!!pinned));last=0;schedule();}
  let spreadGoal=0;
  const colour=new THREE.Color();
  function draw(now){
    frameId=0;if(disposed||!visible||document.hidden&&!options.alwaysRender)return;
    const moving=spread!==spreadGoal;
    if(!reducedMotion||moving)frameId=requestAnimationFrame(draw);
    // Lamps tick at about 30 fps; the spread itself runs at the display rate.
    if(now-last<32&&!reducedMotion&&!moving)return;last=now;
    const w=plan.clientWidth,h=plan.clientHeight;if(!w||!h)return;
    if(w!==width||h!==height){width=w;height=h;renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,2));renderer.setSize(w,h,false);frame(w/h,ease(spread));}
    if(moving){
      const linear=reducedMotion?1:Math.min(1,(now-spreadStart)/SPREAD_MS);spread=spreadFrom+(spreadGoal-spreadFrom)*linear;
      // Storeys leave one after another, outermost first, and settle together.
      for(const storey of storeys){const lag=storeys.length>1?(1-Math.abs(storey.index-(storeys.length-1)/2)/((storeys.length-1)/2))*.18:0,local=ease(Math.max(0,Math.min(1,(spread-lag*(spreadGoal?1:0))/(1-lag*(spreadGoal?1:0)))));
        storey.group.position.lerpVectors(storey.home,storey.away,local);lightmap.setShift(storey.index,storey.group.position.x,storey.group.position.z);}
      frame(w/h,ease(spread));
    }
    const t=reducedMotion?0:now/1000;
    for(const entry of lights){
      const appearance=lightAppearance(states[entry.id]),level=appearance.level;
      // Two slow sines read as a living filament rather than a strobe.
      const breathe=reducedMotion?1:1+.035*Math.sin(t*1.9+entry.phase)+.02*Math.sin(t*4.7+entry.phase*2.3);
      if(entry.fixedColour)colour.copy(entry.fixedColour);else colour.setRGB(appearance.colour[0]/255,appearance.colour[1]/255,appearance.colour[2]/255,THREE.SRGBColorSpace);
      entry.pool.colour=entry.fixedColour?[colour.r,colour.g,colour.b].map(v=>new THREE.Color(v,v,v).convertLinearToSRGB().r*255):appearance.colour;entry.pool.level=level*entry.power*breathe;
      if(entry.sprite){entry.sprite.material.color.copy(colour);entry.sprite.material.opacity=level*.9*breathe;}
      for(const material of entry.emitters||[]){material.emissive.copy(colour);material.emissiveIntensity=level*1.1;}
      if(entry.shade){entry.shade.material.emissive.copy(colour);entry.shade.material.emissiveIntensity=level*.55*breathe;if(level)entry.bulb.material.color.copy(colour);else entry.bulb.material.color.set('#3a332c');}
    }
    for(const {object,model} of animated)model.userData.animate(t,lightAppearance(states[object.light_entity]).level);
    for(const tv of televisions){
      const on=tvIsOn(states[tv.object.media_entity]),bucket=on?Math.floor(now/100):-2;
      if(bucket!==tv.bucket){tv.bucket=bucket;
        if(on)drawTVFrame(tv.context,tv.canvas.width,tv.canvas.height,reducedMotion?0:now);else{tv.context.fillStyle='#05080b';tv.context.fillRect(0,0,tv.canvas.width,tv.canvas.height);}
        tv.texture.needsUpdate=true;
        const data=tv.context.getImageData(0,0,tv.canvas.width,tv.canvas.height).data,sum=[0,0,0];let count=0;
        for(let i=0;i<data.length;i+=4*997){sum[0]+=data[i];sum[1]+=data[i+1];sum[2]+=data[i+2];count++;}
        tv.colour.setRGB(sum[0]/count/255,sum[1]/count/255,sum[2]/count/255,THREE.SRGBColorSpace);
      }
      // Soft, irregular shimmer on top of the picture's own colour drift.
      const flicker=on?(reducedMotion?1:.86+.09*Math.sin(t*7.3)+.05*Math.sin(t*17.1+1.3)):0,stripLevel=tv.strip?lightAppearance(states[tv.strip.light_entity]).level:0;
      const hsl={};tv.colour.getHSL(hsl);colour.setHSL(hsl.h,Math.min(1,hsl.s*1.5+.15),Math.max(.45,hsl.l));
      const srgb=colour.clone().convertLinearToSRGB(),rgb=[srgb.r*255,srgb.g*255,srgb.b*255];tv.spill.colour=rgb;tv.spill.level=flicker*.8;tv.back.colour=rgb;tv.back.level=flicker*stripLevel*.9;
      tv.sprite.material.color.copy(colour);tv.sprite.material.opacity=flicker*.3;
      for(const screen of tv.screens)screen.material.color.setScalar(on?.82+flicker*.2:1);
    }
    lightmap.draw();overlay.layout(camera,spread);ink.render(scene,camera,t);
  }
  const schedule=()=>{if(!frameId&&!disposed)frameId=requestAnimationFrame(draw);};
  function update(nextStates,nextOptions={}){states=nextStates;options={...options,...nextOptions};readouts();last=0;schedule();}
  if(house){
    const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','button');canvas.setAttribute('aria-label','Illustrated floorplan. Activate to spread the floors apart or stack them again.');canvas.style.cursor='pointer';
    plan.addEventListener('pointerenter',e=>{if(e.pointerType!=='mouse')return;hovering=true;retarget();});
    plan.addEventListener('pointerleave',()=>{hovering=false;retarget();});
    canvas.addEventListener('click',()=>{pinned=!pinned;retarget();});
    canvas.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pinned=!pinned;retarget();}else if(e.key==='Escape'&&pinned){pinned=false;retarget();}});
  }
  const resize=new ResizeObserver(()=>{last=0;schedule();});resize.observe(plan);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();});intersection.observe(plan);
  const visibility=()=>{if(!document.hidden)schedule();};document.addEventListener('visibilitychange',visibility);
  function dispose(){
    if(disposed)return;disposed=true;cancelAnimationFrame(frameId);resize.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);
    const geometries=new Set(),materials=new Set();scene.traverse(node=>{node.shadow?.dispose();if(node.geometry)geometries.add(node.geometry);for(const m of [node.material].flat())if(m)materials.add(m);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>{m.map?.dispose();m.dispose();});
    haloMap.dispose();lightmap.dispose();for(const shell of shells)shell.dispose();assets.dispose();overlay.dispose();ink.dispose();renderer.dispose();
  }
  plan.stats=()=>{let meshes=0;scene.traverse(node=>{if(node.isMesh)meshes++;});return {meshes,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,programs:renderer.info.programs.length};};
  plan.update=update;plan.dispose=dispose;update(states,options);return plan;
}

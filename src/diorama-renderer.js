import * as THREE from 'three';
import {element} from './dom.js';
import {lightAppearance} from './illumination.js';
import {tvIsOn,drawTVFrame,tvSlideshow,tvSceneIndex} from './tv-animation.js';
import {renderPlan} from './plan.js';
import {createInk} from './diorama-ink.js';
import {createAssets} from './diorama-assets.js';
import {floorDimensions} from './scene.js';
import {buildShell,nearestWall,SLAB,AJAR,OPEN} from './diorama-shell.js';
import {stairFlight,stairGuard,stairFootprint} from './diorama-stairs.js';
import {createOverlay} from './diorama-overlay.js';
import {halo} from './diorama-textures.js';
import {createLightmap} from './diorama-lightmap.js';
import {consolidate} from './diorama-merge.js';
import {isHung,ELEVATION} from './diorama-cutaway.js';
import {insidePolygon,spreadLayout,coveredPoint} from './diorama-spread.js';
import {createFade,createGlide,ghost} from './diorama-live.js';
import {panelFrame} from './light-animation.js';
import {stripAppearance,updateStrip} from './strip-pattern.js';
import {artwork3D} from './artwork3d.js';
import {updatePrinter3D} from './printers3d.js';
import {heatingState} from './heating.js';
import {radiatorEntity,doorState} from './live-data.js';

export {ELEVATION};
export const STAGE='#15161a';
const DAY_STAGE='#4b5d72';
/** Stage colour behind the drawing for a daylight level from 0 (evening) to 1 (full day). */
export const stageShade=(daylight=0)=>'#'+new THREE.Color(STAGE).lerp(new THREE.Color(DAY_STAGE),Math.max(0,Math.min(1,daylight))).getHexString();
// Screen pixels per metre below which the card's markers start to shrink.
const MARKER_METRE=34;

/**
 * Fixed-angle illustrated view of one storey or the whole stacked house. The
 * camera never orbits, so the cutaway, asset detail and lighting are all
 * composed for this single angle.
 *
 * Options the card supplies: `markers` ([{node, x, y, floorId, entity?, height?}],
 * DOM nodes this view places and hides), `onLightClick(floorId, entityId)`,
 * `quality`, `hideLightFixtures`, `hideRadiators`, `hideExtractionFans`, `daylight` (0 for
 * the evening scene to 1 for full day), `blindStates` (saved closed blinds by key) and
 * `storeyOffset` when `input` is not the lowest storey, and `spreadOrder` (`compact` or
 * `ground-left`) for the direction the stacked storeys slide apart.
 * Standalone extras: `azimuth` (radians; the default looks from the south-east),
 * `forecast` ({temperature, high, low, humidity, wind} as display text),
 * `readouts` and `clock` (built-in room readouts and clock, both off by default),
 * `alwaysRender` to keep drawing in a hidden document, and the layout tunings
 * `partition`, `gap`, `margin`, `spreadMargin` and `explode`.
 * The returned element has `update(states, options)`, `dispose()` and `stats()`.
 * Without WebGL it returns the 2D plan of the first storey instead.
 */
export function renderDiorama(input,states,options={}){
  const floors=[].concat(input),house=floors.length>1;
  // `plan-3d` asks the card to give this view the whole stage rather than a letterboxed plan.
  const plan=element('div',{className:'plan plan-3d plan-diorama'});plan.style.cssText=`position:relative;width:100%;height:100%;overflow:hidden;background:${STAGE};container-type:size`;
  const flat=text=>{const fallback=renderPlan(floors[0],states,{...options,mode:'clean'});fallback.prepend(element('p',{className:'hint',text}));fallback.update ||= ()=>{};fallback.dispose ||= ()=>{};return fallback;};
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});}
  catch{return flat('3D is unavailable on this device. Showing the 2D floorplan.');}
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.domElement.style.cssText='width:100%;height:100%;display:block';renderer.domElement.setAttribute('aria-label','Illustrated floorplan');plan.append(renderer.domElement);
  const scene=new THREE.Scene(),ink=createInk(renderer,{stage:STAGE}),assets=createAssets(),overlay=createOverlay(plan,{compact:house,clock:options.clock===true}),reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const azimuth=options.azimuth??Math.PI/4,towards=new THREE.Vector3(Math.sin(azimuth),0,Math.cos(azimuth));

  // Night base: cool, never black, so warm lamps have something to push against.
  const sky=new THREE.HemisphereLight('#8793c8','#54413a',.92);scene.add(sky);
  // The same key light is the moon in the evening and the sun by day.
  const moon=new THREE.DirectionalLight('#8da2dc',.3);moon.position.copy(towards).multiplyScalar(4).add(new THREE.Vector3(-towards.z*3,7,towards.x*3));scene.add(moon);
  // A soft fill from the viewer keeps the backs of foreground furniture readable.
  const fill=new THREE.DirectionalLight('#d8c2ad',.7);fill.position.copy(towards).multiplyScalar(5).setY(3.2);scene.add(fill);

  const haloMap=halo(),lights=[],animated=[],televisions=[],shells=[],pills=[],storeys=[],targets=[],fittingHeights=new Map(),doors=[],radiators=[],printers=[],sensors=[],artworks=[],frames=[],windows=[];
  function glowSprite(parent,at,size){
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:haloMap,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:0}));
    sprite.position.copy(at);sprite.scale.setScalar(size);sprite.layers.set(1);parent.add(sprite);return sprite;
  }
  const lambert=colour=>new THREE.MeshLambertMaterial({color:colour});
  const planPosition=floor=>{const {width,depth}=floorDimensions(floor);return (p,y=0)=>new THREE.Vector3((p[0]/100-.5)*width,y,(p[1]/100-.5)*depth);};
  const stairsOf=floor=>(floor?.objects||[]).filter(o=>o.type==='stairs'),ceilingOf=floor=>Math.max(2.4,...(floor.walls||[]).map(w=>w.height||2.4));
  let elevation=0,ghosts=0;
  // Lamps are painted into a light map rather than added as real lights: see diorama-lightmap.js.
  const lightmap=createLightmap(floors.map(floor=>{const base=elevation;elevation+=ceilingOf(floor)+SLAB+(options.explode||0);return {...floorDimensions(floor),base};}));elevation=0;
  floors.forEach((floor,index)=>{
    const ceiling=ceilingOf(floor),pitch=ceiling+SLAB,below=floors[index-1],arriving=stairsOf(below),top=house&&index===floors.length-1;
    // Every flight from the storey below needs its well cut through this slab.
    const shell=buildShell(floor,towards,{holes:arriving.map(o=>stairFootprint(o,planPosition(below))),partition:options.partition});
    shell.group.position.y=elevation;scene.add(shell.group);shells.push(shell);for(const door of shell.doors)doors.push({...door,glide:createGlide(AJAR)});const {position}=shell,base=elevation;
    const pool=(point,radius)=>{const room=(floor.rooms||[]).find(r=>insidePolygon(point[0],point[1],r.points)),at=position(point);return lightmap.add({storey:index,x:at.x,z:at.z,radius,clip:room?.points.map(p=>{const v=position(p);return [v.x,v.z];})});};elevation+=pitch+(options.explode||0);
    for(const entry of shell.windows){
      const key=JSON.stringify([floor.id,entry.wall.sourceWallId||entry.wall.id,entry.opening.id]),light=pool(entry.point,1.5+entry.width*.8);light.colour=[208,225,255];
      windows.push({...entry,key,index,pool:light,local:entry.centre,glide:createGlide(options.blindStates?.[key]===true?1:0,1400)});
    }
    const overhead=o=>stairsOf(floor).some(own=>position([own.x,own.y]).distanceTo(planPosition(below)([o.x,o.y]))<1.2);
    for(const o of arriving)if(top||!overhead(o)){const guard=stairGuard(o);guard.position.copy(planPosition(below)([o.x,o.y]));shell.group.add(guard);}

    for(const [i,marker] of (floor.entities||[]).filter(e=>e.entity.startsWith('light.')&&!(floor.objects||[]).some(o=>o.light_entity===e.entity)).entries()){
      // Anything that is not a pendant is treated as a ceiling light: a pool with no fitting.
      const pendant=marker.fixture==='pendant';
      const height=marker.height_m??(pendant?ceiling-.3:ceiling-.04),at=position([marker.x,marker.y],height),entry={id:marker.entity,phase:(index*7+i)*1.9};
      targets.push({floorId:floor.id,id:marker.entity,index,local:at});fittingHeights.set(`${floor.id}:${marker.entity}`,height);
      if(pendant&&!options.hideLightFixtures){
        const fitting=new THREE.Group();fitting.position.copy(at);shell.group.add(fitting);
        const cord=new THREE.Mesh(new THREE.CylinderGeometry(.007,.007,ceiling-height,6),lambert('#2b2726'));cord.position.y=(ceiling-height)/2+.12;fitting.add(cord);
        const shade=new THREE.Mesh(new THREE.LatheGeometry([[.03,.14],[.05,.13],[.15,.02],[.17,-.02]].map(([r,y])=>new THREE.Vector2(r,y)),24),new THREE.MeshLambertMaterial({color:'#d9b27a',side:THREE.DoubleSide,emissive:'#ffb866',emissiveIntensity:0}));fitting.add(shade);
        const bulb=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),new THREE.MeshBasicMaterial({color:'#3a332c'}));bulb.position.y=.02;fitting.add(bulb);
        entry.pool=pool([marker.x,marker.y],3.9);entry.power=.92;
        entry.sprite=glowSprite(shell.group,at,1.5);entry.shade=shade;entry.bulb=bulb;
      }else{entry.pool=pool([marker.x,marker.y],pendant?3.9:2.7);entry.power=.9;}
      lights.push(entry);
    }
    // A room light with no marker and no lamp still lights its room, from the middle.
    for(const room of floor.rooms||[])for(const id of room.lights||[]){
      if((floor.entities||[]).some(e=>e.entity===id)||(floor.objects||[]).some(o=>o.light_entity===id)||!room.points?.length)continue;
      const centre=room.points.reduce((a,p)=>[a[0]+p[0]/room.points.length,a[1]+p[1]/room.points.length],[0,0]);
      lights.push({id,phase:lights.length*1.1,power:.85,pool:pool(centre,3.4)});
    }

    for(const object of floor.objects||[]){
      const at=position([object.x,object.y],object.elevation_m||0);
      if(object.type==='stairs'){
        // On the top storey a stairs object only marks the well; its guard is already in place.
        // A flight above the lowest storey always spans a well, even when that storey is shown alone.
        if(!top){const flight=stairFlight(object,pitch,{open:object.variant==='understairs'||arriving.length>0||(options.storeyOffset||0)+index>0});flight.position.copy(at);shell.group.add(flight);}
        continue;
      }
      // There is no ceiling to carry a ceiling fitting.
      if(object.type==='extractor_fan'&&(object.variant!=='wall'||options.hideExtractionFans))continue;
      if(object.type==='radiator'&&options.hideRadiators)continue;
      const fixture=['lamp','wall_light','nanoleaf_panels','tv_lightstrip'].includes(object.type);
      const model=assets.build(object),middle=at.clone().setY(at.y+(object.height||.3)/2);
      // Something hung on a wall that has been cut down below it would float in mid-air, so
      // it is drawn as a ghost: still there to read, and never hiding the room behind it.
      if(isHung(object)){const wall=nearestWall(at,shell.walls);if(wall.distance<.45&&wall.height<(object.elevation_m||0)+(object.height||.3)*.8){ghost(model);ghosts++;}}
      model.position.copy(at);shell.group.add(model);if(fixture&&options.hideLightFixtures)model.visible=false;
      if(model.userData.animate)animated.push({object,model});
      if(object.type==='picture'){
        // A frame that can change picture or turn on its side stays a separate, clickable model.
        const turning=!!(object.media_entity||object.artwork_portrait_image);if(turning)model.userData.live=true;
        const art=artwork3D(object,model,options.viewState||={},`${floor.id}:${object.id}`,()=>{last=0;schedule();});artworks.push(art);
        if(turning)frames.push({art,index,local:middle});
      }
      if(object.type==='printer_3d'&&object.status_entity){model.userData.live=true;printers.push({object,model});}
      if(object.presence_entities?.length){const leds=[];model.traverse(node=>{if(node.userData.presenceLED)leds.push(node.material);});const sprite=glowSprite(shell.group,middle,.2);sprite.material.color.set('#57e0a8');sensors.push({object,leds,sprite});}
      if(object.type==='radiator'&&radiatorEntity(object,floor)){
        const sprite=glowSprite(shell.group,middle,Math.max(.7,(object.width||1)*.95));sprite.material.color.set('#ff6a35');
        const warmth=pool([object.x,object.y],1.3);warmth.colour=[255,112,58];radiators.push({id:radiatorEntity(object,floor),sprite,pool:warmth,glide:createGlide(0,1200),phase:radiators.length*1.7});
      }
      // A strip synced to a TV takes its colour from the picture; any other lit object has its own pool.
      const patterned=object.type==='tv_lightstrip'&&!!object.pattern_entity;
      if((object.light_entity||patterned)&&!(object.type==='tv_lightstrip'&&object.sync_media_entity)){
        const glow=model.userData.glow,centre=at.clone().setY(at.y+(glow?glow.height:(object.height||.3)/2));
        if(object.light_entity){targets.push({floorId:floor.id,id:object.light_entity,index,local:centre});fittingHeights.set(`${floor.id}:${object.light_entity}`,centre.y);}
        const entry={id:object.light_entity,fixedColour:glow?.colour,phase:lights.length*1.3,power:.7,emitters:[],pool:pool([object.x,object.y],1.5)};
        if(!glow)model.traverse(node=>{if(node.material?.emissive&&(!['wall_light','lamp'].includes(object.type)||node.userData.lightEmitter))entry.emitters.push(node.material);});
        if(object.type==='nanoleaf_panels'&&object.panel_effect&&object.panel_effect!=='static')entry.effect=object.panel_effect;
        // An addressable strip lights part of its length; its pool follows the lit part.
        if(patterned)entry.strip={object,model,x:entry.pool.x,z:entry.pool.z,axis:[Math.cos(model.rotation.y),-Math.sin(model.rotation.y)]};
        if(!options.hideLightFixtures)entry.sprite=glowSprite(shell.group,centre,.7);lights.push(entry);
      }
      if(object.type==='tv'&&object.media_entity){
        const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;const context=canvas.getContext('2d',{willReadFrequently:true}),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
        const screens=[];model.traverse(node=>{if(node.userData.tvScreen){node.material.map=texture;screens.push(node);}});
        // The picture throws its own shifting light into the room and onto the wall behind.
        const facing=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),model.rotation.y);
        const {width,depth}=shell,ahead=at.clone().addScaledVector(facing,1.1),spill=pool([(ahead.x/width+.5)*100,(ahead.z/depth+.5)*100],2.7),back=pool([object.x,object.y],1.2);
        const strip=(floor.objects||[]).find(o=>o.type==='tv_lightstrip'&&o.sync_media_entity===object.media_entity);
        const tv={object,context,canvas,texture,screens,spill,back,strip,sprite:glowSprite(shell.group,middle.clone().addScaledVector(facing,.32),(object.width||1.4)*1.35),bucket:-1,colour:new THREE.Color(),started:performance.now()};
        // Saved stills replace the generated films; each shows for five minutes.
        tv.slides=tvSlideshow(object.tv_scenes,()=>{tv.bucket=-1;last=0;schedule();});if(tv.slides.count)tv.timer=setInterval(()=>{last=0;schedule();},300000);
        televisions.push(tv);
      }
    }
    consolidate(shell.group);lightmap.tag(shell.group,index);
    const storey={floor,index,position,group:shell.group,home:new THREE.Vector3(0,base,0),away:new THREE.Vector3(0,base,0),corners:[],width:shell.width,depth:shell.depth};storeys.push(storey);
    for(const room of floor.rooms||[]){
      for(const p of room.points)for(const y of [-SLAB,ceiling])storey.corners.push(position(p,y));
      if(room.temperature_entity||room.humidity_entity){const local=position(room.readout||room.points.reduce((a,p)=>[a[0]+p[0]/room.points.length,a[1]+p[1]/room.points.length],[0,0]),house?1.3:2.1);pills.push({room,index,local,anchor:()=>local.clone().add(shell.group.position)});}
    }
  });

  scene.traverse(node=>{for(const material of [node.material].flat())if(material)lightmap.apply(material);});
  // The angle is fixed for good; only the framing changes, between the stack and the spread.
  // Spread: storeys slide sideways across the view, each keeping its true height, so they
  // step up across the screen. diorama-spread.js chooses the direction and the stride.
  const layout=spreadLayout({towards:[towards.x,towards.z],pitch:storeys.length>1?storeys[1].home.y-storeys[0].home.y:0,footprint:[Math.max(...storeys.map(s=>s.width)),Math.max(...storeys.map(s=>s.depth))],count:storeys.length,gap:options.gap,order:options.spreadOrder});
  for(const storey of storeys){const [x,z]=layout.offsets[storey.index];storey.away.x+=x;storey.away.z+=z;}
  plan.dataset.spreadDirection=String(layout.direction);
  const cornersAt=key=>storeys.flatMap(storey=>storey.corners.map(p=>p.clone().add(storey[key])));
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,200),centre=new THREE.Box3().setFromPoints(cornersAt('home')).getCenter(new THREE.Vector3());
  camera.position.copy(centre).add(new THREE.Vector3(towards.x*Math.cos(ELEVATION),Math.sin(ELEVATION),towards.z*Math.cos(ELEVATION)).multiplyScalar(100));camera.lookAt(centre);camera.updateMatrixWorld();
  const boundsOf=key=>new THREE.Box2().setFromPoints(cornersAt(key).map(p=>{const v=p.applyMatrix4(camera.matrixWorldInverse);return new THREE.Vector2(v.x,v.y);})),bounds={home:boundsOf('home'),away:boundsOf('away')};
  function fit(box,aspect,margin){
    const size=box.getSize(new THREE.Vector2()),middle=box.getCenter(new THREE.Vector2()),half=Math.max(size.x/aspect,size.y)*.5*margin;
    // Nudge the picture down a little so the weather block has clear sky.
    return [middle.x-half*aspect,middle.x+half*aspect,middle.y+half*1.08,middle.y-half*.92];
  }
  // `reserved` is the share of the width, on the right, that a host panel covers. The
  // picture is fitted into the rest and the view simply extends under the panel.
  let reserved=0;
  function frame(aspect,spread){
    const free=1-reserved,a=fit(bounds.home,aspect*free,options.margin??1.07),b=fit(bounds.away,aspect*free,options.spreadMargin??1.12),mix=i=>a[i]+(b[i]-a[i])*spread;
    camera.left=mix(0);camera.right=camera.left+(mix(1)-camera.left)/free;camera.top=mix(2);camera.bottom=mix(3);camera.updateProjectionMatrix();
    // Published so a host page can tell the view has been sized and framed.
    // In the whole-house view markers shrink with the drawing once a metre is too small to keep them apart.
    if(house){const scale=Math.max(.6,Math.min(1,(width||plan.clientWidth)/(camera.right-camera.left)/MARKER_METRE)).toFixed(2);if(scale!==scaled){scaled=scale;plan.style.setProperty('--fp-storey-scale',scale);}}
    plan.dataset.fittedBounds=JSON.stringify([camera.left,camera.right,camera.top,camera.bottom].map(n=>+n.toFixed(3)));
  }
  overlay.setLabels(house?storeys.map(storey=>{const local=new THREE.Vector3(Math.sign(towards.x)*storey.width/2,-SLAB,Math.sign(towards.z)*storey.depth/2);return {text:storey.floor.name||storey.floor.id,anchor:()=>local.clone().add(storey.group.position)};}):[]);

  // In the stack, a point is covered when its sight line to the camera meets the floor of a
  // storey above. A readout or marker there would appear to label the wrong floor.
  const covered=(index,local)=>coveredPoint([local.x,local.y,local.z],storeys[index].home.y,storeys.slice(index+1).map(above=>({base:above.home.y,width:above.width,depth:above.depth,rooms:above.floor.rooms})),[towards.x,towards.z],{slab:SLAB});
  for(const target of targets)target.covered=covered(target.index,target.local);
  for(const pill of pills)pill.covered=covered(pill.index,pill.local);
  for(const frame of frames)frame.covered=covered(frame.index,frame.local);
  const blinds=windows.filter(entry=>entry.blind);for(const blind of blinds)blind.covered=covered(blind.index,blind.local);
  const reading=(id,digits,unit)=>{const value=Number(states[id]?.state);return id&&Number.isFinite(value)?`${value.toFixed(digits)}${unit}`:'';};
  function readouts(){
    overlay.setWeather(options.forecast);
    overlay.setPills((options.readouts===true?pills:[]).map(({room,anchor,covered})=>({anchor,covered,facts:[['temperature',reading(room.temperature_entity,1,' °C')],['humidity',reading(room.humidity_entity,1,'%')],['air',reading(room.co2_entity,0,' ppm')]].filter(([,text])=>text)})).filter(p=>p.facts.length));
  }

  let frameId=0,disposed=false,visible=true,last=0,width=0,height=0,refit=false,pace=32,called=0,drew=false,strikes=0,quick=0,settle=performance.now()+1500;const START_PACE=250;
  // Spread state: hovering opens the stack, a click or Enter pins it open.
  let hoverTimer=0,hovering=false,pinned=false,spread=0,spreadFrom=0,spreadStart=-1e9;const SPREAD_MS=850,HOVER_MS=350;plan.dataset.spread='0';
  const wanted=()=>house&&(pinned||hovering)?1:0,ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
  function retarget(){const now=performance.now(),target=wanted();if(target!==Math.round(spreadGoal)){spreadFrom=spread;spreadGoal=target;spreadStart=now;}plan.dataset.spread=String(target);renderer.domElement.setAttribute('aria-pressed',String(!!pinned));last=0;schedule();}
  let spreadGoal=0;
  const colour=new THREE.Color(),grades={sky:['#8793c8','#e4ecff'],ground:['#54413a','#b7a68f'],key:['#8da2dc','#fff0d2'],stage:[STAGE,DAY_STAGE]},daylight=createGlide(Math.max(0,Math.min(1,options.daylight||0)),2500);
  for(const pair of Object.values(grades))pair.splice(0,2,new THREE.Color(pair[0]),new THREE.Color(pair[1]));
  // Evening is the resting look. Daylight brightens and cools the room light, washes the
  // lamps out and lifts the stage; windows let it in unless their blind is down.
  let graded=-1,scaled='';
  function grade(now){
    const day=daylight(Math.max(0,Math.min(1,options.daylight||0)),now,reducedMotion);
    sky.color.lerpColors(...grades.sky,day);sky.groundColor.lerpColors(...grades.ground,day);sky.intensity=.92+.5*day;
    moon.color.lerpColors(...grades.key,day);moon.intensity=.3+.8*day;fill.intensity=.7-.2*day;lightmap.setGain(1-.5*day);
    // The host watches this element's style, so it is written only when the grade moves.
    if(day!==graded){graded=day;colour.lerpColors(...grades.stage,day);ink.setStage(colour);plan.style.background='#'+colour.getHexString();plan.dataset.daylight=day.toFixed(2);}
    let closed=0;
    for(const entry of windows){
      const down=options.blindStates?.[entry.key]===true&&!!(entry.blind||entry.rooflight),value=entry.glide(down?1:0,now,reducedMotion);if(down)closed++;
      if(entry.blind)entry.blind.scale.y=.28+.72*value;
      entry.pool.level=day*.62*(1-.9*value);
    }
    plan.dataset.blindsClosed=String(closed);
  }
  // Lamp, lava and TV levels for this instant, written to the light map sources and materials.
  function animate(now,t){
    grade(now);
    for(const entry of lights){
      let target=lightAppearance(states[entry.id]);
      if(entry.strip){const {object,model,x,z,axis}=entry.strip,lit=updateStrip(model,object,states);target={level:lit.level*lit.fraction,colour:lit.colour};entry.pool.x=x+axis[0]*lit.centre*object.width;entry.pool.z=z+axis[1]*lit.centre*object.width;}
      const appearance=(entry.fade||=createFade())(target,now,reducedMotion),level=appearance.level;
      // Two slow sines read as a living filament rather than a strobe.
      const breathe=reducedMotion?1:1+.035*Math.sin(t*1.9+entry.phase)+.02*Math.sin(t*4.7+entry.phase*2.3);
      if(entry.fixedColour)colour.copy(entry.fixedColour);else colour.setRGB(appearance.colour[0]/255,appearance.colour[1]/255,appearance.colour[2]/255,THREE.SRGBColorSpace);
      entry.pool.colour=entry.fixedColour?[colour.r,colour.g,colour.b].map(v=>new THREE.Color(v,v,v).convertLinearToSRGB().r*255):appearance.colour;entry.pool.level=level*entry.power*breathe;
      if(entry.sprite){entry.sprite.material.color.copy(colour);entry.sprite.material.opacity=level*.9*breathe;}
      for(const material of entry.emitters||[]){
        if(entry.effect&&!reducedMotion){const panel=panelFrame(entry.effect,material.userData.panelIndex||0,entry.emitters.length,now,appearance);material.emissive.setRGB(panel.colour[0]/255,panel.colour[1]/255,panel.colour[2]/255,THREE.SRGBColorSpace);material.emissiveIntensity=panel.level*1.1;}
        else{material.emissive.copy(colour);material.emissiveIntensity=level*1.1;}
      }
      if(entry.shade){entry.shade.material.emissive.copy(colour);entry.shade.material.emissiveIntensity=level*.55*breathe;if(level)entry.bulb.material.color.copy(colour);else entry.bulb.material.color.set('#3a332c');}
    }
    for(const {object,model} of animated)model.userData.animate(t,lightAppearance(states[object.light_entity]).level);
    for(const tv of televisions){
      const on=tvIsOn(states[tv.object.media_entity]),stills=tv.slides.count,bucket=on?(stills?1e9+tvSceneIndex(now-tv.started,stills):Math.floor(now/100)):-2;
      if(bucket!==tv.bucket){tv.bucket=bucket;
        if(!on){tv.context.fillStyle='#05080b';tv.context.fillRect(0,0,tv.canvas.width,tv.canvas.height);}
        else if(stills)tv.slides.draw(tv.context,tv.canvas.width,tv.canvas.height,now-tv.started);
        else drawTVFrame(tv.context,tv.canvas.width,tv.canvas.height,reducedMotion?0:now);
        tv.texture.needsUpdate=true;
        const data=tv.context.getImageData(0,0,tv.canvas.width,tv.canvas.height).data,sum=[0,0,0];let count=0;
        for(let i=0;i<data.length;i+=4*997){sum[0]+=data[i];sum[1]+=data[i+1];sum[2]+=data[i+2];count++;}
        tv.colour.setRGB(sum[0]/count/255,sum[1]/count/255,sum[2]/count/255,THREE.SRGBColorSpace);
      }
      // Soft, irregular shimmer on top of the picture's own colour drift; a still holds steady.
      const flicker=on?(reducedMotion||stills?1:.86+.09*Math.sin(t*7.3)+.05*Math.sin(t*17.1+1.3)):0,stripLevel=tv.strip?lightAppearance(states[tv.strip.light_entity]).level:0;
      const hsl={};tv.colour.getHSL(hsl);colour.setHSL(hsl.h,Math.min(1,hsl.s*1.5+.15),Math.max(.45,hsl.l));
      const srgb=colour.clone().convertLinearToSRGB(),rgb=[srgb.r*255,srgb.g*255,srgb.b*255];tv.spill.colour=rgb;tv.spill.level=flicker*.8;tv.back.colour=rgb;tv.back.level=flicker*stripLevel*.9;
      tv.sprite.material.color.copy(colour);tv.sprite.material.opacity=flicker*.3;
      for(const screen of tv.screens)screen.material.color.setScalar(on?.82+flicker*.2:1);
    }
    // A monitored door stands open or shut with its contact; one whose state is unknown rests ajar.
    let open=0;
    for(const door of doors){const status=doorState(door.opening,states);if(status==='Open')open++;door.hinge.rotation.y=-door.side*door.glide(status==='Open'?OPEN:status==='Closed'?0:AJAR,now,reducedMotion);}
    plan.dataset.doorsOpen=String(open);
    for(const radiator of radiators){
      const heat=radiator.glide(heatingState(states[radiator.id])==='heating'?1:0,now,reducedMotion),pulse=reducedMotion?1:1+.07*Math.sin(t*1.3+radiator.phase);
      radiator.sprite.material.opacity=heat*.5*pulse;radiator.pool.level=heat*.3*pulse;
    }
    plan.dataset.radiatorsHeating=String(radiators.filter(radiator=>heatingState(states[radiator.id])==='heating').length);
    for(const {object,model} of printers)updatePrinter3D(model,object,states,now,reducedMotion);
    plan.dataset.printerStates=JSON.stringify(printers.map(printer=>printer.model.userData.printerStatus));
    for(const sensor of sensors){
      const active=sensor.object.presence_entities.some(id=>states[id]?.state==='on');sensor.sprite.material.opacity=active?.85:0;
      for(const led of sensor.leds){led.color.set(active?'#57c7a0':'#576873');led.emissive.set(active?'#269f72':'#000000');}
    }
  }
  function draw(now){
    frameId=0;if(disposed||!visible||document.hidden&&!options.alwaysRender)return;
    const moving=spread!==spreadGoal;
    if(!reducedMotion||moving)frameId=requestAnimationFrame(draw);
    // Lamps tick at about 30 fps; the spread itself runs at the display rate. If the frame
    // after a drawn one arrives late, the graphics cannot keep up (a software renderer, an
    // old tablet), so the ambient tick backs off until the page stays responsive.
    const late=now-called;called=now;
    // A clearly slow frame backs off at once. A mildly late one counts only when repeated and
    // not during start-up, when shader compilation makes a fast device look slow; a start-up
    // hitch is also capped, so one long compile cannot park a capable GPU at the slowest tick.
    // Two prompt frames in a row prove the hitch has passed and restore the full rate.
    if(drew){drew=false;
      if(late>120||late>50&&(now>settle&&++strikes>=2)){quick=0;pace=Math.min(now>settle?2000:START_PACE,Math.max(pace*1.7,late*3));}
      else if(late<=50){strikes=0;if(late<24)pace=++quick>=2?32:Math.max(32,pace*.5);else quick=0;}
    }
    plan.dataset.pace=String(Math.round(pace));
    if(now-last<pace&&!reducedMotion&&!moving)return;last=now;drew=true;
    const w=plan.clientWidth,h=plan.clientHeight;if(!w||!h)return;
    if(w!==width||h!==height||refit){refit=false;width=w;height=h;renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,options.quality==='low'?1:2));renderer.setSize(w,h,false);frame(w/h,ease(spread));}
    if(moving){
      const linear=reducedMotion?1:Math.min(1,(now-spreadStart)/SPREAD_MS);spread=spreadFrom+(spreadGoal-spreadFrom)*linear;
      // Storeys leave one after another, outermost first, and settle together.
      for(const storey of storeys){const lag=storeys.length>1?(1-Math.abs(storey.index-(storeys.length-1)/2)/((storeys.length-1)/2))*.18:0,local=ease(Math.max(0,Math.min(1,(spread-lag*(spreadGoal?1:0))/(1-lag*(spreadGoal?1:0)))));
        storey.group.position.lerpVectors(storey.home,storey.away,local);lightmap.setShift(storey.index,storey.group.position.x,storey.group.position.z);}
      frame(w/h,ease(spread));
    }
    const t=reducedMotion?0:now/1000;animate(now,t);
    for(const marker of markers){
      const storey=storeys.find(s=>s.floor.id===marker.floorId)||storeys[0],p=marker.local.clone().add(storey.group.position).project(camera);
      marker.node.style.left=`${(p.x*.5+.5)*100}%`;marker.node.style.top=`${(-p.y*.5+.5)*100}%`;marker.node.hidden=marker.covered&&spread<.6;
    }
    lightmap.draw();overlay.layout(camera,spread);ink.render(scene,camera,t);
  }
  const schedule=()=>{if(!frameId&&!disposed)frameId=requestAnimationFrame(draw);};
  let markers=[];
  function update(nextStates,nextOptions={}){
    states=nextStates;options={...options,...nextOptions};if(fallback){fallback.update?.(states,options);return;}
    // Keep an unchanged room readout's node in place so focus and open panels survive a refresh.
    const previous=new Map(markers.filter(m=>m.node.matches('.room-readout')).map(m=>[`${m.floorId}:${m.node.dataset.roomId}`,m])),next=(options.markers||[]).filter(marker=>storeys.some(s=>s.floor.id===marker.floorId)),retained=new Set();
    for(const marker of next){
      const storey=storeys.find(s=>s.floor.id===marker.floorId),height=marker.height??fittingHeights.get(`${marker.floorId}:${marker.entity}`)??.35;
      marker.local=storey.position([marker.x,marker.y],height);marker.covered=covered(storey.index,marker.local);
      if(!marker.node.matches('.room-readout'))continue;
      const signature=marker.node.outerHTML,old=previous.get(`${marker.floorId}:${marker.node.dataset.roomId}`);
      if(old?.signature===signature){marker.node=old.node;retained.add(old.node);}
      marker.signature=signature;
    }
    for(const marker of markers)if(!retained.has(marker.node))marker.node.remove();
    markers=next;let anchor=null;
    for(let i=markers.length-1;i>=0;i--){const node=markers[i].node;if(!retained.has(node))plan.insertBefore(node,anchor);anchor=node;}
    for(const art of artworks)art.update(states);
    readouts();last=0;schedule();
  }
  // A click on a lamp switches it, a turning frame swaps between landscape and portrait as it
  // does on the wall, and a blind draws or opens; anywhere else pins the spread or lets it close.
  const nearest=(event,list)=>{
    const rect=renderer.domElement.getBoundingClientRect();let best=null,reach=28;
    for(const target of list){
      if(target.covered&&spread<.6)continue;
      const p=target.local.clone().add(storeys[target.index].group.position).project(camera),distance=Math.hypot((p.x*.5+.5)*rect.width+rect.left-event.clientX,(-p.y*.5+.5)*rect.height+rect.top-event.clientY);
      if(distance<reach){reach=distance;best=target;}
    }
    return best;
  };
  renderer.domElement.addEventListener('click',event=>{
    const light=options.onLightClick&&nearest(event,targets),frame=!light&&nearest(event,frames),blind=!light&&!frame&&nearest(event,blinds);
    if(light)options.onLightClick(light.floorId,light.id);else if(frame){frame.art.toggle();options.onViewChange?.();}
    else if(blind){(options.blindStates||={})[blind.key]=options.blindStates[blind.key]!==true;options.onViewChange?.();last=0;schedule();}
    else if(house){pinned=!pinned;retarget();}
  });
  let fallback;
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();dispose();fallback=flat('3D graphics were interrupted. Showing 2D.');plan.replaceChildren(fallback);});
  if(house){
    const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','button');canvas.setAttribute('aria-label','Illustrated floorplan. Activate to spread the floors apart or stack them again.');canvas.style.cursor='pointer';
    // Hover opens the stack only once the pointer has rested on the drawing itself. Opening
    // at once moved the floors out from under a pointer on its way to a marker.
    const rest=e=>{clearTimeout(hoverTimer);if(e.pointerType!=='mouse'||hovering||e.target!==canvas)return;hoverTimer=setTimeout(()=>{hovering=true;retarget();},HOVER_MS);};
    plan.addEventListener('pointermove',rest);
    plan.addEventListener('pointerleave',()=>{clearTimeout(hoverTimer);if(hovering){hovering=false;retarget();}});
    canvas.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pinned=!pinned;retarget();}else if(e.key==='Escape'&&pinned){pinned=false;retarget();}});
  }
  const resize=new ResizeObserver(()=>{last=0;schedule();});resize.observe(plan);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();});intersection.observe(plan);
  const visibility=()=>{if(!document.hidden){settle=performance.now()+1500;schedule();}};document.addEventListener('visibilitychange',visibility);
  function dispose(){
    fallback?.dispose?.();if(disposed)return;disposed=true;cancelAnimationFrame(frameId);clearTimeout(hoverTimer);resize.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);
    const geometries=new Set(),materials=new Set();scene.traverse(node=>{node.shadow?.dispose();if(node.geometry)geometries.add(node.geometry);for(const m of [node.material].flat())if(m)materials.add(m);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>{m.map?.dispose();m.dispose();});
    for(const art of artworks)art.dispose();for(const tv of televisions){clearInterval(tv.timer);tv.slides.dispose();}
    haloMap.dispose();lightmap.dispose();for(const shell of shells)shell.dispose();assets.dispose();overlay.dispose();ink.dispose();renderer.dispose();
  }
  /** Keep the picture clear of `pixels` of host UI along the right edge of the stage. */
  plan.reserve=pixels=>{const share=Math.max(0,Math.min(.5,pixels/(plan.clientWidth||1)));if(share!==reserved){reserved=share;refit=true;last=0;schedule();}};
  // Inspection hooks for tests and tuning: WebGL pixels cannot be read back reliably.
  plan.sampleLight=(floorId,point)=>{const storey=storeys.find(s=>s.floor.id===floorId);if(!storey)return null;const now=performance.now();animate(now,reducedMotion?0:now/1000);lightmap.draw();const at=storey.position(point);return lightmap.sample(storey.index,at.x,at.z);};
  plan.stats=()=>{let meshes=0;scene.traverse(node=>{if(node.isMesh)meshes++;});return {ceilings:shells.flatMap(shell=>shell.group.children.filter(node=>node.userData.ceiling).map(node=>node.userData.ceiling)),televisions:televisions.map(tv=>({id:tv.object.id,on:tvIsOn(states[tv.object.media_entity])})),slideshows:televisions.filter(tv=>tv.slides.count).length,ghosts,meshes,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,programs:renderer.info.programs.length};};
  plan.update=update;plan.dispose=dispose;update(states,options);return plan;
}

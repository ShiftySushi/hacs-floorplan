import * as THREE from 'three';
import {element} from './dom.js';
import {renderPlan} from './plan.js';
import {createInk} from './diorama-ink.js';
import {createRig} from './diorama-rig.js';
import {exterior3D} from './exterior3d.js';
import {weather3D} from './weather3d.js';
import {ELEVATION} from './diorama-cutaway.js';

/**
 * The outside of the home, drawn from the same fixed angle and in the same ink and
 * light as the interior. `exterior` is the scene's site model; `floor` is only used
 * for the 2D fallback when WebGL is unavailable.
 *
 * Options the card supplies: `markers` ([{node, world: [x, y, z]}]; markers without
 * `world` belong to a storey and are not shown here), `daylight`, `weather`, `quality`
 * and `azimuth`. The returned element has `update(states, options)` and `dispose()`.
 */
export function renderExterior(exterior,floor,states,options={}){
  const plan=element('div',{className:'plan plan-3d plan-exterior'});plan.style.cssText='position:relative;width:100%;height:100%;overflow:hidden;container-type:size';
  const flat=text=>{const fallback=renderPlan(floor,states,{...options,mode:'clean'});fallback.prepend(element('p',{className:'hint',text}));fallback.update ||= ()=>{};fallback.dispose ||= ()=>{};return fallback;};
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});}
  catch{return flat('3D is unavailable on this device. Showing the 2D floorplan.');}
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.domElement.style.cssText='width:100%;height:100%;display:block';renderer.domElement.setAttribute('aria-label','Illustrated exterior');plan.append(renderer.domElement);
  const scene=new THREE.Scene(),ink=createInk(renderer),reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const azimuth=options.azimuth??Math.PI/4,towards=new THREE.Vector3(Math.sin(azimuth),0,Math.cos(azimuth)),
    // The site model's physically based materials need more light than the interior's to match it.
    rig=createRig(scene,towards,options.daylight,2);
  const site=exterior3D(exterior,states);scene.add(site);scene.updateMatrixWorld(true);
  // Leaf cards are cut out by their texture, which the ink pass cannot see, so they are
  // composited over the inked picture instead of being outlined as plain squares.
  site.traverse(node=>{if(node.isMesh&&node.material.alphaTest)node.layers.set(1);});
  const bounds=new THREE.Box3().setFromObject(site),shelters=[];
  if(bounds.isEmpty())bounds.set(new THREE.Vector3(-exterior.width_m/2,0,-exterior.depth_m/2),new THREE.Vector3(exterior.width_m/2,exterior.height_m,exterior.depth_m/2));
  site.traverse(node=>{if(node.isMesh){const box=new THREE.Box3().setFromObject(node);if(box.max.y>1.7&&(box.min.y>1.7||box.max.y-box.min.y>1.5))shelters.push(box);}});
  const weather=weather3D(scene,bounds,shelters);
  // Rain, snow and cloud are lines, points and sprites: they take no ink either.
  scene.getObjectByName('outdoor-weather')?.traverse(node=>{if(!node.isLight)node.layers.set(1);});

  const centre=bounds.getCenter(new THREE.Vector3()),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,400);
  camera.position.copy(centre).add(new THREE.Vector3(towards.x*Math.cos(ELEVATION),Math.sin(ELEVATION),towards.z*Math.cos(ELEVATION)).multiplyScalar(150));camera.lookAt(centre);camera.updateMatrixWorld();
  const seen=new THREE.Box2();
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const v=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);seen.expandByPoint(new THREE.Vector2(v.x,v.y));}
  // `reserved` is the share of the width, on the right, that a host panel covers. The
  // picture is fitted into the rest and the view simply extends under the panel.
  let reserved=0,refit=false;
  function frame(aspect){
    const free=1-reserved,size=seen.getSize(new THREE.Vector2()),middle=seen.getCenter(new THREE.Vector2()),half=Math.max(size.x/(aspect*free),size.y)*.5*(options.margin??1.08);
    camera.left=middle.x-half*aspect*free;camera.right=camera.left+half*aspect*2;camera.top=middle.y+half;camera.bottom=middle.y-half;camera.updateProjectionMatrix();
    plan.dataset.fittedBounds=JSON.stringify([camera.left,camera.right,camera.top,camera.bottom].map(n=>+n.toFixed(3)));
  }

  let frameId=0,timer=0,disposed=false,released=false,visible=true,width=0,height=0,markers=[],fallback,stage='';
  const schedule=()=>{if(!frameId&&!disposed)frameId=requestAnimationFrame(draw);};
  function draw(now){
    frameId=0;if(disposed||!visible||document.hidden)return;
    const w=plan.clientWidth,h=plan.clientHeight;if(!w||!h)return;
    if(w!==width||h!==height||refit){refit=false;width=w;height=h;renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,options.quality==='low'?1:2));renderer.setSize(w,h,false);frame(w/h);}
    const graded=rig.grade(options.daylight,now,reducedMotion);
    // The host watches this element's style, so the stage colour is written only when it moves.
    if(graded.stage!==stage){stage=graded.stage;ink.setStage(stage,graded.horizon);plan.style.background=stage;plan.dataset.daylight=graded.day.toFixed(2);}
    const moving=weather.update(states,options.weather||{enabled:false},now,reducedMotion)||!graded.settled;
    for(const marker of markers){const p=new THREE.Vector3(...marker.world).project(camera);marker.node.style.left=`${(p.x*.5+.5)*100}%`;marker.node.style.top=`${(-p.y*.5+.5)*100}%`;}
    ink.render(scene,camera,reducedMotion?0:now/1000);
    // Weather is the only thing that moves out here; without it the picture is redrawn on change.
    if(moving&&!reducedMotion)timer=setTimeout(schedule,66);
  }
  function update(nextStates,nextOptions={}){
    states=nextStates;options={...options,...nextOptions};if(fallback){fallback.update?.(states,options);return;}
    site.updateStates(states);
    plan.dataset.vehicleStates=JSON.stringify(site.children.filter(node=>node.userData.vehicle).map(node=>({visible:node.visible,charging:node.userData.charging,heading:node.rotation.y})));
    const next=(options.markers||[]).filter(marker=>marker.world);
    for(const marker of markers)if(!next.some(kept=>kept.node===marker.node))marker.node.remove();
    for(const marker of next)if(marker.node.parentNode!==plan)plan.append(marker.node);
    markers=next;schedule();
  }
  renderer.domElement.addEventListener('webglcontextlost',event=>{if(released)return;event.preventDefault();dispose();fallback=flat('3D graphics were interrupted. Showing 2D.');plan.replaceChildren(fallback);});
  const resize=new ResizeObserver(schedule);resize.observe(plan);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();});intersection.observe(plan);
  const visibility=()=>{if(!document.hidden)schedule();};document.addEventListener('visibilitychange',visibility);
  function dispose(){
    fallback?.dispose?.();if(disposed)return;disposed=true;released=true;cancelAnimationFrame(frameId);clearTimeout(timer);resize.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);
    const geometries=new Set(),materials=new Set();scene.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of [node.material].flat())if(material)materials.add(material);});
    geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>{material.map?.dispose();material.dispose();});ink.dispose();renderer.dispose();renderer.forceContextLoss();
  }
  /** Keep the picture clear of `pixels` of host UI along the right edge of the stage. */
  plan.reserve=pixels=>{const share=Math.max(0,Math.min(.5,pixels/(plan.clientWidth||1)));if(share!==reserved){reserved=share;refit=true;schedule();}};
  plan.update=update;plan.dispose=dispose;update(states,options);return plan;
}

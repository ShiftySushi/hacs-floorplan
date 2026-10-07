import {blendAppearance} from './light-animation.js';

export const FADE_MS=600;
const same=(a,b)=>a.level===b.level&&a.colour.every((c,i)=>c===b.colour[i]);

/**
 * Follows one light's {level, colour}. A change of target eases from whatever is
 * showing over FADE_MS; the first reading, or `instant` (reduced motion), shows at once.
 */
export function createFade(duration=FADE_MS){
  let from=null,to=null,start=0;
  return (target,now,instant=false)=>{
    if(!to||instant){from=to=target;start=now-duration;}
    else if(!same(target,to)){from=blendAppearance(from,to,(now-start)/duration);to=target;start=now;}
    return blendAppearance(from,to,(now-start)/duration);
  };
}

/** Eases a single value towards its target the same way; used for doors and radiators. */
export function createGlide(initial,duration=FADE_MS){
  let from=initial,to=initial,start=-Infinity;
  const at=now=>{const t=Math.max(0,Math.min(1,(now-start)/duration));return from+(to-from)*t*t*(3-2*t);};
  return (target,now,instant=false)=>{
    if(instant){from=to=target;return target;}
    if(target!==to){from=at(now);to=target;start=now;}
    return at(now);
  };
}

/**
 * Redraw a model as a faint ghost on the glow layer: it keeps its place and colour but
 * takes no ink and never hides what stands behind it. Used for things hung on a wall
 * that has been cut down below them.
 */
export function ghost(model,opacity=.34){
  const clones=new Map();
  model.traverse(node=>{
    if(!node.isMesh)return;
    const swap=material=>{if(!clones.has(material)){const clone=material.clone();clone.transparent=true;clone.opacity=(material.transparent?material.opacity:1)*opacity;clone.depthWrite=false;clones.set(material,clone);}return clones.get(material);};
    node.material=Array.isArray(node.material)?node.material.map(swap):swap(node.material);node.layers.set(1);node.castShadow=false;
  });
  model.userData.ghost=true;return model;
}

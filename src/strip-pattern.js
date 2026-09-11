import {lightAppearance} from './illumination.js';

// Extents are fractions of the full local X axis, before object/floor rotation.
export function stripAppearance(object,states) {
  const fallback=lightAppearance(states[object.light_entity]);
  const pattern=object.pattern_entity?states[object.pattern_entity]?.state:(fallback.level?'full-fill':'off');
  const raw=states[object.colour_entity]?.state;
  const colour=/^#[0-9a-f]{6}$/i.test(raw || '')?[1,3,5].map(i=>parseInt(raw.slice(i,i+2),16)):fallback.colour;
  let fraction=0;
  if(pattern==='center-dot')fraction=Math.min(1,.08/(object.width || 1));
  if(pattern==='full-fill')fraction=1;
  if(pattern==='progressive-fill'){
    const value=states[object.fill_entity]?.state,number=Number(value);
    if(typeof value==='string'&&value.trim()&&Number.isFinite(number))fraction=Math.max(0,Math.min(100,number))/100;
  }
  const centre=pattern==='progressive-fill'?(object.fill_direction==='right-to-left'?1:-1)*(1-fraction)/2:0;
  return {pattern,fraction,centre,colour,level:fraction?(object.pattern_entity?1:fallback.level):0};
}

export function updateStrip(model,object,states) {
  const appearance=stripAppearance(object,states);
  model.traverse(node=>{
    if(!node.userData.stripEmitter)return;
    node.visible=appearance.level>0;
    node.scale.x=Math.max(.00001,appearance.fraction);
    node.position.x=appearance.centre*object.width;
    node.material.color.setRGB(...appearance.colour.map(c=>c/255),'srgb');
    if(node.material.emissive){node.material.emissive.copy(node.material.color);node.material.emissiveIntensity=appearance.level*1.5;}
  });
  return appearance;
}

export function stripLightStates(objects,states){
  const next={...states};
  for(const object of objects)if(object.pattern_entity&&object.light_entity){const a=stripAppearance(object,states);next[object.light_entity]={state:a.level?'on':'off',attributes:{brightness:255*a.level*a.fraction,rgb_color:a.colour}};}
  return next;
}

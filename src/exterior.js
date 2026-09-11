import {validateExteriorModels} from './exterior-model.js';
export function validateExterior(exterior){
  if(exterior===undefined)return;
  if(!exterior||!Array.isArray(exterior.items)||exterior.items.length>2000)throw Error('Exterior needs a list of up to 2000 items');
  validateExteriorModels(exterior.models);
  const finite=(n,max=1000)=>Number.isFinite(n)&&Math.abs(n)<=max;
  for(const key of ['width_m','depth_m','height_m'])if(!finite(exterior[key])||exterior[key]<=0)throw Error('Exterior dimensions must be positive metres');
  const ids=new Set();
  for(const item of exterior.items){
    if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id))throw Error('Exterior items need unique ids');ids.add(item.id);
    if(!['box','surface','car','plant','light','charger','doorbell'].includes(item.type))throw Error('Choose a supported exterior item');
    if(item.glazing!==undefined&&typeof item.glazing!=='boolean')throw Error('Exterior glazing must be true or false');
    if(item.light_style!==undefined&&!['wall','spot'].includes(item.light_style))throw Error('Choose wall or spot exterior light style');
    for(const field of ['light_entity','charging_entity','connected_entity'])if(item[field]!==undefined&&(typeof item[field]!=='string'||! /^(?:light|sensor|binary_sensor|switch)\.[a-z0-9_]+$/.test(item[field])))throw Error('Use a valid exterior entity ID');
    if(item.plugged_cable!==undefined&&(!Array.isArray(item.plugged_cable)||item.plugged_cable.length<2||item.plugged_cable.length>20||item.plugged_cable.some(p=>!Array.isArray(p)||p.length!==3||p.some(n=>!finite(n,30)))))throw Error('Cable needs two to twenty local metre points');
    if(item.colour!==undefined&&!/^#[0-9a-f]{6}$/i.test(item.colour))throw Error('Use a six-digit exterior colour');
    if(item.finish!==undefined&&!['grass','asphalt','paving','brick'].includes(item.finish))throw Error('Choose a supported exterior finish');
    if(item.model!==undefined&&(typeof item.model!=='string'||!Object.hasOwn(exterior.models || {},item.model)))throw Error('Exterior model asset is missing');
    if(item.type==='surface'){
      if(!Array.isArray(item.vertices)||item.vertices.length<3||item.vertices.length>4||item.vertices.some(p=>!Array.isArray(p)||p.length!==3||p.some(n=>!finite(n))))throw Error('Exterior surfaces need three or four 3D metre coordinates');
    }else{
      for(const key of ['x','y','z'])if(!finite(item[key]))throw Error('Exterior positions must be finite metres');
      for(const key of ['width','height','depth'])if(!finite(item[key],100)||item[key]<=0)throw Error('Exterior item dimensions must be positive metres');
    }
    if(item.rotation!==undefined&&!finite(item.rotation,360))throw Error('Exterior rotation must be within 360 degrees');
  }
}

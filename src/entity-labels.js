import {element,button} from './dom.js';

export function validateLabels(floor){
  if(floor.labels===undefined)return;
  if(!Array.isArray(floor.labels)||floor.labels.length>100)throw Error('Use up to 100 labels per floor');
  const ids=new Set();
  for(const label of floor.labels){
    if(!label||typeof label.id!=='string'||!label.id||ids.has(label.id))throw Error('Labels need unique IDs');
    ids.add(label.id);
    if(![label.x,label.y].every(n=>Number.isFinite(n)&&n>=0&&n<=100))throw Error('Place labels within the floor');
    if(label.height_m!==undefined&&(!Number.isFinite(label.height_m)||label.height_m<0||label.height_m>100))throw Error('Label height must be between 0 and 100 metres');
    if(label.name!==undefined&&(typeof label.name!=='string'||label.name.length>80))throw Error('Label titles must be under 80 characters');
    if(label.room_id&&!floor.rooms.some(r=>r.id===label.room_id))throw Error('Choose a room on this floor');
    if(!Array.isArray(label.items)||label.items.length>16)throw Error('Use up to 16 entities in a label');
    for(const item of label.items){
      if(!item||typeof item.entity!=='string'||!/^[a-z_]+\.[a-z0-9_]+$/.test(item.entity))throw Error('Choose an entity for each label row');
      for(const key of ['name','attribute','unit'])if(item[key]!==undefined&&(typeof item[key]!=='string'||item[key].length>80))throw Error('Label row text must be under 80 characters');
    }
  }
}
export function labelValue(item,states){
  const state=states[item.entity];
  if(!state||['unknown','unavailable'].includes(state.state))return 'Unavailable';
  const value=item.attribute?state.attributes?.[item.attribute]:state.state;
  if(value===undefined||value===null||typeof value==='object')return 'Unavailable';
  const unit=item.unit??(item.attribute?'':state.attributes?.unit_of_measurement || '');
  return `${String(value).replaceAll('_',' ')}${unit?' '+unit:''}`;
}
export function labelMarkers(floor,states,onEntity){
  return (floor.labels || []).map(label=>{
    const title=label.name || floor.rooms.find(r=>r.id===label.room_id)?.name || '';
    const node=element('div',{className:'marker entity-label','aria-label':title || 'Entity label'});
    if(title)node.append(element('strong',{text:title}));
    for(const item of label.items){
      const name=item.name || states[item.entity]?.attributes?.friendly_name || item.entity,value=labelValue(item,states);
      node.append(button('',()=>onEntity(item.entity),{className:'entity-label-row','aria-label':`${name}: ${value}` }));
      node.lastChild.append(element('span',{text:name}),element('span',{text:value}));
    }
    if(!label.items.length)node.append(element('span',{text:'No entities assigned'}));
    return {node,x:label.x,y:label.y,height:label.height_m ?? .6,floorId:floor.id};
  });
}

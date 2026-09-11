export function sceneEntities(config){
  const ids=new Set(['sun.sun','zone.home']);
  function visit(value){
    if(typeof value==='string'){if(value.length<256&&/^[a-z_]+\.[a-z0-9_]+$/.test(value))ids.add(value);}
    else if(value&&typeof value==='object')Object.values(value).forEach(visit);
  }
  visit(config);
  for(const item of config.information?.enabled===false?[]:config.information?.items || [])if(!item.entities?.length&&!item.count_entity&&!item.names_entity&&['people','updates','low_battery'].includes(item.type))ids.add('@'+item.type);
  return ids;
}

export function sceneState(hass,ids=[]){
  const states=hass?.states || {};
  // Daylight also follows the available weather integration.
  const tracked=new Set(ids);
  const watched=new Set([...ids,...Object.keys(states).filter(id=>id.startsWith('weather.')||(tracked.has('@people')&&id.startsWith('person.'))||(tracked.has('@updates')&&id.startsWith('update.'))||(tracked.has('@low_battery')&&states[id]?.attributes?.device_class==='battery'))]);
  return JSON.stringify([hass?.config?.latitude,hass?.config?.longitude,[...watched].map(id=>[id,states[id]?.state,states[id]?.attributes])]);
}

export function sceneEntities(config){
  const ids=new Set(['sun.sun','zone.home']);
  function visit(value){
    if(typeof value==='string'){if(value.length<256&&/^[a-z_]+\.[a-z0-9_]+$/.test(value))ids.add(value);}
    else if(value&&typeof value==='object')Object.values(value).forEach(visit);
  }
  visit(config);return ids;
}

export function sceneState(hass,ids=[]){
  const states=hass?.states || {};
  // Daylight also follows the available weather integration.
  const watched=new Set([...ids,...Object.keys(states).filter(id=>id.startsWith('weather.'))]);
  return JSON.stringify([hass?.config?.latitude,hass?.config?.longitude,[...watched].map(id=>[id,states[id]?.state,states[id]?.attributes])]);
}

// Prefer a room-specific group, then matching fittings within the room.
export function lightToggleIds(config,floorId,id){
  const floor=config.floors.find(f=>f.id===floorId);if(!floor)return [id];
  const room=floor.rooms.find(r=>r.lights.includes(id));
  const groups=config.groups.filter(g=>g.entities.includes(id)&&(!room||g.entities.every(entity=>room.lights.includes(entity))));
  groups.sort((a,b)=>a.entities.length-b.entities.length);
  if(groups.length)return [...new Set(groups[0].entities)];
  const marker=floor.entities.find(e=>e.entity===id);
  if(!room||!marker||floor.objects.some(o=>o.light_entity===id))return [id];
  return floor.entities.filter(e=>room.lights.includes(e.entity)&&(e.fixture || 'bulb')===(marker.fixture || 'bulb')&&!floor.objects.some(o=>o.light_entity===e.entity)).map(e=>e.entity);
}

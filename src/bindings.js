// Rebind one HA entity everywhere as one undoable configuration change.
export function reassignEntity(config, oldId, nextId) {
  const domain = /^((?:light|sensor|binary_sensor))\.[\w]+$/;
  const oldDomain = oldId.match(domain)?.[1], nextDomain = nextId.match(domain)?.[1];
  if (!oldDomain || oldDomain !== nextDomain) throw Error('Choose an entity of the same type as this marker.');
  const affected = config.floors.filter(floor => floor.entities.some(item => item.entity === oldId));
  if (!affected.length) throw Error('This marker no longer exists. Select a marker and try again.');
  if (oldId !== nextId && affected.some(floor => floor.entities.some(item => item.entity === nextId))) throw Error('That entity already has a marker on an affected floor. Choose another entity or remove its existing marker first.');
  const result = structuredClone(config);
  const replace = list => [...new Set(list.map(id => id === oldId ? nextId : id))];
  for (const floor of result.floors) {
    for (const item of floor.objects || []) if (item.light_entity === oldId) item.light_entity = nextId;
    for (const item of floor.entities) if (item.entity === oldId) {item.entity = nextId;if(oldId!==nextId)delete item.unbound;}
    for (const room of floor.rooms || []) {
      if (room.lights) room.lights = replace(room.lights);
      if (room.presence) room.presence = replace(room.presence);
      if (room.temperature_entity===oldId)room.temperature_entity=nextId;
    }
  }
  for (const group of result.groups || []) group.entities = replace(group.entities);
  if(result.outdoor_temperature_entity===oldId)result.outdoor_temperature_entity=nextId;
  return result;
}

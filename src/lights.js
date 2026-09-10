import { validPolygon } from './rooms.js';
import { normaliseScene } from './scene.js';
export const available = state => !!state && !['unavailable', 'unknown'].includes(state.state);
export function capabilities(state) {
  const modes = state?.attributes?.supported_color_modes || [];
  return {
    brightness: modes.some(m => ['brightness', 'white', 'color_temp', 'hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(m)),
    colour: modes.some(m => ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(m)),
    temperature: modes.includes('color_temp'),
  };
}
export function serviceCalls(states, ids, action, value) {
  const unique = [...new Set(ids)].filter(id => id.startsWith('light.') && available(states[id]));
  if (action === 'on' || action === 'off') return unique.length ? [{ service: action === 'on' ? 'turn_on' : 'turn_off', data: { entity_id: unique } }] : [];
  const key = { brightness: 'brightness_pct', colour: 'rgb_color', temperature: 'color_temp_kelvin' }[action];
  if (!key) throw new Error('Unknown light action');
  if (action === 'colour' ? !Array.isArray(value) || value.length !== 3 || value.some(v => !Number.isFinite(v) || v < 0 || v > 255) : !Number.isFinite(value)) throw new Error('Invalid light value');
  return unique.filter(id => capabilities(states[id])[action]).map(id => {
    let v = value;
    if (action === 'brightness') v = Math.round(Math.max(1, Math.min(100, value)));
    if (action === 'temperature') {
      const a = states[id].attributes;
      v = Math.round(Math.max(a.min_color_temp_kelvin || 2000, Math.min(a.max_color_temp_kelvin || 6500, value)));
    }
    return { service: 'turn_on', data: { entity_id: [id], [key]: v } };
  });
}
export function normaliseConfig(config) {
  const result = structuredClone(config);
  result.title ??= 'Floorplan'; result.floors ??= []; result.groups ??= [];
  if (!Array.isArray(result.floors) || !Array.isArray(result.groups)) throw new Error('Floors and groups must be lists');
  const ids = new Set();
  for (const floor of result.floors) {
    if (!floor.id || ids.has(floor.id)) throw new Error('Each floor needs a unique id');
    ids.add(floor.id);
    floor.image ??= '';
    if (typeof floor.image !== 'string' || (floor.image && !/^(\/(?!\/)|https?:\/\/|data:image\/(png|jpeg|webp|svg\+xml);base64,)/.test(floor.image))) throw new Error('Choose an image or use a /local/ path or HTTP(S) URL');
    floor.rotation ??= 0; floor.rooms ??= [];
    if (!Number.isFinite(floor.rotation) || floor.rotation < 0 || floor.rotation >= 360) throw new Error('Rotation must be from 0 to 359 degrees');
    if (floor.aspect_ratio !== undefined && (!Number.isFinite(floor.aspect_ratio) || floor.aspect_ratio <= 0)) throw new Error('Invalid image aspect ratio');
    if (!Array.isArray(floor.rooms)) throw new Error('Rooms must be a list');
    const roomIds = new Set();
    for (const room of floor.rooms) {
      if (!room.id || roomIds.has(room.id) || !room.name) throw new Error('Rooms need unique ids and names');
      roomIds.add(room.id);
      if (!validPolygon(room.points)) throw new Error('Draw a room with at least three corners, without crossing its edges');
      room.lights ??= []; room.presence ??= [];
      if (!Array.isArray(room.lights) || room.lights.some(id => !/^light\.[\w]+$/.test(id))) throw new Error('Room lights must be light entities');
      if (!Array.isArray(room.presence) || room.presence.some(id => !/^binary_sensor\.[\w]+$/.test(id))) throw new Error('Presence needs binary sensor entities');
    }
    floor.entities ??= [];
    if (!Array.isArray(floor.entities)) throw new Error('Entities must be a list');
    const entities = new Set();
    for (const item of floor.entities) {
      if(item.unbound!==undefined&&typeof item.unbound!=='boolean')throw new Error('Element connection state must be a boolean');
      if (!/^(light|sensor|binary_sensor)\.[\w]+$/.test(item.entity) || entities.has(item.entity)) throw new Error('Use unique light, sensor or binary_sensor entities on each floor');
      entities.add(item.entity);
      if (![item.x, item.y].every(n => Number.isFinite(n) && n >= 0 && n <= 100)) throw new Error('Positions must be numbers from 0 to 100');
    }
  }
  for (const group of result.groups) if (!group.name || !Array.isArray(group.entities) || group.entities.some(id => typeof id !== 'string' || !/^light\.[\w]+$/.test(id))) throw new Error('Groups need a name and a list of light entities');
  return normaliseScene(result);
}

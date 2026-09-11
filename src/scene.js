import { displaySettings } from './display-settings.js';
import {validateLabels} from './entity-labels.js';
import {validateWeather} from './weather.js';
import {isPresenceSensor,sensorPlacement} from './presence-sensors.js';
import {validateInformation} from './information.js';
import {validateExterior} from './exterior.js';
import { CATALOGUE } from './catalogue.js';
import {validateLiveFields} from './live-data.js';

export function floorDimensions(floor) {
  const width = floor.width_m || 10;
  return { width, depth: floor.depth_m || width / (floor.aspect_ratio || .6875) };
}
export function normaliseScene(config) {
  validateWeather(config.weather);
  validateInformation(config.information);
  validateExterior(config.exterior);
  if(config.outdoor_temperature_entity&&!/^(sensor|climate)\.[a-z0-9_]+$/.test(config.outdoor_temperature_entity))throw new Error('Choose an outdoor temperature sensor');
  if (config.scene_version !== undefined && config.scene_version !== 1) throw new Error('This scene version is not supported. Update the card before importing it.');
  config.scene_version = 1;
  config.appearance = { mode: 'clean', furniture_opacity: .55, labels: false, quality: 'auto', ...config.appearance };
  if (!['clean','pokemon','zelda','3d','sims'].includes(config.appearance.mode)) throw new Error('Choose a supported render style');
  if(config.appearance.display)config.appearance.display=displaySettings(config.appearance.display);
  if (!Number.isFinite(config.appearance.furniture_opacity) || config.appearance.furniture_opacity < 0 || config.appearance.furniture_opacity > 1) throw new Error('Furniture opacity must be between zero and one');
  if (typeof config.appearance.labels !== 'boolean' || !['auto','low','high'].includes(config.appearance.quality)) throw new Error('Invalid appearance settings');
  const positive = (n, name, max=1000) => { if (!Number.isFinite(n) || n <= 0 || n > max) throw new Error(`${name} must be a positive dimension`); };
  const coordinate = p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && n >= 0 && n <= 100);
  for (const floor of config.floors || []) {
    validateLabels(floor);
    if(floor.style_images !== undefined && (!floor.style_images||typeof floor.style_images!=='object'||Array.isArray(floor.style_images)||Object.entries(floor.style_images).some(([key,value])=>!['pokemon','zelda'].includes(key)||typeof value!=='string'||!value||!/^(\/(?!\/)|https?:\/\/|data:image\/(png|jpeg|webp|svg\+xml);base64,)/.test(value))))throw new Error('Style images must use a Pokémon or Zelda image upload, /local/ path or HTTP(S) URL');
    floor.width_m ??= 10; positive(floor.width_m, 'Floor width');
    if (floor.depth_m !== undefined) positive(floor.depth_m, 'Floor depth');
    for (const key of ['offset_x_m','offset_z_m','elevation_m']) if (floor[key] !== undefined && (!Number.isFinite(floor[key]) || Math.abs(floor[key]) > 1000)) throw new Error('Floor alignment must be a finite distance in metres');
    floor.objects ??= []; floor.walls ??= [];
    for(const item of floor.entities || []) {if(item.fixture !== undefined && !['bulb','pendant','spot'].includes(item.fixture)) throw new Error('Choose a generic light, pendant or spot');if(item.height_m!==undefined&&(!Number.isFinite(item.height_m)||item.height_m<0||item.height_m>100))throw Error('Light height must be between zero and 100 metres');}
    if (!Array.isArray(floor.objects) || !Array.isArray(floor.walls)) throw new Error('Furniture and walls must be lists');
    for (const room of floor.rooms || []) {
      validateLiveFields(room);
      if(room.daylight_group!==undefined&&(typeof room.daylight_group!=='string'||!room.daylight_group.trim()||room.daylight_group.length>80))throw new Error('Use a non-empty daylight group name up to 80 characters');
      if(room.temperature_entity && !/^(sensor|climate)\.[a-z0-9_]+$/.test(room.temperature_entity))throw new Error('Choose a temperature sensor or thermostat for the room');
      if (room.material !== undefined && !['wood','tile','carpet'].includes(room.material)) throw new Error('Choose wood, tile or carpet for the room floor');
      if (room.colour !== undefined && !/^#[0-9a-f]{6}$/i.test(room.colour)) throw new Error('Use a six-digit room colour');
    }
    const ids = new Set();
    const identify = item => { if (!item.id || typeof item.id !== 'string' || ids.has(item.id)) throw new Error('Furniture, walls and openings need unique ids on each floor'); ids.add(item.id); };
    if(floor.ceiling_slopes!==undefined&&!Array.isArray(floor.ceiling_slopes))throw new Error('Ceiling slopes must be a list');
    for(const slope of floor.ceiling_slopes || []) {
      identify(slope);
      if(slope.type!==undefined&&slope.type!=='rooflight')throw new Error('Unknown ceiling surface type');
      if(!Array.isArray(slope.vertices)||slope.vertices.length!==4||slope.vertices.some(p=>!Array.isArray(p)||p.length!==3||!coordinate(p.slice(0,2))||!Number.isFinite(p[2])||p[2]<=0||p[2]>100))throw new Error('Ceiling slopes need four floor points with positive heights in metres');
      const area=slope.vertices.reduce((sum,p,i,points)=>sum+p[0]*points[(i+1)%4][1]-points[(i+1)%4][0]*p[1],0);
      if(Math.abs(area)<.001)throw new Error('Ceiling slopes must cover a floor area');
    }
    for (const item of floor.objects) {
      validateLiveFields(item);
      identify(item);
      if(item.presence_entities!==undefined&&(!isPresenceSensor(item)||!Array.isArray(item.presence_entities)||item.presence_entities.length>16||item.presence_entities.some(id=>typeof id!=='string'||!/^binary_sensor\.[a-z0-9_]+$/.test(id))))throw Error('Choose up to 16 presence entities for a sensor');
      if(item.presence_room&&!floor.rooms.some(r=>r.id===item.presence_room))throw Error('Choose a room for sensor occupancy');
      if(item.style_images !== undefined && (!item.style_images||typeof item.style_images!=='object'||Array.isArray(item.style_images)||Object.entries(item.style_images).some(([key,value])=>!['pokemon','zelda'].includes(key)||typeof value!=='string'||!value||!/^(\/(?!\/)|https?:\/\/|data:image\/(png|jpeg|webp|svg\+xml);base64,)/.test(value))))throw new Error('Furniture sprites must use a Pokémon or Zelda image upload, /local/ path or HTTP(S) URL');
      if(item.heating_entity && !/^(climate|switch|binary_sensor)\.[a-z0-9_]+$/.test(item.heating_entity))throw new Error('Choose a thermostat, heating switch or activity sensor');
      if(item.light_entity && !/^light\.[a-z0-9_]+$/.test(item.light_entity))throw new Error('Choose a light entity for this object');
      for(const key of ['pattern_entity','colour_entity','fill_entity'])if(item[key]&&(item.type!=='tv_lightstrip'||!/^sensor\.[a-z0-9_]+$/.test(item[key])))throw Error('Strip display fields need sensor entities on a TV light strip');
      if(item.fill_direction!==undefined&&!['left-to-right','right-to-left'].includes(item.fill_direction))throw Error('Choose a strip fill direction');
      if(item.sync_media_entity&&!/^media_player\.[a-z0-9_]+$/.test(item.sync_media_entity))throw new Error('Choose a TV media player for Hue Sync');
      if(item.media_entity!==undefined&&(typeof item.media_entity!=='string'||(item.media_entity!==''&&!/^media_player\.[a-z0-9_]+$/.test(item.media_entity))))throw new Error('Choose a media player entity');
      if(item.artwork_image && (typeof item.artwork_image!=='string'||!/^(\/(?!\/)|https?:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(item.artwork_image)))throw Error('Use an image URL, /local/ path or embedded PNG, JPEG or WebP');
      if(item.artwork_portrait_image && (typeof item.artwork_portrait_image!=='string'||!/^(\/(?!\/)|https?:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(item.artwork_portrait_image)))throw Error('Use an image URL, /local/ path or embedded PNG, JPEG or WebP');
      if(item.tv_scenes!==undefined&&(!Array.isArray(item.tv_scenes)||item.tv_scenes.some(s=>!s||typeof s.image!=='string'||!/^(\/(?!\/)|https?:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(s.image))))throw Error('TV scenes must contain image URLs or embedded images');
      if(item.elevation_m !== undefined && (!Number.isFinite(item.elevation_m)||item.elevation_m<0||item.elevation_m>100))throw new Error('Object elevation must be between zero and 100 metres');
      if(item.panel_effect!==undefined&&!['static','breathe','wave','rainbow'].includes(item.panel_effect))throw Error('Choose a supported panel light effect');
      if(item.panel_layout !== undefined && (!Array.isArray(item.panel_layout)||!item.panel_layout.length||item.panel_layout.length>100||item.panel_layout.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isInteger(n)||Math.abs(n)>50))||new Set(item.panel_layout.map(p=>p.join(','))).size!==item.panel_layout.length))throw new Error('Panel layout must contain unique integer hexagon coordinates');
      const definition = CATALOGUE.find(d => d.type === item.type);
      if (!definition) throw new Error(`Unsupported furniture type "${String(item.type).slice(0,80)}" for object "${item.id.slice(0,80)}". Update the Home Assistant floorplan card and refresh the dashboard before importing this scene.`);
      if (!coordinate([item.x,item.y])) throw new Error('Furniture must be placed within the floor');
      for (const key of ['width','depth','height']) { item[key] ??= definition[key]; positive(item[key], `Furniture ${key}`, 100); }
      if(item.mount!==undefined){if(!isPresenceSensor(item))throw Error('Only presence sensors support mounting');Object.assign(item,sensorPlacement(floor,item));delete item.support_id;}
      item.rotation ??= 0;
      if (!Number.isFinite(item.rotation)) throw new Error('Invalid furniture rotation');
      item.rotation = ((item.rotation % 360) + 360) % 360;
      if (item.colour !== undefined && !/^#[0-9a-f]{6}$/i.test(item.colour)) throw new Error('Use a six-digit furniture colour');
      for(const key of ['worktop_colour','handle_colour','leg_colour'])if(item[key]!==undefined&&!/^#[0-9a-f]{6}$/i.test(item[key]))throw new Error('Use a six-digit furniture finish colour');
    }
    for(const item of floor.objects)if(item.support_id!==undefined&&
      (typeof item.support_id!=='string'||item.support_id===item.id||!floor.objects.some(o=>o.id===item.support_id)))throw Error('Furniture support must identify another object on this floor');
    for (const wall of floor.walls) {
      identify(wall);
      if(wall.solid!==undefined&&typeof wall.solid!=='boolean')throw new Error('Solid wall infill must be true or false');
      if(wall.wardrobe_doors!==undefined){const front=wall.wardrobe_doors;if(!front||!['mirror','plain'].includes(front.finish)||![-1,1].includes(front.side)||!Number.isInteger(front.count)||front.count<1||front.count>20)throw new Error('Wardrobe doors need a finish, side and 1–20 panels');}
      if (!coordinate(wall.a) || !coordinate(wall.b) || wall.a.every((n,i)=>n===wall.b[i])) throw new Error('Walls need two different points within the floor');
      wall.height ??= 2.4; wall.thickness ??= .15;
      positive(wall.height,'Wall height',100); positive(wall.thickness,'Wall thickness',10);
      wall.openings ??= [];
      if (!Array.isArray(wall.openings)) throw new Error('Wall openings must be a list');
      const dims = floorDimensions(floor);
      const length = Math.hypot((wall.b[0]-wall.a[0])/100*dims.width,(wall.b[1]-wall.a[1])/100*dims.depth);
      for (const opening of wall.openings) {
        validateLiveFields(opening);
        if(opening.frame!==undefined&&!['fixed','casement','french','solid'].includes(opening.frame))throw Error('Choose fixed, casement or French-door framing');
        if(opening.blinds!==undefined&&typeof opening.blinds!=='boolean')throw new Error('Window blinds must be true or false');
        identify(opening);
        if (!['door','window'].includes(opening.type)) throw new Error('Choose a door or window');
        opening.offset ??= .5; opening.width ??= .9; opening.height ??= opening.type==='door'?2.1:1.2; opening.sill ??= opening.type==='door'?0:.9;
        positive(opening.width,'Opening width'); positive(opening.height,'Opening height');
        if(opening.outside_lights!==undefined&&(!Array.isArray(opening.outside_lights)||opening.outside_lights.length>8||opening.outside_lights.some(id=>typeof id!=='string'||!/^light\.[a-z0-9_]+$/.test(id))))throw Error('Choose up to eight exterior lights for an opening');
        if(opening.transom_height!==undefined&&(opening.type!=='door'||!Number.isFinite(opening.transom_height)||opening.transom_height<.1||opening.transom_height>opening.height-.5))throw Error('Door transom must fit above its leaf');
        if(opening.glazing!==undefined){const g=opening.glazing,h=opening.height-(opening.transom_height || 0);if(opening.type!=='door'||opening.frame!=='solid'||!g||![g.width,g.height,g.sill].every(Number.isFinite)||g.width<=0||g.width>opening.width-.2||g.height<=0||g.sill<=.04||g.sill+g.height>=h-.04)throw Error('Door glazing must fit inside a solid door leaf');}
        if (!Number.isFinite(opening.offset) || opening.offset < 0 || opening.offset > 1 || !Number.isFinite(opening.sill) || opening.sill < 0 || opening.sill+opening.height > wall.height+1e-6 || opening.offset*length-opening.width/2 < -1e-6 || opening.offset*length+opening.width/2 > length+1e-6) throw new Error('Fit each opening inside its wall');
      }
      const intervals=wall.openings.map(o=>[o.offset*length-o.width/2,o.offset*length+o.width/2]).sort((a,b)=>a[0]-b[0]);
      if(intervals.some((p,i)=>i && p[0]<intervals[i-1][1])) throw new Error('Wall openings must not overlap');
    }
  }
  return config;
}

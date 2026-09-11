import {nearestRoom} from './wall-daylight.js';

export const knownState=s=>!!s&&!['unknown','unavailable',''].includes(s.state);
export function sensorNumber(s){return knownState(s)&&s.state.trim()!==''&&Number.isFinite(Number(s.state))?Number(s.state):null;}
export function sensorText(id,states){const s=states[id];return knownState(s)?`${s.state}${s.attributes?.unit_of_measurement?' '+s.attributes.unit_of_measurement:''}`:'Unavailable';}
export function roomEnvironment(room,states){
  const humidity=sensorNumber(states[room.humidity_entity]),pm25=sensorNumber(states[room.pm25_entity]),voc=sensorNumber(states[room.voc_entity]);
  return {humidity:humidity===null?'':`${humidity}%`,pm25,voc,warning:(pm25!==null&&pm25>=(room.pm25_warning??35))||(voc!==null&&voc>=(room.voc_warning??150))};
}
export function objectRoom(object,floor){return floor.rooms?.find(r=>r.id===object.room_id)||floor.rooms?.[nearestRoom(object.x,object.y,floor.rooms||[])];}
export function radiatorEntity(object,floor){return object.heating_demand_entity||objectRoom(object,floor)?.heating_demand_entity||object.heating_entity;}
export function printerState(object,states){const s=states[object.status_entity];return knownState(s)?String(s.state).toLowerCase():'unavailable';}
export function doorState(object,states){const s=states[object.contact_entity];return !knownState(s)?'Unknown':s.state==='on'?'Open':s.state==='off'?'Closed':'Unknown';}
export function energySummary(items,states){
  let watts=0,kwh=0,powerKnown=0,energyKnown=0;
  const rows=(items||[]).map(item=>{const p=states[item.power_entity],e=states[item.energy_entity],pv=sensorNumber(p),ev=sensorNumber(e),pu=p?.attributes?.unit_of_measurement,eu=e?.attributes?.unit_of_measurement;
    if(pv!==null&&['W','kW'].includes(pu)){watts+=pv*(pu==='kW'?1000:1);powerKnown++;}
    if(ev!==null&&['Wh','kWh'].includes(eu)){kwh+=ev/(eu==='Wh'?1000:1);energyKnown++;}
    return {label:item.label||'Plug',power:sensorText(item.power_entity,states),energy:sensorText(item.energy_entity,states)};
  });
  return {rows,power:powerKnown?`${Math.round(watts)} W`:'Unavailable',energy:energyKnown?`${kwh.toFixed(2)} kWh`:'Unavailable',partial:powerKnown<rows.length||energyKnown<rows.length};
}
export function validateLiveFields(value){
  const fields={humidity_entity:'sensor',pm25_entity:'sensor',voc_entity:'sensor',heating_demand_entity:'sensor',status_entity:'sensor',progress_entity:'sensor',time_left_entity:'sensor',bed_temperature_entity:'sensor',job_entity:'sensor',camera_entity:'camera',contact_entity:'binary_sensor',lock_entity:'lock',presence_entity:'device_tracker',power_entity:'sensor',energy_entity:'sensor'};
  for(const [key,domain] of Object.entries(fields))if(value[key]&&!new RegExp(`^${domain}\\.[a-z0-9_]+$`).test(value[key]))throw Error(`Choose a valid ${key.replaceAll('_',' ')}`);
  for(const key of ['pm25_warning','voc_warning'])if(value[key]!==undefined&&(!Number.isFinite(value[key])||value[key]<0))throw Error('Air quality warning thresholds must be non-negative');
  if(value.controls!==undefined){if(!Array.isArray(value.controls)||value.controls.length>40)throw Error('Choose up to 40 room controls');for(const c of value.controls)if(!c||! /^(input_boolean|switch|media_player|scene|vacuum|button|sensor|binary_sensor|camera|lock)\.[a-z0-9_]+$/.test(c.entity||'')||(c.label!==undefined&&typeof c.label!=='string'))throw Error('Choose a valid room control');}
  if(value.energy!==undefined){if(!Array.isArray(value.energy)||value.energy.length>50)throw Error('Choose up to 50 energy devices');for(const e of value.energy){if(!e||typeof e!=='object')throw Error('Choose an energy device');validateLiveFields(e);}}
}

import {element,button} from './dom.js';
import {roomState} from './rooms.js';
import {roomTemperature} from './heating.js';
import {knownState,sensorText,roomEnvironment,objectRoom,printerState,energySummary,doorDescription} from './live-data.js';

export const roomPanelStyles=`
.floorplan-dashboard .marker.room-readout.temp-warm{color:#704326;background:#faeadd}.floorplan-dashboard .marker.room-readout.temp-cool{color:#315d76;background:#e6f1f3}
.floorplan-dashboard .marker.room-readout{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:5px 7px;color:var(--fp-text,var(--primary-text-color,#26343d));white-space:nowrap}.room-readout-name{font-size:10px;opacity:.85}.room-readout-values{font-size:13px;font-variant-numeric:tabular-nums;line-height:1.3}.room-readout-alert{font-size:10px;color:var(--warning-color,#b66b00)}
.floorplan-dashboard .marker.exterior-camera{border-radius:8px;opacity:1;background:var(--fp-surface,#fff)}.floorplan-dashboard .marker.device-error{opacity:1}
.room-panel header{padding:0}.floorplan-dashboard .marker.device-marker{width:max-content;height:auto;max-width:160px;border-radius:6px;white-space:normal;padding:5px 7px;font-size:11px}
.floorplan-dashboard .marker.overlay-lights::after,.floorplan-dashboard .marker.room-readout::after{content:'';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:max(100%,calc(44px / var(--fp-marker-scale,.8)));height:max(100%,calc(44px / var(--fp-marker-scale,.8)))}.exterior-camera .room-camera{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#17262b}.exterior-camera button{min-height:44px}.exterior-camera .camera-unavailable{font-size:11px}
.room-readout{gap:4px;max-width:180px}.room-readout .occupant-count{font-size:11px;font-weight:700}.room-readout.air-warning{outline:2px solid #b66b00}.room-panel{position:absolute;right:14px;top:var(--fp-info-top,64px);z-index:5;width:min(340px,calc(100% - 28px));max-height:calc(100% - var(--fp-info-top,64px) - 78px);overflow:auto;overscroll-behavior:contain;background:var(--fp-surface,var(--card-background-color,#fff));color:var(--primary-text-color,#26343d);border:1px solid var(--fp-line,#cad5d0);border-radius:14px;padding:12px;box-shadow:0 5px 24px #172e3630;font-size:12px}.room-panel header{display:flex;align-items:center;justify-content:space-between;gap:8px}.room-panel h3,.room-panel h4{margin:4px 0}.room-panel section{border-top:1px solid #80958c35;margin-top:10px;padding-top:8px}.room-panel .room-actions{display:flex;flex-wrap:wrap;gap:5px}.room-panel button{min-height:44px;white-space:normal}.room-panel .room-status-line{display:flex;justify-content:space-between;gap:8px;margin:5px 0;overflow-wrap:anywhere}.room-panel .room-camera{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#17262b;border-radius:8px}.room-panel .device-error{padding:8px;border:2px solid #c33232;border-radius:6px;color:#b32121;font-weight:700}.room-panel .room-feedback{padding:6px 0;overflow-wrap:anywhere}.room-panel .room-air-warning{color:#9a5800;font-weight:600}.device-marker{min-width:44px;min-height:44px}.device-marker.device-error{border:2px solid #c33232;color:#b32121;background:#fff0ef}.room-panel .energy-device{padding:5px 0}.room-panel .energy-device small{display:block}.camera-unavailable{margin:6px 0;opacity:.75}@container(max-width:600px){.room-panel{right:8px;width:calc(100% - 16px);padding:10px}.room-panel h3{font-size:15px}}
`;
const more=(host,id)=>{if(id)host.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:id},bubbles:true,composed:true}));};
export function cameraThumbnail(host,id,states){
  const box=element('div'),s=states[id],path=s?.attributes?.entity_picture;
  if(!knownState(s)||typeof path!=='string'||!path.startsWith('/api/camera_proxy/')||path.startsWith('//')){box.append(element('p',{className:'camera-unavailable',text:'Camera unavailable'}));return box;}
  const fresh=path+(path.includes('?')?'&':'?')+'_fp='+Math.floor(Date.now()/60000);
  const img=element('img',{className:'room-camera',alt:s.attributes?.friendly_name||'Camera',src:host._hass?.hassUrl?host._hass.hassUrl(fresh):fresh});
  img.addEventListener('error',()=>box.replaceChildren(element('p',{className:'camera-unavailable',text:'Camera unavailable'})),{once:true});
  const action=button('',()=>more(host,id),{'aria-label':`Open ${img.alt}`});action.style.cssText='padding:0;width:100%;border:0';action.append(img);box.append(action);return box;
}
export function deviceActions(id,state){
  const domain=id.split('.')[0],on=state?.state==='on';
  if(['input_boolean','switch'].includes(domain))return [{label:on?'Turn off':'Turn on',service:on?'turn_off':'turn_on'}];
  if(domain==='scene')return [{label:'Activate',service:'turn_on'}];
  if(domain==='button')return [{label:'Run',service:'press'}];
  if(domain==='vacuum'){const features=state?.attributes?.supported_features;return [{label:'Start',service:'start',flag:8192},{label:'Pause',service:'pause',flag:4},{label:'Dock',service:'return_to_base',flag:16}].filter(a=>features===undefined||(features&a.flag));}
  if(domain==='media_player'){const f=state?.attributes?.supported_features||0;return [{label:'Play / pause',service:'media_play_pause',flag:state?.state==='playing'?1:512},{label:'Turn on',service:'turn_on',flag:128},{label:'Turn off',service:'turn_off',flag:256}].filter(a=>f&a.flag);}
  return [];
}
async function command(host,id,service,label){
  if(host.roomBusy)return;host.roomBusy=true;host.roomFeedback='';host.renderRoomPanel();
  try{await host._hass.callService(id.split('.')[0],service,{entity_id:id});host.roomFeedback=`${label} command sent.`;}
  catch{host.roomFeedback='Command failed. Check the device and try again.';}
  finally{host.roomBusy=false;host.renderRoomPanel();}
}
export function openRoom(host,floorId,roomId){host.activeRoom={floorId,roomId};host.roomFeedback='';host.renderRoomPanel();}
export function roomPanel(host,states){
  const floor=host.config.floors.find(f=>f.id===host.activeRoom?.floorId),room=floor?.rooms.find(r=>r.id===host.activeRoom?.roomId);if(!room)return null;
  const panel=element('section',{className:'room-panel',role:'dialog','aria-label':`${room.name} status and controls`});
  // Equal labels and readings do not imply equal command targets.
  panel.panelIdentity=JSON.stringify([floor.id,room]);
  const close=()=>{host.activeRoom=null;host.renderRoomPanel();host.shadowRoot.querySelector(`[data-room-id="${CSS.escape(room.id)}"]`)?.focus();};
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}});
  panel.append(element('header',{},[element('h3',{text:room.name}),button('Close',close,{'aria-label':'Close room controls'})]));
  const environment=roomEnvironment(room,states),presence=roomState(room,states,floor);
  panel.append(element('p',{text:[roomTemperature(room,states)||(room.temperature_entity?'Temperature unavailable':''),environment.humidity||(room.humidity_entity?'Humidity unavailable':''),presence.presence].filter(Boolean).join(' · ')}));
  const line=(label,text,container=panel)=>container.append(element('div',{className:'room-status-line'},[element('span',{text:label}),element('strong',{text})]));
  if(room.pm25_entity)line('PM2.5',sensorText(room.pm25_entity,states));if(room.voc_entity)line('VOC index',sensorText(room.voc_entity,states));
  if(environment.warning)panel.append(element('p',{className:'room-air-warning',text:'⚠ Air quality above your warning threshold'}));
  const controls=element('section',{},[element('h4',{text:'Controls and status'})]);
  if(room.lights?.length){const online=room.lights.filter(id=>knownState(states[id]));controls.append(button(online.some(id=>states[id].state==='on')?'Lights off':'Lights on',()=>{const current=host._hass?.states||{},ids=room.lights.filter(id=>knownState(current[id]));host.control(ids.some(id=>current[id].state==='on')?'off':'on',undefined,ids);},{disabled:host.busy||!online.length||!host._hass?.callService}));line('Lights',presence.lightState,controls);}
  for(const c of room.controls||[]){const s=states[c.entity],label=c.label||s?.attributes?.friendly_name||c.entity;
    const block=element('div');block.append(button(`${label}: ${sensorText(c.entity,states)}`,()=>more(host,c.entity),{'aria-label':`${label} details`}));
    if(c.entity.startsWith('camera.'))block.append(cameraThumbnail(host,c.entity,states));
    const actions=element('div',{className:'room-actions'});for(const a of deviceActions(c.entity,s))actions.append(button(a.label,()=>command(host,c.entity,a.service,label),{disabled:host.roomBusy||!knownState(s)||!host._hass?.callService,'aria-label':`${label}: ${a.label}`}));block.append(actions);controls.append(block);
  }
  if(room.lights?.length||room.controls?.length)panel.append(controls);
  for(const object of floor.objects.filter(o=>o.type==='printer_3d'&&o.status_entity&&objectRoom(o,floor)?.id===room.id)){
    const status=printerState(object,states),section=element('section',{'data-printer-status':status},[element('h4',{text:object.name||'3D printer'})]);
    section.append(element('p',{className:status==='error'?'device-error':'',text:status==='error'?'⚠ Printer error — check the printer':`Printer: ${status}`}));
    for(const [key,label] of [['progress_entity','Progress'],['time_left_entity','Time left'],['bed_temperature_entity','Bed temperature'],['job_entity','Job']])if(object[key])line(label,sensorText(object[key],states),section);
    const strip=floor.objects.find(o=>o.pattern_entity&&objectRoom(o,floor)?.id===room.id);if(strip)line('Printer light display',sensorText(strip.pattern_entity,states),section);
    if(object.camera_entity)section.append(cameraThumbnail(host,object.camera_entity,states));section.append(button('Printer details',()=>more(host,object.status_entity)));panel.append(section);
  }
  for(const wall of floor.walls||[])for(const door of wall.openings||[])if(door.room_id===room.id&&door.contact_entity)line(door.name||'Door',doorDescription(door,states));
  if(room.energy?.length){const summary=energySummary(room.energy,states),section=element('section',{},[element('h4',{text:'Plug energy'}),element('p',{text:`${summary.power} now · ${summary.energy} today${summary.partial?' · Partial readings':''}`})]);
    for(const row of summary.rows)section.append(element('div',{className:'energy-device'},[element('strong',{text:row.label}),element('small',{text:`${row.power} now · ${row.energy} today`})]));panel.append(section);}
  panel.append(element('div',{className:'room-feedback',role:'status',text:host.roomBusy?'Sending command…':host.roomFeedback||''}));return panel;
}

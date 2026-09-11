import {element,button,field} from './dom.js';
import {entitySelect} from './setup.js';
export function liveFields(host,value,fields){return fields.map(([key,label,domain='sensor'])=>field(label,entitySelect(host,new RegExp(`^(${domain})\\.`),value[key]||'',id=>{value[key]=id;host.emit();})));}
export function energyFields(host,value){
  const root=element('div');for(const [i,e] of (value.energy||[]).entries())root.append(element('fieldset',{},[element('legend',{text:'Energy device'}),field('Device label',element('input',{value:e.label||'',onchange:event=>{e.label=event.target.value;host.emit();}})),...liveFields(host,e,[['power_entity','Current power sensor'],['energy_entity','Daily energy sensor']]),button('Remove energy device',()=>{value.energy.splice(i,1);host.emit();})]));
  root.append(button('Add energy device',()=>{(value.energy||=[]).push({label:'New device',power_entity:'',energy_entity:''});host.emit();}));return root;
}
export function roomLiveFields(host,room){
  host.roomLiveOpen ||= {};const root=element('details',{open:!!host.roomLiveOpen[room.id]},[element('summary',{text:'Room status, controls and energy'})]);root.addEventListener('toggle',()=>{if(root.isConnected)host.roomLiveOpen[room.id]=root.open;});
  root.append(...liveFields(host,room,[['humidity_entity','Humidity sensor'],['pm25_entity','PM2.5 sensor'],['voc_entity','VOC index sensor'],['heating_demand_entity','Room heating demand sensor']]));
  for(const [key,label,fallback] of [['pm25_warning','PM2.5 warning threshold',35],['voc_warning','VOC warning threshold',150]])root.append(field(label,element('input',{type:'number',min:0,value:room[key]??fallback,onchange:e=>{room[key]=Number(e.target.value);host.emit();}})));
  for(const [i,c] of (room.controls||[]).entries())root.append(element('div',{},[field('Control label',element('input',{value:c.label||'',onchange:e=>{c.label=e.target.value;host.emit();}})),...liveFields(host,c,[['entity','Room control entity','input_boolean|switch|media_player|scene|vacuum|button|sensor|binary_sensor|camera|lock']]),button('Remove control',()=>{room.controls.splice(i,1);host.emit();})]));
  const picker=entitySelect(host,/^(input_boolean|switch|media_player|scene|vacuum|button|sensor|binary_sensor|camera|lock)\./,'',id=>{if(id){(room.controls||=[]).push({entity:id});host.emit();}});root.append(field('Add room control',picker));
  root.append(energyFields(host,room));return root;
}
export function exteriorLiveFields(host){
  if(!host.config.exterior?.items?.length)return null;
  const root=element('details',{open:!!host.exteriorLiveOpen},[element('summary',{text:'Exterior live bindings'})]);root.addEventListener('toggle',()=>{if(root.isConnected)host.exteriorLiveOpen=root.open;});
  for(const item of host.config.exterior.items.filter(i=>['car','charger','doorbell','light'].includes(i.type)||i.camera_entity)){
    const box=element('fieldset',{},[element('legend',{text:item.name||item.id})]);
    const fields=[['camera_entity','Camera','camera'],['contact_entity','Door contact','binary_sensor'],['lock_entity','Door lock','lock']];
    if(item.type==='car')fields.push(['presence_entity','Vehicle location','device_tracker']);
    if(['car','charger'].includes(item.type))fields.push(['charging_entity','Charging sensor','binary_sensor|sensor'],['connected_entity','Cable connected sensor','binary_sensor|sensor']);
    box.append(...liveFields(host,item,fields));root.append(box);
  }return root;
}

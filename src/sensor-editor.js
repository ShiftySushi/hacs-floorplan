import {element,field} from './dom.js';
import {memberPicker} from './setup.js';

export function sensorFields(host,floor,item,root){
  root.append(memberPicker(host,'Sensor presence entities',item.presence_entities || [],/^binary_sensor\./,ids=>{item.presence_entities=ids;host.emit();}));
  root.append(field('Assign occupancy to room',element('select',{onchange:e=>{item.presence_room=e.target.value;host.emit();}},[element('option',{value:'',text:'Model indicator only'}),...floor.rooms.map(r=>element('option',{value:r.id,text:r.name,selected:r.id===item.presence_room}))])));
  root.append(field('Sensor mounting',element('select',{onchange:e=>{if(!e.target.value)delete item.mount;else if(e.target.value==='wall'&&floor.walls.length)item.mount={kind:'wall',wall_id:floor.walls[0].id,offset:.5,side:1};else if(e.target.value==='corner'&&floor.rooms.length)item.mount={kind:'corner',room_id:floor.rooms[0].id,corner:0};host.emit();}},[['','Free placement'],['wall','Wall'],['corner','Room top corner']].map(([value,text])=>element('option',{value,text,selected:(item.mount?.kind || '')===value,disabled:value==='wall'?!floor.walls.length:value==='corner'?!floor.rooms.length:false})))));
  const m=item.mount;if(!m)return;
  if(m.kind==='wall'){
    root.append(field('Sensor wall',element('select',{onchange:e=>{m.wall_id=e.target.value;host.emit();}},floor.walls.map((w,i)=>element('option',{value:w.id,text:w.name || `Wall ${i+1}`,selected:w.id===m.wall_id})))),field('Position along wall (%)',element('input',{type:'number',min:0,max:100,value:m.offset*100,onchange:e=>{m.offset=Number(e.target.value)/100;host.emit();}})),field('Wall side',element('select',{onchange:e=>{m.side=Number(e.target.value);host.emit();}},[1,-1].map(value=>element('option',{value,text:value===1?'Side A':'Side B',selected:m.side===value})))));
  }else{
    root.append(field('Sensor room',element('select',{onchange:e=>{m.room_id=e.target.value;m.corner=0;host.emit();}},floor.rooms.map(r=>element('option',{value:r.id,text:r.name,selected:r.id===m.room_id})))),field('Room corner',element('select',{onchange:e=>{m.corner=Number(e.target.value);host.emit();}},(floor.rooms.find(r=>r.id===m.room_id)?.points || []).map((_,i)=>element('option',{value:i,text:`Corner ${i+1}`,selected:i===m.corner})))));
  }
  root.append(element('p',{className:'muted',text:'Attached sensors follow the wall or room corner. Choose Free placement before dragging elsewhere.'}));
}

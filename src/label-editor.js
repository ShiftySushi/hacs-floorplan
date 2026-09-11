import {element,button,field,newId} from './dom.js';
import {entitySelect,entitySearch} from './setup.js';
import {renderPlan} from './plan.js';
import {labelMarkers} from './entity-labels.js';

export function labelSetup(host,floor){
  floor.labels??=[];
  const root=element('section',{className:'setup-section'}),panel=element('div',{className:'setup-panel'}),canvas=element('div',{className:'setup-canvas'});
  root.append(element('p',{text:'Place one entity or combine room readings. Tap a label to edit; drag it or tap the plan to move it. Each live reading opens its Home Assistant controls.'}),element('div',{className:'setup-workspace'},[canvas,panel]));
  const selected=floor.labels.find(l=>l.id===host.labelId);
  const select=id=>{host.labelId=id;host.render();};
  const move=point=>{if(selected){[selected.x,selected.y]=point;host.emit();}};
  const markers=labelMarkers(floor,host._hass?.states || {},()=>{});
  markers.forEach((marker,i)=>{
    const label=floor.labels[i],node=marker.node;let start,dragged=false;
    node.addEventListener('click',e=>{e.stopPropagation();if(!dragged)select(label.id);});
    node.style.touchAction='none';
    node.addEventListener('pointerdown',e=>{if(e.button!==0)return;start=[e.clientX,e.clientY];dragged=false;node.setPointerCapture(e.pointerId);});
    node.addEventListener('pointermove',e=>{if(!start)return;dragged||=Math.hypot(e.clientX-start[0],e.clientY-start[1])>5;if(dragged){const p=plan.pointFromClient(e.clientX,e.clientY);if(p){node.style.left=p[0]+'%';node.style.top=p[1]+'%';}}});
    node.addEventListener('pointerup',e=>{if(!start)return;start=null;if(node.hasPointerCapture(e.pointerId))node.releasePointerCapture(e.pointerId);if(dragged){const p=plan.pointFromClient(e.clientX,e.clientY);if(p){[label.x,label.y]=p;host.labelId=label.id;host.emit();}}});
    node.addEventListener('pointercancel',()=>{start=null;host.render();});
  });
  const plan=renderPlan(floor,host._hass?.states || {},{edit:true,markers,onPoint:move});canvas.append(plan);
  panel.append(button('Add label',()=>{const label={id:newId(),name:'',x:50,y:50,items:[]};floor.labels.push(label);host.labelId=label.id;host.emit();}));
  panel.append(field('Label to edit',element('select',{onchange:e=>select(e.target.value)},[element('option',{value:'',text:'Choose a label…'}),...floor.labels.map((l,i)=>element('option',{value:l.id,text:l.name || `Label ${i+1}`,selected:l===selected}))])));
  if(!selected)return root;
  panel.append(field('Label title',element('input',{value:selected.name || '',maxLength:80,onchange:e=>{selected.name=e.target.value;host.emit();}})));
  panel.append(field('Room',element('select',{onchange:e=>{selected.room_id=e.target.value;host.emit();}},[element('option',{value:'',text:'No room'}),...floor.rooms.map(r=>element('option',{value:r.id,text:r.name,selected:r.id===selected.room_id}))])));
  const room=floor.rooms.find(r=>r.id===selected.room_id);
  if(room)panel.append(button('Centre label in room',()=>{[selected.x,selected.y]=[0,1].map(i=>room.points.reduce((v,p)=>v+p[i]/room.points.length,0));host.emit();}));
  for(const [key,name,max] of [['x','Label X (%)',100],['y','Label Y (%)',100],['height_m','Label height (metres)',100]])panel.append(field(name,element('input',{type:'number',min:0,max,step:.1,value:selected[key]??.6,onchange:e=>{selected[key]=Number(e.target.value);host.emit();}})));
  const picker=entitySelect(host,/^[a-z_]+\./,'',entity=>{if(entity&&selected.items.length<16){selected.items.push({entity});host.emit();}},false);
  panel.append(entitySearch(picker),field('Add entity to label',picker));
  selected.items.forEach((item,i)=>{
    const row=element('fieldset',{},[element('legend',{text:item.entity})]);
    row.append(field('Entity',entitySelect(host,/^[a-z_]+\./,item.entity,id=>{if(id){item.entity=id;host.emit();}},false)));
    for(const [key,name] of [['name','Row name'],['attribute','Attribute (optional)'],['unit','Unit override (optional)']])row.append(field(name,element('input',{value:item[key]??'',maxLength:80,onchange:e=>{if(e.target.value)item[key]=e.target.value;else delete item[key];host.emit();}})));
    row.append(button('Move row up',()=>{[selected.items[i-1],selected.items[i]]=[selected.items[i],selected.items[i-1]];host.emit();},{disabled:i===0}),button('Remove row',()=>{selected.items.splice(i,1);host.emit();}));panel.append(row);
  });
  panel.append(button('Remove label',()=>{floor.labels=floor.labels.filter(l=>l!==selected);host.labelId='';host.emit();}));
  return root;
}

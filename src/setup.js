import { element, button, field } from './dom.js';
import { renderPlan } from './plan.js';
import { validPolygon } from './rooms.js';
export function entitySelect(host, domain, value, change) {
  const select=element('select',{onchange:e=>change(e.target.value)},[element('option',{value:'',text:'Choose an entity…'})]);
  const ids=Object.keys(host._hass?.states || {}).filter(id=>domain.test(id));
  if(value && !ids.includes(value))ids.push(value);
  ids.sort().forEach(id=>select.append(element('option',{value:id,text:`${host._hass?.states[id]?.attributes.friendly_name || id} (${id})`,selected:value===id})));
  return select;
}
export function memberPicker(host, title, members, domain, change) {
  const box=element('fieldset',{},[element('legend',{text:title})]);
  const select=entitySelect(host,domain,'',id=>{if(id && !members.includes(id))change([...members,id]);});
  box.append(field('Add entity',select));
  members.forEach(id=>box.append(element('div',{className:'row member'},[element('span',{text:host._hass?.states[id]?.attributes.friendly_name || id}),button('Remove',()=>change(members.filter(v=>v!==id)),{'aria-label':`Remove ${id} from ${title}`})])));
  if(!members.length)box.append(element('p',{className:'muted',text:'No entities assigned yet.'}));
  return box;
}
export function floorSetup(host,floor) {
  const root=element('div');
  root.append(field('Card title',element('input',{value:host.config.title,onchange:e=>{host.config.title=e.target.value;host.emit();}})),element('p',{text:'Add each storey, choose an image, then rotate it to the way you view your home. Lights and rooms stay attached when you rotate.'}));
  root.append(button('Add floor',()=>{host.config.floors.push({id:crypto.randomUUID(),name:`Floor ${host.config.floors.length+1}`,image:'',rotation:0,rooms:[],entities:[]});host.floorIndex=host.config.floors.length-1;host.emit();}));
  if(!floor)return root;
  root.append(field('Floor name',element('input',{value:floor.name || floor.id,onchange:e=>{floor.name=e.target.value;host.emit();}})));
  root.append(field('Choose floorplan image',element('input',{type:'file',accept:'image/png,image/jpeg,image/webp,image/svg+xml',disabled:!!host.uploading,onchange:async e=>{
    const file=e.target.files?.[0];if(!file)return;
    host.uploading=true;host.error='';host.render();
    try {
      if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type))throw Error('Choose a PNG, JPEG, WebP or SVG image.');
      if(file.size>8*1024*1024)throw Error('Choose an image smaller than 8 MB.');
      let url;
      if(file.type!=='image/svg+xml' && host._hass?.fetchWithAuth){
        const body=new FormData();body.append('file',file);
        const response=await host._hass.fetchWithAuth('/api/image/upload',{method:'POST',body});
        if(!response.ok)throw Error('Home Assistant could not upload this image. Check your access or use an existing image URL.');
        const image=await response.json();url=`/api/image/serve/${encodeURIComponent(image.id)}/original`;
      }else{
        if(file.size>2*1024*1024)throw Error('Embedded images must be smaller than 2 MB. Use an existing URL for larger images.');
        url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Image could not be read.'));reader.readAsDataURL(file);});
      }
      const ratio=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image.naturalWidth/image.naturalHeight);image.onerror=()=>reject(Error('This file could not be displayed as an image.'));image.src=url;});
      floor.image=url;floor.aspect_ratio=ratio;host.uploading=false;host.emit();
    }catch(error){host.uploading=false;host.error=error.message;host.render();}
  }})));
  root.append(element('p',{className:'muted',text:host.uploading?'Uploading image…':'PNG, JPEG and WebP upload to Home Assistant. Small SVGs are saved inside the dashboard. No YAML needed.'}));
  const advanced=element('details',{},[element('summary',{text:'Use an existing image URL instead'})]);
  advanced.append(field('Image URL',element('input',{value:floor.image.startsWith('data:')?'':floor.image,placeholder:'/local/floorplans/ground-floor.svg',onchange:e=>{floor.image=e.target.value.trim();delete floor.aspect_ratio;host.emit();}})));root.append(advanced);
  root.append(field('Rotation (degrees clockwise)',element('input',{type:'number',min:0,max:359,step:1,value:floor.rotation,onchange:e=>{floor.rotation=((Number(e.target.value)%360)+360)%360;host.emit();}})));
  root.append(element('div',{className:'row'},[button('Rotate left',()=>{floor.rotation=(floor.rotation+270)%360;host.emit();}),button('Rotate right',()=>{floor.rotation=(floor.rotation+90)%360;host.emit();})]));
  if(floor.image)root.append(renderPlan(floor,host._hass?.states || {},{edit:true}));
  root.append(button('Remove floor',()=>{host.removingFloor=!host.removingFloor;host.render();}));
  if(host.removingFloor)root.append(element('p',{text:'Remove this floor and its room and marker assignments?'}),button('Remove this floor and assignments',()=>{host.config.floors.splice(host.floorIndex,1);host.floorIndex=0;host.removingFloor=false;host.emit();}));
  return root;
}
export function roomSetup(host,floor) {
  const root=element('div',{},[element('p',{text:'Draw around the inside edges of each room, then assign its lights and presence sensors. Rooms darken when their lights are off; presence is shown separately.'})]);
  if(!host.roomId && floor.rooms.length)host.roomId=floor.rooms[0].id;
  const room=floor.rooms.find(r=>r.id===host.roomId);
  const tabs=element('div',{className:'row'});
  floor.rooms.forEach(r=>tabs.append(button(r.name,()=>{host.roomId=r.id;host.drawing=false;host.draft=[];host.render();},{'aria-pressed':String(r===room)})));
  tabs.append(button('Draw new room',()=>{host.drawing=true;host.redraw=false;host.draft=[];host.render();}));root.append(tabs);
  if(host.drawing)root.append(element('p',{role:'status',text:`Click each corner in order, then Finish room. ${host.draft.length} corners placed. Use Undo corner to correct a point.`}));
  root.append(renderPlan(floor,host._hass?.states || {},{edit:true,draft:host.draft,onPoint:point=>{if(host.drawing){host.draft.push(point);host.render();}}}));
  if(host.drawing){
    root.append(element('div',{className:'row'},[button('Undo corner',()=>{host.draft.pop();host.render();},{disabled:!host.draft.length}),button('Finish room',()=>{
      if(!validPolygon(host.draft)){host.error='Use at least three corners without crossing edges.';host.render();return;}
      if(host.redraw && room)room.points=host.draft;
      else{const r={id:crypto.randomUUID(),name:`Room ${floor.rooms.length+1}`,points:host.draft,lights:[],presence:[]};floor.rooms.push(r);host.roomId=r.id;}
      host.draft=[];host.drawing=false;host.emit();
    },{disabled:host.draft.length<3}),button('Cancel drawing',()=>{host.draft=[];host.drawing=false;host.render();})]));
    const coords=element('details',{},[element('summary',{text:'Place a corner using coordinates'})]);
    const x=element('input',{type:'number',min:0,max:100,value:50}),y=element('input',{type:'number',min:0,max:100,value:50});
    coords.append(field('Corner X (%)',x),field('Corner Y (%)',y),button('Add corner',()=>{const p=[Number(x.value),Number(y.value)];if(p.every(n=>Number.isFinite(n)&&n>=0&&n<=100)){host.draft.push(p);host.render();}}));root.append(coords);
  }
  if(room && !host.drawing){
    root.append(field('Room name',element('input',{value:room.name,onchange:e=>{room.name=e.target.value;host.emit();}})));
    root.append(memberPicker(host,'Room lights',room.lights,/^light\./,ids=>{room.lights=ids;host.emit();}));
    root.append(memberPicker(host,'Presence sensors',room.presence,/^binary_sensor\./,ids=>{room.presence=ids;host.emit();}),element('p',{className:'muted',text:'Choose motion, occupancy or presence binary sensors. Any sensor reporting on means occupied; unavailable sensors are shown as unknown.'}));
    root.append(button('Redraw room',()=>{host.drawing=true;host.redraw=true;host.draft=[];host.render();}),button('Remove room',()=>{floor.rooms=floor.rooms.filter(r=>r!==room);host.roomId='';host.emit();}));
  }
  return root;
}
export function entitySetup(host,floor) {
  const root=element('div',{},[element('p',{text:'Choose a light or sensor, then tap its location. Tap an existing marker to move it. Each light remains individually selectable, including room and group members.'})]);
  root.append(field('Entity to place',entitySelect(host,/^(light|sensor|binary_sensor)\./,host.pendingEntity,id=>{host.pendingEntity=id;host.render();})));
  const place=point=>{
    if(!host.pendingEntity)return;
    const item=floor.entities.find(e=>e.entity===host.pendingEntity);
    if(item)Object.assign(item,{x:point[0],y:point[1]});else floor.entities.push({entity:host.pendingEntity,x:point[0],y:point[1]});
    host.pendingEntity='';host.emit();
  };
  const markers=floor.entities.map(item=>({x:item.x,y:item.y,node:button(item.name || host._hass?.states[item.entity]?.attributes.friendly_name || item.entity,e=>{e.stopPropagation();host.pendingEntity=item.entity;host.render();},{className:'marker','aria-label':`Move ${item.entity}`})}));
  root.append(renderPlan(floor,host._hass?.states || {},{markers,edit:true,onPoint:place}));
  if(host.pendingEntity)root.append(element('p',{role:'status',text:`Place ${host.pendingEntity} on the plan.`}),button('Place in centre',()=>place([50,50])));
  const missing=[...new Set(floor.rooms.flatMap(r=>r.lights))].filter(id=>!floor.entities.some(e=>e.entity===id));
  if(missing.length)root.append(element('p',{text:`${missing.length} room lights still need markers.`}),button('Place room lights automatically',()=>{
    for(const room of floor.rooms){const ids=room.lights.filter(id=>!floor.entities.some(e=>e.entity===id));const x=room.points.reduce((v,p)=>v+p[0],0)/room.points.length,y=room.points.reduce((v,p)=>v+p[1],0)/room.points.length;ids.forEach((entity,i)=>floor.entities.push({entity,x:Math.max(2,Math.min(98,x+(i-(ids.length-1)/2)*6)),y}));}host.emit();
  }));
  for(const item of floor.entities){
    const row=element('details',{},[element('summary',{text:item.name || host._hass?.states[item.entity]?.attributes.friendly_name || item.entity})]);
    row.append(field('Display name',element('input',{value:item.name || '',onchange:e=>{item.name=e.target.value;host.emit();}})));
    for(const axis of ['x','y'])row.append(field(`${axis.toUpperCase()} position (%)`,element('input',{type:'number',min:0,max:100,step:.1,value:item[axis],onchange:e=>{item[axis]=Number(e.target.value);host.emit();}})));
    row.append(button('Remove marker',()=>{floor.entities=floor.entities.filter(e=>e!==item);host.emit();}));root.append(row);
  }
  return root;
}
export function groupSetup(host) {
  const root=element('div',{},[element('p',{text:'Optional: create named selections such as Kitchen spots or Downstairs. Group buttons select their member lights together, across floors.'})]);
  if(host.config.floors.length){
    const floors=element('select',{onchange:e=>{host.floorIndex=Number(e.target.value);host.render();}});
    host.config.floors.forEach((f,i)=>floors.append(element('option',{value:i,text:f.name || f.id,selected:i===host.floorIndex})));
    root.append(field('Place new group lights on',floors),element('p',{className:'muted',text:'Unpositioned members get individual markers on this floor. Fine-tune their positions in step 3.'}));
  }else root.append(element('p',{text:'Add a floor first so group members can have individual markers.'}));
  host.config.groups.forEach(group=>{
    const box=element('fieldset',{},[field('Group name',element('input',{value:group.name,onchange:e=>{group.name=e.target.value;host.emit();}}))]);
    box.append(memberPicker(host,'Group lights',group.entities,/^light\./,ids=>{
      group.entities=ids;
      const floor=host.config.floors[host.floorIndex];
      if(floor)for(const entity of ids)if(!host.config.floors.some(f=>f.entities.some(e=>e.entity===entity)))floor.entities.push({entity,x:20+(floor.entities.length%3)*30,y:25+(Math.floor(floor.entities.length/3)%3)*25});
      host.emit();
    }),button('Remove group',()=>{host.config.groups=host.config.groups.filter(g=>g!==group);host.emit();}));root.append(box);
  });
  root.append(button('Add group',()=>{host.config.groups.push({name:`Group ${host.config.groups.length+1}`,entities:[]});host.emit();}));return root;
}

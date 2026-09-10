import { element, button, field } from './dom.js';
import { renderPlan } from './plan.js';
import { icon } from './icons.js';
import { validPolygon } from './rooms.js';
import { floorDimensions } from './scene.js';
import { reassignEntity } from './bindings.js';
// Keep the plan visible beside its controls throughout the setup steps.
function layoutSetup(root, leading = 0) {
  const plan=root.querySelector(':scope > .plan');if(!plan)return root;
  const children=[...root.children],intro=children.slice(0,leading);
  const canvas=element('div',{className:'setup-canvas'},[plan]);
  const panel=element('div',{className:'setup-panel'},children.filter(node=>node!==plan&&!intro.includes(node)));
  root.classList.add('setup-section');
  root.replaceChildren(...intro,element('div',{className:'setup-workspace'},[canvas,panel]));return root;
}
export function entitySelect(host, domain, value, change, includeUnbound = true) {
  const select=element('select',{onchange:e=>change(e.target.value)},[element('option',{value:'',text:'Choose an entity…'})]);
  const ids=Object.keys(host._hass?.states || {}).filter(id=>domain.test(id));
  const unbound=new Map(host.config.floors.flatMap(f=>f.entities||[]).filter(e=>e.unbound).map(e=>[e.entity,e]));
  if(includeUnbound)for(const id of unbound.keys())if(domain.test(id)&&!ids.includes(id))ids.push(id);
  if(value && !ids.includes(value))ids.push(value);
  ids.sort().forEach(id=>select.append(element('option',{value:id,text:unbound.has(id)?`${unbound.get(id).name || 'Element'} · Not connected`:`${host._hass?.states[id]?.attributes.friendly_name || id} (${id})`,selected:value===id})));
  return select;
}
export function entitySearch(select) {
  const options=Array.from(select.options).map(option=>option.cloneNode(true));
  return field('Search entities',element('input',{type:'search',placeholder:'Search by name or entity ID',oninput:e=>{
    const query=e.target.value.trim().toLowerCase(),value=select.value;
    select.replaceChildren(...options.filter(option=>!option.value || option.value===value || option.textContent.toLowerCase().includes(query)).map(option=>option.cloneNode(true)));select.value=value;
  }}));
}
export function memberPicker(host, title, members, domain, change) {
  const box=element('fieldset',{},[element('legend',{text:title})]);
  const select=entitySelect(host,domain,'',id=>{if(id && !members.includes(id))change([...members,id]);});
  box.append(entitySearch(select),field('Add entity',select));
  members.forEach(id=>box.append(element('div',{className:'row member'},[element('span',{text:host._hass?.states[id]?.attributes.friendly_name || id}),button('Remove',()=>change(members.filter(v=>v!==id)),{'aria-label':`Remove ${id} from ${title}`})])));
  if(!members.length)box.append(element('p',{className:'muted',text:'No entities assigned yet.'}));
  return box;
}
export function floorSetup(host,floor) {
  const root=element('div');
  root.append(field('Outdoor temperature entity',entitySelect(host,/^(sensor|climate)\./,host.config.outdoor_temperature_entity || '',id=>{host.config.outdoor_temperature_entity=id;host.emit();})));
  root.append(field('Card title',element('input',{value:host.config.title,onchange:e=>{host.config.title=e.target.value;host.emit();}})),element('p',{text:'Add each storey, choose an image, then rotate it to the way you view your home. Lights and rooms stay attached when you rotate.'}));
  root.append(button('Add floor',()=>{host.config.floors.push({id:crypto.randomUUID(),name:`Floor ${host.config.floors.length+1}`,image:'',rotation:0,rooms:[],entities:[]});host.floorIndex=host.config.floors.length-1;host.emit();}));
  if(!floor)return root;
  root.append(field('Floor name',element('input',{value:floor.name || floor.id,onchange:e=>{floor.name=e.target.value;host.emit();}})));
  root.append(field('Choose floorplan image',element('input',{type:'file',accept:'image/png,image/jpeg,image/webp,image/svg+xml',disabled:!!host.uploading,onchange:async e=>{
    const file=e.target.files?.[0];if(!file)return;
    const uploadingFloorId=floor.id;
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
      const currentFloor=host.config.floors.find(item=>item.id===uploadingFloorId);
      if(!currentFloor)throw Error('The floor was removed while its image was uploading. Add a floor and choose the image again.');
      currentFloor.image=url;currentFloor.aspect_ratio=ratio;host.uploading=false;host.emit();
    }catch(error){host.uploading=false;host.error=error.message;host.render();}
  }})));
  root.append(element('p',{className:'muted',text:host.uploading?'Uploading image…':'PNG, JPEG and WebP upload to Home Assistant. Small SVGs are saved inside the dashboard. No YAML needed.'}));
  const advanced=element('details',{},[element('summary',{text:'Use an existing image URL instead'})]);
  advanced.append(field('Image URL',element('input',{value:floor.image.startsWith('data:')?'':floor.image,placeholder:'/local/floorplans/ground-floor.svg',onchange:e=>{floor.image=e.target.value.trim();delete floor.aspect_ratio;host.emit();}})));root.append(advanced);
  root.append(field('Rotation (degrees clockwise)',element('input',{type:'number',min:0,max:359,step:1,value:floor.rotation,onchange:e=>{floor.rotation=((Number(e.target.value)%360)+360)%360;host.emit();}})));
  root.append(element('div',{className:'row'},[button('Rotate left',()=>{floor.rotation=(floor.rotation+270)%360;host.emit();}),button('Rotate right',()=>{floor.rotation=(floor.rotation+90)%360;host.emit();})]));
  const scale = element('fieldset',{},[element('legend',{text:'Floor scale'}),element('p',{className:'muted',text:'Use the full image width and depth, including its margins. Alternatively mark a known distance from your dimensioned floorplan.'})]);
  const dimensions = floorDimensions(floor);
  for(const [key,label,fallback] of [['width_m','Full plan width (metres)',dimensions.width],['depth_m','Full plan depth (metres)',dimensions.depth]])scale.append(field(label,element('input',{type:'number',min:.5,max:200,step:.01,value:floor[key] ?? Number(fallback.toFixed(3)),onchange:e=>{floor[key]=Number(e.target.value);host.emit();}})));
  scale.append(button('Calibrate from a known distance',()=>{host.calibrating=true;host.calibrationPoints=[];host.render();}));
  if(host.calibrating) {
    scale.append(element('p',{role:'status',text:`Tap the two ends of a measured distance on the plan. ${(host.calibrationPoints || []).length} of 2 points placed.`}));
    const known=element('input',{type:'number',min:.01,step:.01,value:host.calibrationMetres || 1,onchange:e=>{host.calibrationMetres=Number(e.target.value);}});
    scale.append(field('Known distance (metres)',known),button('Apply scale',()=>{
      const [a,b]=host.calibrationPoints || [],distance=Number(known.value);if(!a||!b||!Number.isFinite(distance)||distance<=0)return;
      const ratio=floor.aspect_ratio || dimensions.width/dimensions.depth;
      const relative=Math.hypot((b[0]-a[0])/100,(b[1]-a[1])/100/ratio);if(relative<.001){host.error='Choose two different points.';host.render();return;}
      floor.width_m=Number((distance/relative).toFixed(3));floor.depth_m=Number((floor.width_m/ratio).toFixed(3));host.calibrating=false;host.calibrationPoints=[];host.emit();
    },{disabled:host.calibrationPoints?.length!==2}),button('Cancel calibration',()=>{host.calibrating=false;host.calibrationPoints=[];host.render();}));
  }
  root.append(scale);
  const alignment=element('details',{},[element('summary',{text:'Align storeys in 3D'}),element('p',{className:'muted',text:'Match the same building corner or stairwell across floors. Elevation is the floor level above the building origin; All storeys adds a viewing gap between levels.'})]);
  for(const [key,label,fallback,min,max] of [['elevation_m','Floor elevation (metres)',host.floorIndex*3,-20,100],['offset_x_m','Horizontal X offset (metres)',0,-100,100],['offset_z_m','Horizontal depth offset (metres)',0,-100,100]])alignment.append(field(label,element('input',{type:'number',min,max,step:.05,value:floor[key] ?? fallback,onchange:e=>{const value=Number(e.target.value);if(!Number.isFinite(value)||value<min||value>max){host.error=`${label} must be between ${min} and ${max}.`;host.render();return;}floor[key]=value;host.emit();}})));
  root.append(alignment);
  root.append(renderPlan(floor,host._hass?.states || {},{edit:true,draft:host.calibrating?host.calibrationPoints:[],onPoint:point=>{if(host.calibrating){host.calibrationPoints??=[];if(host.calibrationPoints.length===2)host.calibrationPoints=[];host.calibrationPoints.push(point);host.render();}}}));
  root.append(button('Remove floor',()=>{host.removingFloor=!host.removingFloor;host.render();}));
  if(host.removingFloor)root.append(element('p',{text:'Remove this floor and its room and marker assignments?'}),button('Remove this floor and assignments',()=>{host.config.floors.splice(host.floorIndex,1);host.floorIndex=0;host.removingFloor=false;host.emit();}));
  return layoutSetup(root);
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
    root.append(field('Room temperature entity',entitySelect(host,/^(sensor|climate)\./,room.temperature_entity || '',id=>{room.temperature_entity=id;host.emit();})),element('p',{className:'muted',text:'Choose a temperature sensor or thermostat. Its current reading appears subtly on the plan; unavailable readings are hidden.'}));
    const material=element('select',{onchange:e=>{room.material=e.target.value;host.emit();}});for(const [value,text] of [['wood','Wood'],['tile','Tile'],['carpet','Carpet']])material.append(element('option',{value,text,selected:(room.material || 'wood')===value}));root.append(field('Floor material',material),field('Floor colour',element('input',{type:'color',value:room.colour || '#cbb89a',onchange:e=>{room.colour=e.target.value;host.emit();}})));
    root.append(memberPicker(host,'Room lights',room.lights,/^light\./,ids=>{room.lights=ids;host.emit();}));
    root.append(memberPicker(host,'Presence sensors',room.presence,/^binary_sensor\./,ids=>{room.presence=ids;host.emit();}),element('p',{className:'muted',text:'Choose motion, occupancy or presence binary sensors. Any sensor reporting on means occupied; unavailable sensors are shown as unknown.'}));
    root.append(button('Redraw room',()=>{host.drawing=true;host.redraw=true;host.draft=[];host.render();}),button('Remove room',()=>{floor.rooms=floor.rooms.filter(r=>r!==room);host.roomId='';host.emit();}));
  }
  return layoutSetup(root,2);
}
export function entitySetup(host,floor) {
  const root=element('div',{},[element('p',{text:'Arrange elements first, connect them later. Choose an element and tap the plan to place it. Drag a marker to move it, or select it to name it and connect a Home Assistant entity.'})]);
  const palette=element('div',{className:'element-palette row','aria-label':'Add element'});
  for(const [kind,name,glyph] of [['pendant','Pendant light','pendant'],['spot','Spotlight','spot'],['bulb','Light','bulb'],['temperature','Temperature','temperature'],['presence','Presence','presence']]){
    const tile=button(name,()=>{host.pendingElement=kind;host.pendingEntity='';host.render();},{'aria-pressed':String(host.pendingElement===kind)});tile.prepend(icon(glyph));palette.append(tile);
  }
  root.append(element('h3',{text:'Add element'}),palette);
  const picker=entitySelect(host,/^(light|sensor|binary_sensor)\./,host.pendingEntity,id=>{host.pendingEntity=id;host.pendingElement='';host.render();});root.append(entitySearch(picker),field('Entity to place',picker));
  const snap=point=>{const dims=floorDimensions(floor);return point.map((n,i)=>Math.max(0,Math.min(100,Math.round(n/100*(i?dims.depth:dims.width)/.1)*.1/(i?dims.depth:dims.width)*100)));};
  const place=point=>{
    point=snap(point);
    if(host.pendingElement){
      const kind=host.pendingElement,domain=kind==='temperature'?'sensor':kind==='presence'?'binary_sensor':'light';
      const names={temperature:'Temperature',presence:'Presence',pendant:'Pendant light',spot:'Spotlight',bulb:'Light'};
      const entity=`${domain}.floorplan_${crypto.randomUUID().replaceAll('-','')}`;
      floor.entities.push({entity,unbound:true,name:`${names[kind]} ${floor.entities.filter(e=>e.unbound).length+1}`,x:point[0],y:point[1],...(domain==='light'?{fixture:kind}:{})});
      host.pendingElement='';host.pendingEntity=entity;host.emit();return;
    }
    if(!host.pendingEntity)return;
    const item=floor.entities.find(e=>e.entity===host.pendingEntity);
    if(item)Object.assign(item,{x:point[0],y:point[1]});else floor.entities.push({entity:host.pendingEntity,x:point[0],y:point[1]});
    host.pendingEntity='';host.emit();
  };
  let dragged=false;
  const markers=floor.entities.map(item=>{const name=item.name || host._hass?.states[item.entity]?.attributes.friendly_name || item.entity;const node=button('',e=>{e.stopPropagation();if(dragged){dragged=false;return;}host.pendingElement='';host.pendingEntity=item.entity;host.render();},{className:'marker',title:name,'aria-label':`Move ${item.entity}`});node.append(icon(item.entity.startsWith('light.')?(item.fixture || 'bulb'):item.entity.startsWith('binary_sensor.')?'presence':'temperature'));
    node.style.touchAction='none';let start;
    node.addEventListener('pointerdown',e=>{if(e.button!==0)return;start=[e.clientX,e.clientY];dragged=false;node.setPointerCapture(e.pointerId);});
    node.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start[0],e.clientY-start[1])>5){dragged=true;node.style.transform=`translate(calc(-50% + ${e.clientX-start[0]}px),calc(-50% + ${e.clientY-start[1]}px))`;}});
    node.addEventListener('pointerup',e=>{if(!start)return;start=null;node.style.transform='';if(node.hasPointerCapture(e.pointerId))node.releasePointerCapture(e.pointerId);if(!dragged)return;const point=plan.pointFromClient(e.clientX,e.clientY);if(point){[item.x,item.y]=snap(point);host.pendingEntity=item.entity;host.pendingElement='';host.emit();}});
    node.addEventListener('pointercancel',()=>{start=null;dragged=false;node.style.transform='';});
    return {x:item.x,y:item.y,node};});
  const plan=renderPlan(floor,host._hass?.states || {},{markers,edit:true,onPoint:place});root.append(plan);
  if(host.pendingElement)root.append(element('p',{role:'status',text:'Tap the plan to place your element. No Home Assistant connection is needed.'}),button('Cancel placement',()=>{host.pendingElement='';host.render();}));
  if(host.pendingEntity)root.append(element('p',{role:'status',text:`Move ${floor.entities.find(e=>e.entity===host.pendingEntity)?.name || host.pendingEntity}: tap a new position or drag its marker.`}),button('Place in centre',()=>place([50,50])));
  const missing=[...new Set(floor.rooms.flatMap(r=>r.lights))].filter(id=>!floor.entities.some(e=>e.entity===id));
  if(missing.length)root.append(element('p',{text:`${missing.length} room lights still need markers.`}),button('Place room lights automatically',()=>{
    for(const room of floor.rooms){const ids=room.lights.filter(id=>!floor.entities.some(e=>e.entity===id));const x=room.points.reduce((v,p)=>v+p[0],0)/room.points.length,y=room.points.reduce((v,p)=>v+p[1],0)/room.points.length;ids.forEach((entity,i)=>floor.entities.push({entity,x:Math.max(2,Math.min(98,x+(i-(ids.length-1)/2)*6)),y}));}host.emit();
  }));
  for(const item of floor.entities){
    const row=element('details',{open:host.pendingEntity===item.entity},[element('summary',{text:item.name || host._hass?.states[item.entity]?.attributes.friendly_name || item.entity})]);
    if(item.unbound)row.append(element('p',{className:'connection-status',text:'Not connected · Position and configure this element now. Assign an entity whenever you are ready.'}));
    row.append(field('Display name',element('input',{value:item.name || '',onchange:e=>{item.name=e.target.value;host.emit();}})));
    const domain=new RegExp(`^${item.entity.split('.')[0]}\\.`);
    const assignment=entitySelect(host,domain,item.unbound?'':item.entity,id=>{
      if(!id)return;
      try{const oldId=item.entity;host.config=reassignEntity(host.config,oldId,id);if(host.pendingEntity===oldId)host.pendingEntity=id;host.emit();}
      catch(error){host.error=error.message;host.render();}
    },false);
    row.append(entitySearch(assignment),field('Assigned entity',assignment),element('p',{className:'muted',text:'Changing the assigned entity keeps its position and updates matching room and group assignments across all floors.'}));
    const roomKey=item.entity.startsWith('light.')?'lights':item.entity.startsWith('binary_sensor.')?'presence':'temperature_entity';
    const roomChoice=element('select',{onchange:e=>{for(const room of floor.rooms){if(roomKey==='temperature_entity'){if(room.temperature_entity===item.entity)delete room.temperature_entity;if(room.id===e.target.value)room.temperature_entity=item.entity;}else{room[roomKey]=room[roomKey].filter(id=>id!==item.entity);if(room.id===e.target.value)room[roomKey].push(item.entity);}}host.emit();}},[element('option',{value:'',text:'No room assignment'})]);
    for(const room of floor.rooms)roomChoice.append(element('option',{value:room.id,text:room.name,selected:roomKey==='temperature_entity'?room.temperature_entity===item.entity:room[roomKey].includes(item.entity)}));
    row.append(field('Element room',roomChoice));
    if(item.entity.startsWith('light.')){
      const fixture=element('select',{onchange:e=>{item.fixture=e.target.value;host.emit();}});
      for(const [value,text] of [['bulb','Generic light'],['pendant','Pendant'],['spot','Spotlight']])fixture.append(element('option',{value,text,selected:(item.fixture || 'bulb')===value}));
      row.append(field('Light fixture',fixture));
    }
    for(const axis of ['x','y'])row.append(field(`${axis.toUpperCase()} position (%)`,element('input',{type:'number',min:0,max:100,step:.1,value:item[axis],onchange:e=>{item[axis]=Number(e.target.value);host.emit();}})));
    row.append(button('Remove marker',()=>{floor.entities=floor.entities.filter(e=>e!==item);host.emit();}));
    if(host.pendingEntity===item.entity)root.insertBefore(row,palette.previousElementSibling);else root.append(row);
  }
  return layoutSetup(root,1);
}
export function groupSetup(host) {
  const root=element('div',{},[element('p',{text:'Optional: create named selections such as Kitchen spots or Downstairs. Group buttons select their member lights together, across floors.'})]);
  if(host.config.floors.length){
    const floors=element('select',{onchange:e=>{host.floorIndex=Number(e.target.value);host.render();}});
    host.config.floors.forEach((f,i)=>floors.append(element('option',{value:i,text:f.name || f.id,selected:i===host.floorIndex})));
    root.append(field('Place new group lights on',floors),element('p',{className:'muted',text:'Unpositioned members get individual markers on this floor. Fine-tune their positions in Entities.'}));
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

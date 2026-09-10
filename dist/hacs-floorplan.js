const available = state => !!state && !['unavailable', 'unknown'].includes(state.state);
function capabilities(state) {
  const modes = state?.attributes?.supported_color_modes || [];
  return {
    brightness: modes.some(m => ['brightness', 'white', 'color_temp', 'hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(m)),
    colour: modes.some(m => ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(m)),
    temperature: modes.includes('color_temp'),
  };
}
function serviceCalls(states, ids, action, value) {
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
function normaliseConfig(config) {
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
      if (!/^(light|sensor|binary_sensor)\.[\w]+$/.test(item.entity) || entities.has(item.entity)) throw new Error('Use unique light, sensor or binary_sensor entities on each floor');
      entities.add(item.entity);
      if (![item.x, item.y].every(n => Number.isFinite(n) && n >= 0 && n <= 100)) throw new Error('Positions must be numbers from 0 to 100');
    }
  }
  for (const group of result.groups) if (!group.name || !Array.isArray(group.entities) || group.entities.some(id => typeof id !== 'string' || !/^light\.[\w]+$/.test(id))) throw new Error('Groups need a name and a list of light entities');
  return result;
}

function roomState(room, states) {
  const lights = room.lights || [];
  const active = lights.map(id => states[id]).filter(s => available(s) && s.state === 'on');
  const known = lights.filter(id => available(states[id]));
  const lightState = active.length ? 'Lit' : !lights.length ? 'No lights assigned' : known.length !== lights.length ? 'Lighting unknown' : 'Dark';
  const sensors = room.presence || [];
  const occupied = sensors.some(id => available(states[id]) && states[id].state === 'on');
  const presence = !sensors.length ? '' : occupied ? 'Presence detected' : sensors.some(id => !available(states[id])) ? 'Presence unknown' : 'No presence';
  return { lightState, presence, occupied, fill: active.length ? '#ffe5a0' : lightState === 'Dark' ? '#263746' : '#929ca4', opacity: active.length ? .28 + .32 * Math.max(...active.map(s => (s.attributes.brightness ?? 255) / 255)) : .66 };
}
function polygonArea(points) {
  return Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
}
function validPolygon(points) {
  if (!Array.isArray(points) || points.length < 3 || points.some(p => !Array.isArray(p) || p.length !== 2 || p.some(n => !Number.isFinite(n) || n < 0 || n > 100)) || polygonArea(points) < .1) return false;
  const cross = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const between = (a,b,p) => Math.min(a[0],b[0])<=p[0] && p[0]<=Math.max(a[0],b[0]) && Math.min(a[1],b[1])<=p[1] && p[1]<=Math.max(a[1],b[1]);
  for (let i=0;i<points.length;i++) for (let j=i+1;j<points.length;j++) {
    if (j===i+1 || (i===0 && j===points.length-1)) continue;
    const a=points[i],b=points[(i+1)%points.length],c=points[j],d=points[(j+1)%points.length];
    const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
    if ((abC*abD<0 && cdA*cdB<0) || (!abC && between(a,b,c)) || (!abD && between(a,b,d)) || (!cdA && between(c,d,a)) || (!cdB && between(c,d,b))) return false;
  }
  return new Set(points.map(p=>p.join(','))).size === points.length;
}
function orientation(ratio, degrees) {
  const w=1000,h=1000/ratio,r=degrees*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  return { w,h,c,s,width:Math.abs(w*c)+Math.abs(h*s),height:Math.abs(w*s)+Math.abs(h*c) };
}
function orientPoint(point, transform, inverse = false) {
  const {w,h,c,s,width,height}=transform;
  if (inverse) {
    const x=point[0]/100*width-width/2,y=point[1]/100*height-height/2;
    return [(x*c+y*s+w/2)/w*100,(-x*s+y*c+h/2)/h*100];
  }
  const x=point[0]/100*w-w/2,y=point[1]/100*h-h/2;
  return [(x*c-y*s+width/2)/width*100,(x*s+y*c+height/2)/height*100];
}

const styles = `
:host{display:block;color:var(--primary-text-color,#26343d);font-family:var(--paper-font-body1_-_font-family,system-ui)}
*{box-sizing:border-box}ha-card{display:block;background:var(--ha-card-background,var(--card-background-color,#fff));border-radius:var(--ha-card-border-radius,12px);overflow:hidden;border:1px solid var(--divider-color,#dce2e6)}
header,.controls,.editor{padding:16px}h2{font-size:20px;margin:0 0 12px}p{line-height:1.5;margin:8px 0;font-size:14px}.muted{color:var(--secondary-text-color,#607078)}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}button,select,input{font:inherit}button{min-height:44px;padding:8px 12px;border-radius:8px;border:1px solid var(--divider-color,#d0d9dd);color:inherit;background:var(--secondary-background-color,#f5f7f8);cursor:pointer}button[aria-pressed=true],button.active{background:var(--primary-color,#007c91);color:var(--text-primary-color,#fff)}button:disabled{opacity:.45;cursor:default}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--primary-color,#007c91);outline-offset:2px}
.plan{position:relative;margin:12px auto;width:100%;max-width:540px;background:#fff}.floor-image{display:block;width:100%;height:100%}.marker{position:absolute;transform:translate(-50%,-50%);padding:3px;min-width:44px;max-width:45%;min-height:44px;font-size:12px;line-height:1.2;background:#fff;color:#26343d;box-shadow:0 1px 5px #0002}.marker.on{border-color:#d79600;background:#fff0b2}.marker[aria-pressed=true]{outline:3px solid #007c91;background:#e1f5f8;color:#164d58}.marker small{display:block}.marker.sensor{border-radius:6px}.controls{border-top:1px solid var(--divider-color,#dce2e6)}label{display:block;font-size:14px;margin:12px 0}label input:not([type=color]),label select{display:block;width:100%;margin-top:6px}input:not([type=range]),select{min-height:40px;border:1px solid var(--divider-color,#ccd4da);border-radius:6px;padding:6px;background:var(--card-background-color,#fff);color:inherit}input[type=range]{accent-color:var(--primary-color,#007c91)}input[type=color]{display:block;width:100%;margin-top:6px}.error{color:var(--error-color,#b3261e)}.editor .plan{cursor:crosshair}.hint{padding:12px}fieldset{min-width:0;border:1px solid var(--divider-color,#ddd);border-radius:8px;margin:12px 0;padding:10px}legend{font-size:14px}details{margin:12px 0}summary{cursor:pointer;min-height:44px;padding:12px 0}input,select{max-width:100%}.member{justify-content:space-between;margin:8px 0}.member span{overflow-wrap:anywhere;flex:1}.wizard-footer{border-top:1px solid var(--divider-color,#ddd);margin-top:16px;padding-top:16px;justify-content:space-between}.room-status{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:12px}.room-button{text-align:left}.room-button strong,.room-button small{display:block}.room-button small{margin-top:4px}.room-button:disabled{opacity:1}
`;

function element(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'text') node.textContent = value;
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  node.append(...children); return node;
}
const button = (text, onclick, props = {}) => element('button', { text, onclick, type: 'button', ...props });
const field = (text, input) => element('label', { className: input.type === 'checkbox' ? 'check' : '' }, [document.createTextNode(text), input]);
function svgElement(tag, props = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(props)) node.setAttribute(key, value);
  return node;
}

function renderPlan(floor, states, options = {}) {
  const plan = element('div', { className: 'plan' });
  const svg = svgElement('svg', { role: 'img', 'aria-label': `${floor.name || floor.id} floorplan`, class: 'floor-image' });
  const group = svgElement('g');
  const image = svgElement('image', { href: floor.image, preserveAspectRatio: 'none' });
  group.append(image); svg.append(group); plan.append(svg);
  let ratio = floor.aspect_ratio || .6875;
  let transform;
  const markers = options.markers || [];
  const rooms = (floor.rooms || []).map(room => {
    const state=roomState(room,states);
    const polygon=svgElement('polygon',{fill:options.edit?'#007c91':state.fill,'fill-opacity':options.edit ? 0.16 : state.opacity,stroke:state.occupied?'#079579':'#6d8190','stroke-width':state.occupied?5:1,'vector-effect':'non-scaling-stroke'});
    const title=svgElement('title'); title.textContent=`${room.name}: ${state.lightState}${state.presence ? ', '+state.presence : ''}`;polygon.append(title);group.append(polygon);
    return {room,polygon};
  });
  const draft=svgElement('polyline',{fill:'#007c91','fill-opacity':.2,stroke:'#007c91','stroke-width':3,'vector-effect':'non-scaling-stroke'}); group.append(draft);
  function layout() {
    transform=orientation(ratio,floor.rotation || 0);
    const {w,h,width,height}=transform;
    plan.style.aspectRatio=`${width}/${height}`;svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    group.setAttribute('transform',`translate(${width/2} ${height/2}) rotate(${floor.rotation || 0}) translate(${-w/2} ${-h/2})`);
    image.setAttribute('width',w);image.setAttribute('height',h);
    const points=p=>p.map(([x,y])=>`${x/100*w},${y/100*h}`).join(' ');
    rooms.forEach(({room,polygon})=>polygon.setAttribute('points',points(room.points)));
    draft.setAttribute('points',points(options.draft || []));
    for(const {node,x,y} of markers){ const point=orientPoint([x,y],transform);node.style.left=`${point[0]}%`;node.style.top=`${point[1]}%`; }
  }
  markers.forEach(({node})=>plan.append(node));layout();
  const probe = new Image();
  probe.onload=()=>{ratio=probe.naturalWidth/probe.naturalHeight;layout();};
  probe.onerror=()=>{plan.replaceChildren(element('p',{className:'error hint',role:'alert',text:'Image could not be loaded. Check the floor image in setup.'}));};
  if(floor.image) probe.src=floor.image;
  if(options.onPoint) plan.addEventListener('click',e=>{
    if(!plan.contains(svg))return;
    const rect=plan.getBoundingClientRect();
    const point=orientPoint([(e.clientX-rect.left)/rect.width*100,(e.clientY-rect.top)/rect.height*100],transform,true);
    if(point.every(n=>n>=0 && n<=100)) options.onPoint(point.map(n=>Math.round(n*10)/10));
  });
  return plan;
}

function entitySelect(host, domain, value, change) {
  const select=element('select',{onchange:e=>change(e.target.value)},[element('option',{value:'',text:'Choose an entity…'})]);
  const ids=Object.keys(host._hass?.states || {}).filter(id=>domain.test(id));
  if(value && !ids.includes(value))ids.push(value);
  ids.sort().forEach(id=>select.append(element('option',{value:id,text:`${host._hass?.states[id]?.attributes.friendly_name || id} (${id})`,selected:value===id})));
  return select;
}
function memberPicker(host, title, members, domain, change) {
  const box=element('fieldset',{},[element('legend',{text:title})]);
  const select=entitySelect(host,domain,'',id=>{if(id && !members.includes(id))change([...members,id]);});
  box.append(field('Add entity',select));
  members.forEach(id=>box.append(element('div',{className:'row member'},[element('span',{text:host._hass?.states[id]?.attributes.friendly_name || id}),button('Remove',()=>change(members.filter(v=>v!==id)),{'aria-label':`Remove ${id} from ${title}`})])));
  if(!members.length)box.append(element('p',{className:'muted',text:'No entities assigned yet.'}));
  return box;
}
function floorSetup(host,floor) {
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
function roomSetup(host,floor) {
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
function entitySetup(host,floor) {
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
function groupSetup(host) {
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

class FloorplanEditor extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this.floorIndex = 0; this.step = 0; this.pendingEntity = ''; this.draft = []; }
  setConfig(config) { this.config = normaliseConfig(config); this.render(); }
  set hass(value) { const first = !this._hass; this._hass = value; if (first && this.config) this.render(); }
  emit() {
    try { const config = normaliseConfig(this.config); this.error = ''; this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true })); }
    catch (error) { this.error = error.message; }
    this.render();
  }
  render() {
    if (!this.config) return;
    const root = element('div', { className: 'editor' });
    root.append(element('h2', { text: 'Set up your floorplan' }));
    const steps = ['Floors', 'Rooms', 'Entities', 'Groups', 'Review'];
    root.append(element('p', { className: 'muted', text: `Step ${this.step + 1} of 5 · ${steps[this.step]}` }));
    const nav = element('nav', { className: 'row', 'aria-label': 'Setup steps' });
    steps.forEach((step,i) => nav.append(button(`${i + 1}. ${step}`, () => { this.step = i; this.render(); }, { 'aria-pressed': String(i === this.step) })));
    root.append(nav);
    if (this.step < 3 && this.config.floors.length) {
      const floors=element('select',{onchange:e=>{this.floorIndex=Number(e.target.value);this.pendingEntity='';this.draft=[];this.drawing=false;this.roomId='';this.render();}});
      this.config.floors.forEach((floor,i)=>floors.append(element('option',{value:i,text:floor.name || floor.id,selected:this.floorIndex===i})));
      root.append(field('Floor to configure',floors));
    }
    const floor=this.config.floors[this.floorIndex];
    if(this.step===0) root.append(floorSetup(this,floor));
    if(this.step===1) root.append(floor?.image?roomSetup(this,floor):element('p',{text:'Add a floor image in step 1 before drawing rooms.'}));
    if(this.step===2) root.append(floor?.image?entitySetup(this,floor):element('p',{text:'Add a floor image in step 1 before placing entities.'}));
    if(this.step===3) root.append(groupSetup(this));
    if(this.step===4) {
      root.append(element('h3',{text:'Ready to save'}),element('p',{text:'Review each floor below, then use Home Assistant’s Save button to keep your setup. You can return to any step later.'}));
      for(const f of this.config.floors) root.append(element('p',{text:`${f.name || f.id}: ${f.entities.length} entities · ${f.rooms.length} rooms · ${f.rotation}° rotation${!f.image?' · Image needed':''}`}));
      if(!this.config.floors.length) root.append(element('p',{text:'Start by adding a floor in step 1.'}));
      for(const f of this.config.floors) for(const r of f.rooms) if(!r.lights.length || !r.presence.length) root.append(element('p',{className:'muted',text:`${r.name}: ${!r.lights.length?'assign lights to show lit/dark state. ':''}${!r.presence.length?'Presence is optional and has not been assigned.':''}`}));
      root.append(element('p',{text:'Tap light markers to build a selection. Room and group buttons select their lights. Power applies to all available selected lights; brightness and colour only affect compatible lights.'}));
    }
    if(this.error) root.append(element('p',{className:'error',role:'alert',text:this.error}));
    root.append(element('div',{className:'row wizard-footer'},[button('Back',()=>{this.step--;this.render();},{disabled:this.step===0}),button(this.step===4?'Back to floors':'Next',()=>{this.step=this.step===4?0:this.step+1;this.render();})]));
    this.shadowRoot.replaceChildren(element('style',{text:styles}),root);
  }
}
customElements.define('floorplan-card-editor',FloorplanEditor);

class FloorplanCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: 'open' }); this.selected = new Set(); this.busy = false;
    this.shadowRoot.addEventListener('focusout', e => {
      if (e.target.tagName === 'INPUT' && this.deferredUpdate) requestAnimationFrame(() => { this.deferredUpdate = false; this.render(); });
    });
  }
  static getConfigElement() { return document.createElement('floorplan-card-editor'); }
  static getStubConfig() { return { type: 'custom:floorplan-card', title: 'Floorplan', floors: [], groups: [] }; }
  setConfig(config) {
    this.config = normaliseConfig(config);
    if (!this.config.floors.some(f => f.id === this.floorId)) this.floorId = this.config.floors[0]?.id;
    const configured = new Set([...this.config.floors.flatMap(f => [...f.entities.map(e => e.entity), ...f.rooms.flatMap(r => r.lights)]), ...this.config.groups.flatMap(g => g.entities)]);
    this.selected = new Set([...this.selected].filter(id => configured.has(id))); this.render();
  }
  set hass(hass) { this._hass = hass; if (!['INPUT', 'SELECT'].includes(this.shadowRoot.activeElement?.tagName)) this.render(); else this.deferredUpdate = true; }
  getCardSize() { return 12; }
  getGridOptions() { return { columns: 12, min_columns: 6 }; }
  toggle(ids) {
    const remove = ids.every(id => this.selected.has(id));
    ids.forEach(id => remove ? this.selected.delete(id) : this.selected.add(id)); this.render();
  }
  async control(action, value) {
    if (this.busy) return;
    this.busy = true; this.error = ''; this.render();
    try {
      const calls = serviceCalls(this._hass?.states || {}, [...this.selected], action, value);
      const results = await Promise.allSettled(calls.map(call => this._hass.callService('light', call.service, call.data)));
      if (results.some(result => result.status === 'rejected')) this.error = 'Some lights could not be updated. Check their state and try again.';
    } catch { this.error = 'The light command could not be sent. Please try again.'; }
    finally { this.busy = false; this.render(); }
  }
  render() {
    if (!this.config) return;
    const states = this._hass?.states || {};
    const card = element('ha-card');
    const header = element('header', {}, [element('h2', { text: this.config.title })]);
    const tabs = element('div', { className: 'row', role: 'group', 'aria-label': 'Floors' });
    this.config.floors.forEach(floor => tabs.append(button(floor.name || floor.id, () => { this.floorId = floor.id; this.render(); }, { 'aria-pressed': String(floor.id === this.floorId) })));
    header.append(tabs); card.append(header);
    const floor = this.config.floors.find(f => f.id === this.floorId);
    if (!floor?.image) card.append(element('p', { className: 'hint', text: 'Open the card editor for guided setup: add a floor image, draw rooms, then place lights and sensors. No YAML needed.' }));
    else {
      const markers = [];
      floor.entities.forEach(item => {
        const state = states[item.entity]; const light = item.entity.startsWith('light.');
        const name = item.name || state?.attributes.friendly_name || item.entity;
        const text = !available(state) ? 'Unavailable' : light ? state.state === 'on' ? 'On' : 'Off' : `${state.state} ${state.attributes.unit_of_measurement || ''}`.trim();
        const marker = button('', () => {
          if (light) this.toggle([item.entity]);
          else this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: item.entity }, bubbles: true, composed: true }));
        }, { className: `marker ${light ? state?.state === 'on' ? 'on' : '' : 'sensor'}`, title: `${name}: ${text}`, 'aria-label': `${name}: ${text}`, ...(light ? { 'aria-pressed': String(this.selected.has(item.entity)) } : {}) });
        marker.append(element('span', { text: name }), element('small', { text }));
        markers.push({ node: marker, x: item.x, y: item.y });
      }); card.append(renderPlan(floor, states, { markers }));
    }
    const controls = element('section', { className: 'controls', 'aria-label': 'Light controls' });
    const groups = element('div', { className: 'row' });
    if(floor?.rooms.length) {
      const rooms = element('div', { className: 'room-status', 'aria-label': 'Rooms' });
      for(const room of floor.rooms) {
        const state=roomState(room,states);
        const row=button('',()=>this.toggle(room.lights),{className:'room-button',disabled:!room.lights.length,'aria-pressed':String(!!room.lights.length && room.lights.every(id=>this.selected.has(id)))});
        row.append(element('strong',{text:room.name}),element('small',{text:`${state.lightState}${state.presence?' · '+state.presence:''}`}));rooms.append(row);
      }
      controls.append(rooms);
    }
    this.config.groups.forEach(group => groups.append(button(group.name, () => this.toggle(group.entities), { disabled: !group.entities.length, 'aria-pressed': String(!!group.entities.length && group.entities.every(id => this.selected.has(id))) })));
    if (floor?.entities.some(e => e.entity.startsWith('light.'))) groups.append(button('Select floor', () => { floor.entities.filter(e => e.entity.startsWith('light.')).forEach(e => this.selected.add(e.entity)); this.render(); }));
    groups.append(button('Clear', () => { this.selected.clear(); this.render(); }, { disabled: !this.selected.size })); controls.append(groups);
    const selected = [...this.selected]; const online = selected.filter(id => available(states[id]));
    controls.append(element('p', { text: selected.length ? `${selected.length} selected · ${online.length} available (across all floors)` : 'Tap lights to select one or more, then choose a control.', role: 'status' }));
    if (selected.length) {
      controls.append(element('div', { className: 'row' }, [button('Turn on', () => this.control('on'), { disabled: this.busy || !online.length }), button('Turn off', () => this.control('off'), { disabled: this.busy || !online.length })]));
      const eligible = action => online.filter(id => capabilities(states[id])[action]);
      const brightness = eligible('brightness'); const colours = eligible('colour'); const temperatures = eligible('temperature');
      if (brightness.length) {
        const value = Math.round((states[brightness[0]].attributes.brightness ?? 255) / 255 * 100);
        const output = element('output', { text: `${value}%` });
        controls.append(field(`Brightness · ${brightness.length} of ${selected.length} lights`, element('input', { type: 'range', min: 1, max: 100, value: Math.max(1, value), disabled: this.busy, oninput: e => { output.textContent = `${e.target.value}%`; }, onchange: e => this.control('brightness', Number(e.target.value)) })), output);
      }
      if (colours.length) {
        const rgb = states[colours[0]].attributes.rgb_color || [255, 255, 255];
        controls.append(field(`Colour · ${colours.length} of ${selected.length} lights`, element('input', { type: 'color', value: '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join(''), disabled: this.busy, onchange: e => this.control('colour', e.target.value.slice(1).match(/../g).map(v => parseInt(v, 16))) })));
      }
      if (temperatures.length) {
        const attributes = temperatures.map(id => states[id].attributes);
        controls.append(field(`White temperature · ${temperatures.length} of ${selected.length} lights (clamped to each light’s range)`, element('input', { type: 'range', min: Math.min(...attributes.map(a => a.min_color_temp_kelvin || 2000)), max: Math.max(...attributes.map(a => a.max_color_temp_kelvin || 6500)), step: 1, value: attributes[0].color_temp_kelvin || 3000, disabled: this.busy, onchange: e => this.control('temperature', Number(e.target.value)) })));
      }
      controls.append(element('p', { className: 'muted', text: 'Controls apply only to compatible, available lights. Slider and colour values start from the first compatible light.' }));
    }
    if (this.busy) controls.append(element('p', { text: 'Updating lights…', role: 'status' }));
    if (this.error) controls.append(element('p', { className: 'error', text: this.error, role: 'alert' }));
    card.append(controls); this.shadowRoot.replaceChildren(element('style', { text: styles }), card);
  }
}
customElements.define('floorplan-card', FloorplanCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'floorplan-card', name: 'Floorplan Card', description: 'Place lights and sensors on a floorplan, with capability-aware group controls.', preview: true });

import {placeOnSurface,updateFurniture,removeFurniture} from './furniture-support.js';
import {lavaColours} from './lava3d.js';
import { newId, element, button, field, svgElement } from './dom.js';
import { renderPlan as render2D } from './plan.js';
import { render3D } from './plan3d.js';
import { CATALOGUE, objectGlyph, TV_SIZES, tvDimensions } from './catalogue.js';
import { PRODUCT_PRESETS, productPreset, applyProductPreset, productDimensions } from './product-catalogue.js';
import { floorDimensions } from './scene.js';
import { furnitureStyles } from './furniture-styles.js';
import { iconButton } from './icons.js';
import { entitySelect } from './setup.js';
import {isPresenceSensor} from './presence-sensors.js';
import {sensorFields} from './sensor-editor.js';
import {weatherEntity} from './weather.js';
import {liveFields} from './live-fields.js';
const LIBRARY=[...CATALOGUE.map(item=>({...item,id:item.type})),...PRODUCT_PRESETS];
export function furnitureSetup(host, floor) {
  const preview=host.furniturePreview==='3d';
  function renderPlan(floor,states,options){
    if(!preview)return render2D(floor,states,{...options,mode:'clean'});
    host.furniture3DViews??=new Map();if(!host.furniture3DViews.has(floor.id))host.furniture3DViews.set(floor.id,{});
    return render3D(floor,states,{mode:'3d',edit:true,weather:{...host.config.weather,entity:weatherEntity(host.config)},viewState:host.furniture3DViews.get(floor.id)});
  }
  floor.objects ??= [];
  const root = element('div', { className: 'scene-editor furniture-editor' });
  const unlocked=!!host.furnitureUnlocked;
  if(!unlocked||host.resizeObject!==host.selectedObject||host.pendingObject)host.resizeObject='';
  host.snapMetres??=.1;
  let cancelPaletteDrag=()=>{},suppressPaletteClickUntil=0;
  host.furnitureViews??=new Map();if(!host.furnitureViews.has(floor.id))host.furnitureViews.set(floor.id,{zoom:1,panX:0,panY:0});const viewState=host.furnitureViews.get(floor.id);
  root.append(element('style',{text:furnitureStyles}),element('div',{className:'furniture-header'},[element('p',{text:unlocked?'Select furniture to edit, or add from the catalogue.':'Unlock editing to add or adjust furniture.'}),iconButton(unlocked?'Lock editing':'Unlock editing','edit',()=>{host.furnitureUnlocked=!unlocked;host.pendingObject='';host.render();},{'aria-pressed':String(unlocked)})]));
  const workspace=element('div',{className:'furniture-workspace'}),canvas=element('div',{className:'furniture-canvas'}),panel=element('div',{className:'furniture-panel'}),actions=element('div',{className:'furniture-actions','aria-label':'Selected furniture actions'});
  workspace.append(canvas,panel);root.append(workspace);
  canvas.append(element('div',{className:'row','aria-label':'Furniture editor view'},[
    button('2D edit',()=>{host.furniturePreview='clean';host.render();},{'aria-pressed':String(!preview)}),
    button('3D preview',()=>{host.furniturePreview='3d';host.pendingObject='';host.render();},{'aria-pressed':String(preview)})
  ]));
  if(preview)canvas.append(element('p',{className:'furniture-lock-hint',text:'Preview clearance; edit in 2D.'}));
  panel.append(element('div',{className:'row'},[button('Add furniture',()=>{host.furnitureUnlocked=true;host.selectedObject='';host.pendingObject='';host.render();}),button('Add lights & sensors',()=>{host.step=3;host.pendingElement='spot';host.pendingEntity='';host.render();})]));
  const palette = element('div', { className: 'furniture-palette row', 'aria-label': 'Furniture catalogue' });
  const startPaletteDrag=(event,item,tile)=>{
    if(!unlocked||event.pointerType==='mouse'||event.button!==0)return;
    cancelPaletteDrag();const start=[event.clientX,event.clientY],pointerId=event.pointerId;let ghost,dragged=false;
    const cleanup=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',cancel);ghost?.remove();cancelPaletteDrag=()=>{};};
    const move=e=>{if(e.pointerId!==pointerId)return;if(!dragged&&Math.hypot(e.clientX-start[0],e.clientY-start[1])<8)return;dragged=true;e.preventDefault();if(!ghost){ghost=element('div',{'aria-hidden':'true'});ghost.style.cssText='position:fixed;z-index:10000;pointer-events:none;width:52px;height:52px;padding:6px;background:#ffffffdf;border:2px solid #007c91;border-radius:9px;box-shadow:0 3px 12px #0003;transform:translate(-50%,-50%)';ghost.append(tile.querySelector('svg').cloneNode(true));document.body.append(ghost);}ghost.style.left=`${e.clientX}px`;ghost.style.top=`${e.clientY}px`;};
    const finish=e=>{if(e.pointerId!==pointerId)return;const point=dragged?plan.pointFromClient?.(e.clientX,e.clientY):null;if(dragged)suppressPaletteClickUntil=Date.now()+500;cleanup();if(point)place(point,item.id);};
    const cancel=e=>{if(e.pointerId===pointerId)cleanup();};cancelPaletteDrag=cleanup;
    window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',cancel);
  };
  const filter = value => {
    palette.replaceChildren();
    LIBRARY.filter(item => `${item.name} ${item.category} ${CATALOGUE.find(p=>p.type===item.type)?.name||''}`.toLowerCase().includes(value.toLowerCase())).forEach(item => { const tile=button(item.name, () => { if(Date.now()<suppressPaletteClickUntil)return;host.furniturePreview='clean';host.pendingObject = item.id; host.render(); }, { disabled:!unlocked,draggable:unlocked,'aria-pressed': String(host.pendingObject === item.id),title:`Drag ${item.name} onto the plan or tap to place.` }); const thumbnail=svgElement('svg',{viewBox:'0 0 100 100',width:48,height:48,'aria-hidden':'true'});const art=svgElement('g');art.append(objectGlyph(item,'clean'));thumbnail.append(art);tile.prepend(thumbnail);if(item.category==='Products')tile.append(element('small',{text:productDimensions(item)}));if(unlocked)tile.style.touchAction='none';tile.addEventListener('dragstart',e=>{if(!unlocked)return;e.dataTransfer.setData('application/x-floorplan-object',item.id);e.dataTransfer.effectAllowed='copy';});tile.addEventListener('pointerdown',e=>startPaletteDrag(e,item,tile));palette.append(tile); });
    if (!palette.childNodes.length) palette.append(element('p', { text: 'No matching objects.' }));
  };
  panel.append(element('details',{open:unlocked&&(!host.selectedObject||!!host.pendingObject)},[element('summary',{text:'Add furniture'}),field('Find furniture', element('input', { type: 'search', value: host.furnitureQuery || '', placeholder: 'Bed, piano, sofa…',disabled:!unlocked, oninput: e => { host.furnitureQuery = e.target.value; filter(e.target.value); } })), palette]));
  filter(host.furnitureQuery || '');
  const snap = point => { const grid = host.snapMetres ?? .1; if (!grid) return point; const dims = floorDimensions(floor); return point.map((value,i) => Math.max(0,Math.min(100,Math.round(value/100*(i?dims.depth:dims.width)/grid)*grid/(i?dims.depth:dims.width)*100))); };
  const snapping = element('select',{disabled:!unlocked,onchange:e=>{host.snapMetres=Number(e.target.value);}});for(const [value,text] of [[0,'Off'],[.1,'10 cm'],[.25,'25 cm'],[.5,'50 cm']])snapping.append(element('option',{value,text,selected:(host.snapMetres ?? .1)===value}));
  const place = (point,type=host.pendingObject) => {
    if(!unlocked)return;
    point = snap(point);
    const item = LIBRARY.find(value => value.id === type); if (!item) return;
    let object = { id: newId(), type: item.type, x: point[0], y: point[1], width: item.width, depth: item.depth, height: item.height, rotation: 0 };
    if(item.category==='Products')object=applyProductPreset(object,item);
    if(object.product_id?.startsWith('mathmos-')){
      object.light_entity='light.floorplan_'+object.id.replace(/[^a-z0-9]/g,'');
      const room=[...floor.rooms].sort((a,b)=>Math.hypot(a.points[0][0]-object.x,a.points[0][1]-object.y)-Math.hypot(b.points[0][0]-object.x,b.points[0][1]-object.y))[0];room?.lights.push(object.light_entity);
      floor.entities.push({entity:object.light_entity,x:object.x,y:object.y,unbound:true});
    }
    placeOnSurface(floor,object);floor.objects.push(object); host.selectedObject = object.id; host.pendingObject = ''; host.emit();
  };
  if (host.pendingObject) canvas.append(element('div', { className: 'row furniture-placement', role: 'status' }, [element('span', { text: `Tap to place ${LIBRARY.find(i => i.id === host.pendingObject)?.name || 'furniture'}.` }), button('Place furniture in centre', () => place([50,50])), button('Cancel placement', () => { host.pendingObject = ''; host.render(); })]));
  const plan=renderPlan(floor, host._hass?.states || {}, { edit: true,viewState, mode: ['3d','sims'].includes(host.config.appearance?.mode) ? 'clean' : host.config.appearance?.mode, selectedObject: host.selectedObject, onPoint: place, onObject: (id,point) => { if(host.pendingObject){place(point);return;}host.selectedObject = id; host.pendingObject = ''; host.render(); },onObjectContext:id=>{host.selectedObject=id;host.pendingObject='';host.render();host.shadowRoot.querySelector('[data-object-tools]')?.focus();}, onObjectMove: unlocked&&!host.pendingObject?(id, point) => { const item = floor.objects.find(o => o.id === id); if (item) { point=snap(point); updateFurniture(floor,item,{x:point[0],y:point[1]}); host.selectedObject = id; host.emit(); } }:undefined,onObjectResize:unlocked&&host.resizeObject===host.selectedObject?(id,size)=>{const item=floor.objects.find(o=>o.id===id);if(item){updateFurniture(floor,item,size);host.emit();}}:undefined });
  canvas.append(plan);
  plan.addEventListener('dragover',e=>{if(unlocked&&e.dataTransfer.types.includes('application/x-floorplan-object')){e.preventDefault();e.dataTransfer.dropEffect='copy';}});
  plan.addEventListener('drop',e=>{if(!unlocked)return;const type=e.dataTransfer.getData('application/x-floorplan-object'),point=plan.pointFromClient?.(e.clientX,e.clientY);if(!point||!LIBRARY.some(item=>item.id===type))return;e.preventDefault();e.stopPropagation();place(point,type);});
  let fitFrame=0,fitDisposed=false;
  const fitPlan=()=>{fitFrame=0;if(fitDisposed||!plan.isConnected)return;const top=plan.getBoundingClientRect().top,canvasStyle=getComputedStyle(canvas),width=canvas.clientWidth-parseFloat(canvasStyle.paddingLeft)-parseFloat(canvasStyle.paddingRight),ratio=Number(plan.style.getPropertyValue('--plan-ratio')) || 1,height=Math.max(160,window.innerHeight-top-125);if(preview){plan.style.setProperty('width',`${Math.max(1,width)}px`,'important');plan.style.height=`${Math.max(320,height)}px`;}else plan.style.setProperty('width',`${Math.max(1,Math.min(width,height*ratio))}px`,'important');};
  const scheduleFit=()=>{if(!fitFrame&&!fitDisposed)fitFrame=requestAnimationFrame(fitPlan);};
  const fitObserver=new ResizeObserver(scheduleFit);fitObserver.observe(canvas);fitObserver.observe(root);window.addEventListener('resize',scheduleFit);scheduleFit();
  const disposePlan=plan.dispose;plan.dispose=()=>{cancelPaletteDrag();fitDisposed=true;cancelAnimationFrame(fitFrame);fitObserver.disconnect();window.removeEventListener('resize',scheduleFit);disposePlan?.();};
  canvas.append(element('p',{className:'furniture-lock-hint',text:'Triangles show fronts. '+(unlocked?'Drag to move; choose Resize furniture for handles. Zoom in for precision.':'Locked: select to inspect size.')}));
  const selection = element('select', { onchange: e => { host.selectedObject = e.target.value; host.render(); } }, [element('option', { value: '', text: 'Select placed furniture…' })]);
  floor.objects.forEach((item, index) => selection.append(element('option', { value: item.id, selected: item.id === host.selectedObject, text: `${item.name || CATALOGUE.find(i => i.type === item.type)?.name || item.type} ${index + 1}` })));
  panel.append(field('Placed furniture', selection));
  panel.append(actions);
  const selected = floor.objects.find(item => item.id === host.selectedObject);
  if (selected) {
    actions.append(button('Resize furniture',()=>{host.resizeObject=host.resizeObject?'':selected.id;host.render();},{disabled:!unlocked||preview,'aria-pressed':String(host.resizeObject===selected.id)}));
    if(selected.support_id)panel.append(element('p',{text:'On '+(floor.objects.find(o=>o.id===selected.support_id)?.name||'furniture surface')}));
    const inspector = element('fieldset', { className: 'object-inspector',disabled:!unlocked }, [element('legend', { text: 'Furniture position and size' })]);
    if(selected.product_id?.startsWith('mathmos-'))inspector.append(field('Lava bottle colour',element('select',{onchange:e=>{selected.lava_colour=Number(e.target.value);host.emit();}},lavaColours.map(([name],i)=>element('option',{value:i,text:name,selected:i===(selected.lava_colour??9)})))));
    if(isPresenceSensor(selected))sensorFields(host,floor,selected,inspector);
    const presets=PRODUCT_PRESETS.filter(p=>p.type===selected.type),product=productPreset(selected);
    if(presets.length){
      const picker=element('select',{disabled:!unlocked,onchange:e=>{const preset=PRODUCT_PRESETS.find(p=>p.id===e.target.value);if(preset)updateFurniture(floor,selected,applyProductPreset(selected,preset));else {delete selected.product_id;delete selected.name;}host.emit();}},[element('option',{value:'',text:'Custom / generic dimensions',selected:!product})]);
      for(const preset of presets)picker.append(element('option',{value:preset.id,text:preset.name,selected:product?.id===preset.id}));
      picker.setAttribute('aria-label','Product preset');const presetField=field('Product preset',picker);presetField.classList.add('product-field');inspector.append(presetField);
    }
    if(product){
      inspector.append(element('p',{text:productDimensions(product)}),element('a',{href:product.source,target:'_blank',rel:'noopener noreferrer',text:'Product dimensions source'}));
      if(product.note)inspector.append(element('p',{className:'muted',text:product.note}));
      const finishes=element('div',{className:'row product-finishes','aria-label':'Suggested product finishes'});
      for(const [name,colour] of product.colours){const swatch=button(name,()=>{selected.colour=colour;host.emit();},{disabled:!unlocked,'aria-pressed':String(selected.colour===colour)});const chip=element('span',{'aria-hidden':'true'});chip.style.cssText=`display:inline-block;width:16px;height:16px;border-radius:50%;border:1px solid #888;background:${colour}`;swatch.prepend(chip);finishes.append(swatch);}
      inspector.append(finishes,element('p',{className:'muted',text:'Approximate finishes. Colours and dimensions are editable.'}),button('Restore product dimensions',()=>{updateFurniture(floor,selected,{width:product.width,depth:product.depth,height:product.height});host.emit();},{disabled:!unlocked}));
    }
    if(['tv','tv_lightstrip'].includes(selected.type)){
      const current=TV_SIZES.find(size=>{const dims=tvDimensions(size);return Math.abs(selected.width-dims.width)<.0001&&Math.abs(selected.height-dims.height)<.0001;}),screen=element('select',{onchange:e=>{if(!e.target.value)return;Object.assign(selected,tvDimensions(Number(e.target.value)));host.emit();}},[element('option',{value:'',text:'Custom dimensions',selected:!current})]);
      for(const size of TV_SIZES)screen.append(element('option',{value:size,text:`${size} inch · 16:9`,selected:current===size}));
      inspector.append(field('TV screen size',screen),element('p',{className:'muted',text:'Choosing a size sets screen width and height.'}));
    }
    if(selected.type==='radiator')inspector.append(field('Radiator heating entity',entitySelect(host,/^(climate|switch|binary_sensor)\./,selected.heating_entity || '',id=>{selected.heating_entity=id;host.emit();})),...liveFields(host,selected,[['heating_demand_entity','Heating demand override']]),element('p',{className:'muted',text:'Uses the room heating demand when set; this is a room-level proxy, not individual valve data.'}));
    if(selected.type==='printer_3d')inspector.append(...liveFields(host,selected,[['status_entity','Printer status'],['progress_entity','Print progress'],['time_left_entity','Print time left'],['bed_temperature_entity','Bed temperature'],['job_entity','Print job'],['camera_entity','Printer camera','camera']]));
    if(selected.type==='picture')inspector.append(field('Artwork media player (HA-Meural)',entitySelect(host,/^media_player\./,selected.media_entity || '',id=>{selected.media_entity=id;host.emit();})),field('Fallback / landscape artwork URL or data image',element('input',{value:selected.artwork_image || '',onchange:e=>{selected.artwork_image=e.target.value;host.emit();}})),field('Portrait artwork URL or data image',element('input',{value:selected.artwork_portrait_image || '',onchange:e=>{selected.artwork_portrait_image=e.target.value;host.emit();}})),element('p',{className:'muted',text:'Tap to rotate in 3D. Uses orientation artwork if set, otherwise the media player image.'}));
    if(selected.type==='tv')inspector.append(field('TV media player',entitySelect(host,/^media_player\./,selected.media_entity || '',id=>{selected.media_entity=id;host.emit();})),element('p',{className:'muted',text:'Optional TV media player; lighting is linked separately.'}));
    if(selected.type==='tv_lightstrip')inspector.append(field('Hue Sync TV',entitySelect(host,/^media_player\./,selected.sync_media_entity || '',id=>{selected.sync_media_entity=id;host.emit();})));
    if(selected.type==='tv_lightstrip'){
      for(const [key,label] of [['pattern_entity','Strip pattern sensor'],['colour_entity','Strip colour sensor'],['fill_entity','Strip fill percentage sensor']])inspector.append(field(label,entitySelect(host,/^sensor\./,selected[key] || '',id=>{selected[key]=id;host.emit();})));
      inspector.append(field('Strip fill direction',element('select',{onchange:e=>{selected.fill_direction=e.target.value;host.emit();}},['left-to-right','right-to-left'].map(value=>element('option',{value,text:value==='left-to-right'?'Local left to right':'Local right to left',selected:(selected.fill_direction || 'left-to-right')===value})))),element('p',{className:'muted',text:'Pattern overrides the light state. Keep the full strip width; the centre dot stays 8 cm wide. Direction follows the object before rotation; reverse it to match the plug end.'}));
    }
    inspector.append(field('Reactive light entity',entitySelect(host,/^light\./,selected.light_entity || '',id=>{selected.light_entity=id;host.emit();})),field('Height above floor (metres)',element('input',{type:'number',min:0,max:100,step:.01,value:selected.elevation_m || 0,onchange:e=>{const value=Number(e.target.value);if(!Number.isFinite(value)||value<0||value>100){host.error='Height above floor must be between zero and 100 metres.';host.render();return;}updateFurniture(floor,selected,{elevation_m:value});host.emit();}})),element('p',{className:'muted',text:'Drop equipment onto a table or desk to set its height automatically. Moving the table carries it; moving equipment off returns it to the floor. Manual height detaches it.'}));
    for (const [key, label, min, max, step] of [['width','Width (metres)',.001,30,'any'],['depth','Depth (metres)',.001,30,'any'],['rotation','Object rotation (degrees)',0,359,1],['height','Height (metres)',.001,10,'any'],['x','X position (%)',0,100,.1],['y','Y position (%)',0,100,.1]]) inspector.append(field(label, element('input', { type: 'number', value: selected[key], min, max, step, onchange: e => { const value = Number(e.target.value); if (!Number.isFinite(value) || value < min || value > max) { host.error = `${label} must be between ${min} and ${max}.`; host.render(); return; } updateFurniture(floor,selected,{[key]:value}); host.emit(); } })));
    inspector.append(field('Furniture colour', element('input', { type: 'color', value: selected.colour || '#b58b65', onchange: e => { selected.colour = e.target.value; host.emit(); } })));
    if(['kitchen_unit','island','kitchen_island'].includes(selected.type))for(const [key,label,fallback] of [['worktop_colour','Worktop colour','#eee9dc'],['handle_colour','Handle colour','#334148']])inspector.append(field(label,element('input',{type:'color',value:selected[key] || fallback,onchange:e=>{selected[key]=e.target.value;host.emit();}})));
    if(['dining_table','chair','side_table','desk'].includes(selected.type))inspector.append(field('Leg colour',element('input',{type:'color',value:selected.leg_colour || selected.colour || '#334148',onchange:e=>{selected.leg_colour=e.target.value;host.emit();}})));
    if(selected.type==='dining_table'){const finish=element('select',{onchange:e=>{selected.surface_finish=e.target.value;host.emit();}});for(const [value,text] of [['plain','Plain'],['speckled','Speckled']])finish.append(element('option',{value,text,selected:(selected.surface_finish || 'plain')===value}));inspector.append(field('Tabletop finish',finish));}
    const spriteUpload=element('details',{open:host.spriteArtworkId===selected.id},[element('summary',{text:'Custom pixel artwork'}),element('p',{text:'Proportional transparent sprites; upright fronts may exceed the footprint. Keep game artwork private.'})]);
    spriteUpload.addEventListener('toggle',()=>{host.spriteArtworkId=spriteUpload.open?selected.id:null;});
    for(const [mode,label] of [['pokemon','Pokémon'],['zelda','Zelda']]){spriteUpload.append(field(`${label} furniture sprite`,element('input',{type:'file',accept:'image/png,image/jpeg,image/webp,image/svg+xml',disabled:!!host.uploadingStyle,onchange:e=>host.uploadStyleImage(floor.id,mode,e.target.files?.[0],selected.id)})));if(selected.style_images?.[mode])spriteUpload.append(button(`Remove ${label} sprite`,()=>{delete selected.style_images[mode];host.emit();}));}inspector.append(spriteUpload);
    const variants={extractor_fan:[['','Ceiling mounted'],['wall','Wall mounted']],stairs:[['','Solid'],['understairs','Sloping underside']],radiator:[['','Panel radiator'],['towel_rail','Chrome towel rail']],sink:[['','Vanity sink'],['inset','Inset kitchen sink']],kitchen_unit:[['','Base unit'],['wall','Wall cupboard'],['glass','Glazed wall cupboard'],['drawers','Drawer unit'],['cooker','Cooker'],['extractor','Extraction hood']],fridge:[['','Freestanding'],['integrated','Integrated']],sofa:[['','Straight sofa'],['corner','Corner sofa']],piano:[['','Upright piano'],['grand','Grand piano']],bed:[['','Double bed'],['single','Single bed']],desk:[['','Desk with computer'],['plain','Plain desk']],bookshelf:[['','Bookshelf'],['cubes','Cube storage']]};
    if(selected.type==='nanoleaf_panels'){
      const effect=element('select',{onchange:e=>{selected.panel_effect=e.target.value;host.emit();}});for(const [value,text] of [['static','Static'],['breathe','Breathe'],['wave','Wave'],['rainbow','Rainbow']])effect.append(element('option',{value,text,selected:(selected.panel_effect || 'static')===value}));inspector.append(field('Panel light effect',effect));
      const layout=selected.panel_layout || Array.from({length:21},(_,i)=>[Math.floor(i/3),i%3+Math.floor(i/3)%2]),cells=new Map();
      for(const [q,r] of layout)for(const [dq,dr] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]])if(Math.abs(q+dq)<=50&&Math.abs(r+dr)<=50)cells.set(`${q+dq},${r+dr}`,[q+dq,r+dr]);
      const coords=[...cells.values()].map(([q,r])=>({q,r,x:Math.sqrt(3)*(q+r/2)*14,y:1.5*r*14})),minX=Math.min(...coords.map(p=>p.x))-16,minY=Math.min(...coords.map(p=>p.y))-16;
      const grid=svgElement('svg',{viewBox:`${minX} ${minY} ${Math.max(...coords.map(p=>p.x))-minX+16} ${Math.max(...coords.map(p=>p.y))-minY+16}`,role:'group','aria-label':'Hexagon panel arrangement',style:'width:100%;max-height:180px'});
      for(const p of coords){const active=layout.some(([q,r])=>q===p.q&&r===p.r),node=svgElement('polygon',{points:Array.from({length:6},(_,i)=>`${p.x+13*Math.cos((30+i*60)*Math.PI/180)},${p.y+13*Math.sin((30+i*60)*Math.PI/180)}`).join(' '),fill:active?'#a594d1':'#dce1e5',stroke:'#fff',role:'button',tabindex:0,'aria-label':`${active?'Remove':'Add'} hexagon ${p.q}, ${p.r}`,'aria-pressed':String(active)});
        const toggle=()=>{if(!unlocked)return;const next=active?layout.filter(([q,r])=>q!==p.q||r!==p.r):[...layout,[p.q,p.r]];if(!next.length||next.length>100)return;selected.panel_layout=next;host.emit();};node.addEventListener('click',toggle);node.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();toggle();}});grid.append(node);}
      inspector.append(element('p',{className:'muted',text:'Tap a pale neighbouring hexagon to add a panel, or an existing panel to remove it.'}),grid);
    }
    if(variants[selected.type]){const variant=element('select',{onchange:e=>{if(selected.type==='extractor_fan'&&selected.variant!==e.target.value)[selected.depth,selected.height]=[selected.height,selected.depth];selected.variant=e.target.value;host.emit();}});for(const [value,text] of variants[selected.type])variant.append(element('option',{value,text,selected:(selected.variant || '')===value}));inspector.append(field('Furniture variant',variant));}
    const nudge = (dx,dy) => { updateFurniture(floor,selected,{x:Math.max(0,Math.min(100,selected.x+dx)),y:Math.max(0,Math.min(100,selected.y+dy))}); host.emit(); };
    inspector.append(element('div', { className: 'row' }, [button('Move left', () => nudge(-1,0)),button('Move right', () => nudge(1,0)),button('Move up', () => nudge(0,-1)),button('Move down', () => nudge(0,1))]));
    actions.append(iconButton('Rotate furniture','rotate',() => { updateFurniture(floor,selected,{rotation:(selected.rotation+90)%360}); host.emit(); },{disabled:!unlocked,'data-object-tools':''}),iconButton('Duplicate furniture','plus',() => { const copy = { ...selected, id: newId(), x: Math.min(100, selected.x + 3), y: Math.min(100, selected.y + 3) }; placeOnSurface(floor,copy);floor.objects.push(copy); host.selectedObject = copy.id; host.emit(); },{disabled:!unlocked}),iconButton('Remove furniture','trash',() => { removeFurniture(floor,selected); host.selectedObject = ''; host.emit(); },{disabled:!unlocked}));
    const keyboard = element('button', { type: 'button', text: 'Keyboard move: focus here and use arrow keys', onkeydown: e => { const moves = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] }; if (!moves[e.key]) return; e.preventDefault(); nudge(...moves[e.key].map(v => v * (e.shiftKey ? 5 : 1))); host.shadowRoot.querySelector('[data-keyboard-move]')?.focus(); }, 'data-keyboard-move': '' }); inspector.append(keyboard); panel.append(inspector);
  } else if (!floor.objects.length) panel.append(element('p', { className: 'muted', text: 'Unlock editing to add furniture.' }));
  panel.append(field('Snap furniture to grid',snapping));
  return root;
}

import { element, button, field, svgElement } from './dom.js';
import { renderPlan } from './plan.js';
import { CATALOGUE, objectGlyph, TV_SIZES, tvDimensions } from './catalogue.js';
import { objectArtwork } from './object-art.js';
import { floorDimensions } from './scene.js';
import { furnitureStyles } from './furniture-styles.js';
import { iconButton } from './icons.js';
import { entitySelect } from './setup.js';
export function furnitureSetup(host, floor) {
  floor.objects ??= [];
  const root = element('div', { className: 'scene-editor furniture-editor' });
  const unlocked=!!host.furnitureUnlocked;
  host.snapMetres??=.1;
  let cancelPaletteDrag=()=>{},suppressPaletteClickUntil=0;
  host.furnitureViews??=new Map();if(!host.furnitureViews.has(floor.id))host.furnitureViews.set(floor.id,{zoom:1,panX:0,panY:0});const viewState=host.furnitureViews.get(floor.id);
  root.append(element('style',{text:furnitureStyles}),element('div',{className:'furniture-header'},[element('p',{text:unlocked?'Select furniture to move or resize it. Add objects from the catalogue.':'Explore your layout. Unlock editing to add, move or resize furniture.'}),iconButton(unlocked?'Lock editing':'Unlock editing','edit',()=>{host.furnitureUnlocked=!unlocked;host.pendingObject='';host.render();},{'aria-pressed':String(unlocked)})]));
  const workspace=element('div',{className:'furniture-workspace'}),canvas=element('div',{className:'furniture-canvas'}),panel=element('div',{className:'furniture-panel'}),actions=element('div',{className:'furniture-actions','aria-label':'Selected furniture actions'});
  workspace.append(canvas,panel);root.append(workspace);
  panel.append(button('Add furniture',()=>{host.furnitureUnlocked=true;host.selectedObject='';host.pendingObject='';host.render();}),button('Add lights & sensors',()=>{host.step=3;host.pendingElement='spot';host.pendingEntity='';host.render();}));
  const palette = element('div', { className: 'furniture-palette row', 'aria-label': 'Furniture catalogue' });
  const startPaletteDrag=(event,item,tile)=>{
    if(!unlocked||event.pointerType==='mouse'||event.button!==0)return;
    cancelPaletteDrag();const start=[event.clientX,event.clientY],pointerId=event.pointerId;let ghost,dragged=false;
    const cleanup=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',cancel);ghost?.remove();cancelPaletteDrag=()=>{};};
    const move=e=>{if(e.pointerId!==pointerId)return;if(!dragged&&Math.hypot(e.clientX-start[0],e.clientY-start[1])<8)return;dragged=true;e.preventDefault();if(!ghost){ghost=element('div',{'aria-hidden':'true'});ghost.style.cssText='position:fixed;z-index:10000;pointer-events:none;width:52px;height:52px;padding:6px;background:#ffffffdf;border:2px solid #007c91;border-radius:9px;box-shadow:0 3px 12px #0003;transform:translate(-50%,-50%)';ghost.append(tile.querySelector('svg').cloneNode(true));document.body.append(ghost);}ghost.style.left=`${e.clientX}px`;ghost.style.top=`${e.clientY}px`;};
    const finish=e=>{if(e.pointerId!==pointerId)return;const point=dragged?plan.pointFromClient(e.clientX,e.clientY):null;if(dragged)suppressPaletteClickUntil=Date.now()+500;cleanup();if(point)place(point,item.type);};
    const cancel=e=>{if(e.pointerId===pointerId)cleanup();};cancelPaletteDrag=cleanup;
    window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',cancel);
  };
  const filter = value => {
    palette.replaceChildren();
    CATALOGUE.filter(item => `${item.name} ${item.category}`.toLowerCase().includes(value.toLowerCase())).forEach(item => { const tile=button(item.name, () => { if(Date.now()<suppressPaletteClickUntil)return;host.pendingObject = item.type; host.render(); }, { disabled:!unlocked,draggable:unlocked,'aria-pressed': String(host.pendingObject === item.type),title:`Drag ${item.name} onto the plan, or select and tap its position.` }); const thumbnail=svgElement('svg',{viewBox:'0 0 100 100',width:48,height:48,'aria-hidden':'true'});const art=svgElement('g',{transform:['pokemon','zelda'].includes(host.config.appearance?.mode)?'translate(5 15)':'translate(0 0)'});art.append(['pokemon','zelda'].includes(host.config.appearance?.mode)?objectArtwork(item,host.config.appearance.mode,90,70):objectGlyph(item,host.config.appearance?.mode));thumbnail.append(art);tile.prepend(thumbnail);if(unlocked)tile.style.touchAction='none';tile.addEventListener('dragstart',e=>{if(!unlocked)return;e.dataTransfer.setData('application/x-floorplan-object',item.type);e.dataTransfer.effectAllowed='copy';});tile.addEventListener('pointerdown',e=>startPaletteDrag(e,item,tile));palette.append(tile); });
    if (!palette.childNodes.length) palette.append(element('p', { text: 'No matching objects.' }));
  };
  panel.append(element('details',{open:unlocked&&(!host.selectedObject||!!host.pendingObject)},[element('summary',{text:'Add furniture'}),field('Find furniture', element('input', { type: 'search', value: host.furnitureQuery || '', placeholder: 'Bed, piano, sofa…',disabled:!unlocked, oninput: e => { host.furnitureQuery = e.target.value; filter(e.target.value); } })), palette]));
  filter(host.furnitureQuery || '');
  const snap = point => { const grid = host.snapMetres ?? .1; if (!grid) return point; const dims = floorDimensions(floor); return point.map((value,i) => Math.max(0,Math.min(100,Math.round(value/100*(i?dims.depth:dims.width)/grid)*grid/(i?dims.depth:dims.width)*100))); };
  const snapping = element('select',{disabled:!unlocked,onchange:e=>{host.snapMetres=Number(e.target.value);}});for(const [value,text] of [[0,'Off'],[.1,'10 cm'],[.25,'25 cm'],[.5,'50 cm']])snapping.append(element('option',{value,text,selected:(host.snapMetres ?? .1)===value}));
  const place = (point,type=host.pendingObject) => {
    if(!unlocked)return;
    point = snap(point);
    const item = CATALOGUE.find(value => value.type === type); if (!item) return;
    const object = { id: crypto.randomUUID(), type: item.type, x: point[0], y: point[1], width: item.width, depth: item.depth, height: item.height, rotation: 0 };
    floor.objects.push(object); host.selectedObject = object.id; host.pendingObject = ''; host.emit();
  };
  if (host.pendingObject) canvas.append(element('div', { className: 'row furniture-placement', role: 'status' }, [element('span', { text: `Tap to place ${CATALOGUE.find(i => i.type === host.pendingObject)?.name || 'furniture'}.` }), button('Place furniture in centre', () => place([50,50])), button('Cancel placement', () => { host.pendingObject = ''; host.render(); })]));
  const plan=renderPlan(floor, host._hass?.states || {}, { edit: true,viewState, mode: ['3d','sims'].includes(host.config.appearance?.mode) ? 'clean' : host.config.appearance?.mode, selectedObject: host.selectedObject, onPoint: place, onObject: id => { host.selectedObject = id; host.pendingObject = ''; host.render(); },onObjectContext:id=>{host.selectedObject=id;host.pendingObject='';host.render();host.shadowRoot.querySelector('[data-object-tools]')?.focus();}, onObjectMove: unlocked?(id, point) => { const item = floor.objects.find(o => o.id === id); if (item) { point=snap(point); item.x = point[0]; item.y = point[1]; host.selectedObject = id; host.emit(); } }:undefined,onObjectResize:unlocked?(id,size)=>{const item=floor.objects.find(o=>o.id===id);if(item){item.width=size.width;item.depth=size.depth;host.emit();}}:undefined });
  canvas.append(plan);
  plan.addEventListener('dragover',e=>{if(unlocked&&e.dataTransfer.types.includes('application/x-floorplan-object')){e.preventDefault();e.dataTransfer.dropEffect='copy';}});
  plan.addEventListener('drop',e=>{if(!unlocked)return;const type=e.dataTransfer.getData('application/x-floorplan-object'),point=plan.pointFromClient(e.clientX,e.clientY);if(!point||!CATALOGUE.some(item=>item.type===type))return;e.preventDefault();e.stopPropagation();place(point,type);});
  let fitFrame=0,fitDisposed=false;
  const fitPlan=()=>{fitFrame=0;if(fitDisposed||!plan.isConnected)return;const top=plan.getBoundingClientRect().top,canvasStyle=getComputedStyle(canvas),width=canvas.clientWidth-parseFloat(canvasStyle.paddingLeft)-parseFloat(canvasStyle.paddingRight),ratio=Number(plan.style.getPropertyValue('--plan-ratio')) || 1,height=Math.max(160,window.innerHeight-top-125);plan.style.setProperty('width',`${Math.max(1,Math.min(width,height*ratio))}px`,'important');};
  const scheduleFit=()=>{if(!fitFrame&&!fitDisposed)fitFrame=requestAnimationFrame(fitPlan);};
  const fitObserver=new ResizeObserver(scheduleFit);fitObserver.observe(canvas);fitObserver.observe(root);window.addEventListener('resize',scheduleFit);scheduleFit();
  const disposePlan=plan.dispose;plan.dispose=()=>{cancelPaletteDrag();fitDisposed=true;cancelAnimationFrame(fitFrame);fitObserver.disconnect();window.removeEventListener('resize',scheduleFit);disposePlan?.();};
  canvas.append(element('p',{className:'furniture-lock-hint',text:unlocked?'Drag a selected object’s corner to resize it. Right-click an object to focus its tools; the same actions work by touch below.':'Editing is locked. You can select objects and inspect their dimensions.'}));
  const selection = element('select', { onchange: e => { host.selectedObject = e.target.value; host.render(); } }, [element('option', { value: '', text: 'Select placed furniture…' })]);
  floor.objects.forEach((item, index) => selection.append(element('option', { value: item.id, selected: item.id === host.selectedObject, text: `${CATALOGUE.find(i => i.type === item.type)?.name || item.type} ${index + 1}` })));
  panel.append(field('Placed furniture', selection));
  panel.append(actions);
  const selected = floor.objects.find(item => item.id === host.selectedObject);
  if (selected) {
    const inspector = element('fieldset', { className: 'object-inspector',disabled:!unlocked }, [element('legend', { text: 'Furniture position and size' })]);
    if(['tv','tv_lightstrip'].includes(selected.type)){
      const current=TV_SIZES.find(size=>{const dims=tvDimensions(size);return Math.abs(selected.width-dims.width)<.0001&&Math.abs(selected.height-dims.height)<.0001;}),screen=element('select',{onchange:e=>{if(!e.target.value)return;Object.assign(selected,tvDimensions(Number(e.target.value)));host.emit();}},[element('option',{value:'',text:'Custom dimensions',selected:!current})]);
      for(const size of TV_SIZES)screen.append(element('option',{value:size,text:`${size} inch · 16:9`,selected:current===size}));
      inspector.append(field('TV screen size',screen),element('p',{className:'muted',text:'Presets set screen width and height together. Custom dimensions stay unchanged until you choose a size.'}));
    }
    if(selected.type==='radiator')inspector.append(field('Radiator heating entity',entitySelect(host,/^(climate|switch|binary_sensor)\./,selected.heating_entity || '',id=>{selected.heating_entity=id;host.emit();})),element('p',{className:'muted',text:'A thermostat glows only while actively heating. A switch or activity sensor glows when on. Tap the radiator in live view to open its Home Assistant controls.'}));
    if(selected.type==='tv')inspector.append(field('TV media player',entitySelect(host,/^media_player\./,selected.media_entity || '',id=>{selected.media_entity=id;host.emit();})),element('p',{className:'muted',text:'TV screen activity follows this media player. The reactive light binding is separate and follows a light’s power, brightness and colour. Leave the media player blank if you do not want to link TV activity.'}));
    inspector.append(field('Reactive light entity',entitySelect(host,/^light\./,selected.light_entity || '',id=>{selected.light_entity=id;host.emit();})),field('Height above floor (metres)',element('input',{type:'number',min:0,max:100,step:.01,value:selected.elevation_m || 0,onchange:e=>{const value=Number(e.target.value);if(!Number.isFinite(value)||value<0||value>100){host.error='Height above floor must be between zero and 100 metres.';host.render();return;}selected.elevation_m=value;host.emit();}})),element('p',{className:'muted',text:'For a TV or monitor on furniture, set its height above floor to the supporting bench or desk height. Link a light to make the object follow its power, brightness and colour.'}));
    for (const [key, label, min, max, step] of [['width','Width (metres)',.05,30,.05],['depth','Depth (metres)',.05,30,.05],['rotation','Object rotation (degrees)',0,359,1],['height','Height (metres)',.05,10,.05],['x','X position (%)',0,100,.1],['y','Y position (%)',0,100,.1]]) inspector.append(field(label, element('input', { type: 'number', value: selected[key], min, max, step, onchange: e => { const value = Number(e.target.value); if (!Number.isFinite(value) || value < min || value > max) { host.error = `${label} must be between ${min} and ${max}.`; host.render(); return; } selected[key] = value; host.emit(); } })));
    inspector.append(field('Furniture colour', element('input', { type: 'color', value: selected.colour || '#b58b65', onchange: e => { selected.colour = e.target.value; host.emit(); } })));
    const spriteUpload=element('details',{open:host.spriteArtworkId===selected.id},[element('summary',{text:'Custom pixel artwork'}),element('p',{text:'Upload a transparent furniture sprite for each game style. Artwork keeps its proportions and position. Upright furniture can extend beyond its shallow floor footprint so the front remains visible. Keep extracted game artwork private.'})]);
    spriteUpload.addEventListener('toggle',()=>{host.spriteArtworkId=spriteUpload.open?selected.id:null;});
    for(const [mode,label] of [['pokemon','Pokémon'],['zelda','Zelda']]){spriteUpload.append(field(`${label} furniture sprite`,element('input',{type:'file',accept:'image/png,image/jpeg,image/webp,image/svg+xml',disabled:!!host.uploadingStyle,onchange:e=>host.uploadStyleImage(floor.id,mode,e.target.files?.[0],selected.id)})));if(selected.style_images?.[mode])spriteUpload.append(button(`Remove ${label} sprite`,()=>{delete selected.style_images[mode];host.emit();}));}inspector.append(spriteUpload);
    const variants={sofa:[['','Straight sofa'],['corner','Corner sofa']],piano:[['','Upright piano'],['grand','Grand piano']],bed:[['','Double bed'],['single','Single bed']],desk:[['','Desk with computer'],['plain','Plain desk']],bookshelf:[['','Bookshelf'],['cubes','Cube storage']]};
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
    if(variants[selected.type]){const variant=element('select',{onchange:e=>{selected.variant=e.target.value;host.emit();}});for(const [value,text] of variants[selected.type])variant.append(element('option',{value,text,selected:(selected.variant || '')===value}));inspector.append(field('Furniture variant',variant));}
    const nudge = (dx,dy) => { selected.x = Math.max(0, Math.min(100, selected.x + dx)); selected.y = Math.max(0, Math.min(100, selected.y + dy)); host.emit(); };
    inspector.append(element('div', { className: 'row' }, [button('Move left', () => nudge(-1,0)),button('Move right', () => nudge(1,0)),button('Move up', () => nudge(0,-1)),button('Move down', () => nudge(0,1))]));
    actions.append(iconButton('Rotate furniture','rotate',() => { selected.rotation = (selected.rotation + 90) % 360; host.emit(); },{disabled:!unlocked,'data-object-tools':''}),iconButton('Duplicate furniture','plus',() => { const copy = { ...selected, id: crypto.randomUUID(), x: Math.min(100, selected.x + 3), y: Math.min(100, selected.y + 3) }; floor.objects.push(copy); host.selectedObject = copy.id; host.emit(); },{disabled:!unlocked}),iconButton('Remove furniture','trash',() => { floor.objects = floor.objects.filter(item => item !== selected); host.selectedObject = ''; host.emit(); },{disabled:!unlocked}));
    const keyboard = element('button', { type: 'button', text: 'Keyboard move: focus here and use arrow keys', onkeydown: e => { const moves = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] }; if (!moves[e.key]) return; e.preventDefault(); nudge(...moves[e.key].map(v => v * (e.shiftKey ? 5 : 1))); host.shadowRoot.querySelector('[data-keyboard-move]')?.focus(); }, 'data-keyboard-move': '' }); inspector.append(keyboard); panel.append(inspector);
  } else if (!floor.objects.length) panel.append(element('p', { className: 'muted', text: 'No furniture yet. Unlock editing and start with the largest objects.' }));
  panel.append(field('Snap furniture to grid',snapping));
  return root;
}

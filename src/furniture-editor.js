import { element, button, field, svgElement } from './dom.js';
import { renderPlan } from './plan.js';
import { CATALOGUE, objectGlyph } from './catalogue.js';
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
    CATALOGUE.filter(item => `${item.name} ${item.category}`.toLowerCase().includes(value.toLowerCase())).forEach(item => { const tile=button(item.name, () => { if(Date.now()<suppressPaletteClickUntil)return;host.pendingObject = item.type; host.render(); }, { disabled:!unlocked,draggable:unlocked,'aria-pressed': String(host.pendingObject === item.type),title:`Drag ${item.name} onto the plan, or select and tap its position.` }); const thumbnail=svgElement('svg',{viewBox:'0 0 100 100',width:48,height:48,'aria-hidden':'true'});thumbnail.append(objectGlyph(item,host.config.appearance?.mode));tile.prepend(thumbnail);if(unlocked)tile.style.touchAction='none';tile.addEventListener('dragstart',e=>{if(!unlocked)return;e.dataTransfer.setData('application/x-floorplan-object',item.type);e.dataTransfer.effectAllowed='copy';});tile.addEventListener('pointerdown',e=>startPaletteDrag(e,item,tile));palette.append(tile); });
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
  const plan=renderPlan(floor, host._hass?.states || {}, { edit: true,viewState, mode: host.config.appearance?.mode === '3d' ? 'clean' : host.config.appearance?.mode, selectedObject: host.selectedObject, onPoint: place, onObject: id => { host.selectedObject = id; host.pendingObject = ''; host.render(); },onObjectContext:id=>{host.selectedObject=id;host.pendingObject='';host.render();host.shadowRoot.querySelector('[data-object-tools]')?.focus();}, onObjectMove: unlocked?(id, point) => { const item = floor.objects.find(o => o.id === id); if (item) { point=snap(point); item.x = point[0]; item.y = point[1]; host.selectedObject = id; host.emit(); } }:undefined,onObjectResize:unlocked?(id,size)=>{const item=floor.objects.find(o=>o.id===id);if(item){item.width=size.width;item.depth=size.depth;host.emit();}}:undefined });
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
    if(selected.type==='radiator')inspector.append(field('Radiator heating entity',entitySelect(host,/^(climate|switch|binary_sensor)\./,selected.heating_entity || '',id=>{selected.heating_entity=id;host.emit();})),element('p',{className:'muted',text:'A thermostat glows only while actively heating. A switch or activity sensor glows when on. Tap the radiator in live view to open its Home Assistant controls.'}));
    for (const [key, label, min, max, step] of [['width','Width (metres)',.05,30,.05],['depth','Depth (metres)',.05,30,.05],['rotation','Object rotation (degrees)',0,359,1],['height','Height (metres)',.05,10,.05],['x','X position (%)',0,100,.1],['y','Y position (%)',0,100,.1]]) inspector.append(field(label, element('input', { type: 'number', value: selected[key], min, max, step, onchange: e => { const value = Number(e.target.value); if (!Number.isFinite(value) || value < min || value > max) { host.error = `${label} must be between ${min} and ${max}.`; host.render(); return; } selected[key] = value; host.emit(); } })));
    inspector.append(field('Furniture colour', element('input', { type: 'color', value: selected.colour || '#b58b65', onchange: e => { selected.colour = e.target.value; host.emit(); } })));
    const variants={sofa:[['','Straight sofa'],['corner','Corner sofa']],piano:[['','Upright piano'],['grand','Grand piano']],bed:[['','Double bed'],['single','Single bed']]};
    if(variants[selected.type]){const variant=element('select',{onchange:e=>{selected.variant=e.target.value;host.emit();}});for(const [value,text] of variants[selected.type])variant.append(element('option',{value,text,selected:(selected.variant || '')===value}));inspector.append(field('Furniture variant',variant));}
    const nudge = (dx,dy) => { selected.x = Math.max(0, Math.min(100, selected.x + dx)); selected.y = Math.max(0, Math.min(100, selected.y + dy)); host.emit(); };
    inspector.append(element('div', { className: 'row' }, [button('Move left', () => nudge(-1,0)),button('Move right', () => nudge(1,0)),button('Move up', () => nudge(0,-1)),button('Move down', () => nudge(0,1))]));
    actions.append(iconButton('Rotate furniture','rotate',() => { selected.rotation = (selected.rotation + 90) % 360; host.emit(); },{disabled:!unlocked,'data-object-tools':''}),iconButton('Duplicate furniture','plus',() => { const copy = { ...selected, id: crypto.randomUUID(), x: Math.min(100, selected.x + 3), y: Math.min(100, selected.y + 3) }; floor.objects.push(copy); host.selectedObject = copy.id; host.emit(); },{disabled:!unlocked}),iconButton('Remove furniture','trash',() => { floor.objects = floor.objects.filter(item => item !== selected); host.selectedObject = ''; host.emit(); },{disabled:!unlocked}));
    const keyboard = element('button', { type: 'button', text: 'Keyboard move: focus here and use arrow keys', onkeydown: e => { const moves = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] }; if (!moves[e.key]) return; e.preventDefault(); nudge(...moves[e.key].map(v => v * (e.shiftKey ? 5 : 1))); host.shadowRoot.querySelector('[data-keyboard-move]')?.focus(); }, 'data-keyboard-move': '' }); inspector.append(keyboard); panel.append(inspector);
  } else if (!floor.objects.length) panel.append(element('p', { className: 'muted', text: 'No furniture yet. Unlock editing and start with the largest objects.' }));
  panel.append(field('Snap furniture to grid',snapping));
  return root;
}

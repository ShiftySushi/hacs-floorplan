import { element, button, field, svgElement } from './dom.js';
import { renderPlan } from './plan.js';
import { CATALOGUE, objectGlyph } from './catalogue.js';
import { floorDimensions } from './scene.js';
export function furnitureSetup(host, floor) {
  floor.objects ??= [];
  const root = element('div', { className: 'scene-editor' });
  root.append(element('p', { text: 'Choose an object, then tap the plan to place it. Drag furniture to move it, or use the position controls below. Furniture is decorative; assign lights and sensors in the next step.' }));
  const palette = element('div', { className: 'furniture-palette row', 'aria-label': 'Furniture catalogue' });
  const filter = value => {
    palette.replaceChildren();
    CATALOGUE.filter(item => `${item.name} ${item.category}`.toLowerCase().includes(value.toLowerCase())).forEach(item => { const tile=button(item.name, () => { host.pendingObject = item.type; host.render(); }, { 'aria-pressed': String(host.pendingObject === item.type) }); const thumbnail=svgElement('svg',{viewBox:'0 0 100 100',width:48,height:48,'aria-hidden':'true'});thumbnail.append(objectGlyph(item,host.config.appearance?.mode));tile.prepend(thumbnail);palette.append(tile); });
    if (!palette.childNodes.length) palette.append(element('p', { text: 'No matching objects.' }));
  };
  root.append(field('Find furniture', element('input', { type: 'search', value: host.furnitureQuery || '', placeholder: 'Bed, piano, sofa…', oninput: e => { host.furnitureQuery = e.target.value; filter(e.target.value); } })), palette);
  filter(host.furnitureQuery || '');
  const snap = point => { const grid = host.snapMetres || 0; if (!grid) return point; const dims = floorDimensions(floor); return point.map((value,i) => Math.max(0,Math.min(100,Math.round(value/100*(i?dims.depth:dims.width)/grid)*grid/(i?dims.depth:dims.width)*100))); };
  const snapping = element('select',{onchange:e=>{host.snapMetres=Number(e.target.value);}});for(const [value,text] of [[0,'Off'],[.1,'10 cm'],[.25,'25 cm'],[.5,'50 cm']])snapping.append(element('option',{value,text,selected:(host.snapMetres || 0)===value}));root.append(field('Snap furniture to grid',snapping));
  const place = point => {
    point = snap(point);
    const item = CATALOGUE.find(value => value.type === host.pendingObject); if (!item) return;
    const object = { id: crypto.randomUUID(), type: item.type, x: point[0], y: point[1], width: item.width, depth: item.depth, height: item.height, rotation: 0 };
    floor.objects.push(object); host.selectedObject = object.id; host.pendingObject = ''; host.emit();
  };
  if (host.pendingObject) root.append(element('div', { className: 'row', role: 'status' }, [element('span', { text: `Tap to place ${CATALOGUE.find(i => i.type === host.pendingObject)?.name || 'furniture'}.` }), button('Place furniture in centre', () => place([50,50])), button('Cancel placement', () => { host.pendingObject = ''; host.render(); })]));
  root.append(renderPlan(floor, host._hass?.states || {}, { edit: true, mode: host.config.appearance?.mode === '3d' ? 'clean' : host.config.appearance?.mode, selectedObject: host.selectedObject, onPoint: place, onObject: id => { host.selectedObject = id; host.pendingObject = ''; host.render(); }, onObjectMove: (id, point) => { const item = floor.objects.find(o => o.id === id); if (item) { point=snap(point); item.x = point[0]; item.y = point[1]; host.selectedObject = id; host.emit(); } } }));
  const selection = element('select', { onchange: e => { host.selectedObject = e.target.value; host.render(); } }, [element('option', { value: '', text: 'Select placed furniture…' })]);
  floor.objects.forEach((item, index) => selection.append(element('option', { value: item.id, selected: item.id === host.selectedObject, text: `${CATALOGUE.find(i => i.type === item.type)?.name || item.type} ${index + 1}` })));
  root.append(field('Placed furniture', selection));
  const selected = floor.objects.find(item => item.id === host.selectedObject);
  if (selected) {
    const inspector = element('fieldset', { className: 'object-inspector' }, [element('legend', { text: 'Furniture position and size' })]);
    for (const [key, label, min, max, step] of [['x','X position (%)',0,100,.1],['y','Y position (%)',0,100,.1],['width','Width (metres)',.05,30,.05],['depth','Depth (metres)',.05,30,.05],['height','Height (metres)',.05,10,.05],['rotation','Object rotation (degrees)',0,359,1]]) inspector.append(field(label, element('input', { type: 'number', value: selected[key], min, max, step, onchange: e => { const value = Number(e.target.value); if (!Number.isFinite(value) || value < min || value > max) { host.error = `${label} must be between ${min} and ${max}.`; host.render(); return; } selected[key] = value; host.emit(); } })));
    inspector.append(field('Furniture colour', element('input', { type: 'color', value: selected.colour || '#b58b65', onchange: e => { selected.colour = e.target.value; host.emit(); } })));
    const variants={sofa:[['','Straight sofa'],['corner','Corner sofa']],piano:[['','Upright piano'],['grand','Grand piano']],bed:[['','Double bed'],['single','Single bed']]};
    if(variants[selected.type]){const variant=element('select',{onchange:e=>{selected.variant=e.target.value;host.emit();}});for(const [value,text] of variants[selected.type])variant.append(element('option',{value,text,selected:(selected.variant || '')===value}));inspector.append(field('Furniture variant',variant));}
    const nudge = (dx,dy) => { selected.x = Math.max(0, Math.min(100, selected.x + dx)); selected.y = Math.max(0, Math.min(100, selected.y + dy)); host.emit(); };
    inspector.append(element('div', { className: 'row' }, [button('Move left', () => nudge(-1,0)),button('Move right', () => nudge(1,0)),button('Move up', () => nudge(0,-1)),button('Move down', () => nudge(0,1)),button('Rotate furniture', () => { selected.rotation = (selected.rotation + 90) % 360; host.emit(); }),button('Duplicate furniture', () => { const copy = { ...selected, id: crypto.randomUUID(), x: Math.min(100, selected.x + 3), y: Math.min(100, selected.y + 3) }; floor.objects.push(copy); host.selectedObject = copy.id; host.emit(); }),button('Remove furniture', () => { floor.objects = floor.objects.filter(item => item !== selected); host.selectedObject = ''; host.emit(); })]));
    const keyboard = element('button', { type: 'button', text: 'Keyboard move: focus here and use arrow keys', onkeydown: e => { const moves = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] }; if (!moves[e.key]) return; e.preventDefault(); nudge(...moves[e.key].map(v => v * (e.shiftKey ? 5 : 1))); host.shadowRoot.querySelector('[data-keyboard-move]')?.focus(); }, 'data-keyboard-move': '' }); inspector.append(keyboard); root.append(inspector);
  } else if (!floor.objects.length) root.append(element('p', { className: 'muted', text: 'No furniture yet. Start with the largest objects, then add smaller details.' }));
  return root;
}

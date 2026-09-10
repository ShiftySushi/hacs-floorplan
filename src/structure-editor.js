import { element, button, field } from './dom.js';
import { renderPlan } from './plan.js';
import { floorDimensions } from './scene.js';
export function structureSetup(host, floor) {
  floor.walls ??= [];
  const root = element('details', { open: !!host.wallDrawing || !!host.wallId }, [element('summary', { text: 'Walls, doors and windows for 3D' }), element('p', { text: 'Trace each shared wall once. Add doors and windows to its inspector. Set the scale in Floors first; opening sizes are in metres.' })]);
  root.append(button('Draw wall', () => { host.wallDrawing = true; host.wallDraft = []; host.render(); }));
  if (host.wallDrawing) root.append(element('p', { role: 'status', text: 'Tap the two ends of a wall.' }), button('Cancel wall', () => { host.wallDrawing = false; host.wallDraft = []; host.render(); }));
  root.append(renderPlan(floor, host._hass?.states || {}, { edit: true, draft: host.wallDraft || [], onPoint: point => {
    if (!host.wallDrawing) return; host.wallDraft.push(point);
    if (host.wallDraft.length === 2) { const [a,b] = host.wallDraft; if (Math.hypot(a[0]-b[0],a[1]-b[1]) < .1) { host.error = 'Choose two different wall endpoints.'; host.wallDraft = []; host.render(); return; } const wall = { id: crypto.randomUUID(), a, b, thickness: .15, height: 2.4, openings: [] }; floor.walls.push(wall); host.wallId = wall.id; host.wallDraft = []; host.wallDrawing = false; host.emit(); } else host.render();
  } }));
  const select = element('select', { onchange: e => { host.wallId = e.target.value; host.render(); } }, [element('option', { value: '', text: 'Choose a wall…' })]);
  floor.walls.forEach((wall, i) => select.append(element('option', { value: wall.id, text: `Wall ${i+1}`, selected: host.wallId === wall.id })));
  root.append(field('Wall to edit', select));
  const wall = floor.walls.find(item => item.id === host.wallId); if (!wall) return root;
  const number = (object, key, label, min, max, step = .05) => field(label, element('input', { type: 'number', min, max, step, value: object[key], onchange: e => { object[key] = Number(e.target.value); host.emit(); } }));
  const box = element('fieldset', {}, [element('legend', { text: 'Wall dimensions' }), number(wall,'thickness','Wall thickness (metres)',.05,1), number(wall,'height','Wall height (metres)',.2,10)]);
  for (const end of ['a','b']) for (const [axis,index] of [['X',0],['Y',1]]) box.append(field(`${end === 'a' ? 'Start' : 'End'} ${axis} (%)`,element('input',{type:'number',min:0,max:100,step:.1,value:wall[end][index],onchange:e=>{wall[end][index]=Number(e.target.value);host.emit();}})));
  box.append(button('Remove wall', () => { floor.walls = floor.walls.filter(item => item !== wall); host.wallId = ''; host.emit(); })); root.append(box);
  for (const opening of wall.openings || []) {
    const pane = element('fieldset', {}, [element('legend', { text: opening.type === 'door' ? 'Door' : 'Window' })]);
    pane.append(number(opening,'offset','Position along wall (0–1)',0,1,.01),number(opening,'width','Opening width (metres)',.1,20),number(opening,'height','Opening height (metres)',.1,10),number(opening,'sill','Sill height (metres)',0,10),button('Remove opening',()=>{wall.openings=wall.openings.filter(item=>item!==opening);host.emit();}));root.append(pane);
  }
  const add = type => {
    const dimensions = floorDimensions(floor);
    const length = Math.hypot((wall.b[0]-wall.a[0]) * dimensions.width / 100, (wall.b[1]-wall.a[1]) * dimensions.depth / 100);
    const intervals = wall.openings.map(o=>[o.offset*length-o.width/2,o.offset*length+o.width/2]).sort((a,b)=>a[0]-b[0]);
    const gaps=[];let end=0;for(const [start,next] of intervals){gaps.push([end,start]);end=next;}gaps.push([end,length]);gaps.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]));const gap=gaps[0];
    if(gap[1]-gap[0]<.15){host.error='There is no space for another opening on this wall. Adjust an existing opening first.';host.render();return;}
    wall.openings.push({ id: crypto.randomUUID(), type, offset: (gap[0]+gap[1])/2/length, width: Math.min(type === 'door' ? .9 : 1.2,(gap[1]-gap[0])*.7), height: Math.min(type === 'door' ? 2.1 : 1.1,wall.height*.7), sill: type === 'door' ? 0 : wall.height*.2 }); host.emit();
  };
  root.append(element('div',{className:'row'},[button('Add door',()=>add('door')),button('Add window',()=>add('window'))])); return root;
}

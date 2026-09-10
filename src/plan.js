import { element, svgElement } from './dom.js';
import { roomState, orientation, orientPoint } from './rooms.js';
export function renderPlan(floor, states, options = {}) {
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

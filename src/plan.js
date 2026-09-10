import { element, svgElement } from './dom.js';
import { roomState, orientation, orientPoint } from './rooms.js';
import { objectGlyph, CATALOGUE } from './catalogue.js';
import { floorDimensions } from './scene.js';
let planSequence=0;
export function renderPlan(floor, states, options={}) {
  const plan=element('div',{className:'plan'}), svg=svgElement('svg',{role:'img','aria-label':`${floor.name || floor.id} floorplan`,class:'floor-image'}), group=svgElement('g');
  const viewport=element('div'),content=element('div');
  viewport.style.cssText='position:absolute;inset:0;overflow:hidden;border-radius:inherit';content.style.cssText='position:absolute;inset:0;transform-origin:center';
  svg.append(group);content.append(svg);viewport.append(content);plan.append(viewport);plan.style.position='relative';
  const patternId=`floor-pattern-${++planSequence}`;
  let markers=options.markers || [],ratio=floor.aspect_ratio || .6875, transform, disposed=false, drag=null, moved=false,zoom=1,panX=0,panY=0;
  const camera=()=>{content.style.transform=`translate(${panX}% ,${panY}%) scale(${zoom})`;};
  const toolbar=element('div',{className:'plan-navigation','aria-label':'Floorplan navigation'});toolbar.style.cssText='position:absolute;bottom:8px;left:8px;right:8px;display:flex;gap:3px;justify-content:center;z-index:4;pointer-events:none';
  for(const [label,text,action] of [['Zoom in','+',()=>{zoom=Math.min(3,zoom+.25);}],['Zoom out','−',()=>{zoom=Math.max(.5,zoom-.25);}],['Pan left','←',()=>{panX=Math.min(75,panX+10);}],['Pan right','→',()=>{panX=Math.max(-75,panX-10);}],['Pan up','↑',()=>{panY=Math.min(75,panY+10);}],['Pan down','↓',()=>{panY=Math.max(-75,panY-10);}],['Fit floorplan','Fit',()=>{zoom=1;panX=0;panY=0;}]]) {const control=element('button',{type:'button',text,'aria-label':label,title:label,onclick:e=>{e.stopPropagation();action();camera();}});control.style.cssText='pointer-events:auto;min-width:32px;min-height:36px;padding:4px 7px';toolbar.append(control);}plan.append(toolbar);
  const pointAt=e=>{const r=content.getBoundingClientRect();return orientPoint([(e.clientX-r.left)/r.width*100,(e.clientY-r.top)/r.height*100],transform,true).map(n=>Math.round(Math.max(0,Math.min(100,n))*10)/10);};
  function layout() {
    const mode=options.mode || 'clean', pixel=['pokemon','zelda'].includes(mode);
    transform=orientation(ratio,floor.rotation || 0);
    const {w,h,width,height}=transform,dims=floorDimensions({...floor,aspect_ratio:ratio});
    plan.style.aspectRatio=`${width}/${height}`;plan.dataset.mode=mode;svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    group.setAttribute('transform',`translate(${width/2} ${height/2}) rotate(${floor.rotation || 0}) translate(${-w/2} ${-h/2})`);group.replaceChildren();
    const defs=svgElement('defs');group.append(defs);
    if(floor.image)group.append(svgElement('image',{href:floor.image,width:w,height:h,preserveAspectRatio:'none',opacity:pixel?.25:1}));
    const points=p=>p.map(([x,y])=>`${x/100*w},${y/100*h}`).join(' '), overlays=[];
    for(const room of floor.rooms || []) {
      const material=room.material || (mode==='zelda'?'tile':'wood'), id=`${patternId}-${defs.childNodes.length}`;
      const pattern=svgElement('pattern',{id,width:48,height:48,patternUnits:'userSpaceOnUse','data-material':material});
      const defaults=material==='wood'?(mode==='pokemon'?'#d7b780':'#d2bd98'):material==='tile'?(mode==='zelda'?'#9eaa83':'#d4dedc'):(mode==='pokemon'?'#c593a0':'#a0b2ae');
      pattern.append(svgElement('rect',{width:48,height:48,fill:room.colour || defaults}));
      if(material==='wood') {
        pattern.append(svgElement('path',{d:'M0 0H48 M0 24H48 M24 0V24 M12 24V48',fill:'none',stroke:'#654d38','stroke-opacity':.24,'stroke-width':pixel?2:1}));
        pattern.append(svgElement('path',{d:'M3 8H18 M28 17H43 M16 34H35',stroke:'#fff4d6','stroke-opacity':.35,'stroke-width':pixel?2:1}));
      } else if(material==='tile') {
        pattern.append(svgElement('path',{d:'M0 0H48V48H0Z M24 0V48 M0 24H48',fill:'none',stroke:'#50635a','stroke-opacity':.3,'stroke-width':pixel?3:1.5}));
        pattern.append(svgElement('rect',{x:2,y:2,width:20,height:20,fill:'#ffffff','fill-opacity':.12}));
        pattern.append(svgElement('rect',{x:26,y:26,width:20,height:20,fill:'#ffffff','fill-opacity':.12}));
        if(pixel)pattern.append(svgElement('path',{d:'M3 3H21 M27 27H45',stroke:'#e6e6c9','stroke-width':2}));
      } else {
        for(let y=4;y<48;y+=8)for(let x=4;x<48;x+=8)pattern.append(svgElement('path',{d:mode==='zelda'?`M${x-2} ${y}h4v4h-4Z`:`M${x} ${y}h2`,fill:'none',stroke:'#ffffff','stroke-opacity':pixel?.22:.14,'stroke-width':pixel?2:1}));
      }
      defs.append(pattern);
      const state=roomState(room,states),attrs={points:points(room.points),'vector-effect':'non-scaling-stroke'};
      group.append(svgElement('polygon',{...attrs,fill:`url(#${id})`,'fill-opacity':options.edit?.55:1,stroke:pixel?(mode==='pokemon'?'#765647':'#4a5946'):'#7a8788','stroke-width':pixel?5:1.5}));
      const active=(room.lights || []).map(id=>states[id]).filter(s=>s?.state==='on');
      const brightness=active.length?Math.max(...active.map(s=>(s.attributes?.brightness ?? 255)/255)):0;
      const rgb=active.find(s=>Array.isArray(s.attributes?.rgb_color))?.attributes.rgb_color;
      const lightFill=rgb?.length===3?`rgb(${rgb.map(n=>Math.max(0,Math.min(255,Number(n)||0))).join(',')})`:state.fill;
      const overlay=svgElement('polygon',{...attrs,fill:state.lightState==='Lit'?lightFill:state.fill,'fill-opacity':options.edit?.08:state.lightState==='Dark'?.64:state.lightState==='Lit'?.10+.25*brightness:0,stroke:state.occupied?'#27bd97':'none','stroke-width':4});
      const title=svgElement('title');title.textContent=`${room.name}: ${state.lightState}${state.presence?', '+state.presence:''}`;overlay.append(title);overlays.push(overlay);
      if(options.labels){const c=room.points.reduce((a,p)=>[a[0]+p[0]/room.points.length,a[1]+p[1]/room.points.length],[0,0]),label=svgElement('text',{x:c[0]/100*w,y:c[1]/100*h,'text-anchor':'middle','font-size':22,fill:'#344a4b','paint-order':'stroke',stroke:'#fff','stroke-width':3});label.textContent=room.name;overlays.push(label);}
    }
    for(const wall of floor.walls || []) {
      const ax=wall.a[0]/100*w,ay=wall.a[1]/100*h,bx=wall.b[0]/100*w,by=wall.b[1]/100*h,length=Math.hypot(bx-ax,by-ay),thickness=(wall.thickness || .15)/dims.width*w;
      const wg=svgElement('g',{transform:`translate(${ax} ${ay}) rotate(${Math.atan2(by-ay,bx-ax)*180/Math.PI})`});
      wg.append(svgElement('rect',{x:0,y:-thickness/2,width:length,height:thickness,fill:pixel?'#706552':'#7f8b8c',stroke:pixel?'#433d35':'#586669','stroke-width':2}));
      for(const opening of wall.openings || []){const size=opening.width/dims.width*w,centre=opening.offset*length;wg.append(svgElement('rect',{x:centre-size/2,y:-thickness/2-1,width:size,height:thickness+2,fill:opening.type==='window'?'#a9d9e3':'#e9e5da',stroke:opening.type==='window'?'#558d9a':'none'}));if(opening.type==='door')wg.append(svgElement('path',{d:`M${centre-size/2} 0v${size} M${centre-size/2} ${size}A${size} ${size} 0 0 0 ${centre+size/2} 0`,fill:'none',stroke:'#8b8c80','stroke-width':2}));}
      group.append(wg);
    }
    for(const item of floor.objects || []) {
      const ow=item.width/dims.width*w,oh=item.depth/dims.depth*h,object=svgElement('g',{transform:`translate(${item.x/100*w} ${item.y/100*h}) rotate(${item.rotation || 0})`,'data-object-id':item.id,opacity:options.edit?1:(options.furniture_opacity ?? (pixel?.9:.55))});
      const art=svgElement('g',{transform:`translate(${-ow/2} ${-oh/2}) scale(${ow/100} ${oh/100})`});art.append(objectGlyph(item,mode));object.append(art);
      const name=CATALOGUE.find(d=>d.type===item.type)?.name || item.type,title=svgElement('title');title.textContent=name;object.append(title);
      if(options.selectedObject===item.id)object.append(svgElement('rect',{x:-ow/2-5,y:-oh/2-5,width:ow+10,height:oh+10,fill:'none',stroke:'#007c91','stroke-width':3,'vector-effect':'non-scaling-stroke','stroke-dasharray':'5 3'}));
      if(options.onObject){object.setAttribute('role','button');object.setAttribute('tabindex','0');object.setAttribute('aria-label',name);object.style.cursor='grab';object.addEventListener('click',e=>{e.stopPropagation();if(!moved)options.onObject(item.id);});object.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();options.onObject(item.id);}if(options.onObjectMove&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const d=e.shiftKey?1:.2;options.onObjectMove(item.id,[Math.max(0,Math.min(100,item.x+(e.key==='ArrowRight'?d:e.key==='ArrowLeft'?-d:0))),Math.max(0,Math.min(100,item.y+(e.key==='ArrowDown'?d:e.key==='ArrowUp'?-d:0)))]);}});}
      if(options.onObjectMove)object.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.stopPropagation();moved=false;drag={id:item.id,start:pointAt(e),x:item.x,y:item.y,node:object,rotation:item.rotation || 0};svg.setPointerCapture(e.pointerId);});
      group.append(object);
    }
    overlays.forEach(node=>{node.style.pointerEvents='none';group.append(node);});
    group.append(svgElement('polyline',{points:points(options.draft || []),fill:'#007c91','fill-opacity':.2,stroke:'#007c91','stroke-width':3,'vector-effect':'non-scaling-stroke'}));
    for(const {node,x,y} of markers){const p=orientPoint([x,y],transform);node.style.left=`${p[0]}%`;node.style.top=`${p[1]}%`;}
  }
  svg.addEventListener('pointermove',e=>{if(!drag)return;const p=pointAt(e);if(Math.hypot(p[0]-drag.start[0],p[1]-drag.start[1])<.3&&!moved)return;moved=true;drag.position=[Math.max(0,Math.min(100,drag.x+p[0]-drag.start[0])),Math.max(0,Math.min(100,drag.y+p[1]-drag.start[1]))];drag.node.setAttribute('transform',`translate(${drag.position[0]/100*transform.w} ${drag.position[1]/100*transform.h}) rotate(${drag.rotation})`);});
  svg.addEventListener('pointerup',e=>{if(!drag)return;const saved=drag;drag=null;if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);if(moved&&saved.position)options.onObjectMove(saved.id,saved.position);else {moved=true;options.onObject?.(saved.id);}});
  svg.addEventListener('pointercancel',()=>{drag=null;layout();});
  markers.forEach(({node})=>content.append(node));layout();
  const probe=new Image();probe.onload=()=>{if(!disposed&&!floor.aspect_ratio){ratio=probe.naturalWidth/probe.naturalHeight;layout();}};
  probe.onerror=()=>{if(!disposed)plan.append(element('p',{className:'error hint',role:'alert',text:'Image could not be loaded. Check the floor image in setup.'}));};if(floor.image)probe.src=floor.image;
  plan.addEventListener('click',e=>{if(moved){moved=false;return;}if(options.onPoint&&!e.target.closest('[data-object-id],button'))options.onPoint(pointAt(e));});
  plan.update=(nextStates,nextOptions={})=>{states=nextStates;options={...options,...nextOptions};if(nextOptions.markers){markers.forEach(({node})=>node.remove());markers=nextOptions.markers;markers.forEach(({node})=>content.append(node));}if(!disposed)layout();};
  plan.dispose=()=>{disposed=true;probe.onload=null;probe.onerror=null;drag=null;};
  return plan;
}

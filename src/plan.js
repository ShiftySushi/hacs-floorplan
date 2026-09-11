import { element, svgElement } from './dom.js';
import { roomState, orientation, orientPoint } from './rooms.js';
import { CATALOGUE } from './catalogue.js';
import { objectArtwork } from './object-art.js';
import { floorDimensions } from './scene.js';
import { roomLightSources, lightAppearance, roomDarkness } from './illumination.js';
import { heatingState } from './heating.js';
import { pixelPattern, pixelRoomTrim } from './pixel-style.js';
import { blendAppearance, panelFrame } from './light-animation.js';
import { stageColour } from './daylight.js';
import { tvIsOn, drawTVFrame } from './tv-animation.js';
let planSequence=0;
export function renderPlan(floor, states, options={}) {
  const plan=element('div',{className:'plan'}), svg=svgElement('svg',{role:'img','aria-label':`${floor.name || floor.id} floorplan`,class:'floor-image'}), group=svgElement('g');
  const viewport=element('div'),content=element('div');
  viewport.style.cssText='position:absolute;inset:0;overflow:hidden;border-radius:inherit';content.style.cssText='position:absolute;inset:0;transform-origin:center';
  svg.append(group);content.append(svg);viewport.append(content);plan.append(viewport);plan.style.position='relative';
  if(options.onObjectMove||options.onObjectResize)svg.style.touchAction='none';
  const patternId=`floor-pattern-${++planSequence}`;
  const tvCanvas=document.createElement('canvas');tvCanvas.width=160;tvCanvas.height=90;let lastTVPaint=-Infinity;
  const lightIds=[...new Set([...(floor.rooms || []).flatMap(r=>r.lights || []),...(floor.objects || []).map(o=>o.light_entity).filter(Boolean)])];
  let targetStates=states,fade=null,frame=0,lastFrame=0;
  const reducedMotion=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function animate(time) {
    frame=0;if(disposed)return;
    if(!document.hidden&&time-lastFrame>=32){
      lastFrame=time;
      if(fade){
        const progress=reducedMotion()?1:Math.min(1,(time-fade.start)/600);
        states={...targetStates};
        for(const id of lightIds){const a=blendAppearance(fade.from[id],lightAppearance(targetStates[id]),progress);states[id]={...targetStates[id],state:a.level?'on':'off',attributes:{...targetStates[id]?.attributes,brightness:a.level*255,color_mode:'rgb',rgb_color:a.colour}};}
        if(progress===1){fade=null;states=targetStates;}
        layout();
      }
      paintPanels(time);
      paintTVs(time);
    }
    if(fade||hasPanelAnimation())frame=requestAnimationFrame(animate);
  }
  function hasPanelAnimation(){return !options.edit&&!reducedMotion()&&(floor.objects || []).some(o=>(o.type==='tv'&&tvIsOn(states[o.media_entity]))||(o.type==='nanoleaf_panels'&&o.panel_effect&&o.panel_effect!=='static'&&lightAppearance(states[o.light_entity]).level));}
  function paintTVs(time,force=false){
    if(!force&&time-lastTVPaint<120)return;lastTVPaint=time;
    for(const screen of group.querySelectorAll('[data-tv-screen]')){
      const item=(floor.objects || []).find(o=>o.id===screen.dataset.tvScreen),on=!options.edit&&tvIsOn(states[item?.media_entity]);
      screen.setAttribute('visibility',on?'visible':'hidden');
      if(on){drawTVFrame(tvCanvas.getContext('2d'),160,90,reducedMotion()?0:time);screen.setAttribute('href',tvCanvas.toDataURL());}
    }
  }
  function paintPanels(time){
    if(options.edit)return;
    for(const object of group.querySelectorAll('[data-object-id]')){
      const item=(floor.objects || []).find(o=>o.id===object.dataset.objectId);if(item?.type!=='nanoleaf_panels'||!item.light_entity)continue;
      const panels=object.querySelectorAll('[data-panel-index]'),appearance=lightAppearance(states[item.light_entity]);
      panels.forEach((panel,index)=>{const a=panelFrame(reducedMotion()?'static':item.panel_effect,index,panels.length,time,appearance);panel.setAttribute('fill',`rgb(${a.colour.map(c=>Math.round(c*(.15+.85*a.level))).join(',')})`);});
    }
  }
  const startAnimation=()=>{if(!frame&&(fade||hasPanelAnimation()))frame=requestAnimationFrame(animate);};
  let markers=options.markers || [],ratio=floor.aspect_ratio || .6875, transform, disposed=false, drag=null, moved=false,zoom=options.viewState?.zoom ?? 1,panX=options.viewState?.panX ?? 0,panY=options.viewState?.panY ?? 0,viewRotation=options.viewState?.rotation ?? 0;
  const camera=()=>{if(options.viewState)Object.assign(options.viewState,{zoom,panX,panY,rotation:viewRotation});options.onViewChange?.();content.style.transform=`translate(${panX}% ,${panY}%) scale(${zoom})`;content.dataset.camera=`${zoom},${panX},${panY}`;for(const {node} of markers)node.style.transform=`translate(-50%,-50%) scale(${1/zoom})`;};
  const toolbar=element('div',{className:'plan-navigation','aria-label':'Floorplan navigation'});toolbar.style.cssText='position:absolute;bottom:8px;left:8px;right:8px;display:flex;gap:3px;justify-content:center;z-index:4;pointer-events:none';
  if(options.edit){plan.style.overflow='visible';plan.style.marginBottom='44px';toolbar.style.cssText='position:absolute;bottom:-44px;left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 32px);display:flex;flex-wrap:wrap;gap:3px;justify-content:center;z-index:4;pointer-events:none';}
  for(const [label,text,action] of [['Zoom in','+',()=>{zoom=Math.min(3,zoom+.25);}],['Zoom out','−',()=>{zoom=Math.max(.5,zoom-.25);}],['Pan left','←',()=>{panX=Math.min(75,panX+10);}],['Pan right','→',()=>{panX=Math.max(-75,panX-10);}],['Pan up','↑',()=>{panY=Math.min(75,panY+10);}],['Pan down','↓',()=>{panY=Math.max(-75,panY-10);}],['Fit floorplan','Fit',()=>{zoom=1;panX=0;panY=0;}],...(!options.edit? [['Rotate floorplan left','↶',()=>{viewRotation=(viewRotation+270)%360;zoom=1;panX=panY=0;layout();}],['Rotate floorplan right','↷',()=>{viewRotation=(viewRotation+90)%360;zoom=1;panX=panY=0;layout();}]]:[])]) {const control=element('button',{type:'button',text,'aria-label':label,title:label,onclick:e=>{e.stopPropagation();action();camera();}});control.style.cssText='pointer-events:auto;min-width:32px;min-height:36px;padding:4px 7px';toolbar.append(control);}plan.append(toolbar);
  const pointAt=e=>{const r=content.getBoundingClientRect();return orientPoint([(e.clientX-r.left)/r.width*100,(e.clientY-r.top)/r.height*100],transform,true).map(n=>Math.round(Math.max(0,Math.min(100,n))*10)/10);};
  function layout() {
    const mode=options.mode || 'clean', pixel=['pokemon','zelda'].includes(mode),styleImage=pixel?floor.style_images?.[mode]:null;
    transform=orientation(ratio,(floor.rotation || 0)+viewRotation);
    const {w,h,width,height}=transform,dims=floorDimensions({...floor,aspect_ratio:ratio});
    plan.style.aspectRatio=`${width}/${height}`;plan.style.setProperty('--plan-ratio',String(width/height));plan.dataset.mode=mode;svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    group.setAttribute('transform',`translate(${width/2} ${height/2}) rotate(${(floor.rotation || 0)+viewRotation}) translate(${-w/2} ${-h/2})`);group.replaceChildren();
    const defs=svgElement('defs');group.append(defs);
    if(styleImage || floor.image)group.append(svgElement('image',{href:styleImage || floor.image,width:w,height:h,preserveAspectRatio:'none',opacity:styleImage?1:pixel?.1:1,style:pixel?'image-rendering:pixelated':''}));
    plan.style.background=`var(--fp-stage-background, ${stageColour(mode,options.daylight ?? .5)})`;
    if(pixel)defs.append(pixelPattern(`${patternId}-wall`,mode,'wall'));
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
      defs.append(pixel?pixelPattern(id,mode,material,room.colour):pattern);
      const state=roomState(room,states),attrs={points:points(room.points),'vector-effect':'non-scaling-stroke'};
      if(!styleImage)group.append(svgElement('polygon',{...attrs,fill:`url(#${id})`,'fill-opacity':options.edit?.55:1,stroke:pixel?(mode==='pokemon'?'#765647':'#4a5946'):'#7a8788','stroke-width':pixel?5:1.5}));
      if(pixel&&!styleImage)group.append(pixelRoomTrim(room.points.map(([x,y])=>[x/100*w,y/100*h]),mode));
      const clipId=`${id}-clip`,maskId=`${id}-shade`;
      const clip=svgElement('clipPath',{id:clipId});clip.append(svgElement('polygon',attrs));defs.append(clip);
      const mask=svgElement('mask',{id:maskId,maskUnits:'userSpaceOnUse',x:0,y:0,width:w,height:h,style:'mask-type:luminance'});
      mask.append(svgElement('rect',{width:w,height:h,fill:'white'}));defs.append(mask);
      const pools=svgElement('g',{'clip-path':`url(#${clipId})`,'data-room-lighting':room.id || room.name});
      if(!options.edit)for(const [index,source] of roomLightSources(floor,room).entries()) {
        const {level,colour}=lightAppearance(states[source.id]);if(!level)continue;
        const cx=source.x/100*w,cy=source.y/100*h,rx=source.radius/dims.width*w,ry=source.radius/dims.depth*h;
        const ellipse={cx,cy,rx,ry,'data-light-zone':source.id};
        const gradientId=`${id}-light-${index}`,revealId=`${gradientId}-reveal`;
        for(const [gid,colourValue,strength] of [[gradientId,`rgb(${colour.join(',')})`,.3*level*source.strength],[revealId,'black',.86*level*source.strength]]) {
          const gradient=svgElement('radialGradient',{id:gid});
          for(const [offset,weight] of [[0,1],[.28,.85],[.65,.35],[1,0]])gradient.append(svgElement('stop',{offset,'stop-color':colourValue,'stop-opacity':strength*weight}));
          defs.append(gradient);
        }
        mask.append(svgElement('ellipse',{...ellipse,fill:`url(#${revealId})`}));
        pools.append(svgElement('ellipse',{...ellipse,fill:`url(#${gradientId})`}));
      }
      const overlay=svgElement('polygon',{...attrs,fill:'#162536','fill-opacity':options.edit?.08:roomDarkness(room,states)*(options.daylight===undefined?1:1.2-.9*options.daylight),mask:`url(#${maskId})`,'data-room-shade':room.id || room.name});
      const presence=svgElement('polygon',{...attrs,fill:'none',stroke:state.occupied?'#27bd97':'none','stroke-width':4});
      const title=svgElement('title');title.textContent=`${room.name}: ${state.lightState}${state.presence?', '+state.presence:''}`;presence.append(title);overlays.push(overlay,pools,presence);
      if(options.labels){const c=room.points.reduce((a,p)=>[a[0]+p[0]/room.points.length,a[1]+p[1]/room.points.length],[0,0]),label=svgElement('text',{x:c[0]/100*w,y:c[1]/100*h,'text-anchor':'middle','font-size':22,fill:'#344a4b','paint-order':'stroke',stroke:'#fff','stroke-width':3});label.textContent=room.name;overlays.push(label);}
    }
    // Paint the complete casing before the infill so connected segments share
    // one outline, rather than exposing a border at every endpoint.
    const wallEdges=svgElement('g'),wallFaces=svgElement('g'),wallOpenings=svgElement('g'),solidFaces=[];
    group.append(wallEdges,wallFaces,wallOpenings);
    for(const wall of styleImage?[]:floor.walls || []) {
      const ax=wall.a[0]/100*w,ay=wall.a[1]/100*h,bx=wall.b[0]/100*w,by=wall.b[1]/100*h,length=Math.hypot(bx-ax,by-ay),thickness=(wall.thickness || .15)/dims.width*w;
      const wg=svgElement('g',{transform:`translate(${ax} ${ay}) rotate(${Math.atan2(by-ay,bx-ax)*180/Math.PI})`});
      const line={x1:ax,y1:ay,x2:bx,y2:by,'stroke-linecap':wall.solid?'butt':'square'};
      wallEdges.append(svgElement('line',{...line,stroke:pixel?'#433d35':'#586669','stroke-width':thickness+2}));
      const face=svgElement('line',{...line,stroke:pixel?`url(#${patternId}-wall)`:'#7f8b8c','stroke-width':pixel?Math.max(thickness,12):thickness});wallFaces.append(face);if(wall.solid)solidFaces.push(face.cloneNode(true));
      for(const opening of wall.openings || []){const size=opening.width/dims.width*w,centre=opening.offset*length;wg.append(svgElement('rect',{x:centre-size/2,y:-thickness/2-1,width:size,height:thickness+2,fill:opening.type==='window'?'#a9d9e3':'#e9e5da',stroke:opening.type==='window'?'#558d9a':'none'}));if(opening.type==='door')wg.append(svgElement('path',{d:`M${centre-size/2} 0v${size} M${centre-size/2} ${size}A${size} ${size} 0 0 0 ${centre+size/2} 0`,fill:'none',stroke:'#8b8c80','stroke-width':2}));}
      wallOpenings.append(wg);
    }
    for(const item of [...(floor.objects || [])].sort((a,b)=>(a.elevation_m||0)-(b.elevation_m||0))) {
      if(!options.edit&&options.hideExtractionFans&&item.type==='extractor_fan')continue;
      if(!options.edit&&((options.hideRadiators&&item.type==='radiator')||(options.hideLightFixtures&&(item.light_entity||['lamp','wall_light','nanoleaf_panels','tv_lightstrip'].includes(item.type)))))continue;
      const ow=item.width/dims.width*w,oh=item.depth/dims.depth*h,object=svgElement('g',{transform:`translate(${item.x/100*w} ${item.y/100*h}) rotate(${item.rotation || 0})`,'data-object-id':item.id,opacity:options.edit?1:(options.furniture_opacity ?? (pixel?.9:.55))});
      if(item.light_entity){const light=lightAppearance(states[item.light_entity]);if(light.level){
        const strip=item.type==='tv_lightstrip',glowId=`${patternId}-object-${defs.childNodes.length}`;
        const gradient=svgElement('radialGradient',{id:glowId});gradient.append(svgElement('stop',{offset:0,'stop-color':`rgb(${light.colour.join(',')})`,'stop-opacity':.45*light.level}),svgElement('stop',{offset:1,'stop-color':`rgb(${light.colour.join(',')})`,'stop-opacity':0}));defs.append(gradient);
        object.append(svgElement('ellipse',{cx:0,cy:0,rx:ow*(strip?.55:.85),ry:strip?Math.max(oh,ow*.06):oh*.85,fill:`url(#${glowId})`,'data-object-glow':item.id}));
      }}
      const art=svgElement('g',{transform:`translate(${-ow/2} ${-oh/2})`});
      if(pixel&&item.style_images?.[mode]){const spriteHeight=['tv','bookshelf','display_cabinet','computer','ultrawide_monitor'].includes(item.type)?Math.max(oh,ow*.75):oh;art.append(svgElement('rect',{width:ow,height:oh,fill:'transparent'}),svgElement('image',{href:item.style_images[mode],x:0,y:(oh-spriteHeight)/2,width:ow,height:spriteHeight,preserveAspectRatio:'xMidYMid meet',style:'image-rendering:pixelated','data-private-sprite':item.id}));}
      else art.append(objectArtwork(item,mode,ow,oh));object.append(art);
      // Furniture fronts face local +Y in the plan (local +Z in 3D).
      // Keep the marker inside the rotating object group and out of hit testing.
      if(options.edit)object.append(svgElement('path',{d:`M-8 ${oh/2-8}L0 ${oh/2+4}L8 ${oh/2-8}Z`,fill:'#007c91',stroke:'#fff','stroke-width':1.5,'vector-effect':'non-scaling-stroke','pointer-events':'none','data-furniture-front':'',role:'img','aria-label':'Front'}));
      if(item.type==='tv'&&item.media_entity){object.append(svgElement('image',{x:-ow*.46,y:-oh*.37,width:ow*.92,height:oh*.22,preserveAspectRatio:'none','data-tv-screen':item.id,style:'image-rendering:pixelated','pointer-events':'none'}));}
      const name=item.name || CATALOGUE.find(d=>d.type===item.type)?.name || item.type,title=svgElement('title');title.textContent=name;object.append(title);
      if(options.selectedObject===item.id)object.append(svgElement('rect',{x:-ow/2-5,y:-oh/2-5,width:ow+10,height:oh+10,fill:'none',stroke:'#007c91','stroke-width':3,'vector-effect':'non-scaling-stroke','stroke-dasharray':'5 3'}));
      if(options.selectedObject===item.id&&options.onObjectResize)for(const [corner,sx,sy] of [['nw',-1,-1],['ne',1,-1],['se',1,1],['sw',-1,1]]){
        const handle=svgElement('g',{transform:`translate(${sx*ow/2} ${sy*oh/2})`,role:'button',tabindex:'0','aria-label':`Resize ${name} ${corner}`,'data-resize-handle':corner});
        handle.append(svgElement('circle',{r:1,fill:'transparent',stroke:'transparent','stroke-width':44,'vector-effect':'non-scaling-stroke'}),svgElement('rect',{x:-5,y:-5,width:10,height:10,rx:2,fill:'#ffffff',stroke:'#007c91','stroke-width':2,'vector-effect':'non-scaling-stroke'}));
        handle.style.cursor=sx===sy?'nwse-resize':'nesw-resize';handle.style.touchAction='none';
        handle.addEventListener('click',e=>e.stopPropagation());
        handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();moved=false;drag={id:item.id,type:'resize',start:pointAt(e),x:item.x,y:item.y,node:object,rotation:item.rotation || 0,width:item.width,depth:item.depth,dims,ow,oh,sx,sy};svg.setPointerCapture(e.pointerId);});
        handle.addEventListener('keydown',e=>{const deltas={ArrowLeft:[-.05,0],ArrowRight:[.05,0],ArrowUp:[0,-.05],ArrowDown:[0,.05]};if(!deltas[e.key])return;e.preventDefault();e.stopPropagation();const [dw,dd]=deltas[e.key],focusRoot=plan.getRootNode();options.onObjectResize(item.id,{width:Math.max(.05,Math.min(30,item.width+dw)),depth:Math.max(.05,Math.min(30,item.depth+dd))});focusRoot.querySelector(`[data-object-id="${CSS.escape(item.id)}"] [data-resize-handle="${corner}"]`)?.focus();});object.append(handle);
      }
      if(options.onObject){object.setAttribute('role','button');object.setAttribute('tabindex','0');object.setAttribute('aria-label',name);object.style.cursor='grab';object.addEventListener('click',e=>{e.stopPropagation();if(!moved)options.onObject(item.id,pointAt(e));});object.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();options.onObject(item.id,[item.x,item.y]);}if(options.onObjectMove&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const d=e.shiftKey?1:.2;options.onObjectMove(item.id,[Math.max(0,Math.min(100,item.x+(e.key==='ArrowRight'?d:e.key==='ArrowLeft'?-d:0))),Math.max(0,Math.min(100,item.y+(e.key==='ArrowDown'?d:e.key==='ArrowUp'?-d:0)))]);}});}
      if(options.onObjectContext){object.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();options.onObjectContext(item.id);});object.addEventListener('keydown',e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();options.onObjectContext(item.id);}});}
      if(options.onObjectMove){object.style.touchAction='none';object.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();moved=false;drag={id:item.id,start:pointAt(e),x:item.x,y:item.y,node:object,rotation:item.rotation || 0};svg.setPointerCapture(e.pointerId);});}
      group.append(object);
    }
    overlays.forEach(node=>{node.style.pointerEvents='none';group.append(node);});
    solidFaces.forEach(node=>{node.style.pointerEvents='none';group.append(node);});
    if(!options.edit)for(const item of floor.objects || [])if(!options.hideRadiators&&item.type==='radiator'&&heatingState(states[item.heating_entity])==='heating'){
      const id=`${patternId}-heat-${defs.childNodes.length}`,gradient=svgElement('radialGradient',{id});
      gradient.append(svgElement('stop',{offset:0,'stop-color':'#ff5039','stop-opacity':.65}),svgElement('stop',{offset:1,'stop-color':'#ff5039','stop-opacity':0}));defs.append(gradient);
      const glow=svgElement('ellipse',{cx:item.x/100*w,cy:item.y/100*h,rx:(item.width/2+.35)/dims.width*w,ry:(item.depth/2+.45)/dims.depth*h,fill:`url(#${id})`,transform:`rotate(${item.rotation || 0} ${item.x/100*w} ${item.y/100*h})`,'data-heating-glow':item.id});glow.style.pointerEvents='none';group.append(glow);
    }
    group.append(svgElement('polyline',{points:points(options.draft || []),fill:'#007c91','fill-opacity':.2,stroke:'#007c91','stroke-width':3,'vector-effect':'non-scaling-stroke'}));
    for(const {node,x,y} of markers){const p=orientPoint([x,y],transform);node.style.left=node.classList.contains('temperature-marker')?`clamp(32px, ${p[0]}%, calc(100% - 32px))`:`${p[0]}%`;node.style.top=`${p[1]}%`;}
    camera();
    paintPanels(performance.now());
    paintTVs(performance.now(),true);
  }
  svg.addEventListener('pointermove',e=>{if(!drag)return;const p=pointAt(e);if(Math.hypot(p[0]-drag.start[0],p[1]-drag.start[1])<.3&&!moved)return;moved=true;
    if(drag.type==='resize'){
      const dx=(p[0]-drag.start[0])/100*transform.w,dy=(p[1]-drag.start[1])/100*transform.h,angle=drag.rotation*Math.PI/180,localX=dx*Math.cos(angle)+dy*Math.sin(angle),localY=-dx*Math.sin(angle)+dy*Math.cos(angle);
      drag.size={width:Math.round(Math.max(.05,Math.min(30,(drag.ow+2*drag.sx*localX)/transform.w*drag.dims.width))*100)/100,depth:Math.round(Math.max(.05,Math.min(30,(drag.oh+2*drag.sy*localY)/transform.h*drag.dims.depth))*100)/100};
      drag.node.setAttribute('transform',`translate(${drag.x/100*transform.w} ${drag.y/100*transform.h}) rotate(${drag.rotation}) scale(${drag.size.width/drag.width} ${drag.size.depth/drag.depth})`);return;
    }
    drag.position=[Math.max(0,Math.min(100,drag.x+p[0]-drag.start[0])),Math.max(0,Math.min(100,drag.y+p[1]-drag.start[1]))];drag.node.setAttribute('transform',`translate(${drag.position[0]/100*transform.w} ${drag.position[1]/100*transform.h}) rotate(${drag.rotation})`);});
  svg.addEventListener('pointerup',e=>{if(!drag)return;const saved=drag;drag=null;if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);if(saved.type==='resize'){if(moved&&saved.size)options.onObjectResize(saved.id,saved.size);return;}if(moved&&saved.position)options.onObjectMove(saved.id,saved.position);else {moved=true;options.onObject?.(saved.id);}});
  svg.addEventListener('pointercancel',()=>{drag=null;layout();});
  markers.forEach(({node})=>content.append(node));layout();
  const probe=new Image();probe.onload=()=>{if(!disposed&&!floor.aspect_ratio){ratio=probe.naturalWidth/probe.naturalHeight;layout();}};
  probe.onerror=()=>{if(!disposed)plan.append(element('p',{className:'error hint',role:'alert',text:'Image could not be loaded. Check the floor image in setup.'}));};if(floor.image)probe.src=floor.image;
  plan.addEventListener('click',e=>{if(moved){moved=false;return;}if(options.onPoint&&!e.target.closest('button')&&(!options.onObject||!e.target.closest('[data-object-id]')))options.onPoint(pointAt(e));});
  plan.pointFromClient=(clientX,clientY)=>{const bounds=viewport.getBoundingClientRect();return disposed||clientX<bounds.left||clientX>bounds.right||clientY<bounds.top||clientY>bounds.bottom?null:pointAt({clientX,clientY});};
  plan.update=(nextStates,nextOptions={})=>{
    const changed=lightIds.some(id=>JSON.stringify(lightAppearance(targetStates[id]))!==JSON.stringify(lightAppearance(nextStates[id])));
    options={...options,...nextOptions};
    if(changed&&!options.edit&&!reducedMotion())fade={start:performance.now(),from:Object.fromEntries(lightIds.map(id=>[id,lightAppearance(states[id])]))};
    targetStates=nextStates;if(!fade)states=nextStates;
    if(nextOptions.markers){markers.forEach(({node})=>node.remove());markers=nextOptions.markers;markers.forEach(({node})=>content.append(node));}
    if(!disposed){layout();startAnimation();}
  };
  startAnimation();
  plan.dispose=()=>{disposed=true;cancelAnimationFrame(frame);probe.onload=null;probe.onerror=null;drag=null;};
  return plan;
}

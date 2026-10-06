import {element} from './dom.js';

const css=`
.dio-overlay{position:absolute;inset:0;pointer-events:none;font-family:Roboto,"Helvetica Neue",system-ui,sans-serif;color:#fff;font-variant-numeric:tabular-nums}
.dio-weather{position:absolute;top:clamp(12px,3.2cqh,40px);right:clamp(14px,5cqw,110px);display:grid;grid-template-columns:auto auto;align-items:center;column-gap:clamp(14px,2.6cqw,48px);text-shadow:0 1px 10px #0009}
.dio-weather svg.dio-sky{width:clamp(54px,6cqw,110px);height:auto;grid-row:1/3}
.dio-temp{font-size:clamp(34px,4.6cqw,84px);font-weight:700;letter-spacing:.01em;line-height:1.05}
.dio-facts{display:grid;grid-template-columns:auto auto;gap:.15em 1.1em;font-size:clamp(14px,1.7cqw,31px);font-weight:500;opacity:.92}
.dio-facts span,.dio-pill span{display:inline-flex;align-items:center;gap:.45em;white-space:nowrap}
.dio-sky path{animation:dio-drift 11s ease-in-out infinite alternate}.dio-sky path+path{animation-duration:15s;animation-direction:alternate-reverse}
@keyframes dio-drift{from{transform:translateX(-2.5px)}to{transform:translateX(2.5px)}}
@media(prefers-reduced-motion:reduce){.dio-sky path{animation:none}.dio-pill{transition:none}}
.dio-clock{position:absolute;top:clamp(12px,3.2cqh,40px);left:clamp(14px,3cqw,60px);font-size:clamp(26px,3.4cqw,62px);font-weight:700;line-height:1.05;text-shadow:0 1px 10px #0009}
.dio-clock small{display:block;font-size:.4em;font-weight:500;opacity:.8;margin-top:.25em}
.dio-overlay svg.dio-icon{width:1.05em;height:1.05em;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;opacity:.85}
.dio-compact .dio-pill{font-size:clamp(9px,.74cqw,13px);gap:.8em;padding:.32em .7em}
.dio-label{position:absolute;transform:translate(-50%,10px);font-size:clamp(11px,1.15cqw,19px);font-weight:600;letter-spacing:.16em;text-transform:uppercase;opacity:0;white-space:nowrap;text-shadow:0 1px 8px #000a}
.dio-pill{transition:opacity .25s}.dio-pill{position:absolute;transform:translate(-50%,-50%);display:flex;gap:1.1em;padding:.42em .95em;border-radius:99px;background:#2a2b30b8;border:1px solid #ffffff14;backdrop-filter:blur(6px);font-size:clamp(11px,1.02cqw,17px);font-weight:500;box-shadow:0 2px 14px #0005}
`;
const paths={
  temperature:'M10 13.5V5a2 2 0 0 1 4 0v8.5a4 4 0 1 1-4 0ZM12 9v7',
  humidity:'M12 3.5c3 3.6 5.5 6.6 5.5 10a5.5 5.5 0 0 1-11 0c0-3.4 2.5-6.4 5.5-10Z',
  day:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  night:'M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5ZM17 4.5v3M15.5 6h3',
  wind:'M3 9h10.5a2.5 2.5 0 1 0-2.5-2.5M3 13h15a2.5 2.5 0 1 1-2.5 2.5M3 17h7',
  air:'M4 8h9a2 2 0 1 0-2-2M4 12h14M4 16h9a2 2 0 1 1-2 2',
};
const icon=name=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','dio-icon');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]||paths.air);svg.append(path);return svg;};
const fact=(name,text)=>{const node=element('span');node.append(icon(name),text);return node;};
function sky(){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 96 64');svg.setAttribute('class','dio-sky');svg.setAttribute('aria-hidden','true');
  svg.innerHTML='<path d="M30 52a14 14 0 0 1 1-28 20 20 0 0 1 38 4 12 12 0 0 1-1 24Z" fill="#aab3bd"/><path d="M22 58a11 11 0 0 1 1-22 16 16 0 0 1 30 3 10 10 0 0 1-1 19Z" fill="#eef2f5"/>';return svg;
}

/** Screen-space furniture: the weather block, clock and per-room readouts. */
export function createOverlay(plan,{compact=false}={}){
  const root=element('div',{className:'dio-overlay'+(compact?' dio-compact':'')}),style=element('style',{text:css});
  const temp=element('div',{className:'dio-temp'}),facts=element('div',{className:'dio-facts'}),weather=element('div',{className:'dio-weather'},[sky(),temp,facts]);
  const time=element('span'),date=element('small'),clock=element('div',{className:'dio-clock'},[time,date]);
  root.append(clock,weather);plan.append(style,root);
  let pills=[],labels=[],measured=-1;
  const tick=()=>{const now=new Date();time.textContent=now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});date.textContent=now.toLocaleDateString([],{weekday:'long',day:'numeric',month:'long'});};
  tick();const timer=setInterval(tick,15000);
  return {
    setWeather(w){
      weather.hidden=!w;if(!w)return;temp.textContent=w.temperature;
      facts.replaceChildren(...[['day',w.high],['night',w.low],['humidity',w.humidity],['wind',w.wind]].filter(([,text])=>text).map(([name,text])=>fact(name,text)));
    },
    /** Each pill: {anchor: () => Vector3, covered, facts: [[icon, text]]}. */
    setPills(next){for(const pill of pills)pill.node.remove();pills=next.map(pill=>{const node=element('div',{className:'dio-pill'});for(const [name,text] of pill.facts)node.append(fact(name,text));root.append(node);return {...pill,node};});measured=-1;},
    /** Storey captions, shown only while the storeys are spread apart. */
    setLabels(next){for(const label of labels)label.node.remove();labels=next.map(label=>{const node=element('div',{className:'dio-label',text:label.text});root.append(node);return {...label,node};});},
    /** Anchors are functions so readouts follow a storey as it slides. `spread` runs 0 (stacked) to 1. */
    layout(camera,spread=0){
      const place=(node,anchor)=>{const p=anchor().project(camera);node.style.left=`${(p.x*.5+.5)*100}%`;node.style.top=`${(-p.y*.5+.5)*100}%`;};
      // Readouts that would overlap step down the screen instead of covering each other.
      const width=root.clientWidth,height=root.clientHeight,placed=[];
      if(width!==measured){measured=width;for(const pill of pills){pill.w=pill.node.offsetWidth;pill.h=pill.node.offsetHeight;}}
      const shown=pills.filter(pill=>{const visible=!(pill.covered&&spread<.6);pill.node.style.opacity=visible?'1':'0';return visible;}).map(pill=>{const p=pill.anchor().project(camera);return {pill,x:(p.x*.5+.5)*width,y:(-p.y*.5+.5)*height};}).sort((a,b)=>a.y-b.y);
      for(const item of shown){
        for(let pass=0;pass<placed.length;pass++){const hit=placed.find(other=>Math.abs(other.x-item.x)<(other.pill.w+item.pill.w)/2+4&&Math.abs(other.y-item.y)<(other.pill.h+item.pill.h)/2+3);if(!hit)break;item.y=hit.y+(hit.pill.h+item.pill.h)/2+3;}
        placed.push(item);item.pill.node.style.left=`${item.x}px`;item.pill.node.style.top=`${item.y}px`;
      }
      for(const {anchor,node} of labels){place(node,anchor);node.style.opacity=String(Math.max(0,spread*2-1)*.8);}
    },
    dispose(){clearInterval(timer);root.remove();style.remove();}
  };
}

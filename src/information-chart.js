import {element,svgElement} from './dom.js';
import {historyKey,numericValue} from './information-history.js';

export function informationChart(item,state,cache,locale='en-GB'){
  const raw=item.attribute?state?.attributes?.[item.attribute]:state?.state,value=['unknown','unavailable'].includes(state?.state)?null:numericValue(raw);
  const root=element('div',{className:'information-chart'}),format=n=>new Intl.NumberFormat(locale,{maximumFractionDigits:item.precision??2}).format(n);
  root.style.setProperty('--information-graph-height',`${item.graph_height||100}px`);
  const caption=text=>root.append(element('span',{className:'information-detail',text}));
  if(item.display==='gauge'){
    if(value===null){caption('A numeric reading is needed for a gauge');return root;}
    const min=item.min??0,max=item.max??100,meter=element('meter',{min,max,value,'aria-label':item.label||state?.attributes?.friendly_name||item.entity});root.append(meter);caption(`${format(min)} – ${format(max)}`);return root;
  }
  const history=cache?.[historyKey(item)];
  if(!history?.points?.some(p=>p.value!==null)){caption(history?.error?'History unavailable':history?.pending?'Loading history…':history?'No numeric history':'History requires a Home Assistant connection');return root;}
  const points=history.points,values=points.filter(p=>p.value!==null).map(p=>p.value),bottom=Math.min(...values,...item.display==='bar'?[0]:[]),top=Math.max(...values,...item.display==='bar'?[0]:[]),low=item.min??Math.min(bottom,(item.max??Infinity)-1),high=item.max??Math.max(top,(item.min??-Infinity)+1),min=low===high?low-1:low,max=low===high?high+1:high;
  const svg=svgElement('svg',{viewBox:'0 0 300 100',preserveAspectRatio:'none',role:'img','aria-label':`${item.label||item.entity}: ${item.history_hours||24} hour ${item.display} chart, ${format(low)} to ${format(high)}`});
  const x=t=>4+292*(t-history.start)/Math.max(1,history.end-history.start),y=v=>94-88*(Math.max(min,Math.min(max,v))-min)/(max-min),base=y(Math.max(min,Math.min(max,0)));
  for(const height of [6,50,94])svg.append(svgElement('line',{x1:4,x2:296,y1:height,y2:height,stroke:'currentColor',opacity:.15,'stroke-width':1}));
  if(item.display==='bar'){
    const width=Math.max(.5,Math.min(12,270/points.length));
    for(const point of points)if(point.value!==null)svg.append(svgElement('rect',{x:x(point.time)-width/2,y:Math.min(base,y(point.value)),width,height:Math.max(1,Math.abs(base-y(point.value))),fill:'currentColor'}));
  }else{
    let path='',gap=true;for(const point of points){if(point.value===null){gap=true;continue;}path+=`${gap?'M':'L'}${x(point.time).toFixed(2)},${y(point.value).toFixed(2)} `;gap=false;}
    svg.append(svgElement('path',{d:path,fill:'none',stroke:'currentColor','stroke-width':2,'vector-effect':'non-scaling-stroke'}));
    if(values.length===1){const point=points.find(p=>p.value!==null);svg.append(svgElement('circle',{cx:x(point.time),cy:y(point.value),r:3,fill:'currentColor'}));}
  }
  root.append(svg);
  const time=t=>new Date(t).toLocaleString(locale,{...((item.history_hours||24)>=24?{day:'numeric',month:'short'}:{}),hour:'2-digit',minute:'2-digit'});
  root.append(element('div',{className:'information-chart-axis'},[element('span',{text:time(history.start)}),element('span',{text:time(history.end)})]));
  const unit=item.unit??(!item.attribute?state?.attributes?.unit_of_measurement:'');
  caption(`Range ${format(low)} – ${format(high)}${unit?' '+unit:''} · Last ${item.history_hours||24} hours`);
  if(history.error)caption('Could not refresh · Showing last available history');
  return root;
}

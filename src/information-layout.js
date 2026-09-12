import {element,field} from './dom.js';

const options=(target,key,label,choices,fallback,save)=>field(label,element('select',{onchange:e=>{target[key]=typeof fallback==='number'?Number(e.target.value):e.target.value;save();}},choices.map(([value,text])=>element('option',{value,text,selected:(target[key]??fallback)===value}))));
const number=(target,key,label,min,max,fallback,save)=>field(label,element('input',{type:'number',min,max,value:target[key]??fallback,onchange:e=>{const value=e.target.valueAsNumber;if(!Number.isFinite(value)||value<min||value>max){e.target.value=target[key]??fallback;return;}target[key]=value;save();}}));
export function informationLayoutFields(panel,save){return [
  field('Panel title',element('input',{value:panel.title??'At a glance',maxLength:80,onchange:e=>{panel.title=e.target.value;save();}})),
  number(panel,'width','Panel width (px)',240,800,340,save),
  number(panel,'max_height','Maximum height (%)',20,90,70,save),
  options(panel,'density','Spacing',[['compact','Compact'],['comfortable','Comfortable']],'compact',save),
];}
export function informationItemFields(item,save){
  const fields=[
    options(item,'column_span','Column span',[[0,'Automatic'],[1,'1 column'],[2,'2 columns'],[3,'3 columns'],[4,'4 columns']],0,save),
    number(item,'min_height','Minimum item height (px)',0,400,0,save),
    options(item,'text_size','Value size',[['small','Small'],['medium','Medium'],['large','Large']],'medium',save),
    options(item,'align','Alignment',[['left','Left'],['center','Centre'],['right','Right']],'left',save),
  ];
  if(item.type==='entity')fields.push(
    field('Attribute (optional)',element('input',{value:item.attribute||'',maxLength:80,placeholder:'Use the entity state',onchange:e=>{item.attribute=e.target.value.trim();save();}})),
    options(item,'display','Display',[['value','Value'],['line','History line'],['bar','History bars'],['gauge','Gauge']],'value',save),
    field('Unit override (optional)',element('input',{value:item.unit??'',maxLength:20,onchange:e=>{if(e.target.value)item.unit=e.target.value;else delete item.unit;save();}})),
    options(item,'precision','Decimal places',[[-1,'As reported'],[0,'0'],[1,'1'],[2,'2'],[3,'3']],-1,()=>{if(item.precision===-1)delete item.precision;save();}),
  );
  if(item.type==='entity'&&['line','bar'].includes(item.display))fields.push(options(item,'history_hours','History period',[[1,'1 hour'],[6,'6 hours'],[24,'24 hours'],[168,'7 days']],24,save),number(item,'graph_height','Graph height (px)',60,300,100,save));
  if(item.type==='entity'&&['line','bar','gauge'].includes(item.display)){
    for(const [key,label,fallback] of [['min','Scale minimum',0],['max','Scale maximum',100]])fields.push(field(label,element('input',{type:'number',step:'any',value:item[key]??(item.display==='gauge'?fallback:''),placeholder:'Automatic',onchange:e=>{const value=e.target.valueAsNumber;if(e.target.value==='')delete item[key];else if(Number.isFinite(value))item[key]=value;save();}})));
    fields.push(element('p',{className:'muted',text:item.display==='gauge'?'Gauges use numeric readings; the default scale is 0–100.':'Charts use recorded numeric history. Bars show readings, not consumption totals. Unavailable periods leave gaps.'}));
  }
  if(item.type==='calendar')fields.push(number(item,'max_events','Maximum events',1,50,12,save));
  return fields;
}
export function validateInformationLayout(panel){
  const choice=(obj,key,allowed)=>{if(obj[key]!==undefined&&!allowed.includes(obj[key]))throw Error(`Choose a valid information ${key.replaceAll('_',' ')}`);};
  const range=(obj,key,min,max)=>{if(obj[key]!==undefined&&(!Number.isFinite(obj[key])||obj[key]<min||obj[key]>max))throw Error(`Information ${key.replaceAll('_',' ')} must be between ${min} and ${max}`);};
  range(panel,'width',240,800);range(panel,'max_height',20,90);choice(panel,'density',['compact','comfortable']);
  if(panel.title!==undefined&&(typeof panel.title!=='string'||panel.title.length>80))throw Error('Panel title must be under 80 characters');
  for(const item of panel.items){
    choice(item,'column_span',[0,1,2,3,4]);range(item,'min_height',0,400);range(item,'graph_height',60,300);choice(item,'text_size',['small','medium','large']);choice(item,'align',['left','center','right']);choice(item,'display',['value','line','bar','gauge']);choice(item,'history_hours',[1,6,24,168]);choice(item,'precision',[0,1,2,3]);
    if(item.display&&item.type!=='entity')throw Error('Choose an entity item for charts');
    for(const [key,max] of [['attribute',80],['unit',20]])if(item[key]!==undefined&&(typeof item[key]!=='string'||item[key].length>max))throw Error(`Choose a valid ${key}`);
    for(const key of ['min','max'])if(item[key]!==undefined&&!Number.isFinite(item[key]))throw Error('Chart scale must be numeric');
    if((item.min!==undefined&&item.max!==undefined||item.display==='gauge')&&(item.min??0)>=(item.max??100))throw Error('Scale maximum must exceed minimum');
  }
}

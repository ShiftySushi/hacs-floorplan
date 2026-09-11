import {element,field} from './dom.js';
export function displaySettings(value={}) {
  const result={};
  for(const key of ['lights','temperatures','heating','controls'])result[key]=['auto','always',...(key==='controls'?[]:['hidden'])].includes(value?.[key])?value[key]:'auto';
  result.size=Number.isFinite(value?.size)&&value.size>=.65&&value.size<=1.25?value.size:.8;
  result.idle_rotation=value?.idle_rotation===true;
  result.hide_light_fixtures=value?.hide_light_fixtures===true;
  result.hide_radiators=value?.hide_radiators===true;
  result.hide_extraction_fans=value?.hide_extraction_fans===true;
  return result;
}
export function displayFields(value,onChange){
  const settings=displaySettings(value);
  return [...[['hide_light_fixtures','Hide light fixtures'],['hide_radiators','Hide radiators'],['hide_extraction_fans','Hide extraction fans'],['idle_rotation','Slow idle rotation (3D)']].map(([key,label])=>field(label,element('input',{type:'checkbox',checked:settings[key],onchange:e=>onChange({...settings,[key]:e.target.checked})}))),...['lights','temperatures','heating','controls'].map((key,index)=>field(['Light buttons','Temperature labels','Heating buttons','Navigation controls'][index],element('select',{'aria-label':['Light buttons visibility','Temperature labels visibility','Heating buttons visibility','Navigation controls visibility'][index],onchange:e=>onChange({...settings,[key]:e.target.value})},[['auto','Show on hover or focus'],['always','Always visible'],...(key==='controls'?[]:[['hidden','Hidden']])].map(([value,text])=>element('option',{value,text,selected:settings[key]===value}))))),field(`Overlay size · ${Math.round(settings.size*100)}%`,element('input',{type:'range','aria-label':'Overlay size',min:.65,max:1.25,step:.05,value:settings.size,onchange:e=>onChange({...settings,size:Number(e.target.value)})}))];
}

import {calendarIds,calendarEvents} from './calendar-data.js';
import {sensorNumber,energySummary,validateLiveFields} from './live-data.js';
import {validateInformationLayout} from './information-layout.js';
import {numericValue} from './information-history.js';
const unavailable=s=>!s||['unknown','unavailable'].includes(s.state);
export const informationTypes={entity:'Entity',heading:'Section heading',weather:'Weather',calendar:'Calendar',people:'Who’s at home',updates:'HA updates',low_battery:'Low batteries',energy:'Plug energy'};
export const informationIcons={none:'None',temperature:'Temperature',presence:'Person',power:'Power',bulb:'Light',floor:'Home',colour:'Droplet',grid:'Grid',check:'Check'};
export function validateInformation(panel){
  if(panel===undefined)return;
  if(!panel||typeof panel!=='object'||!Array.isArray(panel.items)||panel.items.length>48)throw Error('Information panel needs up to 48 items');
  if(panel.enabled!==undefined&&typeof panel.enabled!=='boolean')throw Error('Information visibility must be true or false');
  if(panel.position!==undefined&&!['top-left','top-right','bottom-left','bottom-right'].includes(panel.position))throw Error('Choose an information panel position');
  if(panel.columns!==undefined&&![1,2,3,4].includes(panel.columns))throw Error('Choose 1 to 4 information columns');
  for(const item of panel.items){
    if(!item||!Object.hasOwn(informationTypes,item.type))throw Error('Choose an information item type');
    validateLiveFields(item);
    if(item.icon!==undefined&&!Object.hasOwn(informationIcons,item.icon))throw Error('Choose an information icon');
    if(item.colour!==undefined&&!/^#[0-9a-f]{6}$/i.test(item.colour))throw Error('Choose a six-digit information colour');
    for(const key of ['show_details','show_unavailable','full_width'])if(item[key]!==undefined&&typeof item[key]!=='boolean')throw Error('Information display options must be true or false');
    if(item.label!==undefined&&(typeof item.label!=='string'||item.label.length>80))throw Error('Information labels must be under 80 characters');
    if(['entity','weather'].includes(item.type)&&!new RegExp(item.type==='entity'?'^[a-z_]+\\.[a-z0-9_]+$':`^${item.type}\\.[a-z0-9_]+$`).test(item.entity || ''))throw Error('Choose an entity for the information item');
    if(item.type==='calendar'&&(!calendarIds(item).length||calendarIds(item).some(id=>!/^calendar\.[a-z0-9_]+$/.test(id))))throw Error('Choose calendar entities');
    for(const key of ['count_entity','names_entity'])if(item[key]&&!/^sensor\.[a-z0-9_]+$/.test(item[key]))throw Error('Choose a battery summary sensor');
    if(item.max_events!==undefined&&(!Number.isInteger(item.max_events)||item.max_events<1||item.max_events>50))throw Error('Choose between 1 and 50 events');
    if(item.entities!==undefined&&(!Array.isArray(item.entities)||item.entities.length>500||item.entities.some(id=>typeof id!=='string'||!/^[a-z_]+\.[a-z0-9_]+$/.test(id))))throw Error('Choose valid information entities');
    if(item.threshold!==undefined&&(!Number.isFinite(item.threshold)||item.threshold<0||item.threshold>100))throw Error('Battery threshold must be between 0 and 100');
  }
  validateInformationLayout(panel);
}
export function informationRows(panel,states,now=new Date(),locale='en-GB',calendarCache){
  if(!panel||panel.enabled===false)return [];
  return panel.items.map(item=>{
    const state=states[item.entity],a=state?.attributes || {},label=item.label || a.friendly_name || informationTypes[item.type];
    const row={item,label,entity:item.entity,value:'Unavailable',detail:'',unavailable:false,icon:item.icon,colour:item.colour,showDetails:item.show_details!==false,fullWidth:item.full_width??['calendar','energy','heading'].includes(item.type)};
    if(item.type==='heading')return {...row,value:'',entity:undefined};
    if(item.type==='energy'){const summary=energySummary(item.energy,states),missing=summary.power==='Unavailable'&&summary.energy==='Unavailable';return {...row,entity:undefined,value:missing?'Readings unavailable':`${summary.power} now · ${summary.energy} today`,energyRows:summary.rows,detail:summary.partial?'Some readings unavailable':'',unavailable:missing};}
    if(item.type==='calendar'&&(item.entities?.length||calendarCache?.[item.entity])){
      const {events,failures}=calendarEvents(item,states,calendarCache,now,locale);
      return {...row,entity:undefined,value:events.length?`${events.length} upcoming`:(failures.length?'Unavailable':'No upcoming events'),events,detail:failures.length?`Could not refresh: ${failures.join(', ')}${events.length?' · Showing last available events':''}`:'Next 7 days',unavailable:!events.length&&!!failures.length};
    }
    if(item.type==='low_battery'&&(item.count_entity||item.names_entity)){
      const count=sensorNumber(states[item.count_entity]),names=states[item.names_entity];
      return {...row,entity:item.count_entity,value:count===null||count<0?'Unavailable':`${count} low`,detail:unavailable(names)?'Device names unavailable':String(names.state).split(',').map(s=>s.trim()).filter(Boolean).join(', '),unavailable:count===null||count<0};
    }
    if(['entity','weather','calendar'].includes(item.type)){
      if(unavailable(state))return {...row,unavailable:true};
      if(item.type==='weather')return {...row,value:[a.temperature===undefined?'':`${a.temperature}${a.temperature_unit || '°'}`,state.state.replaceAll('-',' ')].filter(Boolean).join(' · ')};
      if(item.type==='calendar'){
        const start=a.start_time?new Date(a.start_time):null,end=a.end_time?new Date(a.end_time):null;
        if(!a.message||!start||!Number.isFinite(start.getTime())||(end&&end<=now))return {...row,value:'No upcoming event'};
        return {...row,value:a.message,detail:(a.all_day?'All day · ':'')+start.toLocaleString(locale,{day:'numeric',month:'short',...(a.all_day?{}:{hour:'2-digit',minute:'2-digit'})})};
      }
      const raw=item.attribute?a[item.attribute]:state.state;
      const number=numericValue(raw),unit=item.unit??(!item.attribute?a.unit_of_measurement:'');
      return raw===undefined||raw===null||typeof raw==='object'?{...row,unavailable:true}:{...row,value:`${number!==null&&item.precision!==undefined?number.toLocaleString(locale,{minimumFractionDigits:item.precision,maximumFractionDigits:item.precision}):raw}${unit?' '+unit:''}`};
    }
    const domain=item.type==='people'?'person.':item.type==='updates'?'update.':null;
    const ids=item.entities?.length?[...new Set(item.entities)]:Object.keys(states).filter(id=>domain?id.startsWith(domain):states[id]?.attributes?.device_class==='battery');
    const known=ids.filter(id=>!unavailable(states[id])),missing=ids.length-known.length;
    const matches=known.filter(id=>item.type==='people'?states[id].state==='home':item.type==='updates'?states[id].state==='on':states[id].state==='on'||(states[id].state.trim()!==''&&Number.isFinite(Number(states[id].state))&&Number(states[id].state)<=(item.threshold??20)));
    const names=matches.map(id=>{const name=states[id].attributes?.friendly_name || id;return item.type==='updates'?name.replace(/\s+update$/i,''):name;});
    return {...row,entity:undefined,entities:matches,value:!known.length?'Unavailable':item.type==='people'?(names.join(', ') || 'Nobody home'):`${matches.length} ${item.type==='updates'?'available':'low'}`,detail:[item.type==='people'?'':names.join(', '),missing&&(item.show_unavailable??!!item.entities?.length)?`${missing} unavailable`:''].filter(Boolean).join(' · '),unavailable:!known.length};
  });
}

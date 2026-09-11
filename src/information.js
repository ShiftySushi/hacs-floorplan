const unavailable=s=>!s||['unknown','unavailable'].includes(s.state);
export const informationTypes={entity:'Entity',weather:'Weather',calendar:'Calendar',people:'Who’s at home',updates:'HA updates',low_battery:'Low batteries'};
export function validateInformation(panel){
  if(panel===undefined)return;
  if(!panel||typeof panel!=='object'||!Array.isArray(panel.items)||panel.items.length>16)throw Error('Information panel needs up to 16 items');
  if(panel.enabled!==undefined&&typeof panel.enabled!=='boolean')throw Error('Information visibility must be true or false');
  if(panel.position!==undefined&&!['top-left','top-right'].includes(panel.position))throw Error('Choose an information panel position');
  for(const item of panel.items){
    if(!item||!Object.hasOwn(informationTypes,item.type))throw Error('Choose an information item type');
    if(item.label!==undefined&&(typeof item.label!=='string'||item.label.length>80))throw Error('Information labels must be under 80 characters');
    if(['entity','weather','calendar'].includes(item.type)&&!new RegExp(item.type==='entity'?'^[a-z_]+\\.[a-z0-9_]+$':`^${item.type}\\.[a-z0-9_]+$`).test(item.entity || ''))throw Error('Choose an entity for the information item');
    if(item.entities!==undefined&&(!Array.isArray(item.entities)||item.entities.length>500||item.entities.some(id=>typeof id!=='string'||!/^[a-z_]+\.[a-z0-9_]+$/.test(id))))throw Error('Choose valid information entities');
    if(item.threshold!==undefined&&(!Number.isFinite(item.threshold)||item.threshold<0||item.threshold>100))throw Error('Battery threshold must be between 0 and 100');
  }
}
export function informationRows(panel,states,now=new Date(),locale='en-GB'){
  if(!panel||panel.enabled===false)return [];
  return panel.items.map(item=>{
    const state=states[item.entity],a=state?.attributes || {},label=item.label || a.friendly_name || informationTypes[item.type];
    const row={label,entity:item.entity,value:'Unavailable',detail:'',unavailable:false};
    if(['entity','weather','calendar'].includes(item.type)){
      if(unavailable(state))return {...row,unavailable:true};
      if(item.type==='weather')return {...row,value:[a.temperature===undefined?'':`${a.temperature}${a.temperature_unit || '°'}`,state.state.replaceAll('-',' ')].filter(Boolean).join(' · ')};
      if(item.type==='calendar'){
        const start=a.start_time?new Date(a.start_time):null,end=a.end_time?new Date(a.end_time):null;
        if(!a.message||!start||!Number.isFinite(start.getTime())||(end&&end<=now))return {...row,value:'No upcoming event'};
        return {...row,value:a.message,detail:(a.all_day?'All day · ':'')+start.toLocaleString(locale,{day:'numeric',month:'short',...(a.all_day?{}:{hour:'2-digit',minute:'2-digit'})})};
      }
      const raw=item.attribute?a[item.attribute]:state.state;
      return raw===undefined||raw===null?{...row,unavailable:true}:{...row,value:typeof raw==='object'?'Unavailable':`${raw}${a.unit_of_measurement&&!item.attribute?' '+a.unit_of_measurement:''}`};
    }
    const domain=item.type==='people'?'person.':item.type==='updates'?'update.':null;
    const ids=item.entities?.length?[...new Set(item.entities)]:Object.keys(states).filter(id=>domain?id.startsWith(domain):states[id]?.attributes?.device_class==='battery');
    const known=ids.filter(id=>!unavailable(states[id])),missing=ids.length-known.length;
    const matches=known.filter(id=>item.type==='people'?states[id].state==='home':item.type==='updates'?states[id].state==='on':states[id].state==='on'||(states[id].state.trim()!==''&&Number.isFinite(Number(states[id].state))&&Number(states[id].state)<=(item.threshold??20)));
    const names=matches.map(id=>states[id].attributes?.friendly_name || id);
    return {...row,entity:undefined,entities:matches,value:!known.length?'Unavailable':item.type==='people'?(names.join(', ') || 'Nobody home'):`${matches.length} ${item.type==='updates'?'available':'low'}`,detail:[item.type==='people'?'':names.join(', '),missing?`${missing} unavailable`:''].filter(Boolean).join(' · '),unavailable:!known.length};
  });
}

// History is fetched only for explicitly configured charts, using the HA session.
export const historyKey=item=>JSON.stringify([item.entity,item.attribute||'',item.history_hours||24]);
export const numericValue=value=>typeof value==='number'&&Number.isFinite(value)?value:typeof value==='string'&&value.trim()!==''&&Number.isFinite(Number(value))?Number(value):null;
export function historyPoints(records,item,start,end){
  const points=(records||[]).map(record=>({time:Date.parse(record.last_updated||record.last_changed),value:['unknown','unavailable'].includes(record.state)?null:numericValue(item.attribute?record.attributes?.[item.attribute]:record.state)})).filter(p=>Number.isFinite(p.time)&&p.time<=end).sort((a,b)=>a.time-b.time);
  const before=points.filter(p=>p.time<start).at(-1),result=points.filter(p=>p.time>=start);
  if(before)result.unshift({...before,time:start});
  // Bound SVG work while retaining bucket extrema and unavailable gaps.
  if(result.length<=600)return result;
  const sampled=[];for(let i=0;i<result.length;i+=Math.ceil(result.length/100)){
    const bucket=result.slice(i,i+Math.ceil(result.length/100)),valid=bucket.filter(p=>p.value!==null);
    const keep=[bucket[0],bucket.at(-1),bucket.find(p=>p.value===null),...valid.length?[valid.reduce((a,b)=>a.value<b.value?a:b),valid.reduce((a,b)=>a.value>b.value?a:b)]:[]];
    sampled.push(...[...new Set(keep.filter(Boolean))].sort((a,b)=>a.time-b.time));
  }return sampled;
}
export function resetInformationHistory(host){host.historyGeneration=(host.historyGeneration||0)+1;host.informationHistory={};}
export async function refreshInformationHistory(host){
  if(!host.isConnected||!host._hass?.callApi||host.config?.information?.enabled===false)return;
  const items=(host.config?.information?.items||[]).filter(i=>i.type==='entity'&&['line','bar'].includes(i.display)),now=Date.now();
  const cache=host.informationHistory||={},generation=host.historyGeneration||0;
  await Promise.all(items.map(async item=>{
    const key=historyKey(item),previous=cache[key];if(previous?.pending||previous&&now-previous.requestedAt<300000)return;
    const start=now-(item.history_hours||24)*3600000;
    cache[key]={...previous,pending:true,requestedAt:now};
    try{
      const query=new URLSearchParams({filter_entity_id:item.entity,end_time:new Date(now).toISOString()});
      if(!item.attribute){query.set('minimal_response','');query.set('no_attributes','');}
      const data=await host._hass.callApi('GET',`history/period/${encodeURIComponent(new Date(start).toISOString())}?${query}`);
      if(!Array.isArray(data)||data.some(series=>!Array.isArray(series)))throw Error('Invalid history');
      if(!host.isConnected||(host.historyGeneration||0)!==generation)return;
      cache[key]={points:historyPoints(data.flat(),item,start,now),start,end:now,requestedAt:now};
    }catch{
      if(!host.isConnected||(host.historyGeneration||0)!==generation)return;
      cache[key]={...previous,pending:false,error:true,requestedAt:now};
    }
    host.render();
  }));
}

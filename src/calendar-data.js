export const calendarIds=item=>[...new Set(item.entities?.length?item.entities:item.entity?[item.entity]:[])];
const eventDate=value=>{const raw=value?.dateTime||value?.date||value;if(typeof raw!=='string')return null;const d=new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw)?raw+'T00:00:00':raw);return Number.isFinite(d.getTime())?d:null;};
const calendarName=(id,a)=>/webcals?:|https?:|\.ics(?:\b|$)/i.test(a.friendly_name||'')?'':a.friendly_name||id;
export function calendarEvents(item,states,cache,now=new Date(),locale='en-GB'){
  const events=[],failures=[];
  for(const id of calendarIds(item)){
    const entry=cache?.[id],a=states[id]?.attributes||{};
    const source=calendarName(id,a);
    if(entry?.error)failures.push(source||'Calendar');
    const list=entry?.events??(a.message?[{summary:a.message,start:a.start_time,end:a.end_time,all_day:a.all_day}]:[]);
    for(const event of list){const start=eventDate(event.start),end=eventDate(event.end);if(!start||!end||end<=now)continue;
      const allDay=event.all_day||!!event.start?.date;
      const date=start.toLocaleDateString(locale,{weekday:'short',day:'numeric',month:'short'}),time=allDay?'All day':start.toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'});
      events.push({entity:id,title:event.summary||'Untitled event',start:start.getTime(),date,time,source,detail:[date,time,source].filter(Boolean).join(' · ')});
    }
  }
  events.sort((a,b)=>a.start-b.start||a.entity.localeCompare(b.entity)||a.title.localeCompare(b.title));
  return {events:events.slice(0,item.max_events??12),failures};
}
// One in-flight request per card, cached for five minutes; stale responses cannot
// replace the result of a later configuration or a disconnected card.
export async function refreshCalendars(host){
  if(!host.isConnected||!host._hass?.callApi||host.config?.information?.enabled===false)return;
  const ids=[...new Set((host.config?.information?.items||[]).filter(i=>i.type==='calendar').flatMap(calendarIds))];
  const key=JSON.stringify(ids),now=Date.now();if(host.calendarRequestKey===key&&now-(host.calendarRequestedAt||0)<300000)return;
  host.calendarRequestKey=key;host.calendarRequestedAt=now;const generation=host.calendarGeneration=(host.calendarGeneration||0)+1;
  const start=new Date(now).toISOString(),end=new Date(now+7*86400000).toISOString();
  const results=await Promise.allSettled(ids.map(id=>host._hass.callApi('GET',`calendars/${encodeURIComponent(id)}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)));
  if(!host.isConnected||host.calendarGeneration!==generation||host.calendarRequestKey!==key)return;
  const next={};results.forEach((r,i)=>{next[ids[i]]=r.status==='fulfilled'&&Array.isArray(r.value)?{events:r.value}:{events:host.calendarCache?.[ids[i]]?.events,error:true};});host.calendarCache=next;host.render();
}

// Only standalone simulated devices are persisted here; real HA states stay live.
const key='floorplan-preview:'+location.pathname;
async function database(action,value){
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('floorplan-preview',1);request.onupgradeneeded=()=>request.result.createObjectStore('states');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  try{return await new Promise((resolve,reject)=>{const transaction=db.transaction('states',action==='read'?'readonly':'readwrite'),store=transaction.objectStore('states'),request=action==='read'?store.get(key):store.put(value,key);transaction.oncomplete=()=>resolve(request.result);transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error);});}finally{db.close();}
}
export async function restorePreview(states){
  let saved;try{const raw=localStorage.getItem(key);saved=raw?JSON.parse(raw):await database('read');}catch{saved=await database('read').catch(()=>null);}
  for(const [id,value] of Object.entries(saved || {}))if(states[id]&&/^(light|climate|switch|binary_sensor|media_player)\./.test(id))states[id]={...states[id],state:value.state,attributes:{...states[id].attributes,...value.attributes}};
  document.body.classList.toggle('dark',document.documentElement.dataset.theme==='dark');
}
export async function savePreview(states){
  const saved=Object.fromEntries(Object.entries(states).filter(([id])=>/^(light|climate|switch|binary_sensor|media_player)\./.test(id)));
  try{localStorage.setItem(key,JSON.stringify(saved));}catch(error){
    if(error.name!=='QuotaExceededError')throw error;
    await database('write',saved);localStorage.removeItem(key);
  }
}
export function togglePreviewTheme(){
  const dark=document.body.classList.toggle('dark');document.documentElement.dataset.theme=dark?'dark':'light';
  localStorage.setItem('floorplan-preview-theme',dark?'dark':'light');
}

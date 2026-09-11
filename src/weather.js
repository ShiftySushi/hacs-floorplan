export function weatherEntity(config){return config.weather?.entity || config.information?.items?.find(i=>i.type==='weather')?.entity || '';}
export function validateWeather(value){
  if(value===undefined)return;
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Weather settings must be an object');
  if(value.entity&&!/^weather\.[a-z0-9_]+$/.test(value.entity))throw Error('Choose a weather entity');
  if(value.enabled!==undefined&&typeof value.enabled!=='boolean')throw Error('Weather effects must be enabled or disabled');
  if(value.intensity!==undefined&&(!Number.isFinite(value.intensity)||value.intensity<0||value.intensity>1))throw Error('Weather intensity must be between 0 and 1');
}
export function weatherAppearance(states,config={}){
  const state=config.entity?states[config.entity]:Object.entries(states).find(([id,s])=>id.startsWith('weather.')&&s&&!['unknown','unavailable'].includes(s.state))?.[1];
  const condition=config.enabled===false?'':state?.state;
  const clouds={cloudy:1,partlycloudy:.45,rainy:.8,pouring:1,lightning:1,'lightning-rainy':1,snowy:.8,'snowy-rainy':.9,hail:.9,fog:.85,'windy-variant':.65,exceptional:1}[condition] || 0;
  return {condition:condition || '',clouds,rain:['rainy','pouring','lightning-rainy','snowy-rainy'].includes(condition),snow:['snowy','snowy-rainy'].includes(condition),hail:condition==='hail',fog:condition==='fog',storm:['lightning','lightning-rainy','exceptional'].includes(condition),wind:['windy','windy-variant','exceptional'].includes(condition),intensity:config.intensity??.7};
}

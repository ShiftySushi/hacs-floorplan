// Sun elevation follows the home's configured location. The clock is only a
// preview fallback when the Sun integration is unavailable.
export function daylightLevel(states={},now=new Date()) {
  const sun=states['sun.sun'],elevation=sun?.attributes?.elevation;
  let level;
  if(Number.isFinite(elevation)&&!['unknown','unavailable'].includes(sun.state))level=Math.max(0,Math.min(1,(elevation+6)/26));
  else if(sun?.state==='above_horizon')level=1;
  else if(sun?.state==='below_horizon')level=0;
  else level=Math.max(0,Math.sin((now.getHours()+now.getMinutes()/60-6)*Math.PI/12));
  const weather=Object.entries(states).find(([id,state])=>id.startsWith('weather.')&&!['unknown','unavailable'].includes(state?.state))?.[1];
  const cloud=weather?.attributes?.cloud_coverage;
  if(Number.isFinite(cloud))level*=1-.35*Math.max(0,Math.min(100,cloud))/100;
  return level;
}

export function stageColour(mode,level) {
  const day={sims:[144,183,116],clean:[223,232,225],'3d':[220,231,224],pokemon:[137,173,131],zelda:[117,140,113]}[mode] || [223,232,225];
  const night={sims:[34,59,55],pokemon:[32,54,57],zelda:[27,39,49]}[mode] || [27,38,52];
  return `rgb(${day.map((c,i)=>Math.round(night[i]+(c-night[i])*Math.max(0,Math.min(1,level)))).join(',')})`;
}

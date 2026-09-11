import {weatherAppearance} from './weather.js';
// Sun elevation follows the home's configured location. The clock is only a
// preview fallback when the Sun integration is unavailable.
export function daylightLevel(states={},now=new Date(),location={},weatherEntity='') {
  const sun=states['sun.sun'],elevation=sun?.attributes?.elevation;
  let level;
  if(Number.isFinite(elevation)&&!['unknown','unavailable'].includes(sun.state))level=Math.max(0,Math.min(1,(elevation+6)/26));
  else if(sun?.state==='above_horizon')level=1;
  else if(sun?.state==='below_horizon')level=0;
  else if(Number.isFinite(location.latitude ?? states['zone.home']?.attributes?.latitude)&&Number.isFinite(location.longitude ?? states['zone.home']?.attributes?.longitude))level=Math.max(0,Math.min(1,(solarElevation(now,location.latitude ?? states['zone.home'].attributes.latitude,location.longitude ?? states['zone.home'].attributes.longitude)+6)/26));
  else level=Math.max(0,Math.sin((now.getHours()+now.getMinutes()/60-6)*Math.PI/12));
  const weather=weatherEntity?states[weatherEntity]:Object.entries(states).find(([id,state])=>id.startsWith('weather.')&&!['unknown','unavailable'].includes(state?.state))?.[1];
  const cloud=weather?.attributes?.cloud_coverage ?? weatherAppearance({'weather.selected':weather}).clouds*100;
  if(Number.isFinite(cloud))level*=1-.35*Math.max(0,Math.min(100,cloud))/100;
  return level;
}

export function stageColour(mode,level) {
  const day={sims:[144,183,116],clean:[223,232,225],'3d':[220,231,224],pokemon:[137,173,131],zelda:[117,140,113]}[mode] || [223,232,225];
  const night={sims:[34,59,55],pokemon:[32,54,57],zelda:[27,39,49]}[mode] || [27,38,52];
  return `rgb(${day.map((c,i)=>Math.round(night[i]+(c-night[i])*Math.max(0,Math.min(1,level)))).join(',')})`;
}

// Solar position from UTC date and geographic coordinates; no browser timezone dependency.
export function solarElevation(now,latitude,longitude){
  const rad=Math.PI/180,days=now.getTime()/86400000-10957.5,mean=(357.5291+.98560028*days)*rad;
  const longitudeSun=mean+(1.9148*Math.sin(mean)+.02*Math.sin(2*mean)+.0003*Math.sin(3*mean)+102.9372)*rad+Math.PI;
  const obliquity=23.4397*rad,declination=Math.asin(Math.sin(longitudeSun)*Math.sin(obliquity));
  const ascension=Math.atan2(Math.sin(longitudeSun)*Math.cos(obliquity),Math.cos(longitudeSun));
  const hourAngle=(280.16+360.9856235*days+longitude)*rad-ascension,lat=latitude*rad;
  return Math.asin(Math.sin(lat)*Math.sin(declination)+Math.cos(lat)*Math.cos(declination)*Math.cos(hourAngle))/rad;
}

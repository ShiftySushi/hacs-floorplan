export function heatingState(state) {
  if(!state || ['unknown','unavailable'].includes(state.state))return 'unknown';
  const action=state.attributes?.hvac_action;
  if(action)return action==='heating'?'heating':['idle','off','cooling','drying','fan'].includes(action)?'idle':'unknown';
  if(state.state==='on')return 'heating';
  if(state.state==='off')return 'idle';
  return 'unknown';
}

export function roomTemperature(room,states) {
  const id=room.temperature_entity,state=states[id];
  if(!state || ['unknown','unavailable'].includes(state.state))return '';
  const value=id?.startsWith('climate.')?state.attributes?.current_temperature:state.state;
  if(value===null || value===undefined || value==='' || !Number.isFinite(Number(value)))return '';
  const unit=state.attributes?.unit_of_measurement || state.attributes?.temperature_unit || '';
  return `${Number(value).toFixed(1)}${unit?' '+unit:'°'}`;
}

export function temperatureTone(entity,state) {
  if(!state||['unknown','unavailable'].includes(state.state))return 'neutral';
  const raw=entity?.startsWith('climate.')?state?.attributes?.current_temperature:state?.state;
  if(raw===null||raw===undefined||raw===''||!Number.isFinite(Number(raw)))return 'neutral';
  let value=Number(raw);const unit=state?.attributes?.unit_of_measurement || state?.attributes?.temperature_unit;
  if(unit==='°F')value=(value-32)*5/9;
  return value<18?'cool':value>24?'warm':'neutral';
}

// Keep compact readouts inside the room and away from light hit targets.
export function roomReadoutPoint(room,floor) {
  const points=room.points, xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),centre=[(left+right)/2,(top+bottom)/2];
  const inside=([x,y])=>{let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
  const ratio=floor.aspect_ratio || .6875,distance=(a,b)=>Math.hypot(a[0]-b[0],(a[1]-b[1])/ratio),obstacles=[...(floor.entities || []).map(e=>[e.x,e.y]),...(floor.objects || []).filter(o=>o.type==='radiator').map(o=>[o.x,o.y])];
  let best=centre,score=-Infinity;
  for(let i=1;i<8;i++)for(let j=1;j<8;j++){
    const p=[left+(right-left)*i/8,top+(bottom-top)*j/8];
    if(![[0,0],[-3,0],[3,0],[0,-1],[0,1]].every(([x,y])=>inside([p[0]+x,p[1]+y])))continue;
    const clearance=Math.min(12,...obstacles.map(o=>distance(p,o))),value=clearance-.35*distance(p,centre);
    if(value>score){best=p;score=value;}
  }
  return best;
}

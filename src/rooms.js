import { available } from './lights.js';
export function roomState(room, states) {
  const lights = room.lights || [];
  const active = lights.map(id => states[id]).filter(s => available(s) && s.state === 'on');
  const known = lights.filter(id => available(states[id]));
  const lightState = active.length ? 'Lit' : !lights.length ? 'No lights assigned' : known.length !== lights.length ? 'Lighting unknown' : 'Dark';
  const sensors = room.presence || [];
  const occupied = sensors.some(id => available(states[id]) && states[id].state === 'on');
  const presence = !sensors.length ? '' : occupied ? 'Presence detected' : sensors.some(id => !available(states[id])) ? 'Presence unknown' : 'No presence';
  return { lightState, presence, occupied, fill: active.length ? '#ffe5a0' : lightState === 'Dark' ? '#263746' : '#929ca4', opacity: active.length ? .28 + .32 * Math.max(...active.map(s => (s.attributes.brightness ?? 255) / 255)) : .66 };
}
export function polygonArea(points) {
  return Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
}
export function validPolygon(points) {
  if (!Array.isArray(points) || points.length < 3 || points.some(p => !Array.isArray(p) || p.length !== 2 || p.some(n => !Number.isFinite(n) || n < 0 || n > 100)) || polygonArea(points) < .1) return false;
  const cross = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const between = (a,b,p) => Math.min(a[0],b[0])<=p[0] && p[0]<=Math.max(a[0],b[0]) && Math.min(a[1],b[1])<=p[1] && p[1]<=Math.max(a[1],b[1]);
  for (let i=0;i<points.length;i++) for (let j=i+1;j<points.length;j++) {
    if (j===i+1 || (i===0 && j===points.length-1)) continue;
    const a=points[i],b=points[(i+1)%points.length],c=points[j],d=points[(j+1)%points.length];
    const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
    if ((abC*abD<0 && cdA*cdB<0) || (!abC && between(a,b,c)) || (!abD && between(a,b,d)) || (!cdA && between(c,d,a)) || (!cdB && between(c,d,b))) return false;
  }
  return new Set(points.map(p=>p.join(','))).size === points.length;
}
export function orientation(ratio, degrees) {
  const w=1000,h=1000/ratio,r=degrees*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  return { w,h,c,s,width:Math.abs(w*c)+Math.abs(h*s),height:Math.abs(w*s)+Math.abs(h*c) };
}
export function orientPoint(point, transform, inverse = false) {
  const {w,h,c,s,width,height}=transform;
  if (inverse) {
    const x=point[0]/100*width-width/2,y=point[1]/100*height-height/2;
    return [(x*c+y*s+w/2)/w*100,(-x*s+y*c+h/2)/h*100];
  }
  const x=point[0]/100*w-w/2,y=point[1]/100*h-h/2;
  return [(x*c-y*s+width/2)/width*100,(x*s+y*c+height/2)/height*100];
}

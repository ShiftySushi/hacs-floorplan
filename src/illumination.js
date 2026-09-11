// Shared physical light footprints for the 2D and 3D renderers.
export function roomLightSources(floor, room) {
  const centre=(room.points || []).reduce((p,q)=>[p[0]+q[0]/room.points.length,p[1]+q[1]/room.points.length],[0,0]);
  return [...new Set(room.lights || [])].map(id=>{
    const marker=(floor.entities || []).find(e=>e.entity===id);
    const object=(floor.objects || []).find(o=>o.light_entity===id);
    const height=lightHeight(floor,id),accent=!!object;
    const radius=accent?(object.type==='tv_lightstrip'?1.3:1.8):height*(marker?.fixture==='spot'?.65:.95);
    return {id,x:object?.x ?? marker?.x ?? centre[0],y:object?.y ?? marker?.y ?? centre[1],height,radius,strength:accent?.6:Math.min(1,(2.4/Math.max(1,height))**2)};
  });
}

export function lightHeight(floor,id) {
  const object=(floor.objects || []).find(o=>o.light_entity===id);
  if(object)return (object.elevation_m || 0)+(object.height || .6)/2;
  const marker=(floor.entities || []).find(e=>e.entity===id);
  const ceiling=Math.max(2.4,...(floor.walls || []).map(w=>w.height || 2.4));
  return marker?.height_m ?? Math.max(.5,ceiling-(marker?.fixture==='pendant'?.3:.05));
}

export function lightAppearance(state) {
  const a=state?.attributes || {}, clamp=n=>Math.max(0,Math.min(255,Number(n)||0));
  const level=state?.state==='on'?clamp(a.brightness ?? 255)/255:0;
  let colour=[255,231,190];
  if(a.color_mode==='color_temp'&&(a.color_temp_kelvin || a.color_temp))colour=kelvinColour(a.color_temp_kelvin || 1e6/a.color_temp);
  else if(Array.isArray(a.rgb_color)&&a.rgb_color.length===3)colour=a.rgb_color.map(clamp);
  else if(Array.isArray(a.hs_color)) {
    const h=((Number(a.hs_color[0])||0)%360+360)%360/60,s=Math.max(0,Math.min(1,(Number(a.hs_color[1])||0)/100));
    const x=1-Math.abs(h%2-1),rgb=h<1?[1,x,0]:h<2?[x,1,0]:h<3?[0,1,x]:h<4?[0,x,1]:h<5?[x,0,1]:[1,0,x];
    colour=rgb.map(c=>Math.round(255*(1-s+s*c)));
  } else if(a.color_temp_kelvin || a.color_temp) {
    colour=kelvinColour(a.color_temp_kelvin || 1e6/a.color_temp);
  }
  return {level,colour};
}

export function roomDarkness(room, states) {
  const ids=room.lights || [];
  return ids.length&&ids.every(id=>['on','off'].includes(states[id]?.state))?.64:.18;
}

export function kelvinColour(kelvin){
  const t=Math.max(1000,Math.min(40000,kelvin))/100,clamp=n=>Math.round(Math.max(0,Math.min(255,n)));
  return [clamp(t<=66?255:329.698727446*(t-60)**-.1332047592),clamp(t<=66?99.4708025861*Math.log(t)-161.1195681661:288.1221695283*(t-60)**-.0755148492),clamp(t>=66?255:t<=19?0:138.5177312231*Math.log(t-10)-305.0447927307)];
}

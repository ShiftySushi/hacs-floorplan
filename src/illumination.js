// Shared physical light footprints for the 2D and 3D renderers.
export function roomLightSources(floor, room) {
  const centre=(room.points || []).reduce((p,q)=>[p[0]+q[0]/room.points.length,p[1]+q[1]/room.points.length],[0,0]);
  return [...new Set(room.lights || [])].map(id=>{
    const marker=(floor.entities || []).find(e=>e.entity===id);
    const object=(floor.objects || []).find(o=>o.light_entity===id);
    const height=lightHeight(floor,id),accent=!!object;
    const radius=accent?(object.type==='tv_lightstrip'?1.3:1.8):height*(marker?.fixture==='spot'?.65:.95);
    return {id,x:marker?.x ?? object?.x ?? centre[0],y:marker?.y ?? object?.y ?? centre[1],height,radius,strength:accent?.6:Math.min(1,(2.4/Math.max(1,height))**2)};
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
  if(Array.isArray(a.rgb_color)&&a.rgb_color.length===3)colour=a.rgb_color.map(clamp);
  else if(Array.isArray(a.hs_color)) {
    const h=((Number(a.hs_color[0])||0)%360+360)%360/60,s=Math.max(0,Math.min(1,(Number(a.hs_color[1])||0)/100));
    const x=1-Math.abs(h%2-1),rgb=h<1?[1,x,0]:h<2?[x,1,0]:h<3?[0,1,x]:h<4?[0,x,1]:h<5?[x,0,1]:[1,0,x];
    colour=rgb.map(c=>Math.round(255*(1-s+s*c)));
  } else if(a.color_temp_kelvin || a.color_temp) {
    const k=a.color_temp_kelvin || 1e6/a.color_temp;
    colour=k<4000?[255,clamp(190+Math.max(0,k-2000)*.02),clamp(115+Math.max(0,k-2000)*.04)]:[235,240,255];
  }
  return {level,colour};
}

export function roomDarkness(room, states) {
  const ids=room.lights || [];
  return ids.length&&ids.every(id=>['on','off'].includes(states[id]?.state))?.64:.18;
}

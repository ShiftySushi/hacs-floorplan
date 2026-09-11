import * as THREE from 'three';
export const lavaColours=[['Blue / green','#4dbbe8','#b3ec39'],['Blue / pink','#569bdd','#f66dac'],['Clear / dark purple','#e6edf0','#642581'],['Clear / green','#e6edf0','#62c957'],['Clear / yellow','#e6edf0','#f4df46'],['Pink / pink','#ee9cc6','#ed4e9e'],['Pink / yellow','#ee9cc6','#f4df46'],['Violet / orange','#946ee7','#ff892d'],['Violet / red','#946ee7','#ee3e45'],['Violet / turquoise','#946ee7','#35e0cc'],['Yellow / orange','#e8d462','#ff892d']];
export function lavaAppearance(object){
  const pair=lavaColours[object.lava_colour??9]||lavaColours[9],liquid=new THREE.Color(pair[1]),wax=new THREE.Color(pair[2]);
  const rgb=c=>c.convertLinearToSRGB().toArray().map(v=>v*255);
  return {light:rgb(liquid.clone().lerp(wax,.4)),liquid:rgb(liquid),wax:rgb(wax)};
}
export function lava3D(group,o){
  const pair=lavaColours[o.lava_colour??9]||lavaColours[9],metal=new THREE.MeshStandardMaterial({color:o.colour||'#202022',metalness:.8,roughness:.3});
  const lathe=(points,material)=>{const m=new THREE.Mesh(new THREE.LatheGeometry(points.map(([r,y])=>new THREE.Vector2(r,y)),40),material);group.add(m);return m;};
  lathe([[0,0],[.07,0],[.07,.014],[.035,.11],[.059,.155]],metal);
  lathe([[.032,.372],[.032,.38],[.018,.427],[0,.43]],metal);
  if(o.variant?.includes('vinyl'))for(let i=0;i<9;i++){const m=new THREE.Mesh(new THREE.TorusGeometry(.068-i*.0032,.0008,4,40),metal);m.rotation.x=Math.PI/2;m.position.y=.016+i*.009;group.add(m);}
  const liquid=new THREE.MeshStandardMaterial({color:pair[1],emissive:pair[1],emissiveIntensity:0,transparent:true,opacity:.42,roughness:.08,depthWrite:false});
  const bottle=lathe([[0,.145],[.058,.145],[.059,.17],[.032,.37],[0,.373]],liquid);bottle.userData.lavaLiquid=true;bottle.userData.lightEmitter=true;
  const wax=new THREE.MeshStandardMaterial({color:pair[2],emissive:pair[2],emissiveIntensity:0,roughness:.35});
  for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.016,16,12),wax);m.userData.lava=i;m.userData.lightEmitter=true;m.position.y=.17+i*.033;group.add(m);}
}

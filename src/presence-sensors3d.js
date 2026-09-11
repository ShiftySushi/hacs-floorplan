import * as THREE from 'three';

// Original scale models: rounded enclosures, lenses, vents and mounting feet.
export function presenceSensor3D(group,item){
  const w=item.width,h=item.height,d=item.depth,hue=item.type==='hue_motion_sensor',lite=item.type==='everything_presence_lite',pro=item.type==='everything_presence_pro';
  const shell=new THREE.MeshStandardMaterial({color:item.colour || '#f1f1ed',roughness:.45}),dark=new THREE.MeshStandardMaterial({color:'#272c31',roughness:.5});
  const add=(geometry,material,x,y,z)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;group.add(mesh);return mesh;};
  const r=Math.min(w,h)*.16,shape=new THREE.Shape();
  shape.moveTo(-w/2+r,0);shape.lineTo(w/2-r,0);shape.quadraticCurveTo(w/2,0,w/2,r);shape.lineTo(w/2,h-r);shape.quadraticCurveTo(w/2,h,w/2-r,h);shape.lineTo(-w/2+r,h);shape.quadraticCurveTo(-w/2,h,-w/2,h-r);shape.lineTo(-w/2,r);shape.quadraticCurveTo(-w/2,0,-w/2+r,0);
  add(new THREE.ExtrudeGeometry(shape,{depth:d*.82,bevelEnabled:false,curveSegments:6}),shell,0,0,-d*.41);
  if(!lite){
    const radius=Math.min(w*.28,h*.24),lens=new THREE.MeshStandardMaterial({color:hue?'#d7d9d4':'#fafaf5',roughness:.25});
    const pir=add(new THREE.SphereGeometry(radius,16,10),lens,0,h*(pro?.72:.55),d*.35);pir.scale.z=.36;
    if(hue)add(new THREE.SphereGeometry(w*.043,10,6),dark,w*.29,h*.8,d*.42);
  }
  const led=add(new THREE.SphereGeometry(w*.023,8,6),new THREE.MeshStandardMaterial({color:'#576873',emissive:'#000000'}),lite?w*.32:0,h*.15,d*.42);led.userData.presenceLED=true;
  if(!hue){
    for(let i=0;i<5;i++)add(new THREE.BoxGeometry(w*.035,h*.15,.0015),dark,(i-2)*w*.11,h*.3,-d*.415);
    add(new THREE.BoxGeometry(w*.18,.006,.004),dark,0,.008,-d*.42);
    add(new THREE.CylinderGeometry(w*.24,w*.31,.008,16),shell,0,.004,-d*.15);
  }
}

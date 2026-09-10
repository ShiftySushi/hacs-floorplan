import * as THREE from 'three';

// Tilt the wooden slats, rather than moving an opaque curtain over the opening.
export function windowBlinds(parent,opening,length,wall,floor){
  const width=Math.min(opening.width || .9,length),height=opening.height || 1.2,sill=opening.sill ?? .9,x=length*(opening.offset ?? .5),slats=[];
  const material=new THREE.MeshStandardMaterial({color:'#161819',roughness:.9});
  const group=new THREE.Group();group.position.set(x,sill+height/2,0);parent.add(group);
  function box(w,h,d,y){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
  box(width,.045,.065,height/2);box(width,.025,.06,-height/2);
  const count=Math.ceil(height/.055),pitch=height/count;
  for(let i=0;i<count;i++)slats.push(box(width,.006,pitch*1.07,height/2-pitch*(i+.5)));
  const t=opening.offset ?? .5,px=wall.a[0]+(wall.b[0]-wall.a[0])*t,py=wall.a[1]+(wall.b[1]-wall.a[1])*t;
  // Room outlines may stop at the inner wall face; use the nearest room edge.
  const distance=room=>Math.min(...(room.points || []).map((a,i,points)=>{const b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],u=Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/(dx*dx+dy*dy || 1)));return Math.hypot(px-a[0]-u*dx,py-a[1]-u*dy);}));
  const room=[...(floor.rooms || [])].sort((a,b)=>distance(a)-distance(b))[0];
  let target=0,start=0,from=0;
  const blind={floor,room,hit:group,width,height,value:0,toggle(){from=blind.value;target=target?0:1;start=performance.now();},update(now,reduced){const t=reduced?1:Math.min(1,(now-start)/700);blind.value=from+(target-from)*t*t*(3-2*t);for(const slat of slats)slat.rotation.x=blind.value*Math.PI/2;return t<1&&blind.value!==target;}};
  return blind;
}

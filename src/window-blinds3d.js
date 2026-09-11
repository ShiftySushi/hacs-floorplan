import * as THREE from 'three';

// Raise open slats into a compact stack so both states read clearly at room scale.
export function windowRoom(opening,wall,floor){
  const t=opening.offset ?? .5,px=wall.a[0]+(wall.b[0]-wall.a[0])*t,py=wall.a[1]+(wall.b[1]-wall.a[1])*t;
  const distance=room=>Math.min(...(room.points || []).map((a,i,points)=>{const b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],u=Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/(dx*dx+dy*dy || 1)));return Math.hypot(px-a[0]-u*dx,py-a[1]-u*dy);}));
  return [...(floor.rooms || [])].sort((a,b)=>distance(a)-distance(b))[0];
}
export function windowBlinds(parent,opening,length,wall,floor,preferences={}){
  if(opening.blinds===false)return null;
  const width=Math.min(opening.width || .9,length),height=opening.height || 1.2,sill=opening.sill ?? .9,x=length*(opening.offset ?? .5),slats=[];
  const sliding=opening.sliding,material=new THREE.MeshStandardMaterial({color:sliding?'#85898d':'#161819',roughness:.9});
  const group=new THREE.Group();group.position.set(x,sill+height/2,0);parent.add(group);
  function box(w,h,d,y){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
  box(width,.045,.065,height/2);const bottom=box(width,.025,.06,-height/2);
  const count=Math.ceil(height/.055),pitch=height/count;
  if(sliding)slats.push(box(width,height,.025,0));else for(let i=0;i<count;i++)slats.push(box(width,.006,pitch*1.07,height/2-pitch*(i+.5)));
  const room=windowRoom(opening,wall,floor);
  if(!sliding&&room?.points?.length){const centre=room.points.reduce((p,v)=>[p[0]+v[0]/room.points.length,p[1]+v[1]/room.points.length],[0,0]);const side=Math.sign((wall.b[0]-wall.a[0])*(centre[1]-wall.a[1])-(wall.b[1]-wall.a[1])*(centre[0]-wall.a[0]))||1;group.position.z=side*((wall.thickness||.15)/2+.055);}
  let target=preferences.closed?1:0,start=0,from=target;
  function pose(value){if(sliding){slats[0].scale.y=Math.max(.015,value);slats[0].position.y=height/2-height*slats[0].scale.y/2;bottom.position.y=height/2-height*value;return;}for(const [i,slat] of slats.entries()){slat.rotation.x=value*Math.PI/2;slat.position.y=height/2-(.009+(pitch-.009)*value)*(i+.5);}bottom.position.y=height/2-(count*.009+(height-count*.009)*value);}
  pose(target);
  const blind={floor,room,hit:group,width,height,value:target,get closed(){return target===1;},setClosed(closed){from=blind.value;target=closed?1:0;start=performance.now();preferences.onChange?.(!!target);},toggle(){blind.setClosed(!target);},update(now,reduced){const t=reduced?1:Math.max(0,Math.min(1,(now-start)/1400));blind.value=from+(target-from)*t*t*(3-2*t);pose(blind.value);return t<1&&blind.value!==target;}};
  return blind;
}

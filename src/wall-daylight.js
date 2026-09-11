import * as THREE from 'three';
import {blindTransmission} from './wall-occlusion3d.js';
import {floorDimensions} from './scene.js';

// Open areas of the same room can retain separate controls and sensors while
// receiving daylight from the same windows. Enclosed rooms stay independent.
export function roomDaylightWindows(windows,floor,room){
  return windows.filter(w=>w.floor===floor&&(w.room===room||!!room.daylight_group&&w.room?.daylight_group===room.daylight_group));
}

// Resolve boundaries by nearest room, never by nudging towards the building centre.
export function nearestRoom(x,y,rooms){
  let nearest=-1,best=Infinity;
  rooms.forEach((room,index)=>{
    let inside=false,distance=Infinity;
    const points=room.points||[];
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[j],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1];
      if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
      const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));
      distance=Math.min(distance,(x-a[0]-t*dx)**2+(y-a[1]-t*dy)**2);
    }
    if(inside)distance=0;
    if(distance<best){best=distance;nearest=index;}
  });
  return nearest;
}

export function wallDaylight(space,windows,walls){
  const {floor,group}=space,rooms=floor.rooms||[];
  if(!rooms.length)return {update(){},dispose(){}};
  const size=256,pixels=new Float32Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)pixels[(y*size+x)*4]=nearestRoom((x+.5)/size*100,(y+.5)/size*100,rooms);
  const mask=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat,THREE.FloatType),values=new Float32Array(rooms.length*4),light=new THREE.DataTexture(values,rooms.length,1,THREE.RGBAFormat,THREE.FloatType);
  mask.needsUpdate=true;light.needsUpdate=true;
  const byRoom=rooms.map(room=>roomDaylightWindows(windows,floor,room));
  const dimensions=floorDimensions(floor),uniforms={fm:{value:mask},ft:{value:light},fi:{value:group.matrixWorld.clone().invert()},fs:{value:new THREE.Vector2(dimensions.width,dimensions.depth)}};
  const members=new Set();group.traverse(node=>members.add(node));
  for(const mesh of walls)if(members.has(mesh))mesh.material.userData.wallDaylight=uniforms;
  return {update(){let changed=false;byRoom.forEach((windows,i)=>{const value=blindTransmission(windows);if(values[i*4]!==Math.fround(value)){values[i*4]=value;changed=true;}});if(changed)light.needsUpdate=true;},dispose(){mask.dispose();light.dispose();}};
}

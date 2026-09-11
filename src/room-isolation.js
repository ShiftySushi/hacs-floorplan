import {ShapeUtils,Vector2} from 'three';
import {floorDimensions} from './scene.js';
import {nearestRoom} from './wall-daylight.js';

function inside(p,polygon){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[j],b=polygon[i];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
}return hit;}
function distance(p,polygon){let best=Infinity;for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
  best=Math.min(best,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy));
}return best;}
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);

// Keep only the part of a wall beside this room. A small wall-width margin
// includes its centre line even when room polygons describe plaster faces.
function roomWalls(floor,polygon,size){
  const metre=p=>[p[0]*size.width/100,p[1]*size.depth/100];
  return (floor.walls||[]).flatMap(wall=>{
    const a=metre(wall.a),b=metre(wall.b),length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!length)return [];
    const keep=t=>{const p=mix(a,b,t);return inside(p,polygon)||distance(p,polygon)<(wall.thickness||.15)*.75+.02;};
    const steps=Math.max(1,Math.ceil(length/.025)),ranges=[];let previous=keep(0),start=previous?0:null;
    for(let i=1;i<=steps;i++){
      const next=keep(i/steps);if(next!==previous){let lo=(i-1)/steps,hi=i/steps;for(let j=0;j<12;j++){const mid=(lo+hi)/2;if(keep(mid)===previous)lo=mid;else hi=mid;}const boundary=(lo+hi)/2;
        if(next)start=boundary;else ranges.push([start,boundary]);previous=next;
      }
    }if(previous)ranges.push([start,1]);
    return ranges.filter(([a,b])=>(b-a)*length>.005).map(([from,to],i)=>({...wall,sourceWallId:wall.id,id:`${wall.id}:room:${i}`,a:mix(wall.a,wall.b,from),b:mix(wall.a,wall.b,to),openings:(wall.openings||[]).flatMap(o=>{
      const centre=(o.offset??.5)*length,left=Math.max(from*length,centre-o.width/2),right=Math.min(to*length,centre+o.width/2);
      return right-left>.01?[{...o,width:right-left,offset:((left+right)/2-from*length)/((to-from)*length)}]:[];
    })}));
  });
}

function clipPolygon(vertices,triangle){
  let result=vertices;const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
  const sign=Math.sign(cross(triangle[0],triangle[1],triangle[2]));
  for(let i=0;i<3;i++){
    const a=triangle[i],b=triangle[(i+1)%3],input=result;result=[];
    for(let j=0;j<input.length;j++){const p=input[j],q=input[(j+1)%input.length],dp=sign*cross(a,b,p),dq=sign*cross(a,b,q);
      if(dp>=-1e-8)result.push(p);if((dp>=0)!==(dq>=0))result.push(mix(p,q,dp/(dp-dq)));
    }
  }return result;
}

/** A derived preview only: preserve the saved source scene and coordinates. */
export function isolateRoomFloor(floor,roomId){
  const room=floor.rooms.find(r=>r.id===roomId);if(!room)return floor;
  const size=floorDimensions(floor),polygon=room.points.map(p=>[p[0]*size.width/100,p[1]*size.depth/100]),index=floor.rooms.indexOf(room);
  const belongs=p=>nearestRoom(p[0],p[1],floor.rooms)===index;
  const objects=(floor.objects||[]).filter(o=>belongs([o.x,o.y]));
  const ids=new Set([...(room.lights||[]),...objects.map(o=>o.light_entity).filter(Boolean)]);
  const triangles=ShapeUtils.triangulateShape(room.points.map(p=>new Vector2(...p)),[]).map(t=>t.map(i=>room.points[i]));
  const ceilings=(floor.ceiling_slopes||[]).flatMap(s=>{
    if(s.type==='rooflight'){const centre=s.vertices.reduce((p,v)=>[p[0]+v[0]/s.vertices.length,p[1]+v[1]/s.vertices.length],[0,0]);return belongs(centre)?[s]:[];}
    return triangles.flatMap((t,i)=>{const vertices=clipPolygon(s.vertices,t);return vertices.length>=3?[{...s,id:`${s.id}:room:${i}`,vertices}]:[];});
  });
  return {...floor,image:undefined,rooms:[room],objects,walls:roomWalls(floor,polygon,size),labels:(floor.labels || []).filter(l=>l.room_id?l.room_id===roomId:belongs([l.x,l.y])),entities:(floor.entities||[]).filter(e=>ids.has(e.entity)||belongs([e.x,e.y])),ceiling_slopes:ceilings};
}

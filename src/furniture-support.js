import {floorDimensions} from './scene.js';

const surfaces=new Set(['desk','dining_table','side_table','tv_bench','bookshelf','display_cabinet','island','kitchen_island','kitchen_unit']);
const portable=new Set(['printer_3d','computer','ultrawide_monitor','tv','speaker','plant','picture','lamp']);
function contains(floor,surface,item){
  const d=floorDimensions(floor),angle=-(surface.rotation||0)*Math.PI/180;
  const x=(item.x-surface.x)*d.width/100,y=(item.y-surface.y)*d.depth/100;
  return Math.abs(x*Math.cos(angle)-y*Math.sin(angle))<=surface.width/2&&Math.abs(x*Math.sin(angle)+y*Math.cos(angle))<=surface.depth/2;
}
export function placeOnSurface(floor,item){
  if(!portable.has(item.type))return;
  const surface=(floor.objects||[]).filter(o=>o!==item&&surfaces.has(o.type)&&!['wall','glass','extractor','cooker'].includes(o.variant)&&contains(floor,o,item)).sort((a,b)=>(b.elevation_m||0)+b.height-(a.elevation_m||0)-a.height)[0];
  if(surface){item.support_id=surface.id;item.elevation_m=(surface.elevation_m||0)+surface.height;}
  else if(item.support_id){delete item.support_id;item.elevation_m=0;}
}
export function updateFurniture(floor,item,changes){
  const before={...item};Object.assign(item,changes);
  if('elevation_m' in changes&&Object.keys(changes).length===1)delete item.support_id;
  else if('x' in changes||'y' in changes)placeOnSurface(floor,item);
  const dims=floorDimensions(floor),angle=((item.rotation||0)-(before.rotation||0))*Math.PI/180;
  for(const child of floor.objects||[])if(child.support_id===item.id){
    const x=(child.x-before.x)*dims.width/100,y=(child.y-before.y)*dims.depth/100;
    child.x=Math.max(0,Math.min(100,item.x+(x*Math.cos(angle)-y*Math.sin(angle))/dims.width*100));
    child.y=Math.max(0,Math.min(100,item.y+(x*Math.sin(angle)+y*Math.cos(angle))/dims.depth*100));
    child.rotation=((child.rotation||0)+angle*180/Math.PI+360)%360;
    child.elevation_m=(item.elevation_m||0)+item.height;
  }
}
export function removeFurniture(floor,item){
  for(const child of floor.objects||[])if(child.support_id===item.id){delete child.support_id;child.elevation_m=0;}
  floor.objects=floor.objects.filter(o=>o!==item);
}

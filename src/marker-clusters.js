import {insidePolygon} from './diorama-spread.js';

/**
 * Groups a floor's light markers by room for the whole-house view, where every storey is
 * drawn small. A light belongs to the room that lists it, else to the room it stands in.
 * Returns [{room, items, x, y}] for rooms with at least two lights; `x` and `y` are the
 * middle of the group. Lights alone in a room, or outside every room, are left out.
 */
export function clusterLights(floor){
  const rooms=(floor.rooms||[]).filter(room=>room.points?.length),groups=new Map();
  for(const item of (floor.entities||[]).filter(e=>e.entity?.startsWith('light.'))){
    const room=rooms.find(r=>(r.lights||[]).includes(item.entity))||rooms.find(r=>insidePolygon(item.x,item.y,r.points));
    if(room)groups.set(room,[...(groups.get(room)||[]),item]);
  }
  const middle=(items,axis)=>items.reduce((sum,item)=>sum+item[axis],0)/items.length;
  return [...groups].filter(([,items])=>items.length>1).map(([room,items])=>({room,items,x:middle(items,'x'),y:middle(items,'y')}));
}

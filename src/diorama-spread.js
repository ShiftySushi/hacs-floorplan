import {ELEVATION} from './diorama-cutaway.js';

/** Even-odd test of a point against a polygon of [x, y] pairs. */
export function insidePolygon(x,y,points){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}

/** Horizontal unit vector [x, z] pointing to screen right for a camera at `towards`. */
export const acrossView=towards=>[towards[1],-towards[0]];

/**
 * How far one storey must slide along `acrossView` before it stops hiding the storey below.
 * Seen from above, a storey hides whatever lies `lean` behind it one `pitch` down, so
 * sliding one way (`sign` 1 is screen right) clears it much sooner than the other.
 * `footprint` is the largest storey's [width, depth] in metres.
 */
export function spreadClearance(towards,pitch,footprint,sign,elevation=ELEVATION){
  const across=acrossView(towards),reach=pitch/Math.tan(elevation);
  return Math.min(...[0,1].map(axis=>{const step=across[axis]*sign,offset=towards[axis]*reach,size=footprint[axis];return step?Math.max((size+offset)/step,(-size+offset)/step):Infinity;}).filter(s=>s>0));
}

/**
 * Sideways offsets ([x, z] metres, lowest storey first) for the stepped row. `order`
 * `compact` takes the shorter slide so the floors nest closely; `ground-left` always
 * steps upwards to the right, so the row reads lowest storey first.
 */
export function spreadLayout({towards,pitch,footprint,count,gap=2,order='compact',elevation=ELEVATION}){
  const direction=order==='ground-left'||spreadClearance(towards,pitch,footprint,1,elevation)<=spreadClearance(towards,pitch,footprint,-1,elevation)?1:-1;
  const stride=count>1?(spreadClearance(towards,pitch,footprint,direction,elevation)+gap)*direction:0,across=acrossView(towards);
  return {direction,stride,offsets:Array.from({length:count},(_,index)=>{const steps=stride*(index-(count-1)/2);return [across[0]*steps,across[1]*steps];})};
}

/**
 * In the stack, a point is covered when its sight line to the camera meets the floor of a
 * storey above. `point` is [x, y, z] in metres on a storey whose floor is at `base`;
 * `above` lists the storeys over it as {base, width, depth, rooms}, `base` being the
 * walking surface over a slab `slab` thick.
 */
export function coveredPoint(point,base,above,towards,{slab=0,elevation=ELEVATION}={}){
  for(const storey of above){
    const rise=storey.base-slab-(base+point[1]);if(rise<=0)continue;
    const reach=rise/Math.tan(elevation),x=((point[0]+towards[0]*reach)/storey.width+.5)*100,y=((point[2]+towards[1]*reach)/storey.depth+.5)*100;
    if((storey.rooms||[]).some(room=>insidePolygon(x,y,room.points)))return true;
  }
  return false;
}

import {floorDimensions} from './scene.js';

// True isometric: every horizontal axis foreshortens equally.
export const ELEVATION=Math.atan(Math.SQRT1_2);
export const KERB=.1,LOW=1.05;
// Solid wall shorter than this is a nib rather than a wall in its own right.
const NIB=1;

const inside=(x,y,points)=>{let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};

/** Things fixed to a wall rather than standing on the floor or on furniture. */
export function isHung(object){
  if(['picture','pegboard','nanoleaf_panels','wall_light','radiator'].includes(object.type))return true;
  if(object.type==='kitchen_unit')return ['wall','glass','extractor'].includes(object.variant);
  if(object.type==='extractor_fan')return object.variant==='wall';
  return object.variant==='sword';
}

/** Footprint sample points in floor-centred metres: corners, edge midpoints and centre. */
function footprint(object,metre){
  const [cx,cz]=metre([object.x,object.y]),w=(object.width||1)/2,d=(object.depth||.6)/2,turn=-(object.rotation||0)*Math.PI/180,cos=Math.cos(turn),sin=Math.sin(turn),points=[];
  for(const x of [-w,0,w])for(const z of [-d,0,d])points.push([cx+x*cos+z*sin,cz-x*sin+z*cos]);
  return points;
}

/** Split a wall into solid rectangles; openings are real holes, not painted doors. */
export function wallSections(length, height, openings = []) {
  const holes = openings.map(o => ({x0: Math.max(0, length*(o.offset ?? .5)-(o.width || .9)/2), x1: Math.min(length,length*(o.offset ?? .5)+(o.width || .9)/2), y0: Math.max(0,o.type==='window'?(o.sill ?? .9):0), y1: Math.min(height,(o.type==='window'?(o.sill ?? .9):0)+(o.height || (o.type==='window'?1.2:2.1)))})).filter(o=>o.x1>o.x0&&o.y1>o.y0);
  const xs=[...new Set([0,length,...holes.flatMap(o=>[o.x0,o.x1])])].sort((a,b)=>a-b);
  const ys=[...new Set([0,height,...holes.flatMap(o=>[o.y0,o.y1])])].sort((a,b)=>a-b), result=[];
  for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++){const x=(xs[i-1]+xs[i])/2,y=(ys[j-1]+ys[j])/2;if(!holes.some(o=>x>o.x0&&x<o.x1&&y>o.y0&&y<o.y1))result.push({x,y,width:xs[i]-xs[i-1],height:ys[j]-ys[j-1]});}
  return result;
}

/**
 * Whether a sloping ceiling would come between the camera and the room. Sight lines are
 * walked from points on the floor, and at table height, of every room towards the camera;
 * a slope that any of them meets has to be drawn see-through. A slope that falls away
 * from the viewer, down to a far wall, meets none and can stand as part of the backdrop.
 * `slope.vertices` are four [x, y, height] points: floor-local percentages and metres.
 */
export function slopeHides(floor,slope,towards,{elevation=ELEVATION,grid=12}={}){
  const {width,depth}=floorDimensions(floor),rooms=floor.rooms||[],v=slope.vertices.map(([x,y,h])=>[(x/100-.5)*width,h,(y/100-.5)*depth]);
  const d=[towards[0]*Math.cos(elevation),Math.sin(elevation),towards[1]*Math.cos(elevation)],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  // Möller–Trumbore, for a ray leaving `origin` towards the camera.
  const meets=(origin,a,b,c)=>{const e1=sub(b,a),e2=sub(c,a),p=cross(d,e2),det=dot(e1,p);if(Math.abs(det)<1e-9)return false;const s=sub(origin,a),u=dot(s,p)/det;if(u<0||u>1)return false;const q=cross(s,e1),w=dot(d,q)/det;return w>=0&&u+w<=1&&dot(e2,q)/det>.01;};
  for(let i=0;i<=grid;i++)for(let j=0;j<=grid;j++){
    const x=100*i/grid,y=100*j/grid;if(!rooms.some(room=>inside(x,y,room.points)))continue;
    for(const height of [0,.9]){const origin=[(x/100-.5)*width,height,(y/100-.5)*depth];if(meets(origin,v[0],v[1],v[2])||meets(origin,v[0],v[2],v[3]))return true;}
  }
  return false;
}

/**
 * Decide every wall's height for one fixed viewing direction.
 *
 * Only three heights are ever used, so the cut reads as deliberate:
 *  - outside walls on the far side stand full height as the backdrop;
 *  - outside walls on the near side drop to a kerb;
 *  - walls between rooms stop at LOW, and drop to a kerb as a whole run when
 *    LOW would still hide the foot of something standing behind them.
 * Pieces of one straight wall share a decision, and short nibs never stand
 * taller than the walls they join.
 * `towards` is the horizontal unit vector [x, z] pointing at the camera.
 */
export function planCutaway(floor,towards,{elevation=ELEVATION,low=LOW,tolerance=.15}={}){
  const {width,depth}=floorDimensions(floor),rooms=floor.rooms||[],metre=p=>[(p[0]/100-.5)*width,(p[1]/100-.5)*depth];
  const inRoom=(x,z)=>rooms.some(room=>inside((x/width+.5)*100,(z/depth+.5)*100,room.points)),rise=Math.tan(elevation);
  const standing=(floor.objects||[]).filter(o=>!isHung(o)&&!['rug','stairs','tv_lightstrip'].includes(o.type)&&(o.height||.8)>.25).map(o=>({object:o,base:o.elevation_m||0,points:footprint(o,metre)}));
  const plans=[];
  for(const wall of floor.walls||[]){
    if(!wall.a||!wall.b)continue;const a=metre(wall.a),b=metre(wall.b),length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<.01)continue;
    const along=[(b[0]-a[0])/length,(b[1]-a[1])/length],normal=[-along[1],along[0]],middle=[(a[0]+b[0])/2,(a[1]+b[1])/2],thickness=wall.thickness||.15,reach=thickness/2+.2;
    const front=inRoom(middle[0]+normal[0]*reach,middle[1]+normal[1]*reach),behind=inRoom(middle[0]-normal[0]*reach,middle[1]-normal[1]*reach);
    // Local +Z of the built wall is `normal`; `inward` says which side the room is on.
    const inward=front&&!behind?1:behind&&!front?-1:0,facing=normal[0]*towards[0]+normal[1]*towards[1],full=wall.height||2.4;
    const plan={wall,a,b,length,along,normal,inward,full,thickness,facing,blocked:[]};plans.push(plan);
    plan.role=inward!==0?(facing*-inward>.15?'near':'far'):front&&behind?'partition':'free';
    plan.height=plan.role==='near'?KERB:plan.role==='partition'?Math.min(full,low):full;
  }
  // Walk each sight line from a footprint point towards the camera and see whether it
  // meets the wall, within its length, below `height`.
  function hidden(plan,height){
    const side=Math.sign(plan.facing)||1,approach=Math.abs(plan.facing),found=[];if(approach<.05)return found;
    for(const {object,base,points} of standing)for(const [x,z] of points){
      const distance=-((x-plan.a[0])*plan.normal[0]+(z-plan.a[1])*plan.normal[1])*side-plan.thickness/2;if(distance<=0)continue;
      const travel=distance/approach,at=(x+towards[0]*travel-plan.a[0])*plan.along[0]+(z+towards[1]*travel-plan.a[1])*plan.along[1];
      if(at>=-.02&&at<=plan.length+.02&&base+rise*travel<height-tolerance){found.push(object.id);break;}
    }
    return found;
  }
  for(const plan of plans){
    if(plan.role==='partition')plan.blocked=hidden(plan,plan.height);
    // An outside wall on the far side can still stand in front of a room where the
    // building steps in and out; it then comes down like any partition.
    else if(plan.role==='far'&&hidden(plan,plan.full).length){plan.stepped=true;plan.height=Math.min(plan.full,low);plan.blocked=hidden(plan,plan.height);if(plan.blocked.length)plan.height=KERB;}
  }
  // A straight wall is often stored as several pieces (door heads, jambs, returns). Its
  // height may only change where another wall meets it, never part-way along a plain
  // stretch, so pieces joined end to end with no junction between them share one decision.
  const onto=(end,plan)=>{const u=(end[0]-plan.a[0])*plan.along[0]+(end[1]-plan.a[1])*plan.along[1],off=Math.abs((end[0]-plan.a[0])*plan.normal[0]+(end[1]-plan.a[1])*plan.normal[1]);return off<.16&&u>0&&u<plan.length;};
  const near=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1])<.16,parallel=(p,q)=>Math.abs(p.along[0]*q.along[1]-p.along[1]*q.along[0])<.04;
  const partitions=plans.filter(plan=>plan.role==='partition'),group=new Map(partitions.map(plan=>[plan,plan])),find=plan=>{while(group.get(plan)!==plan)plan=group.get(plan);return plan;};
  for(const [i,p] of partitions.entries())for(const q of partitions.slice(i+1)){
    if(!parallel(p,q))continue;
    const joint=[p.a,p.b].find(end=>near(end,q.a)||near(end,q.b));if(!joint)continue;
    if(plans.some(other=>other!==p&&other!==q&&!parallel(other,p)&&(near(other.a,joint)||near(other.b,joint))))continue;
    group.set(find(p),find(q));
  }
  for(const plan of partitions){const run=find(plan);if(run!==plan)run.blocked.push(...plan.blocked);}
  for(const plan of partitions){const run=find(plan);plan.run=run;if(run.blocked.length){plan.height=Math.min(plan.height,KERB);if(plan!==run)plan.blocked=[...new Set(run.blocked)];}}
  // A short nib (a jamb, a return, the posts left either side of a doorway) must not stand proud of the walls it joins, or it
  // reads as a stray post. It takes the lowest height among the walls touching it.
  const runLength=new Map();for(const plan of partitions)runLength.set(plan.run,(runLength.get(plan.run)||0)+plan.length-(plan.wall.openings||[]).filter(o=>o.type==='door').reduce((sum,o)=>sum+(o.width||.9),0));
  // A nib joined to another nib follows it down, so the rule is applied until nothing
  // changes. Heights only ever fall, so the result does not depend on storage order.
  const nibs=partitions.filter(plan=>runLength.get(plan.run)<NIB).map(plan=>({plan,touching:plans.filter(other=>other.run!==plan.run&&other.role!=='far'&&[plan.a,plan.b].some(end=>near(end,other.a)||near(end,other.b)||onto(end,other)))}));
  for(let changed=true;changed;){
    changed=false;
    for(const {plan,touching} of nibs){
      const height=Math.min(plan.height,...touching.map(other=>other.height),...partitions.filter(other=>other.run===plan.run).map(other=>other.height));
      if(height<plan.height){plan.height=height;changed=true;}
    }
  }
  return plans;
}

import * as THREE from 'three';

// Materials belong to one model: each view patches and disposes its own.
function palette(){const materials=new Map();return colour=>{if(!materials.has(colour))materials.set(colour,new THREE.MeshLambertMaterial({color:colour}));return materials.get(colour);};}
function box(group,w,h,d,x,y,z,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y+h/2,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;}
// A member running up the pitch line, `lift` above the nosings.
function raked(group,thickness,height,x,run,rise,lift,colour){
  const mesh=box(group,thickness,height,Math.hypot(run,rise),x,0,0,colour);mesh.position.set(x,rise/2+lift,0);mesh.rotation.x=-Math.atan2(rise,run);return mesh;
}

/**
 * A straight flight that climbs exactly one storey: it starts on this floor and
 * lands flush with the one above. Local +Z is uphill, matching the catalogue.
 */
export function stairFlight(object,rise,{open=false}={}){
  const group=new THREE.Group(),mat=palette(),paint=mat('#f3efe6'),oak=mat('#a8774a'),dark=mat('#7d5534'),w=object.width||.9,run=object.depth||2.5,steps=Math.max(8,Math.round(rise/.19)),going=run/steps,riser=rise/steps;
  for(let i=0;i<steps;i++){
    const z=-run/2+going*(i+.5),top=riser*(i+1);
    box(group,w-.07,.04,going+.025,0,top-.04,z+.012,oak);
    // Open flights keep a sawtooth soffit so the storey below shows through the well.
    if(open)box(group,w-.09,riser+.1,.03,0,top-riser-.1,z+going/2-.015,paint);
    else box(group,w-.09,top-.04,going,0,0,z,paint);
  }
  for(const side of [-1,1])raked(group,.035,.3,side*(w/2-.0175),run,rise,-.05,paint);
  if(object.banister!==false){
    const x=-w/2+.03;
    for(const [z,y] of [[-run/2-.04,0],[run/2+.04,rise]])box(group,.09,1.12,.09,x,y,z,paint);
    for(let i=0;i<steps;i++)box(group,.022,.86,.022,x,riser*(i+1),-run/2+going*(i+.5),paint);
    raked(group,.06,.055,x,run+.08,rise,.93+riser/2,dark);
  }
  group.rotation.y=-(object.rotation||0)*Math.PI/180;return group;
}

/** Guard rail around the opening where a flight from below arrives; the uphill end stays open. */
export function stairGuard(object){
  const group=new THREE.Group(),mat=palette(),paint=mat('#f3efe6'),dark=mat('#7d5534'),w=(object.width||.9)+.1,run=(object.depth||2.5)+.1;
  const rail=(length,x,z,turn)=>{const part=new THREE.Group();part.position.set(x,0,z);part.rotation.y=turn;group.add(part);
    box(part,length,.055,.06,0,.93,0,dark);for(let i=0;i<=Math.round(length/.11);i++)box(part,.022,.93,.022,-length/2+length*i/Math.round(length/.11),0,0,paint);
    for(const end of [-1,1])box(part,.09,1.1,.09,end*length/2,0,0,paint);};
  for(const side of [-1,1])rail(run,side*w/2,0,Math.PI/2);rail(w,0,-run/2,0);
  group.rotation.y=-(object.rotation||0)*Math.PI/180;return group;
}

/** Plan rectangle of a flight in floor-centred metres, shrunk so it can be cut cleanly from a slab. */
export function stairFootprint(object,position,inset=.06){
  const w=(object.width||.9)/2-inset,run=(object.depth||2.5)/2-inset,centre=position([object.x,object.y]),turn=-(object.rotation||0)*Math.PI/180;
  return [[-w,-run],[w,-run],[w,run],[-w,run]].map(([x,z])=>new THREE.Vector2(centre.x+x*Math.cos(turn)+z*Math.sin(turn),centre.z-x*Math.sin(turn)+z*Math.cos(turn)));
}

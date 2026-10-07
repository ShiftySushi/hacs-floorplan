import * as THREE from 'three';
import {floorDimensions} from './scene.js';
import {wallSections} from './plan3d.js';
import {planks,tiles,fabric} from './diorama-textures.js';
import {planCutaway,LOW} from './diorama-cutaway.js';

const inside=(x,y,points)=>{let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
export const SLAB=.28;

/**
 * Floors and walls for one storey, cut for a fixed camera. Wall heights come
 * from planCutaway, which explains the three levels used.
 * `holes` are plan polygons (floor-centred metres) cut from the slab for stairs.
 */
export function buildShell(floor,towardsCamera,{holes=[],partition=LOW}={}){
  const group=new THREE.Group(),{width,depth}=floorDimensions(floor),rooms=floor.rooms||[];
  const position=(p,y=0)=>new THREE.Vector3((p[0]/100-.5)*width,y,(p[1]/100-.5)*depth);
  const paint=new THREE.MeshLambertMaterial({color:'#eadfcb'}),cap=new THREE.MeshBasicMaterial({color:'#8f8a84'}),trim=new THREE.MeshLambertMaterial({color:'#f6f2e8'}),section=new THREE.MeshLambertMaterial({color:'#9a8f82'});
  // The slab's cut edge is a section through the building, not a lit surface.
  section.userData.noLightmap=true;
  const glass=new THREE.MeshBasicMaterial({color:'#31507f',transparent:true,opacity:.32,depthWrite:false,side:THREE.DoubleSide});
  const box=(w,h,d,x,y,z,material,parent)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y+h/2,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  const textures=[];
  for(const room of rooms){
    if(!room.points?.length)continue;
    const shape=new THREE.Shape(room.points.map(p=>new THREE.Vector2((p[0]/100-.5)*width,-(p[1]/100-.5)*depth)));
    for(const hole of holes)if(hole.every(v=>inside((v.x/width+.5)*100,(v.y/depth+.5)*100,room.points)))shape.holes.push(new THREE.Path(hole.map(v=>new THREE.Vector2(v.x,-v.y))));
    const surface=room.material||'wood',colour=room.colour||({tile:'#c8d2d1',carpet:'#c4ada2'}[surface]||'#cbb89a');
    const map=surface==='tile'?tiles(colour):surface==='carpet'?fabric(colour):planks(colour);map.repeat.setScalar(surface==='tile'?1/.9:surface==='carpet'?2:1/1.6);textures.push(map);
    const slab=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:SLAB,bevelEnabled:false}),[new THREE.MeshLambertMaterial({map,color:new THREE.Color().setScalar(1-.2*THREE.MathUtils.smoothstep(new THREE.Color(colour).getHSL({}).l,.45,.75))}),section]);
    slab.rotation.x=-Math.PI/2;slab.position.y=-SLAB;slab.receiveShadow=true;group.add(slab);
  }
  const walls=[];
  for(const plan of planCutaway(floor,[towardsCamera.x,towardsCamera.z],{low:partition})){
    const {wall,length,inward,height,full}=plan,a=new THREE.Vector3(plan.a[0],0,plan.a[1]),b=new THREE.Vector3(plan.b[0],0,plan.b[1]),thickness=wall.thickness||.15,cut=height<full;
    const holder=new THREE.Group();holder.position.copy(a);holder.rotation.y=-Math.atan2(plan.along[1],plan.along[0]);group.add(holder);
    // Below door-head height only doorways stay open; a kerb never shows window holes.
    const openings=cut?(wall.openings||[]).filter(o=>o.type==='door'):wall.openings||[];
    for(const r of wallSections(length,height,openings))box(r.width,r.height,thickness,r.x,r.y-r.height/2,0,[paint,paint,cap,paint,paint,paint],holder);
    // Square posts close the corners where centre-line walls meet.
    for(const end of [0,length])if(!openings.some(o=>Math.abs((o.offset??.5)*length-end)<=(o.width||.9)/2+.001))box(thickness,height,thickness,end,0,0,[paint,paint,cap,paint,paint,paint],holder);
    walls.push({wall,a,b,cut,height,role:plan.role});
    if(height<full)continue;
    for(const r of wallSections(length,.09,(wall.openings||[]).filter(o=>o.type==='door')))box(r.width,r.height,thickness+.03,r.x,0,0,trim,holder);
    for(const o of wall.openings||[]){
      const x=length*(o.offset??.5),w=o.width||.9,side=inward||1;
      if(o.type==='door'){
        const h=o.height||2.1;for(const s of [-1,1])box(.05,h,thickness+.04,x+s*w/2,0,0,trim,holder);box(w+.1,.05,thickness+.04,x,h,0,trim,holder);
        if(o.frame==='french'){box(.04,h,.05,x,0,0,trim,holder);const pane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),glass);pane.position.set(x,h/2,0);pane.layers.set(1);holder.add(pane);continue;}
        const hinge=new THREE.Group();hinge.position.set(x-w/2+.03,0,side*thickness/2);hinge.rotation.y=-side*.62;holder.add(hinge);
        const leaf=w-.06;box(leaf,h-.02,.04,leaf/2,.01,0,trim,hinge);
        for(const [y,panel] of [[.18,h*.34],[h*.48,h*.4]])box(leaf*.68,panel,.052,leaf/2,y,0,paint,hinge);
        const handle=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.11,10),new THREE.MeshLambertMaterial({color:'#b79a5b'}));handle.rotation.z=Math.PI/2;handle.position.set(leaf-.1,1,side*.04);hinge.add(handle);
      }else{
        const h=o.height||1.2,sill=o.sill??.9,frame=.045;
        for(const s of [-1,1])box(frame,h,thickness+.02,x+s*(w/2-frame/2),sill,0,trim,holder);
        for(const y of [sill,sill+h-frame])box(w,frame,thickness+.02,x,y,0,trim,holder);
        for(let i=1;i<Math.round(w/.7);i++)box(.035,h,.05,x-w/2+w*i/Math.round(w/.7),sill,0,trim,holder);
        box(w+.12,.03,thickness/2+.09,x,sill-.03,side*(thickness/4+.045),trim,holder);
        const pane=new THREE.Mesh(new THREE.PlaneGeometry(w-frame*2,h-frame*2),glass);pane.position.set(x,sill+h/2,0);pane.layers.set(1);holder.add(pane);
        if(o.blinds)for(let i=0;i<Math.round(h*.42/.05);i++)box(w-frame*2-.02,.008,.04,x,sill+h-frame-.03-i*.05,side*(thickness/2-.03),trim,holder).rotation.x=.5;
      }
    }
  }
  return {group,position,walls,width,depth,dispose(){for(const texture of textures)texture.dispose();}};
}

/** Distance from a plan position to the nearest wall, with that wall. */
export function nearestWall(point,walls){
  let best={distance:Infinity};
  for(const entry of walls){const ab=entry.b.clone().sub(entry.a),t=Math.max(0,Math.min(1,point.clone().sub(entry.a).dot(ab)/ab.lengthSq())),distance=entry.a.clone().addScaledVector(ab,t).setY(0).distanceTo(point.clone().setY(0));if(distance<best.distance)best={...entry,distance};}
  return best;
}

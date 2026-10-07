import * as THREE from 'three';
import {floorDimensions} from './scene.js';
import {planks,tiles,fabric} from './diorama-textures.js';
import {planCutaway,slopeHides,wallSections,LOW,KERB} from './diorama-cutaway.js';

const inside=(x,y,points)=>{let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
export const SLAB=.28;
// Leaf angles in radians: the resting pose of an unmonitored door, and a door reported open.
export const AJAR=.62,OPEN=1.4;

/**
 * Floors and walls for one storey, cut for a fixed camera. Wall heights come
 * from planCutaway, which explains the three levels used.
 * `holes` are plan polygons (floor-centred metres) cut from the slab for stairs.
 * `doors` lists the hinged leaves bound to a contact sensor as {opening, hinge, side}.
 * `windows` lists outside windows as {opening, wall, width, point, blind?, centre?}; `blind`
 * is the slat group of a drawn blind and `centre` its window's middle in storey metres.
 * Rooflights in `floor.ceiling_slopes` are listed too, with `rooflight` set.
 */
export function buildShell(floor,towardsCamera,{holes=[],partition=LOW}={}){
  const group=new THREE.Group(),{width,depth}=floorDimensions(floor),rooms=floor.rooms||[];
  const position=(p,y=0)=>new THREE.Vector3((p[0]/100-.5)*width,y,(p[1]/100-.5)*depth);
  const paint=new THREE.MeshLambertMaterial({color:'#eadfcb'}),cap=new THREE.MeshBasicMaterial({color:'#8f8a84'}),trim=new THREE.MeshLambertMaterial({color:'#f6f2e8'}),section=new THREE.MeshLambertMaterial({color:'#9a8f82'});
  // The slab's cut edge is a section through the building, not a lit surface.
  section.userData.noLightmap=true;
  const glass=new THREE.MeshBasicMaterial({color:'#31507f',transparent:true,opacity:.32,depthWrite:false,side:THREE.DoubleSide});
  const box=(w,h,d,x,y,z,material,parent)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y+h/2,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  const textures=[],mirror=new THREE.MeshLambertMaterial({color:'#b9d3dc'}),glint=new THREE.MeshBasicMaterial({color:'#eef8fb'});
  for(const room of rooms){
    if(!room.points?.length)continue;
    const shape=new THREE.Shape(room.points.map(p=>new THREE.Vector2((p[0]/100-.5)*width,-(p[1]/100-.5)*depth)));
    for(const hole of holes)if(hole.every(v=>inside((v.x/width+.5)*100,(v.y/depth+.5)*100,room.points)))shape.holes.push(new THREE.Path(hole.map(v=>new THREE.Vector2(v.x,-v.y))));
    const surface=room.material||'wood',colour=room.colour||({tile:'#c8d2d1',carpet:'#c4ada2'}[surface]||'#cbb89a');
    const map=surface==='tile'?tiles(colour):surface==='carpet'?fabric(colour):planks(colour);map.repeat.setScalar(surface==='tile'?1/.9:surface==='carpet'?2:1/1.6);textures.push(map);
    const slab=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:SLAB,bevelEnabled:false}),[new THREE.MeshLambertMaterial({map,color:new THREE.Color().setScalar(1-.2*THREE.MathUtils.smoothstep(new THREE.Color(colour).getHSL({}).l,.45,.75))}),section]);
    slab.rotation.x=-Math.PI/2;slab.position.y=-SLAB;slab.receiveShadow=true;group.add(slab);
  }
  const walls=[],doors=[],windows=[];
  for(const plan of planCutaway(floor,[towardsCamera.x,towardsCamera.z],{low:partition})){
    const {wall,length,inward,height,full}=plan,a=new THREE.Vector3(plan.a[0],0,plan.a[1]),b=new THREE.Vector3(plan.b[0],0,plan.b[1]),thickness=wall.thickness||.15,cut=height<full;
    const holder=new THREE.Group();holder.position.copy(a);holder.rotation.y=-Math.atan2(plan.along[1],plan.along[0]);group.add(holder);
    // Below door-head height only doorways stay open; a kerb never shows window holes.
    const openings=cut?(wall.openings||[]).filter(o=>o.type==='door'):wall.openings||[];
    for(const r of wallSections(length,height,openings))box(r.width,r.height,thickness,r.x,r.y-r.height/2,0,[paint,paint,cap,paint,paint,paint],holder);
    // Square posts close the corners where centre-line walls meet.
    for(const end of [0,length])if(!openings.some(o=>Math.abs((o.offset??.5)*length-end)<=(o.width||.9)/2+.001))box(thickness,height,thickness,end,0,0,[paint,paint,cap,paint,paint,paint],holder);
    walls.push({wall,a,b,cut,height,role:plan.role});
    // Fitted wardrobe fronts follow their wall: full doors where it stands, the lower part
    // of them where it is cut to a partition, and nothing on a kerb.
    const fronts=wall.wardrobe_doors;
    if(fronts&&height>KERB){
      const top=Math.min(height,full-.05),leaf=length/fronts.count,z=fronts.side*(thickness/2+.016),mirrored=fronts.finish==='mirror';
      for(let i=0;i<fronts.count;i++){
        const at=leaf*(i+.5),w=leaf-.018;
        box(w,top-.07,.028,at,.07,z,mirrored?section:trim,holder);box(w-.055,top-.14,.012,at,.105,z+fronts.side*.02,mirrored?mirror:paint,holder);
        // A diagonal glint keeps a mirror reading as glass without an environment to reflect.
        if(mirrored)box(.022,(top-.14)*.7,.004,at,.105+(top-.14)*.15,z+fronts.side*.028,glint,holder).rotation.z=-.12;
        if(top>1.2)box(.018,.22,.045,at+(i%2?-1:1)*(w/2-.055),.93,z+fronts.side*.04,section,holder);
      }
    }
    // Daylight comes in through every outside window, drawn or cut away. `point` is where
    // it lands, a little inside the room, as a floor-local percentage.
    for(const o of inward?wall.openings||[]:[])if(o.type!=='door'||o.frame==='french'){
      const along=length*(o.offset??.5),reach=thickness/2+.9,x=a.x+plan.along[0]*along+plan.normal[0]*inward*reach,z=a.z+plan.along[1]*along+plan.normal[1]*inward*reach;
      windows.push({opening:o,wall,width:o.width||.9,point:[(x/width+.5)*100,(z/depth+.5)*100]});
    }
    if(height<full)continue;
    for(const r of wallSections(length,.09,(wall.openings||[]).filter(o=>o.type==='door')))box(r.width,r.height,thickness+.03,r.x,0,0,trim,holder);
    for(const o of wall.openings||[]){
      const x=length*(o.offset??.5),w=o.width||.9,side=inward||1;
      if(o.type==='door'){
        const h=o.height||2.1;for(const s of [-1,1])box(.05,h,thickness+.04,x+s*w/2,0,0,trim,holder);box(w+.1,.05,thickness+.04,x,h,0,trim,holder);
        if(o.frame==='french'){box(.04,h,.05,x,0,0,trim,holder);const pane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),glass);pane.position.set(x,h/2,0);pane.layers.set(1);holder.add(pane);continue;}
        const hinge=new THREE.Group();hinge.position.set(x-w/2+.03,0,side*thickness/2);hinge.rotation.y=-side*AJAR;holder.add(hinge);
        // A door with a contact sensor swings with it, so its leaf stays a separate mesh.
        if(o.contact_entity){hinge.userData.live=true;doors.push({opening:o,hinge,side});}
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
        if(o.blinds){
          // Slats hang from the head of the window in their own group, so the renderer can
          // draw the blind down or gather it up by scaling that group.
          const blind=new THREE.Group(),drop=h-frame*2-.02;blind.position.set(x,sill+h-frame-.01,side*(thickness/2-.03));blind.userData.live=true;holder.add(blind);
          for(let i=0;i<Math.round(drop/.05);i++)box(w-frame*2-.02,.008,.04,0,-.02-i*.05,0,trim,blind).rotation.x=.5;
          const entry=windows.find(entry=>entry.opening===o);if(entry){holder.updateMatrixWorld(true);entry.blind=blind;entry.centre=holder.localToWorld(new THREE.Vector3(x,sill+h/2,0));}
        }
      }
    }
  }
  // A sloping ceiling stands solid only where it cannot come between the viewer and the
  // room; otherwise, and for any rooflight, it is see-through on the glow layer.
  for(const slope of floor.ceiling_slopes||[]){
    const rooflight=slope.type==='rooflight',clear=rooflight||slopeHides(floor,slope,[towardsCamera.x,towardsCamera.z]);
    const geometry=new THREE.BufferGeometry().setFromPoints(slope.vertices.map(([x,y,h])=>position([x,y],h)));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,rooflight?glass:new THREE.MeshLambertMaterial({color:'#efe8d8',side:THREE.DoubleSide,...(clear?{transparent:true,opacity:.22,depthWrite:false}:{})}));
    mesh.userData.ceiling=clear?'clear':'solid';if(clear)mesh.layers.set(1);group.add(mesh);
    if(rooflight){const centre=slope.vertices.reduce((sum,p)=>[sum[0]+p[0]/4,sum[1]+p[1]/4],[0,0]),span=slope.vertices.map(([x,y])=>position([x,y]));windows.push({opening:{id:slope.id},wall:{id:'rooflight'},width:span[0].distanceTo(span[2])/2,point:centre,rooflight:true});}
  }
  return {group,position,walls,doors,windows,width,depth,dispose(){for(const texture of textures)texture.dispose();}};
}

/** Distance from a plan position to the nearest wall, with that wall. */
export function nearestWall(point,walls){
  let best={distance:Infinity};
  for(const entry of walls){const ab=entry.b.clone().sub(entry.a),t=Math.max(0,Math.min(1,point.clone().sub(entry.a).dot(ab)/ab.lengthSq())),distance=entry.a.clone().addScaledVector(ab,t).setY(0).distanceTo(point.clone().setY(0));if(distance<best.distance)best={...entry,distance};}
  return best;
}

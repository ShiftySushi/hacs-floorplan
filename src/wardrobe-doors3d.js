import * as THREE from 'three';

// Door fronts attach to a solid built-in volume in the wall's local coordinates.
export function wardrobeDoors(parent,wall,length){
  const front=wall.wardrobe_doors;if(!front)return [];
  const meshes=[],height=(wall.height || 2.4)-.12,side=front.side;
  const depth=(wall.thickness || .15)/2,leaf=length/front.count,mirrored=front.finish==='mirror';
  const box=(w,h,d,x,y,z,colour,mirror=false)=>{
    const material=new THREE.MeshStandardMaterial({color:colour,metalness:mirror?.45:0,roughness:mirror?.08:.55});
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,side*z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);meshes.push(mesh);return mesh;
  };
  for(let i=0;i<front.count;i++){
    const x=leaf*(i+.5),y=height/2+.07,width=leaf-.018;
    box(width,height,.028,x,y,depth+.018,mirrored?'#8b969b':'#e8e3d7');
    box(width-.055,height-.07,.012,x,y,depth+.039,mirrored?'#b5d0db':'#f4efe5',mirrored);
    if(mirrored){
      // A cool upper reflection and diagonal glint keep the mirror legible even
      // without an environment map, including in the unlit floorplan preview.
      box(width-.06,height*.35,.004,x,y+height*.29,depth+.048,'#d5e4e8',true);
      const shine=box(.022,height*.7,.004,x,y,depth+.052,'#f4fbfc');shine.rotation.z=-.12;
    }
    const edge=i%2===0?1:-1;
    box(.018,.22,.045,x+edge*(width/2-.055),1.04,depth+.078,mirrored?'#7b858a':'#77746c');
  }
  return meshes;
}

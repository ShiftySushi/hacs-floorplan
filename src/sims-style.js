import * as THREE from 'three';

/** Original life-simulation presentation; does not change the editable house scene. */
export function createSimsStyle() {
  const gradient=new THREE.DataTexture(new Uint8Array([115,115,115,255,185,185,185,255,235,235,235,255,255,255,255,255]),4,1,THREE.RGBAFormat);
  gradient.minFilter=gradient.magFilter=THREE.NearestFilter;gradient.generateMipmaps=false;gradient.needsUpdate=true;
  function furniture(model){
    const replacements=new Map();model.traverse(node=>{if(!node.material?.isMeshStandardMaterial)return;const original=node.material;
      if(!replacements.has(original)){const material=new THREE.MeshToonMaterial({color:original.color,emissive:original.emissive,emissiveIntensity:original.emissiveIntensity,gradientMap:gradient,side:original.side});material.userData={...original.userData};replacements.set(original,material);}
      node.material=replacements.get(original);
    });replacements.forEach((_,original)=>original.dispose());
  }
  function lawn(parent,width,depth){
    const base=new THREE.Mesh(new THREE.BoxGeometry(width+1.7,.18,depth+1.7),new THREE.MeshStandardMaterial({color:'#78a365',roughness:1}));base.position.y=-.23;base.receiveShadow=true;parent.add(base);
    const skirt=new THREE.Mesh(new THREE.BoxGeometry(width+1.78,.12,depth+1.78),new THREE.MeshStandardMaterial({color:'#e5d9bf',roughness:.9}));skirt.position.y=-.38;parent.add(skirt);
    const seams=new THREE.Group();parent.add(seams);
    const lineMaterial=new THREE.LineBasicMaterial({color:'#608d52',transparent:true,opacity:.22});
    for(let x=-width/2-.75;x<width/2+.8;x+=.5){const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,-.135,-depth/2-.8),new THREE.Vector3(x,-.135,depth/2+.8)]);seams.add(new THREE.Line(geometry,lineMaterial));}
    for(let z=-depth/2-.75;z<depth/2+.8;z+=.5){const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-width/2-.8,-.135,z),new THREE.Vector3(width/2+.8,-.135,z)]);seams.add(new THREE.Line(geometry,lineMaterial));}
  }
  function presence(parent,position){
    const shape=new THREE.Mesh(new THREE.OctahedronGeometry(.16,0),new THREE.MeshStandardMaterial({color:'#69d548',emissive:'#194b10',emissiveIntensity:.25,roughness:.55,flatShading:true}));shape.scale.set(1,2.1,1);shape.position.copy(position);shape.visible=false;parent.add(shape);return shape;
  }
  return {furniture,lawn,presence,wallColour:'#f1e3c9',dispose:()=>gradient.dispose()};
}

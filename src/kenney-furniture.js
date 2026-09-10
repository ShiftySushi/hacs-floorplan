import * as THREE from 'three';
import assets from './assets/kenney-furniture.json' with {type:'json'};

/*! Selected furniture models by Kenney (https://kenney.nl/assets/furniture-kit), CC0. */
export function kenneyFurniture(object) {
  if(object.variant&&['corner','cubes','grand'].includes(object.variant))return null;
  const name={chair:'chairCushion',office_chair:'chairDesk',sofa:'loungeSofa',bed:object.variant==='single'?'bedSingle':'bedDouble',dining_table:'table',side_table:'sideTable',plant:'pottedPlant',toilet:'toilet',sink:'bathroomSink',bath:'bathtub',bookshelf:'bookcaseOpen',tv_bench:'cabinetTelevision',fridge:'kitchenFridge'}[object.type];
  const asset=assets[name];if(!asset)return null;
  const group=new THREE.Group();group.userData.asset=name;
  for(const part of asset.parts){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(asset.vertices,3));geometry.setIndex(part.indices);geometry.computeVertexNormals();
    const colour=object.colour&&['wood','carpet','fabric'].includes(part.name)?new THREE.Color(object.colour):new THREE.Color().setRGB(...part.colour,THREE.SRGBColorSpace);
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:colour,roughness:.86}));mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());
  const scale=Math.min((object.width || 1)/size.x,(object.depth || .6)/size.z,(object.height || .8)/size.y);
  for(const mesh of group.children){mesh.geometry.translate(-centre.x,-bounds.min.y,-centre.z);mesh.geometry.scale(scale,scale,scale);}
  group.rotation.y=-(object.rotation || 0)*Math.PI/180;return group;
}

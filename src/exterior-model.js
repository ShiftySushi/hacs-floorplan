import * as THREE from 'three';

export function packedExteriorModel(model,item){
  const group=new THREE.Group();
  const decode=(text,Type)=>{const bytes=Uint8Array.from(atob(text),c=>c.charCodeAt(0));return new Type(bytes.buffer);};
  for(const part of model.parts){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(Float32Array.from(decode(part.positions,Int16Array),n=>n/30000),3));
    geometry.setIndex(new THREE.BufferAttribute(decode(part.indices,Uint16Array),1));
    if(part.normals)geometry.setAttribute('normal',new THREE.Float32BufferAttribute(Float32Array.from(decode(part.normals,Int8Array),n=>n/127),3));else geometry.computeVertexNormals();
    const glass=part.material==='Glass',paint=part.material==='CAR_PAINT',material=new THREE.MeshStandardMaterial({color:paint?(item.colour || part.colour):part.colour || '#888888',roughness:glass?.15:paint?.28:.68,metalness:paint?.4:glass?.25:.12});
    const mesh=new THREE.Mesh(geometry,material);mesh.name=part.name || '';mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  group.scale.set(item.width,item.height,item.depth);group.userData.attribution=model.attribution;return group;
}

export function validateExteriorModels(models={}){
  if(!models||typeof models!=='object'||Array.isArray(models)||Object.keys(models).length>20)throw Error('Exterior models must be a dictionary of up to 20 assets');
  const base64=s=>typeof s==='string'&&s.length<=2000000&&s.length%4===0&&/^[A-Za-z0-9+/]*={0,2}$/.test(s);
  let total=0;
  for(const model of Object.values(models)){
    if(!model||!Array.isArray(model.parts)||!model.parts.length||model.parts.length>100)throw Error('Exterior models need 1–100 mesh parts');
    for(const part of model.parts){
      if(!part||!base64(part.positions)||!base64(part.indices)||(part.normals!==undefined&&!base64(part.normals)))throw Error('Invalid packed exterior mesh');
      const positions=atob(part.positions),indices=atob(part.indices),count=positions.length/6;
      if(!count||positions.length%6||!indices.length||indices.length%6||(part.normals!==undefined&&atob(part.normals).length!==count*3))throw Error('Exterior mesh attribute lengths do not match');
      for(let i=0;i<indices.length;i+=2)if((indices.charCodeAt(i)|(indices.charCodeAt(i+1)<<8))>=count)throw Error('Exterior mesh index is out of bounds');
      if(part.colour!==undefined&&!/^#[0-9a-f]{6}$/i.test(part.colour))throw Error('Invalid exterior model colour');
      total+=part.positions.length+part.indices.length+(part.normals?.length || 0);
    }
  }
  if(total>4000000)throw Error('Exterior models exceed the packed geometry budget');
}

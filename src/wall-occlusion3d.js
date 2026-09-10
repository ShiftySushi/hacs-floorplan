import * as THREE from 'three';

// A shared wall mask keeps occlusion independent of the GPU shadow-map budget.
// Store the actual solid wall sections, so doors remain gaps and cutaways still block light.
export function wallOcclusion(scene,walls,camera,ambient){
  scene.updateMatrixWorld(true);
  const data=new Float32Array(Math.max(1,walls.length)*12);
  walls.forEach((mesh,i)=>{
    mesh.geometry.computeBoundingBox();const bounds=mesh.geometry.boundingBox,centre=bounds.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld),size=bounds.getSize(new THREE.Vector3()),scale=mesh.getWorldScale(new THREE.Vector3());
    const x=new THREE.Vector3(1,0,0).transformDirection(mesh.matrixWorld),z=new THREE.Vector3(0,0,1).transformDirection(mesh.matrixWorld);
    data.set([centre.x,centre.y,centre.z,size.y*scale.y/2,x.x,x.z,size.x*scale.x/2,size.z*scale.z/2,z.x,z.z,0,0],i*12);
  });
  const texture=new THREE.DataTexture(data,3,Math.max(1,walls.length),THREE.RGBAFormat,THREE.FloatType);texture.needsUpdate=true;
  const uniforms={fw:{value:texture},fn:{value:walls.length},fc:{value:camera.matrixWorld},fb:{get value(){return .55/ambient.intensity;}}};
  const code=`uniform sampler2D fw;uniform int fn;uniform mat4 fc;float fv(vec3 s,vec3 l){vec3 p=(fc*vec4(s,1.)).xyz,d=mat3(fc)*(l-s);p+=normalize(d)*.003;for(int i=0;i<fn;i++){vec4 a=texelFetch(fw,ivec2(0,i),0),b=texelFetch(fw,ivec2(1,i),0),c=texelFetch(fw,ivec2(2,i),0);vec3 r=p-a.xyz,o=vec3(dot(r.xz,b.xy),r.y,dot(r.xz,c.xy)),v=vec3(dot(d.xz,b.xy),d.y,dot(d.xz,c.xy));v+=vec3(lessThan(abs(v),vec3(.000001)))*.000001;vec3 e=vec3(b.z,a.w,b.w),t1=(-e-o)/v,t2=(e-o)/v,lo=min(t1,t2),hi=max(t1,t2);float n=max(max(lo.x,lo.y),lo.z),f=min(min(hi.x,hi.y),hi.z);if(f>max(n,0.)&&n<.999&&f>0.)return 0.;}return 1.;}`;
  const chunk=THREE.ShaderChunk.lights_fragment_begin.replace(/get(?:Point|Spot)LightInfo\(\s*(\w+)\s*,\s*geometryPosition\s*,\s*directLight\s*\)\s*;/g,(call,light)=>`${call}if(directLight.visible)directLight.color*=fv(geometryPosition,${light}.position);`);
  const materials=new Set();scene.traverse(node=>{for(const material of Array.isArray(node.material)?node.material:[node.material])if(material?.isMeshStandardMaterial)materials.add(material);});
  materials.forEach(material=>{const daylight={get value(){const blinds=material.userData.blinds || [];return blinds.length?1-.92*blinds.reduce((sum,b)=>sum+b.value,0)/blinds.length:1;}};
    material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms,{fd:daylight});shader.fragmentShader='uniform float fd,fb;\n'+code+'\n'+shader.fragmentShader.replace('#include <lights_fragment_begin>',chunk.replace(/getDirectionalLightInfo\(\s*directionalLight\s*,\s*directLight\s*\)\s*;/,'$& directLight.color *= fd;')+'\n#if defined(RE_IndirectDiffuse)\nirradiance*=mix(fb,1.,fd);\n#endif\n');};material.customProgramCacheKey=()=> 'floorplan-wall-occlusion';material.needsUpdate=true;});
  return ()=>texture.dispose();
}

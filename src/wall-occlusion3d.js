import * as THREE from 'three';
import {wallBVH} from './wall-bvh.js';
export function blindTransmission(windows){
  // Undefined means an outdoor/unassigned surface. An empty list means an
  // indoor room with no glazing: it must not receive unrestricted daylight.
  if(windows===undefined)return 1;
  const area=windows.reduce((sum,w)=>sum+w.area,0);
  return area?windows.reduce((sum,w)=>sum+w.area*(w.transmission??(1-.92*w.value)),0)/area:0;
}

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
  const nodes=wallBVH(walls.map((mesh,index)=>{const b=new THREE.Box3().setFromObject(mesh);return {index,min:b.min.toArray(),max:b.max.toArray()};}));
  const treeData=new Float32Array(Math.max(1,nodes.length)*8);nodes.forEach((n,i)=>treeData.set([...n.min,n.escape,...n.max,n.wall],i*8));
  const tree=new THREE.DataTexture(treeData,2,Math.max(1,nodes.length),THREE.RGBAFormat,THREE.FloatType);tree.needsUpdate=true;
  const uniforms={fw:{value:texture},fn:{value:nodes.length},ftree:{value:tree},fc:{value:camera.matrixWorld},fb:{get value(){return .18/ambient.intensity;}}};
  // Traverse the bounds tree, testing oriented geometry only at candidate leaves.
  const code=`uniform sampler2D fw,ftree;uniform int fn;uniform mat4 fc;float fv(vec3 s,vec3 l){vec3 p=(fc*vec4(s,1.)).xyz,d=mat3(fc)*(l-s);p+=normalize(d)*.003;vec3 safeD=d+vec3(lessThan(abs(d),vec3(.000001)))*.000001;int cursor=0;for(int step=0;step<fn;step++){if(cursor>=fn)break;vec4 mn=texelFetch(ftree,ivec2(0,cursor),0),mx=texelFetch(ftree,ivec2(1,cursor),0);vec3 tmin=(mn.xyz-p)/safeD,tmax=(mx.xyz-p)/safeD,nearT=min(tmin,tmax),farT=max(tmin,tmax);float entry=max(max(nearT.x,nearT.y),nearT.z),exitT=min(min(farT.x,farT.y),farT.z);if(exitT<max(entry,0.)||entry>.999){cursor=int(mn.w);continue;}cursor++;int i=int(mx.w);if(i<0)continue;vec4 a=texelFetch(fw,ivec2(0,i),0),b=texelFetch(fw,ivec2(1,i),0),c=texelFetch(fw,ivec2(2,i),0);vec3 r=p-a.xyz,o=vec3(dot(r.xz,b.xy),r.y,dot(r.xz,c.xy)),v=vec3(dot(d.xz,b.xy),d.y,dot(d.xz,c.xy));v+=vec3(lessThan(abs(v),vec3(.000001)))*.000001;vec3 e=vec3(b.z,a.w,b.w),t1=(-e-o)/v,t2=(e-o)/v,lo=min(t1,t2),hi=max(t1,t2);float n=max(max(lo.x,lo.y),lo.z),f=min(min(hi.x,hi.y),hi.z);if(f>max(n,0.)&&n<.999&&f>0.)return 0.;}return 1.;}`;
  const chunk=THREE.ShaderChunk.lights_fragment_begin.replace(/get(?:Point|Spot)LightInfo\(\s*(\w+)\s*,\s*geometryPosition\s*,\s*directLight\s*\)\s*;/g,(call,light)=>`${call}if(directLight.visible)directLight.color*=fv(geometryPosition,${light}.position);`);
  const materials=new Set();scene.traverse(node=>{for(const material of Array.isArray(node.material)?node.material:[node.material])if(material?.isMeshStandardMaterial)materials.add(material);});
  materials.forEach(material=>{const daylight={get value(){return blindTransmission(material.userData.blinds);}},wall=material.userData.wallDaylight;
    const declarations=wall?'uniform sampler2D fm,ft;uniform mat4 fi;uniform vec2 fs;\n':'';
    // Sample just beyond the visible wall face, in floor-local coordinates.
    const sample=wall?'vec3 wp=(fi*fc*vec4(geometryPosition,1.)).xyz+mat3(fi*fc)*geometryNormal*.03;int ri=int(texture2D(fm,wp.xz/fs+.5).r+.5);float roomDaylight=texelFetch(ft,ivec2(ri,0),0).r;':'float roomDaylight=fd;';
    material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms,{fd:daylight},wall);shader.fragmentShader='uniform float fd,fb;\n'+declarations+code+'\n'+shader.fragmentShader.replace('#include <lights_fragment_begin>',chunk.replace(/getDirectionalLightInfo\(\s*directionalLight\s*,\s*directLight\s*\)\s*;/,'$& directLight.color *= roomDaylight;').replace(/vec3 geometryNormal\s*=\s*normal\s*;/,'$&\n'+sample)+'\n#if defined(RE_IndirectDiffuse)\nirradiance*=mix(fb,1.,roomDaylight);\n#endif\n');};material.customProgramCacheKey=()=> 'floorplan-wall-occlusion'+!!wall;material.needsUpdate=true;});
  return ()=>{texture.dispose();tree.dispose();};
}

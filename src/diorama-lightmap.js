import * as THREE from 'three';

const MAX_STOREYS=6;
const declarations=`uniform sampler2D dioMap;uniform vec2 dioShift[${MAX_STOREYS}];uniform int dioCount;uniform vec2 dioSize;uniform float dioGain;varying vec3 dioWorld;varying float dioTile;
vec3 dioLight(){
  int storey=int(dioTile+.5);vec2 shift=vec2(0.);for(int i=0;i<${MAX_STOREYS};i++)if(i==storey)shift=dioShift[i];
  vec2 uv=(dioWorld.xz-shift)/dioSize+.5;if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)return vec3(0.);
  return texture2D(dioMap,vec2(uv.x,(uv.y+float(storey))/float(dioCount))).rgb*dioGain;
}
`;

/**
 * Lamp light painted top-down into one small texture, a tile per storey, and
 * sampled by every surface from its plan position. Any number of lamps costs
 * one texture read, light never leaks between storeys, and each pool is
 * clipped to its own room so walls hold it in. Geometry is tagged with its
 * storey so a storey can slide sideways and keep its own light.
 */
export function createLightmap(storeys,{scale=24,gain=1.7}={}){
  const width=Math.max(...storeys.map(s=>s.width))+.6,depth=Math.max(...storeys.map(s=>s.depth))+.6,w=Math.ceil(width*scale),h=Math.ceil(depth*scale);
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h*storeys.length;const context=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;
  const shift=Array.from({length:MAX_STOREYS},()=>new THREE.Vector2());
  const uniforms={dioMap:{value:texture},dioShift:{value:shift},dioCount:{value:storeys.length},dioSize:{value:new THREE.Vector2(width,depth)},dioGain:{value:gain}},sources=[],patched=new Set();
  const pixel=(x,z)=>[(x/width+.5)*w,(z/depth+.5)*h];
  function apply(material){
    if(patched.has(material)||material.userData.noLightmap||!(material.isMeshLambertMaterial||material.isMeshStandardMaterial))return;patched.add(material);
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader='attribute float dioStorey;varying vec3 dioWorld;varying float dioTile;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvec4 dioPoint=vec4(transformed,1.);\n#ifdef USE_INSTANCING\ndioPoint=instanceMatrix*dioPoint;\n#endif\ndioWorld=(modelMatrix*dioPoint).xyz;dioTile=dioStorey;');
      // Mostly from above: floors and table tops catch the most, undersides the least.
      shader.fragmentShader=declarations+shader.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nfloat dioFacing=dot(normal,normalize((viewMatrix*vec4(0.,1.,0.,0.)).xyz));\nreflectedLight.directDiffuse+=diffuseColor.rgb*dioLight()*(.3+.32*smoothstep(-.8,.1,dioFacing)+.38*max(dioFacing,0.));');
    };
    material.customProgramCacheKey=()=>'diorama-lightmap';material.needsUpdate=true;
  }
  /** `clip` is the room outline in floor-centred metres; the pool cannot cross it. */
  function add({storey,x,z,radius,clip}){const source={storey,x,z,radius,clip,colour:[255,217,160],level:0};sources.push(source);return source;}
  function draw(){
    context.globalCompositeOperation='source-over';context.fillStyle='#000';context.fillRect(0,0,canvas.width,canvas.height);context.globalCompositeOperation='lighter';
    for(const {storey,x,z,radius,clip,colour,level} of sources){
      if(level<=.002)continue;
      context.save();context.translate(0,storey*h);context.beginPath();
      if(clip?.length){clip.forEach(([px,pz],i)=>{const p=pixel(px,pz);i?context.lineTo(...p):context.moveTo(...p);});context.closePath();}else context.rect(0,0,w,h);
      context.clip();
      const [cx,cy]=pixel(x,z),r=radius*scale,gradient=context.createRadialGradient(cx,cy,0,cx,cy,r),rgb=colour.map(v=>Math.round(v)).join(','),a=Math.min(1,level);
      gradient.addColorStop(0,`rgba(${rgb},${a})`);gradient.addColorStop(.3,`rgba(${rgb},${a*.62})`);gradient.addColorStop(.65,`rgba(${rgb},${a*.2})`);gradient.addColorStop(1,`rgba(${rgb},0)`);
      context.fillStyle=gradient;context.fillRect(cx-r,cy-r,r*2,r*2);context.restore();
    }
    texture.needsUpdate=true;
  }
  /** Mark every mesh under `root` as belonging to storey `index`. */
  function tag(root,index){root.traverse(node=>{if(node.isMesh&&!node.geometry.attributes.dioStorey)node.geometry.setAttribute('dioStorey',new THREE.BufferAttribute(new Float32Array(node.geometry.attributes.position.count).fill(index),1));});}
  return {apply,add,draw,tag,setShift(index,x,z){shift[index].set(x,z);},dispose(){texture.dispose();}};
}

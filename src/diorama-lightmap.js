import * as THREE from 'three';

const MAX_STOREYS=6;
const declarations=`uniform sampler2D dioMap,dioFocus;uniform vec2 dioShift[${MAX_STOREYS}];uniform int dioCount;uniform vec2 dioSize;uniform float dioGain,dioDim;varying vec3 dioWorld;varying float dioTile;
// Plan position within this surface's storey tile; false outside the footprint.
bool dioTileUV(out vec2 uv){
  int storey=int(dioTile+.5);vec2 shift=vec2(0.);for(int i=0;i<${MAX_STOREYS};i++)if(i==storey)shift=dioShift[i];
  uv=(dioWorld.xz-shift)/dioSize+.5;if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)return false;
  uv.y=(uv.y+float(storey))/float(dioCount);return true;
}
vec3 dioLight(){vec2 uv;return dioTileUV(uv)?texture2D(dioMap,uv).rgb*dioGain:vec3(0.);}
// 1 inside a focused room, falling to 1 - dioDim everywhere else.
float dioShade(){vec2 uv;return 1.-dioDim*(1.-(dioTileUV(uv)?texture2D(dioFocus,uv).r:0.));}
`;

/**
 * Lamp light painted top-down into one small texture, a tile per storey, and
 * sampled by every surface from its plan position. Any number of lamps costs
 * one texture read, light never leaks between storeys, and each pool is
 * clipped to its own room so walls hold it in. Geometry is tagged with its
 * storey so a storey can slide sideways and keep its own light. A second texture of
 * the same layout marks focused rooms, so everything outside them can be dimmed.
 */
export function createLightmap(storeys,{scale=24,gain=1.7}={}){
  const width=Math.max(...storeys.map(s=>s.width))+.6,depth=Math.max(...storeys.map(s=>s.depth))+.6,w=Math.ceil(width*scale),h=Math.ceil(depth*scale);
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h*storeys.length;const context=canvas.getContext('2d',{willReadFrequently:true});
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;
  const shift=Array.from({length:MAX_STOREYS},()=>new THREE.Vector2());
  const focusCanvas=document.createElement('canvas');focusCanvas.width=w;focusCanvas.height=h*storeys.length;const focusContext=focusCanvas.getContext('2d'),focus=new THREE.CanvasTexture(focusCanvas);focus.flipY=false;focus.generateMipmaps=false;focus.minFilter=THREE.LinearFilter;
  const uniforms={dioFocus:{value:focus},dioDim:{value:0},dioMap:{value:texture},dioShift:{value:shift},dioCount:{value:storeys.length},dioSize:{value:new THREE.Vector2(width,depth)},dioGain:{value:gain}},sources=[],patched=new Set();
  const pixel=(x,z)=>[(x/width+.5)*w,(z/depth+.5)*h];
  function apply(material){
    if(patched.has(material)||material.userData.noLightmap||!(material.isMeshLambertMaterial||material.isMeshStandardMaterial))return;patched.add(material);
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader='attribute float dioStorey;varying vec3 dioWorld;varying float dioTile;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvec4 dioPoint=vec4(transformed,1.);\n#ifdef USE_INSTANCING\ndioPoint=instanceMatrix*dioPoint;\n#endif\ndioWorld=(modelMatrix*dioPoint).xyz;dioTile=dioStorey;');
      // Mostly from above: floors and table tops catch the most, undersides the least.
      shader.fragmentShader=declarations+shader.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nfloat dioFacing=dot(normal,normalize((viewMatrix*vec4(0.,1.,0.,0.)).xyz));\nreflectedLight.directDiffuse+=diffuseColor.rgb*dioLight()*(.3+.32*smoothstep(-.8,.1,dioFacing)+.38*max(dioFacing,0.));\nfloat dioKeep=dioShade();reflectedLight.directDiffuse*=dioKeep;reflectedLight.indirectDiffuse*=dioKeep;');
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
  /** Painted light at a plan position, as [r, g, b] 0–255, from the last draw. */
  function sample(storey,x,z){const [px,py]=pixel(x,z);return Array.from(context.getImageData(Math.round(px),Math.round(py)+storey*h,1,1).data).slice(0,3);}
  return {apply,add,draw,tag,sample,setShift(index,x,z){shift[index].set(x,z);},
    /** Scale every lamp's contribution; daylight washes lamps out. `level` 1 is the evening strength. */
    setGain(level){uniforms.dioGain.value=gain*level;},
    /** Mark the focused rooms: `regions` are {storey, points} outlines in floor-centred metres. */
    setFocus(regions){
      focusContext.fillStyle='#000';focusContext.fillRect(0,0,focusCanvas.width,focusCanvas.height);focusContext.fillStyle=focusContext.strokeStyle='#fff';focusContext.lineJoin='round';
      // The outline is widened by a wall's thickness so the walls around a focused room stay lit with it.
      focusContext.lineWidth=scale*.3;
      for(const {storey,points} of regions){focusContext.save();focusContext.translate(0,storey*h);focusContext.beginPath();points.forEach(([x,z],i)=>{const p=pixel(x,z);i?focusContext.lineTo(...p):focusContext.moveTo(...p);});focusContext.closePath();focusContext.fill();focusContext.stroke();focusContext.restore();}
      focus.needsUpdate=true;
    },
    /** How far everything outside the focused rooms is dimmed, 0 (not at all) to 1 (black). */
    setDim(level){uniforms.dioDim.value=level;},dispose(){texture.dispose();focus.dispose();}};
}

import * as THREE from 'three';

// Hand-drawn outlines from depth and normal discontinuities. Solid geometry is
// drawn to offscreen targets, inked, then written back with its depth so glows
// and glass (layer 1) still sort correctly against it.
const fragment=`
uniform sampler2D tColour,tNormal,tDepth;uniform vec2 px;uniform float range,strength,time;uniform vec3 ink,stage,horizon;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
  // A slow, slight wobble keeps lines from looking ruled.
  vec2 uv=vUv+(vec2(noise(vUv*90.),noise(vUv*90.+31.))-.5)*px*1.1;
  float d=texture2D(tDepth,uv).r;
  vec2 o=px;
  float dl=texture2D(tDepth,uv-vec2(o.x,0)).r,dr=texture2D(tDepth,uv+vec2(o.x,0)).r,du=texture2D(tDepth,uv+vec2(0,o.y)).r,dd=texture2D(tDepth,uv-vec2(0,o.y)).r;
  // Second derivative: flat slanted surfaces stay clean under an orthographic camera.
  float depthEdge=smoothstep(.012,.05,(abs(dl+dr-2.*d)+abs(du+dd-2.*d))*range);
  vec3 n=texture2D(tNormal,uv).rgb;
  float normalEdge=length(n-texture2D(tNormal,uv-vec2(o.x,0)).rgb)+length(n-texture2D(tNormal,uv+vec2(o.x,0)).rgb)+length(n-texture2D(tNormal,uv+vec2(0,o.y)).rgb)+length(n-texture2D(tNormal,uv-vec2(0,o.y)).rgb);
  normalEdge=smoothstep(.35,.9,normalEdge);
  float line=max(depthEdge,normalEdge)*strength;
  vec4 colour=texture2D(tColour,vUv);
  // The stage is a sky: paler towards the horizon at the foot of the picture.
  vec3 rgb=mix(mix(horizon,stage,smoothstep(0.,.75,vUv.y)),colour.rgb,colour.a);
  // Lines darken towards a warm brown rather than black, like ink over paint.
  rgb=mix(rgb,rgb*ink*.55+ink*.035,line);
  vec2 c=vUv-.5;rgb*=1.-dot(c,c)*.55;
  rgb*=1.+(hash(vUv*vec2(1913.,1711.))-.5)*.05;
  gl_FragColor=vec4(rgb,1.);
  gl_FragDepth=d;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createInk(renderer,{stage='#15161a',ink='#4a2f25'}={}){
  const colour=new THREE.WebGLRenderTarget(1,1,{samples:4,type:THREE.HalfFloatType});
  const normal=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthTexture:new THREE.DepthTexture(1,1)});
  const normalMaterial=new THREE.MeshNormalMaterial();
  const uniforms={tColour:{value:colour.texture},tNormal:{value:normal.texture},tDepth:{value:normal.depthTexture},px:{value:new THREE.Vector2()},range:{value:1},strength:{value:1},time:{value:0},ink:{value:new THREE.Color(ink)},stage:{value:new THREE.Color(stage)},horizon:{value:new THREE.Color(stage)}};
  const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms,fragmentShader:fragment,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',depthFunc:THREE.AlwaysDepth}));
  quad.frustumCulled=false;
  const quadScene=new THREE.Scene(),quadCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);quadScene.add(quad);
  const size=new THREE.Vector2();
  function render(scene,camera,time=0){
    renderer.getDrawingBufferSize(size);
    if(colour.width!==size.x||colour.height!==size.y){colour.setSize(size.x,size.y);normal.setSize(size.x,size.y);}
    // Roughly 1.3 CSS pixels wide at any density.
    const width=Math.max(1,renderer.getPixelRatio()*.65);uniforms.px.value.set(width/size.x,width/size.y);
    uniforms.range.value=camera.far-camera.near;uniforms.time.value=time;
    const background=scene.background;scene.background=null;
    camera.layers.set(0);
    renderer.setRenderTarget(colour);renderer.setClearColor(0,0);renderer.clear();renderer.render(scene,camera);
    const shadows=renderer.shadowMap.enabled;renderer.shadowMap.enabled=false;scene.overrideMaterial=normalMaterial;
    renderer.setRenderTarget(normal);renderer.clear();renderer.render(scene,camera);
    scene.overrideMaterial=null;renderer.shadowMap.enabled=shadows;
    renderer.setRenderTarget(null);renderer.clear();renderer.render(quadScene,quadCamera);
    // Glows and glass composite over the inked picture, still depth-tested.
    const autoClear=renderer.autoClear;renderer.autoClear=false;camera.layers.set(1);renderer.render(scene,camera);renderer.autoClear=autoClear;
    camera.layers.set(0);scene.background=background;
  }
  return {render,setStage(value,horizon=value){uniforms.stage.value.set(value);uniforms.horizon.value.set(horizon);},dispose(){colour.dispose();normal.dispose();normalMaterial.dispose();quad.geometry.dispose();quad.material.dispose();}};
}

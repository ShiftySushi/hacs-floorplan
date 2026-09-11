import * as THREE from 'three';
import {weatherAppearance} from './weather.js';

// Weather lives in world space, beyond the house footprint, not on the camera.
export function weather3D(world,bounds,shelters=[]){
  const group=new THREE.Group();group.name='outdoor-weather';
  const size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3()),radius=Math.max(size.x,size.z,8)*.72,top=Math.max(5,bounds.max.y+2);
  const count=360,positions=new Float32Array(count*6),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const material=new THREE.LineBasicMaterial({color:'#a5c9df',transparent:true,opacity:.5,depthWrite:false});
  const rain=new THREE.LineSegments(geometry,material);rain.frustumCulled=false;group.add(rain);
  const flakes=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#f4f8fa',size:.065,transparent:true,opacity:.85,depthWrite:false}));flakes.frustumCulled=false;group.add(flakes);
  const cloudPixels=new Uint8Array(96*48*4);
  for(let y=0;y<48;y++)for(let x=0;x<96;x++){
    let alpha=0;for(const [cx,cy,rx,ry] of [[.22,.6,.23,.29],[.43,.4,.24,.38],[.65,.5,.24,.33],[.8,.63,.19,.24]]){const r=Math.hypot((x/96-cx)/rx,(y/48-cy)/ry);alpha=Math.max(alpha,Math.max(0,1-r)**1.4);}
    cloudPixels.set([230,236,240,Math.round(alpha*240)],(y*96+x)*4);
  }
  const cloudTexture=new THREE.DataTexture(cloudPixels,96,48);cloudTexture.needsUpdate=true;cloudTexture.magFilter=THREE.LinearFilter;cloudTexture.minFilter=THREE.LinearFilter;
  const cloudMaterial=new THREE.SpriteMaterial({map:cloudTexture,color:'#cbd3dc',transparent:true,opacity:.5,depthWrite:false});
  const clouds=new THREE.Group();group.add(clouds);
  for(let i=0;i<12;i++){const puff=new THREE.Sprite(cloudMaterial),a=i*2.399; puff.position.set(centre.x+Math.cos(a)*radius,top+.2+(i%3)*.3,centre.z+Math.sin(a)*radius);puff.scale.set(4+(i%3),2,1);clouds.add(puff);}
  const flash=new THREE.PointLight('#d5e5ff',0,radius*5);flash.position.set(centre.x-radius,top+2,centre.z-radius);group.add(flash);
  const seeds=Array.from({length:count},(_,i)=>[(Math.sin(i*127.1+1)*43758.5453)%1,(Math.sin(i*311.7+2)*19341.33)%1,(i*.618034)%1]);
  const sheltered=(x,z)=>shelters.some(b=>x>=b.min.x-.15&&x<=b.max.x+.15&&z>=b.min.z-.15&&z<=b.max.z+.15);
  let last=0,time=0;
  world.add(group);
  return {group,update(states,config,now,reducedMotion){
    const a=weatherAppearance(states,config),active=!!(a.clouds||a.rain||a.snow||a.hail||a.wind||a.storm);
    group.visible=active&&a.intensity>0;
    const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(!reducedMotion)time+=dt;
    rain.visible=a.rain||a.wind;flakes.visible=a.snow||a.hail;clouds.visible=a.clouds>0;
    cloudMaterial.opacity=a.fog?.4:a.clouds*.8*a.intensity;
    cloudMaterial.color.set(a.storm?'#697786':a.fog?'#d9e0e1':'#adb9c5');
    clouds.position.y=a.fog?-top+1:0;
    flash.intensity=!reducedMotion&&a.storm?Math.max(0,Math.sin(time*.7)-.98)*100*a.intensity:0;
    const n=Math.round(count*a.intensity*(a.condition==='pouring'?1:.6));geometry.setDrawRange(0,n*2);
    for(let i=0;i<n;i++){
      const seed=seeds[i],drift=a.wind?time*.45:time*.035;
      const x=centre.x+(((seed[0]+drift)%2+2)%2-1)*radius,z=centre.z+seed[1]*radius;
      const speed=a.snow?(a.rain?2.5:.6):a.hail?4:a.wind?1:5;
      const y=bounds.min.y+((seed[2]*top-time*speed)%top+top)%top;
      const visible=!sheltered(x,z),length=a.wind?.24:a.rain?.2:.005;
      positions.set([x,visible?y:-100,z,x+(a.wind?.4:.025),visible?y+length:-100,z],i*6);
    }
    geometry.attributes.position.needsUpdate=true;
    return group.visible&&!reducedMotion;
  }};
}

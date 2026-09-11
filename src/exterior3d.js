import * as THREE from 'three';
import {exteriorTexture,plantedShrub} from './exterior-materials.js';
import {packedExteriorModel} from './exterior-model.js';
import {lightAppearance} from './illumination.js';

// Site geometry lives in scene data, never in the distributable or public demo.
export function exterior3D(config,states={}){
  const group=new THREE.Group();group.name='exterior';
  const updates=[];
  const materials=new Map(),textures=new Map();
  const texture=finish=>{if(!textures.has(finish))textures.set(finish,exteriorTexture(finish));return textures.get(finish);};
  const material=(colour,glass=false)=>{
    const key=colour+glass;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color:colour,roughness:glass?.18:.85,metalness:glass?.25:0,side:THREE.DoubleSide}));return materials.get(key);
  };
  const mesh=(geometry,colour,parent=group,glass=false)=>{const m=new THREE.Mesh(geometry,material(colour,glass));m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const box=(w,h,d,x,y,z,colour,parent)=>{const m=mesh(new THREE.BoxGeometry(w,h,d),colour,parent);m.position.set(x,y,z);return m;};
  const rounded=(w,h,d,colour,parent)=>{const r=Math.min(w,h)*.2,s=new THREE.Shape();s.moveTo(-w/2+r,0);s.lineTo(w/2-r,0);s.quadraticCurveTo(w/2,0,w/2,r);s.lineTo(w/2,h-r);s.quadraticCurveTo(w/2,h,w/2-r,h);s.lineTo(-w/2+r,h);s.quadraticCurveTo(-w/2,h,-w/2,h-r);s.lineTo(-w/2,r);s.quadraticCurveTo(-w/2,0,-w/2+r,0);const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:5});g.translate(0,0,-d/2);return mesh(g,colour,parent);};
  function surface(vertices,colour,parent,glass=false){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));g.setIndex(vertices.length===3?[0,1,2]:[0,1,2,0,2,3]);g.computeVertexNormals();return mesh(g,colour,parent,glass);
  }
  function car(item,parent){
    // Original procedural fastback saloon; nose faces local +Z.
    const body=item.colour || '#62696c',glass='#243b45';
    const sections=[[-2.33,.63,.56],[-2.12,.86,.76],[-1.35,.93,.85],[.95,.93,.8],[1.8,.86,.69],[2.33,.66,.49]];
    for(let i=1;i<sections.length;i++){
      const [z0,w0,h0]=sections[i-1],[z1,w1,h1]=sections[i];
      surface([[-w0,h0,z0],[w0,h0,z0],[w1,h1,z1],[-w1,h1,z1]],body,parent);
      for(const sign of [-1,1])surface([[sign*w0,.27,z0],[sign*w0,h0,z0],[sign*w1,h1,z1],[sign*w1,.27,z1]],body,parent);
    }
    for(const [z,w,h] of [sections[0],sections.at(-1)])surface([[-w,.27,z],[w,.27,z],[w,h,z],[-w,h,z]],body,parent);
    const roof=[[-.73,1.38,-.72],[.73,1.38,-.72],[.69,1.36,.45],[-.69,1.36,.45]];
    surface(roof,glass,parent,true);
    surface([[-.89,.85,-1.55],[.89,.85,-1.55],roof[1],roof[0]],glass,parent,true);
    surface([roof[3],roof[2],[.86,.81,1.13],[-.86,.81,1.13]],glass,parent,true);
    for(const s of [-1,1]){
      surface([[s*.89,.84,-1.55],[s*.73,1.38,-.72],[s*.69,1.36,.45],[s*.86,.81,1.13]],glass,parent,true);
      box(.035,.5,.07,s*.83,1.04,-.15,body,parent);
      box(.15,.025,.035,s*.922,.76,.1,'#242729',parent);
      box(.19,.08,.15,s*1.0,.88,.91,body,parent);
      for(const z of [-1.43,1.43]){
        const tyre=mesh(new THREE.CylinderGeometry(.34,.34,.2,24),'#202326',parent);tyre.rotation.z=Math.PI/2;tyre.position.set(s*.9,.34,z);
        const rim=mesh(new THREE.CylinderGeometry(.25,.25,.205,20),'#454b50',parent);rim.rotation.z=Math.PI/2;rim.position.copy(tyre.position);
        box(.022,.2,.08,s*1.01,.36,z+.12,'#b12f2e',parent);
      }
      box(.32,.045,.07,s*.54,.58,2.27,'#e8f2f4',parent);
      box(.33,.055,.06,s*.57,.67,-2.22,'#a72e35',parent);
    }
    box(1.5,.022,.12,0,.8,-2.04,'#282d30',parent);
    parent.scale.set(item.width/1.85,item.height/1.44,item.depth/4.69);
  }
  for(const item of config.items){
    let node;
    if(item.type==='surface'){
      node=surface(item.vertices,item.colour || '#d8d1bb',group,!!item.glazing);
      if(item.finish){node.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(item.vertices.flatMap(p=>[p[0],p[2]]),2));node.material=node.material.clone();node.material.map=texture(item.finish);node.material.bumpMap=node.material.map;node.material.bumpScale=.025;}
    }
    else {
      node=new THREE.Group();group.add(node);node.position.set(item.x,item.y,item.z);node.rotation.y=(item.rotation || 0)*Math.PI/180;
      if(item.model)node.add(packedExteriorModel(config.models[item.model],item));
      else if(item.type==='light'){
        rounded(item.width,item.height,item.depth,item.colour || '#454c50',node);
        const lens=box(item.width*.8,item.height*.74,.025,0,item.height*.5,item.depth/2+.014,'#e8e8d9',node);lens.material=lens.material.clone();
        if(item.light_style==='spot'){
          lens.visible=false;const head=new THREE.Group();head.position.set(0,item.height*.65,item.depth*.75);head.rotation.x=Math.PI*2/3;node.add(head);
          const housing=mesh(new THREE.CylinderGeometry(item.width*.5,item.width*.5,item.depth,20),item.colour || '#454c50',head);
          const face=mesh(new THREE.CircleGeometry(item.width*.42,20),'#e8e8d9',head);face.rotation.x=-Math.PI/2;face.position.y=item.depth/2+.003;face.material=lens.material;
        }
        const lamp=new THREE.PointLight('#ffe7be',0,5,2);lamp.position.set(0,item.height/2,item.depth/2+.14);node.add(lamp);
        updates.push(next=>{const a=lightAppearance(next[item.light_entity]);lamp.color.setRGB(...a.colour.map(v=>v/255));lamp.intensity=a.level*4;lens.material.emissive.copy(lamp.color);lens.material.emissiveIntensity=a.level*2;});
      }
      else if(item.type==='charger'){
        rounded(item.width,item.height,item.depth,'#333a3e',node);
        const cover=rounded(item.width*.88,item.height*.94,.028,'#e4e5df',node);cover.position.set(0,item.height*.03,item.depth/2);
        const status=box(item.width*.55,.018,.015,0,item.height*.83,item.depth/2+.025,'#46504a',node);status.material=status.material.clone();
        const cable=points=>{const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(curve,48,.018,7,false),'#171c1f',node);};
        const docked=cable([[.06,.03,.12],[.2,-.3,.16],[.18,-.55,.17],[-.18,-.55,.17],[-.22,-.2,.17],[-.17,.18,.17]]);
        const plugged=item.plugged_cable?cable(item.plugged_cable):null;
        const handle=box(.045,.16,.07,-.17,.16,.17,'#30363a',node);
        updates.push(next=>{const charging=['on','charging'].includes(String(next[item.charging_entity]?.state).toLowerCase());const connected=charging||['on','connected','plugged_in'].includes(String(next[item.connected_entity]?.state).toLowerCase());docked.visible=!connected||!plugged;handle.visible=docked.visible;if(plugged)plugged.visible=connected;status.material.emissive.set(charging?'#46e589':'#000000');status.material.emissiveIntensity=charging?1:0;});
      }
      else if(item.type==='doorbell'){
        rounded(item.width,item.height,item.depth,'#22282c',node);
        for(const [y,r,c] of [[.81,.31,'#080e14'],[.61,.15,'#10191e'],[.23,.29,'#777b77']]){const circle=mesh(new THREE.CircleGeometry(item.width*r,24),c,node);circle.position.set(0,item.height*y,item.depth/2+.002);}
        box(item.width*.65,item.height*.14,.004,0,item.height*.43,item.depth/2+.003,'#10171b',node);
      }
      else if(item.type==='car')car(item,node);
      else if(item.type==='plant'){
        const key='leaf'+item.colour;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color:item.colour || '#688052',map:texture('leaf'),alphaTest:.5,side:THREE.DoubleSide,roughness:1}));
        node.add(plantedShrub(item,materials.get(key)));
        box(.06,item.height*.6,.06,0,item.height*.3,0,'#7d6650',node);
      }else {
        const block=box(item.width,item.height,item.depth,0,item.height/2,0,item.colour || '#ded7c3',node);
        if(item.glazing)block.material=material(item.colour || '#536f7b',true);
        if(item.finish){
          block.material=block.material.clone();const map=texture(item.finish).clone();map.needsUpdate=true;
          map.repeat.set(item.width/(item.finish==='brick'?.45:1), (item.finish==='brick'?item.height:item.depth)/(item.finish==='brick'?.6:1));
          block.material.map=map;block.material.bumpMap=map;block.material.bumpScale=item.finish==='grass'?.025:.012;block.material.roughness=1;
        }
      }
    }
    node.name=item.id;node.userData.exterior=true;
  }
  group.updateStates=next=>updates.forEach(update=>update(next));group.updateStates(states);
  return group;
}

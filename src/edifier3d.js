import * as THREE from 'three';

// Original procedural S1000DB, front +Z; furniture3D applies measured bounds.
export function edifier3D(group,active){
  const mat=(color,roughness=.65,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const black=mat('#202123'),rubber=mat('#101112',.92),metal=mat('#56585b',.4,.65),cone=mat('#333539',.36,.65);
  const pixels=new Uint8Array(64*128*4);
  for(let y=0;y<128;y++)for(let x=0;x<64;x++){
    const grain=Math.sin(x*.9+Math.sin(y*.055)*1.7)*.09+Math.sin(x*2.7+y*.018)*.035,i=(y*64+x)*4;
    [167,105,52].forEach((c,j)=>pixels[i+j]=c*(1+grain));pixels[i+3]=255;
  }
  const texture=new THREE.DataTexture(pixels,64,128);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
  const wood=mat('#ffffff',.48);wood.map=texture;wood.addEventListener('dispose',()=>texture.dispose());
  const add=(geometry,material,x,y,z,parent=group,part)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;if(part)m.userData.speakerPart=part;parent.add(m);return m;};
  const box=(w,h,d,x,y,z,m,parent=group)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
  const shell=(w,x,m)=>{const g=new THREE.BoxGeometry(w,1.62,1.22),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)-(p.getY(i)+.81)*.12);g.computeVertexNormals();add(g,m,x,.87,0,group,'cabinet');};
  shell(.84,0,black);shell(.08,-.46,wood);shell(.08,.46,wood);
  for(const x of [-.36,.36])for(const z of [-.48,.43])box(.13,.06,.13,x,.03,z,rubber);
  const front=new THREE.Group();front.position.set(0,.06,.615);front.rotation.x=-Math.atan(.12);group.add(front);
  const shape=new THREE.Shape();shape.moveTo(-.25,1.51);shape.quadraticCurveTo(0,1.61,.25,1.51);shape.lineTo(.25,1.02);shape.bezierCurveTo(.25,.89,.39,.83,.39,.57);shape.quadraticCurveTo(.39,.19,0,.18);shape.quadraticCurveTo(-.39,.19,-.39,.57);shape.bezierCurveTo(-.39,.83,-.25,.89,-.25,1.02);shape.closePath();
  add(new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelSize:.012,bevelThickness:.008,bevelSegments:2}),metal,0,0,.002,front);
  const disc=(r,depth,y,z,m,parent=front,part)=>{const mesh=add(new THREE.CylinderGeometry(r,r,depth,48),m,0,y,z,parent,part);mesh.rotation.x=Math.PI/2;return mesh;};
  const ring=(r,t,y,z,m)=>add(new THREE.TorusGeometry(r,t,10,64),m,0,y,z,front);
  disc(.347,.025,.58,.04,black);ring(.306,.028,.58,.12,rubber);
  const profile=[[0,.025],[.12,.025],[.21,.065],[.278,.09]].map(p=>new THREE.Vector2(...p));
  const woofer=add(new THREE.LatheGeometry(profile,64),cone,0,.58,.035,front,'woofer');woofer.rotation.x=Math.PI/2;
  const dome=(r,y,z,m,part)=>{const mesh=add(new THREE.SphereGeometry(r,32,20),m,0,y,z,front,part);mesh.scale.z=.42;};
  dome(.119,.58,.067,cone);disc(.235,.025,1.27,.04,black);ring(.163,.012,1.27,.065,rubber);dome(.062,1.27,.068,metal,'tweeter');
  for(const [r,y,count] of [[.327,.58,6],[.205,1.27,4]])for(let i=0;i<count;i++){
    const a=(i+.5)*Math.PI*2/count,x=Math.sin(a)*r,cy=y+Math.cos(a)*r;
    disc(.009,.008,cy,.067,metal).position.x=x;box(.009,.002,.002,x,cy,.072,rubber,front);
  }
  if(active){box(.16,.043,.009,0,.092,.02,rubber,front);disc(.008,.003,.092,.027,mat('#3974ad',.35));}
  const rear=new THREE.Group();rear.position.set(0,.06,-.615);rear.rotation.set(-Math.atan(.12),Math.PI,0);group.add(rear);
  disc(.135,.015,1.32,.015,rubber,rear,'port');add(new THREE.TorusGeometry(.138,.022,10,40),black,0,1.32,.025,rear);
  box(.55,.76,.035,0,.59,.005,black,rear);
  if(active){
    for(const y of [.87,.7,.53])disc(.045,.065,y,.048,metal,rear,'control');
    for(const x of [-.15,.15])for(const y of [.3,.39])disc(.022,.023,y,.04,mat(x<0?'#c4bdb0':'#8d342c',.4,.5),rear).position.x=x;
    box(.07,.06,.012,-.15,.19,.03,rubber,rear);
  }else disc(.034,.022,.5,.03,metal,rear);
}

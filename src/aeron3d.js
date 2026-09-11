import * as THREE from 'three';

// Original measured-proportion Aeron model: curved Pellicle surfaces, perimeter
// frames, PostureFit pads, pivoting arms, tilt housing and five twin-wheel castors.
export function aeron3D(group,colour='#383a39'){
  const frame=new THREE.MeshStandardMaterial({color:colour,roughness:.42,metalness:.18});
  const rubber=new THREE.MeshStandardMaterial({color:'#181b1c',roughness:.8});
  const metal=new THREE.MeshStandardMaterial({color:'#7d8385',metalness:.85,roughness:.24});
  const add=(geometry,material=frame)=>{const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;};
  const tube=(points,r=.014,material=frame)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,r,8,false),material);
  const ellipsoid=(x,y,z,a,b,c,material=frame)=>{const m=add(new THREE.SphereGeometry(1,24,16),material);m.position.set(x,y,z);m.scale.set(a,b,c);return m;};
  const cylinder=(r,height,x,y,z,material=frame)=>{const m=add(new THREE.CylinderGeometry(r,r,height,24),material);m.position.set(x,y,z);return m;};
  cylinder(.028,.28,0,.27,0,metal);cylinder(.042,.14,0,.17,0);
  ellipsoid(0,.405,-.015,.105,.048,.15);
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5,x=Math.sin(a)*.29,z=Math.cos(a)*.29;
    tube([[0,.17,0],[x*.45,.13,z*.45],[x,.085,z]],.025);
    cylinder(.012,.055,x,.075,z,metal);
    for(const side of [-1,1]){const wheel=cylinder(.033,.023,x+Math.cos(a)*side*.017,.033,z-Math.sin(a)*side*.017,rubber);wheel.rotation.set(0,-a,Math.PI/2);wheel.userData.aeronPart='castor';}
  }
  const pixels=new Uint8Array(4*4*4);
  for(let i=0;i<16;i++)pixels.set([255,i%4===0||i<4?255:0,255,255],i*4);
  const weave=new THREE.DataTexture(pixels,4,4);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(22,22);weave.needsUpdate=true;
  const meshMaterial=new THREE.MeshStandardMaterial({color:colour,roughness:.72,alphaMap:weave,alphaTest:.5,side:THREE.DoubleSide});
  // The renderer disposes materials; this texture belongs exclusively to them.
  meshMaterial.addEventListener('dispose',()=>weave.dispose());
  const surface=(point,part)=>{
    const geometry=new THREE.PlaneGeometry(2,1,32,32),p=geometry.attributes.position;
    for(let i=0;i<p.count;i++)p.setXYZ(i,...point(p.getX(i),p.getY(i)+.5));
    geometry.computeVertexNormals();const mesh=add(geometry,meshMaterial);mesh.userData.aeronPart=part;
    const rim=[];for(let i=0;i<=32;i++)rim.push(point(-1+2*i/32,0));for(let i=1;i<=32;i++)rim.push(point(1,i/32));for(let i=1;i<=32;i++)rim.push(point(1-2*i/32,1));for(let i=1;i<=32;i++)rim.push(point(-1,1-i/32));tube(rim,.017);
  };
  surface((u,v)=>[u*(.222+.014*Math.sin(v*Math.PI)),.465-.024*(1-u*u)+.022*(2*v-1)**2,.09+(v-.5)*.43],'mesh-seat');
  surface((u,v)=>[u*(.205+.034*Math.sin(v*Math.PI)-.025*v**6),.56+.49*v-.015*u*u,-.145-.09*v+.035*Math.sin(v*Math.PI)*(1-u*u)],'mesh-back');
  tube([[0,.4,-.08],[0,.51,-.2],[0,.72,-.245]],.022);
  for(const y of [.62,.73])ellipsoid(0,y,-.224,.073,.042,.018,rubber).userData.aeronPart='lumbar-pad';
  for(const side of [-1,1]){
    tube([[side*.11,.42,-.12],[side*.235,.51,-.19],[side*.278,.68,-.12]],.02);
    const pad=ellipsoid(side*.275,.69,-.025,.05,.026,.145,rubber);pad.rotation.x=-.08;pad.userData.aeronPart='arm-pad';
    cylinder(.032,.028,side*.24,.51,-.15).rotation.z=Math.PI/2;
  }
  tube([[.08,.395,.02],[.17,.4,.05],[.215,.39,.08]],.009);ellipsoid(.215,.39,.08,.027,.013,.018,rubber);
}

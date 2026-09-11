import * as THREE from 'three';

// Sheathed Suzaku display. Blade/tsuka lengths are specified; sori and the
// decorative cast fittings are reference-informed approximations, not CAD.
export const IAITO = Object.freeze({ blade: .742, tsuka: .258, sori: .017, length: 1.025 });
export function iaito3D(group, object) {
  const root = new THREE.Group(); group.add(root);
  const black = new THREE.MeshStandardMaterial({color:'#171717',roughness:.19,metalness:.08});
  const leather = new THREE.MeshStandardMaterial({color:'#171717',roughness:.6});
  const iron = new THREE.MeshStandardMaterial({color:'#292723',roughness:.65,metalness:.8});
  const brass = new THREE.MeshStandardMaterial({color:'#8d7950',roughness:.48,metalness:.8});
  const cream = new THREE.MeshStandardMaterial({color:'#e7d9b4',roughness:.95});
  const guard = -IAITO.length/2 + IAITO.tsuka, level=.16, start=guard+.008, length=.759;
  const centre=t=>level-4*IAITO.sori*t*t; // Convex edge faces up; hilt tangent is horizontal.
  function mesh(geometry,material,part,x=0,y=0,z=0){
    const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);
    m.castShadow=true;m.receiveShadow=true;m.userData.swordPart=part;root.add(m);return m;
  }
  function box(w,h,d,x,y,z,material,part){return mesh(new THREE.BoxGeometry(w,h,d),material,part,x,y,z);}
  function cord(points,r,material,part){
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(16,points.length*4),r,6,false),material,part);
  }
  // One welded oval sweep, with a rounded closed tip and smooth normals.
  const positions=[],indices=[],rings=96,sides=20;
  for(let i=0;i<=rings;i++){
    const t=i/rings,round=t>.975?Math.sqrt(Math.max(.0001,1-((t-.975)/.025)**2)):1;
    for(let j=0;j<sides;j++){
      const a=j/sides*Math.PI*2;
      positions.push(start+length*t,centre(t)+Math.cos(a)*(.020-.006*t)*round,Math.sin(a)*(.014-.005*t)*round);
      if(i<rings){const a0=i*sides+j,b=i*sides+(j+1)%sides,c=b+sides,d=a0+sides;indices.push(a0,b,d,b,c,d);}
    }
  }
  positions.push(start,centre(0),0,start+length,centre(1),0);
  for(let j=0;j<sides;j++){indices.push((rings+1)*sides,(j+1)%sides,j);indices.push((rings+1)*sides+1,rings*sides+j,rings*sides+(j+1)%sides);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  mesh(geometry,black,'saya');
  const grip=mesh(new THREE.CapsuleGeometry(.015,.225,6,24),cream,'same',guard-.129,level);grip.rotation.z=Math.PI/2;grip.scale.z=.78;
  // Broad leather bands wrap the whole oval handle; white diamond openings
  // remain between opposite helices, rather than a cream handle with thin Xs.
  for(const direction of [-1,1]){
    const p=[],idx=[],steps=320;
    for(let i=0;i<=steps;i++){
      const t=i/steps,a=direction*t*Math.PI*10;
      for(const edge of [-1,1])p.push(guard-.239+t*.224+edge*.0085,level+Math.sin(a)*.016,Math.cos(a)*.0128);
      if(i<steps){const n=i*2;idx.push(n,n+2,n+1,n+1,n+2,n+3);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();
    const material=leather.clone();material.side=THREE.DoubleSide;mesh(g,material,'ito');
  }
  for(const [x,part] of [[guard-.251,'kashira'],[guard-.012,'fuchi']]){
    const collar=mesh(new THREE.CylinderGeometry(.0165,.0165,.012,28),brass,part,x,level);collar.rotation.z=Math.PI/2;collar.scale.x=1.08;collar.scale.z=.8;
    for(let j=0;j<3;j++)cord([[x-.004+j*.004,level-.012,-.009],[x-.004+j*.004,level,-.014],[x-.004+j*.004,level+.012,-.009]],.00065,iron,'hiranami');
  }
  // Iron openwork guard: rim, inner collar, and interwoven wave/koi silhouettes.
  const rim=mesh(new THREE.TorusGeometry(.032,.003,8,48),iron,'tsuba',guard,level);rim.rotation.y=Math.PI/2;rim.scale.x=1.12;
  box(.006,.029,.018,guard,level,0,iron,'tsuba');
  for(let i=0;i<7;i++){
    const a=i*Math.PI*2/7,points=[];
    for(let k=0;k<=12;k++){const t=k/12,angle=a+t*.85,r=.012+.021*t;points.push([guard,level+Math.cos(angle)*r*1.12,Math.sin(angle)*r]);}
    cord(points,.0023,iron,'tsuba');
    const fish=mesh(new THREE.SphereGeometry(.005,10,6),iron,'koi',guard,level+Math.cos(a+.6)*.025,Math.sin(a+.6)*.023);fish.scale.set(.6,1.5,.7);
  }
  for(const side of [-1,1]){
    const menuki=mesh(new THREE.SphereGeometry(.0035,10,6),brass,'menuki',guard-(side>0?.095:.16),level,side*.014);menuki.scale.set(2.4,1,.5);
  }
  // Black seppa; the silver habaki and blade are concealed inside the saya.
  box(.002,.037,.025,guard+.004,level,0,black,'seppa');
  box(.018,.009,.011,start+.08,centre(.08/length),.017,black,'kurigata');
  cord([[start+.06,level-.005,.019],[start+.13,level-.022,.03],[start+.10,level-.062,.031],[start+.066,level-.026,.03],[start+.14,level-.013,.024]],.0028,leather,'sageo');
  cord([[start+.1,level-.02,.03],[start+.15,level-.052,.031],[start+.17,level-.057,.03]],.0028,leather,'sageo');
  box(.64,.016,.15,0,.008,0,black,'stand');
  for(const t of [.06,.73]){
    const x=start+length*t,y=centre(t)-(.020-.006*t);
    box(.019,y-.016,.035,x,(y+.016)/2,0,black,'stand');
    for(const side of [-1,1])box(.025,.018,.009,x,y,side*.018,black,'stand');
  }
  root.scale.set((object.width||IAITO.length)/IAITO.length,(object.height||.2)/.2,(object.depth||.16)/.16);
  root.userData.iaito={...IAITO,edgeUp:true};
}

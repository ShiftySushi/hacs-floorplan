import * as THREE from 'three';

// Normalised printer architecture; the measured preset supplies the outside bounds.
export function printer3D(object,box,group){
  const variant=object.variant||'enclosed',open=['bedslinger','cantilever'].includes(variant),u1=variant==='toolchanger',colour=u1?'#e4e5e3':object.colour||'#353a3d',accent=object.product_id?.startsWith('prusa')?'#ef6b24':'#44494b';
  const b=(w,h,d,x,y,z,c=colour)=>box(w,h,d,x,y,z,c);
  b(.92,.12,.92,0,.06,0);for(const x of [-.36,.36])for(const z of [-.36,.36])b(.09,.03,.09,x,.015,z,'#171b1d');
  b(.62,.035,.62,0,.22,.02,object.product_id?.startsWith('prusa')?'#343c3b':'#bca776');
  b(.12,.28,.1,0,.35,-.25,'#777e82');
  if(open){
    for(const x of variant==='cantilever'?[-.36]:[-.36,.36]){b(.065,.82,.065,x,.55,-.18);b(.018,.78,.02,x+.02,.55,-.14,'#b6bdc0');}
    b(.8,.055,.055,0,.6,-.14,'#8e9699');
    if(variant!=='cantilever')b(.8,.055,.09,0,.96,-.18);
  }else{
    for(const x of [-.43,.43])for(const z of [-.43,.43])b(.075,.84,.075,x,.54,z);
    if(u1){for(const z of [-.43,.43])b(.92,.055,.075,0,.96,z);for(const x of [-.43,.43])b(.075,.055,.8,x,.96,0);}
    else b(.92,.08,.92,0,.96,0);
    b(.92,.76,.025,0,.54,-.44,u1?'#292d30':colour);
    for(const x of [-.44,.44])b(.025,.76,.85,x,.54,0);
    b(.8,.035,.035,0,.72,0,'#acb6bb');
    // Transparent glazing reveals the print bed, toolhead and rails.
    const glass=b(.75,.7,.012,0,.53,.448,'#a6c3cc');glass.material=new THREE.MeshStandardMaterial({color:'#a6c3cc',transparent:true,opacity:.16,roughness:.12,depthWrite:false});glass.castShadow=false;
    b(.025,.18,.035,.33,.53,.465,'#171b1d');
  }
  const head=b(.15,.12,.14,-.1,.62,0,accent);head.userData.printerPart='toolhead';b(.025,.035,.025,-.1,.545,.02,'#b99c61');
  const screenX=object.product_id==='bambu-x1c'?-.24:object.product_id==='prusa-mk4s'?0:.24,screenY=object.product_id?.startsWith('bambu-')&&!open?.88:.14;
  const screen=b(.18,.11,.025,screenX,screenY,.47,'#15262d');screen.rotation.x=-.2;b(.125,.06,.027,screenX,screenY,.484,'#80b8c1');
  if(u1){
    // Four parked tools and four side spools distinguish the U1 toolchanger.
    for(let i=0;i<4;i++)b(.12,.1,.1,-.27+i*.18,.79,-.3,'#34383a');
    for(const x of [-.53,.53])for(const z of [-.22,.22]){
      const spool=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.09,24),new THREE.MeshStandardMaterial({color:accent,roughness:.6}));spool.rotation.z=Math.PI/2;spool.position.set(x,.57,z);spool.castShadow=true;group.add(spool);
    }
    const tube=new THREE.Mesh(new THREE.TorusGeometry(.22,.008,6,32,Math.PI),new THREE.MeshStandardMaterial({color:'#c9d1d1'}));tube.position.set(0,1.02,0);group.add(tube);
  }
}

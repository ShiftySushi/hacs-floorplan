import * as THREE from 'three';

// Optional measured framing, kept with its wall during cutaway.
export function openingFrame(parent,o,length,preferences={}){
  if(!o.frame)return [];
  const w=o.width,h=o.height,sill=o.type==='door'?0:o.sill,parts=[],x=length*o.offset,door=o.type==='door';
  const frame=new THREE.MeshStandardMaterial({color:'#f2f1eb',roughness:.6});
  const glass=new THREE.MeshStandardMaterial({color:'#b6d2d5',transparent:true,opacity:.12,roughness:.1,depthWrite:false});
  const box=(width,height,depth,px,py,material=frame)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),material);mesh.position.set(x+px,sill+py,0);mesh.castShadow=material===frame;mesh.receiveShadow=true;mesh.userData.glazing=material===glass;parent.add(mesh);parts.push(mesh);return mesh;};
  for(const px of [-w/2+.025,w/2-.025])box(.05,h,.075,px,h/2);
  for(const py of [.025,h-.025])box(w,.05,.075,0,py);
  if(door){
    const hinges=[],leaves=[],double=o.frame==='french',count=double?2:1,leafWidth=(w-.1)/count;
    for(let i=0;i<count;i++){
      const sign=i? -1:1,hinge=new THREE.Group();hinge.position.set(x+sign*(-w/2+.05),0,0);parent.add(hinge);hinges.push(hinge);
      const leaf=new THREE.Group();leaf.position.x=sign*leafWidth/2;hinge.add(leaf);
      const add=(a,b,c,px,py,material)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(a,b,c),material);m.position.set(px,py,0);m.castShadow=!double;leaf.add(m);leaves.push(m);};
      const grey=new THREE.MeshStandardMaterial({color:o.colour||'#646b70',roughness:.6});
      add(leafWidth,h-.08,.045,0,h/2,double?glass:grey);
      for(const px of [-leafWidth/2+.025,leafWidth/2-.025])add(.05,h-.08,.06,px,h/2,frame);
      for(const py of [.065,h-.065])add(leafWidth,.05,.06,0,py,frame);
      add(.09,.02,.1,sign*(leafWidth/2-.09),1,grey);
    }
    let opened=!!preferences.open,value=+opened,from=value,start=0;
    const pose=()=>hinges.forEach((hinge,i)=>hinge.rotation.y=value*Math.PI*.48*(i?-1:1)*(o.swing||1));pose();
    parts.door={leaves,get open(){return opened;},get transmission(){return (double?.75:0)+(double?.25:1)*value;},toggle(){from=value;opened=!opened;start=performance.now();preferences.onChange?.(opened);},update(now,reduced){const t=reduced?1:Math.max(0,Math.min(1,(now-start)/1400));value=from+(+opened-from)*t*t*(3-2*t);pose();return t<1&&value!==+opened;},setVisible(value){hinges.forEach(h=>h.visible=value);}};
  }else{
    box(w,h,.012,0,h/2,glass);
    if(o.frame==='casement')box(w,.04,.075,0,h*.62);
  }
  if(o.type==='window'&&sill>.1)box(w+.07,.035,.23,0,-.012);
  return parts;
}

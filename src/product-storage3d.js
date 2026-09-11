// Cabinet fronts face positive Z. Dividers and fronts are separate from the
// carcass so openings remain genuinely open when viewed from an angle.
export function productStorage3D(o,box,ball){
  const id=o.product_id;
  if(id==='lyla-sideboard'){
    const w=o.width,h=o.height,d=o.depth,c=o.colour||'#ae784b',base=.09,body=h-base;
    box(w,.035,d,0,h-.0175,0,c);box(w,.025,d,0,base,0,c);box(w,body,.025,0,base+body/2,-d/2,c);
    for(const x of [-w/2+.025,w/2-.025]){box(.05,h,d,x,h/2,0,c);}
    for(let i=0;i<2;i++){const x=-w/2+w*(i+.5)/3;box(w/3-.012,body-.045,.025,x,base+body/2,d/2,c).userData.storagePart='door';ball(.012,x+(i?-.1:.1),h*.4,d/2+.02,'#343638');}
    for(let i=0;i<3;i++){const y=base+body*(i+.5)/3;box(w/3-.012,body/3-.016,.025,w/3,y,d/2,c).userData.storagePart='drawer';ball(.012,w/3,y,d/2+.02,'#343638');}
    return true;
  }
  if(id==='malm-2'||id==='malm-6-glass'){
    const w=o.width,d=o.depth,h=o.height,glass=id==='malm-6-glass',body=h-(glass?.006:0),wood=o.colour||'#302723',cols=glass?2:1,rows=glass?3:2;
    box(w,body,d,0,body/2,0,wood);
    // Recessed plinth and narrow gaps define MALM's handleless drawer fronts.
    box(w-.04,.055,.012,0,.0275,d/2,'#171311');
    for(let c=0;c<cols;c++)for(let r=0;r<rows;r++){
      const front=box(w/cols-.018,(body-.08)/rows-.012,.018,-w/2+w/cols*(c+.5),.055+(body-.08)/rows*(r+.5),d/2,wood);
      front.userData.storagePart='drawer';
    }
    if(glass){const top=box(w,.006,d,0,h-.003,0,'#f4f5f2');top.material=top.material.clone();top.material.roughness=.08;top.userData.storagePart='glass-top';}
    return true;
  }
  if(!['lyla-display','lyla-tv-bench','dunelm-fulton-extra-wide-pine'].includes(id))return false;
  const w=o.width,d=o.depth,h=o.height,wood=o.colour || '#ae784b',metal='#343638',t=.025;
  const fulton=id==='dunelm-fulton-extra-wide-pine',base=fulton?h*12/42:0;
  const part=(name,...args)=>{const mesh=box(...args);mesh.userData.storagePart=name;return mesh;};
  const shelf=(width,y,x=0)=>part('shelf',width,t,d,x,y,0,wood);
  const front=(kind,x,y,width,height)=>{
    const face=part(kind,width,height,t,x,y,d/2-t/2,wood);
    if(fulton)part('handle',Math.min(.1,width*.25),.015,.02,x,y,d/2+.01,metal);
    else ball(.012,x,y,d/2+.008,metal);return face;
  };
  shelf(w,base+t/2);shelf(w,h-t/2);
  for(const x of [-w/2+t/2,w/2-t/2])box(t,h-base,d,x,(h+base)/2,0,wood);
  box(w,h-base,t,0,(h+base)/2,-d/2+t/2,wood);
  if(id==='lyla-display'){
    const drawerTop=h*.35;
    for(let i=0;i<3;i++)front('drawer',0,(i+.5)*drawerTop/3,w-2*t,drawerTop/3-.01);
    shelf(w,drawerTop);for(const y of [h*.55,h*.75])shelf(w-2*t,y);
    const glass=part('glass',w-4*t,h-drawerTop-2*t,.01,0,(h+drawerTop)/2,d/2,'#b9d0d3');
    glass.material=glass.material.clone();glass.material.transparent=true;glass.material.opacity=.22;
    for(const x of [-w/2+t,w/2-t])box(t,h-drawerTop,t,x,(h+drawerTop)/2,d/2,wood);
    ball(.012,w*.36,h*.6,d/2+.008,metal);
  }else{
    const centreWidth=w*(fulton?.52:.4),body=h-base;
    for(const sign of [-1,1]){
      box(t,body,d,sign*centreWidth/2,(h+base)/2,0,wood);
      front('door',sign*(w+centreWidth)/4,(h+base)/2,(w-centreWidth)/2-2*t,body-2*t);
    }
    shelf(centreWidth,base+body*.5);
    if(fulton){
      box(t,body,d,0,(h+base)/2,0,wood);
      for(const x of [-centreWidth/4,centreWidth/4])front('drawer',x,base+body*.25,centreWidth/2-2*t,body*.5-2*t);
      for(const x of [-w*.45,w*.45]){for(const z of [-d*.4,d*.4])box(.025,base,.025,x,base/2,z,metal);box(.025,.025,d*.8,x,.0125,0,metal);}
    }
  }
  return true;
}

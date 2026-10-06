import * as THREE from 'three';

/** Bathroom fittings. Backs sit at negative Z, against the wall. */
export function bathroomAssets({kit,tone}){
  const white='#f6f4ee',shade='#dfe5e3',chrome='#c6ccd0',glass=new THREE.MeshBasicMaterial({color:'#cfe9ee',transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide});
  const oval=(mesh,w,d)=>{mesh.scale.set(1,1,d/w);return mesh;};
  function toilet(o){
    const {group,soft,cyl,box}=kit(),w=o.width,d=o.depth,h=o.height,tank=Math.min(.2,d*.28),bowl=d-tank;
    soft(w*.92,h-.42,tank,0,.42,-d/2+tank/2,white,.03);soft(w*.96,.035,tank+.02,0,h-.02,-d/2+tank/2,white,.012);cyl(.022,.012,0,h+.015,-d/2+tank/2,chrome);
    soft(w*.5,.36,bowl*.62,0,0,-d/2+tank+bowl*.3,white,.06);
    oval(cyl(w/2,.1,0,.32,d/2-bowl*.52,white,w*.36,24),w,bowl*.98);
    oval(cyl(w/2+.008,.022,0,.42,d/2-bowl*.52,shade,w/2+.008,24),w,bowl*.98);oval(cyl(w/2-.01,.018,0,.44,d/2-bowl*.52,white,w/2-.01,24),w,bowl*.96);
    return group;
  }
  function basin(o){
    const {group,soft,cyl,box}=kit(),w=o.width,d=o.depth,h=o.height;
    if(w>=.5){
      // Vanity unit: two flat doors under a one-piece basin top.
      box(w-.03,h-.24,d-.03,0,.1,0,'#ece7dc');for(const side of [-1,1]){box(w/2-.03,h-.3,.014,side*(w/4-.004),.13,d/2-.008,white);box(.012,.1,.018,side*.03,h*.5,d/2+.006,chrome);}
      for(const x of [-w/2+.05,w/2-.05])box(.03,.1,.03,x,0,d/2-.06,chrome);
    }else{cyl(.06,h-.13,0,0,-d*.1,white,.085);}
    soft(w,.13,d,0,h-.13,0,white,.045);oval(cyl(Math.min(w,d*2)*.36,.012,0,h-.008,d*.06,shade,Math.min(w,d*2)*.36,20),1,Math.min(1.5,d*1.35/Math.min(w,d*2)));
    cyl(.016,.1,0,h,-d*.36,chrome);box(.02,.016,.09,0,h+.085,-d*.36+.045,chrome);
    return group;
  }
  function bath(o){
    const {group,soft,box,cyl}=kit(),w=o.width,d=o.depth,h=o.height,rim=.075;
    box(w-.02,.14,d-.02,0,0,0,white);for(const side of [-1,1])soft(rim,h,d,side*(w/2-rim/2),0,0,white,.03);for(const end of [-1,1])soft(w,h,rim+.02,0,0,end*(d/2-rim/2-.01),white,.03);
    // The well's floor sits low inside the rim, so the tub reads as hollow.
    box(w-rim*2,.02,d-rim*2-.04,0,.14,0,shade);cyl(.02,.008,0,.16,-d/2+rim+.16,chrome);
    cyl(.014,.14,0,h,-d/2+rim*.5,chrome);box(.02,.018,.12,0,h+.12,-d/2+rim*.5+.06,chrome);for(const side of [-1,1])cyl(.02,.03,side*.08,h,-d/2+rim*.5,chrome);
    return group;
  }
  function shower(o){
    const {group,soft,box,cyl}=kit(),w=o.width,d=o.depth,h=o.height,metal=o.colour||chrome;
    soft(w,.06,d,0,0,0,white,.02);box(w-.14,.006,d-.14,0,.06,0,shade);cyl(.035,.006,0,.066,0,chrome);
    // Two glazed sides with slim posts; the wall sides stay open so the room's own walls show.
    for(const [x,z] of [[-w/2,d/2],[w/2,d/2],[w/2,-d/2]])box(.025,h,.025,x*.985,0,z*.985,metal);
    box(w,.022,.022,0,h-.022,d/2*.985,metal);box(.022,.022,d,w/2*.985,h-.022,0,metal);
    const front=new THREE.Mesh(new THREE.PlaneGeometry(w-.03,h-.08),glass);front.position.set(0,h/2+.03,d/2*.985);front.layers.set(1);group.add(front);
    const side=new THREE.Mesh(new THREE.PlaneGeometry(d-.03,h-.08),glass);side.rotation.y=Math.PI/2;side.position.set(w/2*.985,h/2+.03,0);side.layers.set(1);group.add(side);
    cyl(.012,h-.25,-w*.2,.25,-d/2+.04,chrome);box(.1,.14,.04,-w*.2,1.0,-d/2+.045,chrome);box(.02,.02,.22,-w*.2,h-.04,-d/2+.14,chrome);cyl(.1,.014,-w*.2,h-.07,-d/2+.26,chrome);
    return group;
  }
  function towelRail(o){
    const {group,cyl,box}=kit(),w=o.width,h=o.height,colour=o.colour||chrome,rungs=Math.max(6,Math.round(h/.09));
    for(const side of [-1,1]){cyl(.012,h,side*(w/2-.012),0,0,colour);box(.024,.03,(o.depth||.1),side*(w/2-.012),h*.12,-(o.depth||.1)/2,colour);}
    for(let i=1;i<rungs;i++)if(i%5){const rung=cyl(.008,w-.024,0,0,0,colour);rung.rotation.z=Math.PI/2;rung.position.set(0,h*i/rungs,0);}
    // A folded towel over an upper rung.
    box(w*.62,.26,.035,0,h*.52,.012,'#8fb0b6');
    return group;
  }
  return {toilet,bath,shower,towelRail,sink:o=>o.variant==='inset'?null:basin(o)};
}

import * as THREE from 'three';

/** Seating, plants, lights and small electricals. Fronts face positive Z; wall fittings back on to negative Z. */
export function livingAssets({kit,tone,wood,cloth,seeded}){
  const dark='#1b1d1f',facing=mesh=>{mesh.rotation.x=Math.PI/2;return mesh;};
  // A lit part needs a material of its own: the renderer tints it with the lamp's colour.
  const shade=colour=>new THREE.MeshLambertMaterial({color:colour});
  function officeChair(o){
    const {group,soft,cyl,box}=kit(),w=o.width,d=o.depth,h=o.height,fabric=cloth(o.colour||'#3f4a52'),seat=Math.min(.5,h*.44),reach=Math.min(w,d)*.46;
    // Five-star base on castors, a gas lift, then a seat and a curved back that leans a little.
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5+.3,arm=box(reach,.03,.045,Math.sin(a)*reach/2,.06,Math.cos(a)*reach/2,dark);arm.rotation.y=a-Math.PI/2;cyl(.028,.05,Math.sin(a)*reach,0,Math.cos(a)*reach,'#0f1011');}
    cyl(.03,seat-.12,0,.07,0,'#8d9498');cyl(.05,.05,0,seat-.09,0,dark);
    soft(w*.74,.08,d*.7,0,seat-.03,.02,fabric,.035);
    const back=soft(w*.68,h-seat-.12,.06,0,seat+.12,-d*.33,fabric,.03);back.rotation.x=-.12;box(.05,.2,.03,0,seat-.02,-d*.33,dark).rotation.x=-.12;
    for(const side of [-1,1]){box(.03,.2,.03,side*w*.4,seat-.02,-d*.02,dark);soft(.055,.03,d*.36,side*w*.4,seat+.18,.02,dark,.012);}
    return group;
  }
  function plant(o){
    const {group,cyl,ball}=kit(),w=o.width,d=o.depth,h=o.height,next=seeded(o.id),pot=Math.min(w,d)*.3,tall=Math.min(h*.3,.34),leaf=Math.min(w,d)*.3;
    cyl(pot*.74,tall,0,0,0,o.colour||'#b9714f',pot);cyl(pot*1.04,.03,0,tall-.03,0,tone(o.colour||'#b9714f',-.05),pot*1.04);cyl(pot*.9,.012,0,tall-.008,0,'#3b2f27',pot*.9);
    cyl(.016,h*.5,0,tall,0,'#5a4a36',.011);
    // Broad leaves in three tiers, each turned a little so no two line up.
    for(let i=0;i<14;i++){const tier=i%3,angle=i*2.4+next()*.5,out=leaf*(1.05-tier*.28),y=tall+(h-tall)*(.32+tier*.24)+next()*.05;
      const blade=ball(leaf,Math.sin(angle)*out,y,Math.cos(angle)*out,['#4f8a5b','#63a06c','#3f7650'][i%3]);blade.scale.set(.6,.16,1.2);blade.rotation.set(-.5-tier*.15,angle,0,'YXZ');}
    ball(leaf*.8,0,h-leaf*.5,0,'#63a06c').scale.set(.8,.9,.8);
    return group;
  }
  function floorLamp(o){
    const {group,cyl}=kit(),w=o.width,d=o.depth,h=o.height,radius=Math.min(w,d)/2,drum=Math.min(.36,h*.24),metal='#2a2b2d';
    cyl(radius*.62,.025,0,0,0,metal);cyl(.014,h-drum-.02,0,.025,0,metal);
    const lit=cyl(radius,drum,0,h-drum,0,shade('#efe3c4'),radius*.8,20);lit.userData.lightEmitter=true;
    cyl(radius*.8+.004,.012,0,h-.012,0,'#d9ccac',radius*.8+.004,20);cyl(radius+.004,.012,0,h-drum,0,'#d9ccac',radius+.004,20);
    return group;
  }
  function wallLight(o){
    const {group,box,soft}=kit(),w=o.width,d=o.depth,h=o.height,body=o.colour||'#262727';
    // A lantern on a back plate: cap, glazed cage and a short arm to the wall.
    box(w*.7,h*.6,.012,0,h*.2,-d/2+.006,body);box(w*.3,.03,d*.5,0,h*.5,-d/4,body);
    soft(w,h*.1,d*.86,0,h*.9,.01,body,.01);box(w*.86,.02,d*.74,0,h*.14,.01,body);
    for(const x of [-1,1])for(const z of [-1,1])box(.01,h*.76,.01,x*(w*.43-.005),h*.14,.01+z*(d*.37-.005),body);
    box(w*.74,h*.7,d*.62,0,h*.17,.01,shade('#eee9dc')).userData.lightEmitter=true;
    return group;
  }
  function tower(o){
    const {group,box,soft}=kit(),w=o.width,d=o.depth,h=o.height,colour=o.colour||'#26282b';
    for(const x of [-w/2+.03,w/2-.03])for(const z of [-d/2+.05,d/2-.05])box(.03,.02,.05,x,0,z,'#0d0e0f');
    soft(w,h-.02,d,0,.02,0,colour,.012);
    // Mesh front with a lit edge, a dark glazed side and vents on top.
    box(w*.78,h*.84,.006,0,.06,d/2+.003,'#101112');for(let i=1;i<8;i++)box(w*.74,.004,.008,0,.06+h*.84*i/8,d/2+.006,tone(colour,.06));
    box(.006,h*.84,.008,-w*.36,.06,d/2+.007,new THREE.MeshBasicMaterial({color:'#6fc3ff'}));
    box(.006,h*.74,d*.8,w/2+.003,.1,0,'#0e1114');for(let i=0;i<5;i++)box(w*.6,.004,.014,0,h,-d*.3+i*d*.15,'#101112');
    box(.014,.014,.004,w*.3,h-.05,d/2+.008,new THREE.MeshBasicMaterial({color:'#ffe9c0'}));
    return group;
  }
  function bookshelfSpeaker(o){
    const {group,box,soft,cyl}=kit(),w=o.width,d=o.depth,h=o.height,cabinet=o.colour?o.colour:wood('#7b5236'),size=Math.min(w,h);
    // Cabinet on small feet, a dark baffle, and a woofer under a tweeter, each a ringed disc.
    for(const x of [-w/2+.03,w/2-.03])box(.03,.012,d*.7,x,0,0,dark);
    soft(w,h-.012,d,0,.012,0,cabinet,.012);box(w-.03,h-.045,.008,0,.028,d/2+.004,dark);
    const cone=(radius,y)=>{facing(cyl(radius,.008,0,y,d/2+.009,'#3a3d40',radius,20));facing(cyl(radius*.72,.008,0,y,d/2+.014,'#111213',radius*.72,20));facing(cyl(radius*.26,.008,0,y,d/2+.019,'#55595c',radius*.26,12));};
    cone(size*.29,h*.36);cone(size*.12,h*.76);
    return group;
  }
  function wallFan(o){
    const {group,soft,cyl,box}=kit(),w=o.width,d=o.depth,h=o.height,white=o.colour||'#f4f3ed',radius=Math.min(w,h)*.36;
    soft(w,h,d,0,0,0,white,.02);facing(cyl(radius,.006,0,h/2,d/2+.002,'#6a7170',radius,24));
    // Louvres across the opening and a small hub, so it reads as a vent at any size.
    for(let i=-2;i<=2;i++)box(Math.sqrt(1-(i*.36)**2)*radius*1.9,h*.035,.01,0,h/2+i*radius*.36-h*.0175,d/2+.01,white);
    facing(cyl(radius*.22,.008,0,h/2,d/2+.014,white,radius*.22,14));
    return group;
  }
  return {office_chair:o=>o.product_id?null:officeChair(o),plant,lamp:floorLamp,wall_light:o=>o.product_id?null:wallLight(o),tower,bookshelfSpeaker,
    extractor_fan:o=>o.variant==='wall'?wallFan(o):null};
}

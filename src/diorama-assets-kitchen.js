import * as THREE from 'three';

/** Kitchen and dining furniture. Fronts face positive Z; see diorama-assets.js for the shared kit. */
export function kitchenAssets({kit,tone,wood,cloth,seeded}){
  const steel='#c3c8ca',glass=new THREE.MeshBasicMaterial({color:'#cfe6ea',transparent:true,opacity:.14,depthWrite:false});
  // A framed Shaker front: four raised rails round a recessed panel.
  function shaker(box,w,h,x,y,z,colour,{handle='bar',steelColour=steel,glazed=false,group}={}){
    const rail=Math.min(.065,w*.2),face=tone(colour,.03);
    if(glazed){const pane=new THREE.Mesh(new THREE.PlaneGeometry(w-rail*2,h-rail*2),glass);pane.position.set(x,y+h/2,z+.004);pane.layers.set(1);group.add(pane);}
    else box(w,h,.014,x,y,z,colour);
    for(const side of [-1,1])box(rail,h,.022,x+side*(w/2-rail/2),y,z+.004,face);
    for(const top of [0,1])box(w-rail*2,rail,.022,x,y+top*(h-rail),z+.004,face);
    if(handle==='bar')box(.012,Math.min(.14,h*.3),.02,x+w/2-rail/2,y+h*.62,z+.024,steelColour);
    else if(handle==='pull')box(Math.min(.16,w*.4),.012,.02,x,y+h-rail/2,z+.024,steelColour);
  }
  function base(o){
    const {group,box,cyl}=kit(),w=o.width,d=o.depth,h=o.height,colour=o.colour||'#eee9d8',top=o.worktop_colour||tone(colour,-.12),handles=o.handle_colour||steel;
    box(w-.02,.1,d-.08,0,0,-.03,'#2f2c2a');box(w,h-.14,d-.03,0,.1,-.015,colour);box(w+.012,.04,d+.02,0,h-.04,0,top);
    const bays=Math.max(1,Math.round(w/.6)),bay=w/bays,front=d/2,tall=h-.16;
    for(let i=0;i<bays;i++){const x=-w/2+bay*(i+.5);
      if(o.variant==='drawers')for(let row=0;row<3;row++)shaker(box,bay-.012,tall/3-.01,x,.11+row*tall/3,front,colour,{handle:'pull',steelColour:handles});
      else shaker(box,bay-.012,tall-.01,x,.11,front,colour,{steelColour:handles});}
    return group;
  }
  function cooker(o){
    const {group,box,cyl}=kit(),w=o.width,d=o.depth,h=o.height;
    box(w-.02,.1,d-.08,0,0,-.03,'#2f2c2a');box(w,h-.14,d-.03,0,.1,-.015,'#2b2d30');box(w+.012,.04,d+.02,0,h-.04,0,'#444544');
    box(w-.06,h*.46,.012,0,.16,d/2,'#111315');box(w-.1,.02,.03,0,.16+h*.46+.03,d/2+.02,steel);box(w-.04,.09,.012,0,h-.25,d/2,'#3a3d41');
    for(let i=0;i<4;i++)cyl(.016,.02,-w*.3+i*w*.2,h-.215,d/2+.012,steel).rotation.x=Math.PI/2;
    // Glass hob with four zones: thin discs so the ink pass draws the rings.
    box(w-.04,.008,d-.1,0,h,0,'#101113');
    for(const [x,z,r] of [[-w*.2,-d*.16,.085],[w*.2,-d*.16,.07],[-w*.2,d*.16,.07],[w*.2,d*.16,.085]]){cyl(r,.004,x,h+.008,z,'#34373b');cyl(r*.55,.004,x,h+.012,z,'#17181a');}
    return group;
  }
  function hood(o){
    const {group,box}=kit(),w=o.width,d=o.depth,h=o.height;
    box(w,.07,d,0,0,0,steel);box(w*.9,.012,d*.85,0,-.006,0,'#8d9396');box(w*.42,h-.07,d*.55,0,.07,-d*.2,tone(steel,-.04));
    return group;
  }
  function wallUnit(o){
    const {group,box,cyl}=kit(),w=o.width,d=o.depth,h=o.height,colour=o.colour||'#eee9d8',glazed=o.variant==='glass',bays=Math.max(1,Math.round(w/.5)),bay=w/bays,next=seeded(o.id);
    if(glazed){box(w,.02,d,0,0,0,colour);box(w,.02,d,0,h-.02,0,colour);for(const side of [-1,1])box(.02,h,d,side*(w/2-.01),0,0,colour);box(w,h,.012,0,0,-d/2+.006,tone(colour,-.06));
      for(const y of [h*.36,h*.68])box(w-.04,.012,d-.03,0,y,0,'#dfe7e4');
      for(const y of [.02,h*.36+.012,h*.68+.012])for(let i=0;i<Math.round(w/.16);i++)if(next()>.3)cyl(.035+next()*.02,.05+next()*.07,-w/2+.09+i*.16,y,0,next()>.5?'#f5f2ea':'#9fb8c4',.03);}
    else box(w,h,d,0,0,0,colour);
    box(w+.02,.03,d+.02,0,h,0,tone(colour,.03));
    for(let i=0;i<bays;i++)shaker(box,bay-.012,h-.02,-w/2+bay*(i+.5),.01,d/2,colour,{steelColour:o.handle_colour||steel,glazed,group});
    return group;
  }
  function fridge(o){
    const {group,box}=kit(),w=o.width,d=o.depth,h=o.height,colour=o.colour||'#eee9d8',split=h*.42;
    box(w-.02,.1,d-.08,0,0,-.03,'#2f2c2a');box(w,h-.1,d-.03,0,.1,-.015,colour);box(w+.03,.05,d+.02,0,h-.05,0,tone(colour,.03));
    shaker(box,w-.014,split-.12,0,.11,d/2,colour,{steelColour:o.handle_colour||steel});shaker(box,w-.014,h-split-.07,0,split,d/2,colour,{steelColour:o.handle_colour||steel});
    return group;
  }
  // An inset bowl cannot be carved from the worktop, so it is drawn as a rim with a dark well.
  function sink(o){
    const {group,box,cyl,add}=kit(),w=o.width,d=o.depth;
    box(w,.01,d,0,0,0,steel);box(w*.46,.006,d*.74,-w*.2,.01,0,'#7d8588');box(w*.4,.003,d*.66,-w*.2,.016,0,'#5d6568');
    for(let i=0;i<6;i++)box(w*.36,.004,.012,w*.27,.01,-d*.3+i*d*.12,tone(steel,-.08));
    cyl(.018,.06,-w*.2,.01,-d*.42,steel);cyl(.012,.24,-w*.2,.07,-d*.42,steel);
    const spout=add(new THREE.TorusGeometry(.07,.011,8,14,Math.PI),steel,-w*.2,.31,-d*.42+.07);spout.rotation.y=Math.PI/2;
    return group;
  }
  function diningTable(o){
    const {group,box,soft,cyl,ball}=kit(),w=o.width,d=o.depth,h=o.height,top=o.colour||'#929497',leg=o.leg_colour||'#202122';
    soft(w,.04,d,0,h-.04,0,top,.012);box(w-.16,.07,d-.16,0,h-.11,0,tone(top,-.1));
    for(const x of [-w/2+.07,w/2-.07])for(const z of [-d/2+.07,d/2-.07])box(.055,h-.04,.055,x,0,z,leg);
    // Runner and fruit bowl.
    box(w*.34,.004,d*.82,0,h,0,cloth('#c9b89a'));cyl(.09,.05,0,h+.004,0,'#e9e2d0',.14);
    for(const [x,z,c] of [[-.04,.02,'#d1543f'],[.04,-.03,'#e3a23b'],[.01,.05,'#7da453']])ball(.038,x,h+.075,z,c);
    return group;
  }
  function chair(o){
    const {group,box,soft}=kit(),w=o.width,d=o.depth,h=o.height,seat=cloth(o.colour||'#85888b'),leg=o.leg_colour||'#202122';
    for(const x of [-w/2+.035,w/2-.035]){box(.03,.45,.03,x,0,d/2-.035,leg);const back=box(.03,h,.03,x,0,-d/2+.035,leg);back.rotation.x=-.05;}
    soft(w,.07,d,0,.43,0,seat,.03);const rest=soft(w-.02,h*.36,.045,0,h*.6,-d/2+.03,seat,.02);rest.rotation.x=-.08;
    return group;
  }
  return {dining_table:diningTable,chair,fridge,
    kitchen_unit:o=>o.variant==='cooker'?cooker(o):o.variant==='extractor'?hood(o):['wall','glass'].includes(o.variant)?wallUnit(o):base(o),
    sink:o=>o.variant==='inset'?sink(o):null};
}

import * as THREE from 'three';

/** Desks, screens and cube storage. Users sit at positive Z. */
export function officeAssets({kit,tone,wood,cloth,seeded,bookColours}){
  function desk(o){
    const {group,box,soft}=kit(),w=o.width,d=o.depth,h=o.height,colour=o.colour||'#303738',bench=o.product_id==='bror-workbench',top=bench?wood(colour):colour,metal=bench?'#1f2123':o.product_id?.startsWith('bekant')?'#d8dadb':tone(colour,-.06),next=seeded(o.id);
    soft(w,bench?.045:.03,d,0,h-(bench?.045:.03),0,top,.008);
    if(bench){for(const x of [-w/2+.03,w/2-.03])for(const z of [-d/2+.03,d/2-.03])box(.04,h-.045,.04,x,0,z,metal);box(w-.06,.02,d-.06,0,.2,0,metal);for(const z of [-d/2+.03,d/2-.03])box(w-.06,.03,.02,0,h-.1,z,metal);}
    else{
      // Sit-stand style end frames: a column on a foot, joined by a rail under the top.
      for(const side of [-1,1]){const x=side*(w/2-.12);box(.06,h-.06,.08,x,.03,0,metal);box(.07,.03,d*.86,x,0,0,metal);box(.05,.03,d*.7,x,h-.06,0,metal);}
      box(w-.24,.05,.03,0,h-.1,-d*.2,metal);box(w*.6,.1,.012,0,h-.16,-d/2+.06,tone(colour,-.04));
    }
    if(w>=1.3&&!bench){box(.44,.012,.14,-w*.05,h,d*.2,'#1b1d1f');box(.42,.006,.12,-w*.05,h+.012,d*.2,'#2f3235');box(.07,.02,.11,w*.2,h,d*.2,'#1b1d1f');
      const mug=new THREE.Mesh(new THREE.CylinderGeometry(.04,.035,.09,14),new THREE.MeshLambertMaterial({color:bookColours[Math.floor(next()*bookColours.length)]}));mug.position.set(w*.36,h+.045,d*.05);group.add(mug);}
    return group;
  }
  function monitor(o){
    const {group,box,cyl}=kit(),w=o.width,h=o.height,d=o.depth,curved=w>.9,panels=curved?7:1,radius=curved?1.25:1e6,tall=h*.62,base=h-tall,screen=new THREE.MeshBasicMaterial({color:'#24385f'});
    cyl(.012,.012,0,0,-d*.1,'#1b1d1f').scale.set(curved?14:9,1,7);box(.05,base+tall*.5,.03,0,.012,-d*.25,'#1b1d1f');
    for(let i=0;i<panels;i++){const angle=(i-(panels-1)/2)*(w/panels)/radius,pivot=new THREE.Group();pivot.position.set(Math.sin(angle)*radius,0,radius-Math.cos(angle)*radius-d*.2);pivot.rotation.y=-angle;group.add(pivot);
      const back=new THREE.Mesh(new THREE.BoxGeometry(w/panels+.004,tall,.03),new THREE.MeshLambertMaterial({color:o.colour&&curved?'#d7dadc':'#1b1d1f'}));back.position.y=base+tall/2;back.castShadow=true;pivot.add(back);
      const face=new THREE.Mesh(new THREE.PlaneGeometry(w/panels+.004,tall-.03),screen);face.position.set(0,base+tall/2,.016);pivot.add(face);}
    return group;
  }
  // Open cube storage with no back, as built: a thick frame, thin dividers and a different
  // thing in every cube, readable from either side.
  function cubes(o){
    const {group,box,cyl,ball}=kit(),w=o.width,d=o.depth,h=o.height,colour=o.colour||'#39312b',frame=wood(colour),columns=Math.max(1,Math.round(w/.37)),rows=Math.max(1,Math.round(h/.37)),cw=(w-.08)/columns,ch=(h-.08)/rows,next=seeded(o.id);
    for(const side of [-1,1])box(.04,h,d,side*(w/2-.02),0,0,frame);for(const y of [0,h-.04])box(w,.04,d,0,y,0,frame);
    for(let c=1;c<columns;c++)box(.016,h-.08,d-.01,-w/2+.04+cw*c,.04,0,frame);for(let r=1;r<rows;r++)box(w-.08,.016,d-.01,0,.04+ch*r,0,frame);
    for(let c=0;c<columns;c++)for(let r=0;r<rows;r++){const x=-w/2+.04+cw*(c+.5),y=.04+ch*r+(r?.008:0),pick=next();
      if(pick<.4){let at=x-cw/2+.02;while(at<x+cw/2-.05){const thick=.02+next()*.028;box(thick,ch*(.6+next()*.3),d*.6,at+thick/2,y,d/2-.04-d*.3,bookColours[Math.floor(next()*bookColours.length)]);at+=thick+.003;}}
      else if(pick<.68){box(cw-.03,ch-.04,d-.04,x,y,.01,cloth(['#8a8f8c','#b9a88c','#566b78','#a5523d'][Math.floor(next()*4)]));box(.09,.02,.012,x,y+ch*.6,d/2,'#2a2725');}
      else if(pick<.84){cyl(.05,.08,x,y,0,'#c96f4a',.06);ball(.075,x,y+.15,0,'#4f8a5b');ball(.05,x+.04,y+.2,.02,'#63a06c');}
      else if(pick<.93){for(let i=0;i<3;i++)box(cw*.6,.03,d*.55,x,y+i*.03,0,bookColours[Math.floor(next()*bookColours.length)]).rotation.y=(next()-.5)*.3;}
    }
    return group;
  }
  return {desk,ultrawide_monitor:monitor,cubes};
}

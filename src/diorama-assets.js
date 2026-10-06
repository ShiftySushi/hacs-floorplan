import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {furniture3D} from './furniture3d.js';
import {lavaColours} from './lava3d.js';
import {fabric,grain,rug as rugTexture} from './diorama-textures.js';
import {kitchenAssets} from './diorama-assets-kitchen.js';
import {bathroomAssets} from './diorama-assets-bathroom.js';
import {bedroomAssets} from './diorama-assets-bedroom.js';
import {officeAssets} from './diorama-assets-office.js';

const tone=(colour,l,s=0)=>'#'+new THREE.Color(colour).offsetHSL(0,s,l).getHexString();
// Illustration keeps its darks readable: near-black furniture is drawn as charcoal, so
// form and outline survive in a dim room. Hue and relative order are preserved.
export function lift(colour){const c=new THREE.Color(colour),hsl={};c.getHSL(hsl);return hsl.l>=.26?colour:'#'+c.setHSL(hsl.h,hsl.s*.9,.17+hsl.l*.35).getHexString();}
function seeded(text){let s=2166136261;for(const c of String(text))s=Math.imul(s^c.charCodeAt(0),16777619);return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
const bookColours=['#8c3b33','#2f5d62','#d9a441','#3d405b','#81b29a','#e07a5f','#f2e9d8','#5b4636','#6d597a','#355070','#b56576','#4a6741'];

/**
 * Hand-designed furniture for the fixed diorama angle. Dimensions are metres,
 * the origin is the footprint centre at floor level and fronts face positive Z.
 */
export function createAssets(){
  const materials=new Map(),textures=new Map();
  const textured=(kind,colour,make)=>{const key=kind+colour;if(!textures.has(key))textures.set(key,make(colour));return textures.get(key);};
  function mat(colour,options={}){
    if(colour.isMaterial)return colour;
    colour=lift(colour);const key=colour+JSON.stringify(options);
    if(!materials.has(key))materials.set(key,new THREE.MeshLambertMaterial({color:colour,...options}));return materials.get(key);
  }
  const wood=colour=>{colour=lift(colour);const key='wood'+colour;if(!materials.has(key)){const map=textured('grain',colour,grain);materials.set(key,new THREE.MeshLambertMaterial({map}));}return materials.get(key);};
  const cloth=colour=>{colour=lift(colour);const key='cloth'+colour;if(!materials.has(key)){const map=textured('fabric',colour,fabric);map.repeat.set(3,3);materials.set(key,new THREE.MeshLambertMaterial({map}));}return materials.get(key);};

  function kit(){
    const group=new THREE.Group();
    const add=(geometry,colour,x,y,z)=>{const mesh=new THREE.Mesh(geometry,mat(colour));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;};
    // y is always the underside, so heights read like a section drawing.
    const box=(w,h,d,x=0,y=0,z=0,colour='#888')=>add(new THREE.BoxGeometry(w,h,d),colour,x,y+h/2,z);
    const soft=(w,h,d,x=0,y=0,z=0,colour='#888',r=.04)=>add(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/2,h/2,d/2)),colour,x,y+h/2,z);
    const cyl=(r,h,x=0,y=0,z=0,colour='#888',top=r,segments=16)=>add(new THREE.CylinderGeometry(top,r,h,segments),colour,x,y+h/2,z);
    const ball=(r,x,y,z,colour)=>add(new THREE.SphereGeometry(r,14,10),colour,x,y,z);
    return {group,box,soft,cyl,ball,add};
  }

  function sofa(o){
    const {group,box,soft,cyl}=kit(),w=o.width,d=o.depth,h=o.height,base=o.colour||'#6f7a80',body=cloth(base),cushion=cloth(tone(base,.07)),arm=.22,inner=w-arm*2,seat=inner/3;
    for(const x of [-w/2+.1,w/2-.1])for(const z of [-d/2+.1,d/2-.1])cyl(.03,.07,x,0,z,'#2b2422');
    soft(w-.03,.22,d-.05,0,.06,0,body,.05);
    for(const side of [-1,1])soft(arm,.6,d,side*(w/2-arm/2),.06,0,body,.09);
    soft(inner+.04,h-.34,.26,0,.26,-d/2+.14,body,.1);
    for(let i=0;i<3;i++){const x=-inner/2+seat*(i+.5);
      soft(seat-.02,.2,d-.34,x,.27,.13,cushion,.07);
      soft(seat-.04,.4,.17,x,.45,-d/2+.33,cushion,.08).rotation.x=-.14;
      soft(seat-.1,.17,.15,x,h-.2,-d/2+.2,cushion,.07).rotation.x=-.1;}
    // A folded throw and a cushion: small, deliberate signs of life.
    soft(.52,.34,.31,-inner/2+seat*.5,h-.37,-d/2+.14,cloth('#c9993f'),.04);
    const pillow=soft(.36,.36,.13,inner/2-.2,.46,.06,cloth('#a5523d'),.06);pillow.rotation.set(-.25,-.35,.08);
    return group;
  }

  function cabinet(o,{colour,dark=false}){
    const {group,box,cyl}=kit(),w=o.width,d=o.depth,h=o.height,leg=h>.5?.11:.08,body=dark?mat(colour):wood(colour),face=dark?mat(tone(colour,.04)):wood(tone(colour,.035)),trim=dark?'#0f1011':tone(colour,-.16);
    for(const x of [-w/2+.05,w/2-.05])for(const z of [-d/2+.05,d/2-.05])box(.045,leg,.045,x,0,z,dark?'#101112':tone(colour,-.08));
    box(w,h-leg-.03,d,0,leg,0,body);box(w+.03,.03,d+.03,0,h-.03,0,dark?mat(tone(colour,.05)):wood(tone(colour,.05)));
    const bays=Math.max(2,Math.round(w/.5)),bay=w/bays,top=h-leg-.03;
    for(let i=0;i<bays;i++){const x=-w/2+bay*(i+.5),open=dark&&bays>2&&i>0&&i<bays-1;
      if(open){box(bay-.03,top-.05,.01,x,leg+.025,d/2-.02,'#08090a');box(bay-.03,.015,.03,x,leg+top*.5,d/2-.012,body);}
      else{box(bay-.025,top-.05,.016,x,leg+.025,d/2+.006,face);box(bay-.11,top-.14,.006,x,leg+.07,d/2+.015,dark?mat(tone(colour,.015)):wood(tone(colour,.01)));
        cyl(.011,.02,x+(i<bays/2?1:-1)*(bay/2-.06),leg+top*.55,d/2+.03,trim).rotation.x=Math.PI/2;}
    }
    return group;
  }

  function tv(o){
    const {group,box}=kit(),w=o.width,h=o.height;
    box(w,h,.035,0,0,0,'#141618');box(w*.3,.05,.05,0,.08,-.035,'#1d2023');
    for(const x of [-w*.32,w*.32]){box(.025,.09,.025,x,-.08,0,'#1d2023');box(.03,.012,.22,x,-.08,0,'#1d2023');}
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(w-.03,h-.03),new THREE.MeshBasicMaterial({color:'#05080b'}));screen.position.set(0,h/2,.0185);screen.userData.tvScreen=true;group.add(screen);
    return group;
  }

  function sideTable(o){
    const {group,box,cyl}=kit(),w=o.width,d=o.depth,h=o.height,frame=o.colour||'#3a3c3f',next=seeded(o.id);
    for(const x of [-w/2+.012,w/2-.012])for(const z of [-d/2+.012,d/2-.012])box(.022,h,.022,x,0,z,frame);
    for(const y of [.14,h-.025])box(w,.025,d,0,y,0,wood('#8a6a4b'));
    cyl(.035,.08,0,h,d*.18,next()>.5?'#e9e2d0':'#c8695a',.04);
    for(let i=0;i<3;i++)box(.2-i*.015,.025,.27,0,.165+i*.025,-d*.1,bookColours[Math.floor(next()*bookColours.length)]).rotation.y=(next()-.5)*.3;
    return group;
  }

  function rug(o){
    const {group,box}=kit(),w=o.width,d=o.depth,key='rug';
    if(!materials.has(key))materials.set(key,new THREE.MeshLambertMaterial({map:rugTexture()}));
    const top=materials.get(key),edge=mat('#6b2f2b');
    const body=new THREE.Mesh(new THREE.BoxGeometry(w,.018,d),[edge,edge,top,edge,edge,edge]);body.position.y=.009;body.receiveShadow=true;group.add(body);
    for(const side of [-1,1])for(let i=0;i<Math.round(d/.045);i++)box(.07,.006,.014,side*(w/2+.035),0,-d/2+.0225+i*.045,'#e6d6b4');
    return group;
  }

  function radiator(o){
    const {group,box,cyl}=kit(),w=o.width,h=o.height,d=o.depth,white=o.colour||'#f4f3ed',fins=Math.max(4,Math.round(w/.07));
    box(w,h,.03,0,0,-d/2+.03,white);
    for(let i=0;i<fins;i++)box(w/fins*.62,h-.04,d*.5,-w/2+w/fins*(i+.5),.02,0,white);
    box(w,.018,d*.7,0,h-.018,0,tone(white,-.05));
    for(const side of [-1,1]){cyl(.012,.14,side*(w/2-.03),-.12,0,'#c9c6bd');cyl(.02,.045,side*(w/2+.02),.02,0,'#f8f7f2').rotation.z=Math.PI/2;}
    return group;
  }

  function piano(o){
    const {group,box,cyl}=kit(),w=o.width,d=o.depth,h=o.height,body=wood(o.colour||'#3a2620'),trim=wood('#2c1c18'),back=-d/2+.17,keys=back+.17+.14;
    box(w,h-.03,.34,0,0,back,body);
    // Upright pianos have a framed back: posts over a paler soundboard.
    box(w-.12,h-.3,.012,0,.16,back-.176,wood('#7a5a40'));for(let i=0;i<5;i++)box(.07,h-.12,.035,-w/2+.1+i*(w-.2)/4,.06,back-.185,trim);box(w+.03,.035,.38,0,h-.035,back,trim);box(w-.02,.1,.06,0,.0,back+.2,trim);
    box(w,.09,.3,0,.6,keys,body);for(const side of [-1,1]){box(.06,.24,.3,side*(w/2-.03),.6,keys,trim);box(.07,.6,.07,side*(w/2-.06),0,keys+.1,trim);}
    box(w-.14,.022,.15,0,.69,keys+.06,'#f3efe4');
    const count=Math.round((w-.14)/.0235);
    for(let i=0;i<count;i++)if([1,2,4,5,6].includes(i%7))box(.012,.014,.09,-(w-.14)/2+i*.0235,.712,keys+.03,'#17120f');
    const desk=box(.62,.24,.015,0,.82,back+.185,trim);desk.rotation.x=-.2;const sheet=box(.42,.2,.006,0,.84,back+.2,'#f1ecdd');sheet.rotation.x=-.2;
    for(let i=-1;i<=1;i++)cyl(.012,.05,i*.09,.03,back+.24,'#c4a046').rotation.x=Math.PI/2.4;
    return group;
  }

  function bookshelf(o){
    const {group,box,cyl,ball}=kit(),w=o.width,d=o.depth,h=o.height,oak=wood(o.colour||'#ae784b'),dark=wood(tone(o.colour||'#ae784b',-.1)),next=seeded(o.id),shelves=Math.max(2,Math.round((h-.13)/.36)),inner=w-.06,bay=(h-.13)/shelves;
    for(const side of [-1,1])box(.03,h,d,side*(w/2-.015),0,0,oak);
    box(w,.03,d,0,h-.03,0,oak);box(w,.1,d-.02,0,0,-.01,dark);
    // The back is often what this angle shows: a pale panel held by battens, not a blank slab.
    box(inner,h-.1,.012,0,.1,-d/2+.006,wood(tone(o.colour||'#ae784b',.07)));for(const y of [h*.3,h*.68])box(inner,.05,.014,0,y,-d/2-.004,dark);
    for(let s=0;s<shelves;s++){const y=.1+s*bay;box(inner,.022,d-.02,0,y,0,oak);
      let x=-inner/2+.01;const stop=inner/2-(s%2&&inner>.6?.2:.02);
      while(x<stop-.05){const thick=.022+next()*.03,tall=bay*(.55+next()*.33),deep=d*(.55+next()*.2);
        const book=box(thick,tall,deep,x+thick/2,y+.022,d/2-.03-deep/2,bookColours[Math.floor(next()*bookColours.length)]);
        if(next()>.88){book.rotation.z=-.22;book.position.x+=.02;x+=.03;}x+=thick+.003;}
      if(s%2&&inner>.6){cyl(.045,.07,inner/2-.1,y+.022,0,'#c96f4a',.055);ball(.07,inner/2-.1,y+.15,0,'#4f8a5b');ball(.05,inner/2-.06,y+.2,.02,'#63a06c');}
    }
    return group;
  }

  function displayCabinet(o){
    const {group,box,cyl,ball}=kit(),w=o.width,d=o.depth,h=o.height,colour=o.colour||'#ae784b',oak=wood(colour),dark=wood(tone(colour,-.1)),lower=h*.36,next=seeded(o.id);
    for(const x of [-w/2+.045,w/2-.045])for(const z of [-d/2+.045,d/2-.045])box(.045,.1,.045,x,0,z,dark);
    box(w,lower-.1,d,0,.1,0,oak);box(w+.02,.025,d+.02,0,lower,0,wood(tone(colour,.04)));
    for(const side of [-1,1]){box(w/2-.025,lower-.2,.016,side*w/4,.15,d/2+.006,wood(tone(colour,.03)));cyl(.011,.02,side*.035,lower*.6,d/2+.03,tone(colour,-.2)).rotation.x=Math.PI/2;}
    // Glazed upper case: a real frame with shelves and ornaments behind the glass.
    for(const side of [-1,1]){box(.035,h-lower-.025,d,side*(w/2-.0175),lower+.025,0,oak);}
    box(.03,h-lower-.06,.03,0,lower+.025,d/2-.015,oak);
    box(w,.035,d,0,h-.035,0,oak);box(w-.07,h-lower-.06,.012,0,lower+.025,-d/2+.006,wood(tone(colour,.08)));
    for(const y of [lower+.025,h-.07])box(w-.07,.035,.03,0,y,d/2-.015,oak);
    const rows=3,gap=(h-lower-.1)/rows;
    for(let r=0;r<rows;r++){const y=lower+.03+r*gap;if(r)box(w-.07,.012,d-.04,0,y,0,'#d9e6e3');
      for(const x of [-w*.22,w*.2]){const pick=next();
        if(pick<.35){cyl(.035,.12+next()*.08,x,y+.012,0,bookColours[Math.floor(next()*bookColours.length)],.02);}
        else if(pick<.7){cyl(.05,.035,x,y+.012,0,'#efe7d6',.065);}
        else ball(.045,x,y+.058,0,bookColours[Math.floor(next()*bookColours.length)]);}
    }
    const glass=new THREE.Mesh(new THREE.PlaneGeometry(w-.07,h-lower-.06),new THREE.MeshBasicMaterial({color:'#bfe3ea',transparent:true,opacity:.1,depthWrite:false}));glass.position.set(0,lower+.025+(h-lower-.06)/2,d/2-.004);glass.layers.set(1);group.add(glass);
    return group;
  }

  function computer(o){
    const {group,box,soft}=kit(),w=o.width,d=o.depth,h=o.height;
    if(o.variant==='ps5'){
      box(w*.5,h*.95,d*.92,0,.01,0,'#111214');
      for(const side of [-1,1]){const plate=soft(.014,h,d,side*(w/2-.007),0,0,o.colour||'#e9eaec',.006);plate.rotation.z=-side*.03;}
      box(w*.5,.006,d*.9,0,h*.95,0,new THREE.MeshBasicMaterial({color:'#5aa7ff'}));
      return group;
    }
    if(o.variant!=='north')return null;
    for(const x of [-w/2+.03,w/2-.03])for(const z of [-d/2+.05,d/2-.05])box(.03,.02,.05,x,0,z,'#0d0e0f');
    soft(w,h-.02,d,0,.02,0,o.colour||'#262727',.012);box(w*.8,.004,d*.8,0,h,0,'#101112');
    const slats=9;for(let i=0;i<slats;i++)box(w*.8/slats*.6,h*.82,.014,-w*.4+w*.8/slats*(i+.5),.06,d/2+.004,wood('#a97b50'));
    box(.012,.012,.004,w*.32,h-.04,d/2+.004,new THREE.MeshBasicMaterial({color:'#ffe9c0'}));
    return group;
  }

  function speaker(o){
    const {group,box,soft}=kit(),w=o.width,d=o.depth,h=o.height,colour=o.colour||'#262727';
    if(o.product_id==='sonos-arc'){soft(w,h,d,0,0,0,colour,h*.48);return group;}
    if(o.variant==='sub'){soft(w,h,d,0,0,0,colour,.06);box(w*.42,h*.5,d+.006,0,h*.25,0,'#070708');return group;}
    return null;
  }

  function picture(o){
    const {group,box}=kit(),w=o.width,h=o.height,d=o.depth;
    box(w,h,d,0,0,0,wood(o.colour||'#c4a27a'));box(w-.05,h-.05,.006,0,.025,d/2,'#f3efe3');
    const art=new THREE.Mesh(new THREE.PlaneGeometry(w-.12,h-.12),new THREE.MeshLambertMaterial({color:'#6f8f8a'}));art.position.set(0,h/2,d/2+.005);group.add(art);
    if(typeof o.artwork_image==='string'&&/^(\/(?!\/)|https?:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(o.artwork_image))new THREE.TextureLoader().load(o.artwork_image,texture=>{texture.colorSpace=THREE.SRGBColorSpace;art.material.map=texture;art.material.color.set('#ffffff');art.material.needsUpdate=true;});
    return group;
  }

  function lavaLamp(o){
    const {group,add}=kit(),pair=lavaColours[o.lava_colour??9]||lavaColours[9],metal=mat(o.colour||'#202022');
    const lathe=(points,material)=>add(new THREE.LatheGeometry(points.map(([r,y])=>new THREE.Vector2(r,y)),28),material,0,0,0);
    lathe([[0,0],[.07,0],[.07,.014],[.035,.11],[.059,.155]],metal);lathe([[.032,.372],[.032,.38],[.018,.427],[0,.43]],metal);
    const wax=new THREE.MeshLambertMaterial({color:pair[2],emissive:pair[2],emissiveIntensity:0}),blobs=[];
    for(let i=0;i<5;i++){const blob=new THREE.Mesh(new THREE.SphereGeometry(.017,14,10),wax);blob.position.y=.18+i*.035;group.add(blob);blobs.push(blob);}
    const liquid=new THREE.MeshBasicMaterial({color:pair[1],transparent:true,opacity:.3,depthWrite:false});
    const bottle=new THREE.Mesh(new THREE.LatheGeometry([[0,.145],[.058,.145],[.059,.17],[.032,.37],[0,.373]].map(([r,y])=>new THREE.Vector2(r,y)),28),liquid);bottle.layers.set(1);group.add(bottle);
    const scale=o.height/.43;group.scale.setScalar(scale);
    group.userData.glow={colour:new THREE.Color(pair[1]).lerp(new THREE.Color(pair[2]),.4),height:.27*scale};
    group.userData.animate=(time,level)=>{wax.emissiveIntensity=level*.9;liquid.opacity=.18+level*.3;
      blobs.forEach((blob,i)=>{const t=time/9+i*1.7;blob.position.set(Math.sin(t*1.3)*.014,.2+(Math.sin(t)+1)*.07,Math.cos(t*.9)*.01);blob.scale.set(1,1.25+Math.sin(t*.8)*.4,1);});};
    return group;
  }

  const context={kit,mat,wood,cloth,tone,seeded,bookColours},kitchen=kitchenAssets(context),bathroom=bathroomAssets(context),bedroom=bedroomAssets(context),office=officeAssets(context);
  const hung=o=>{const model=o.variant==='towel_rail'?bathroom.towelRail(o):radiator(o);return model;};
  const builders={...kitchen,...bathroom,...bedroom,...office,sofa,tv,rug,radiator:hung,piano,display_cabinet:displayCabinet,computer,speaker,picture,
    bookshelf:o=>o.variant==='cubes'?office.cubes(o):bookshelf(o),sink:o=>kitchen.sink(o)||bathroom.sink(o),
    tv_bench:o=>cabinet(o,o.product_id?.startsWith('lyla-')?{colour:o.colour||'#ae784b'}:{colour:o.colour||'#252626',dark:true}),
    side_table:o=>bedroom.side_table(o)||(o.variant?null:sideTable(o)),lamp:o=>o.product_id?.startsWith('mathmos-')?lavaLamp(o):null,tv_lightstrip:()=>new THREE.Group()};

  /** Returns a positioned-at-origin model; unknown types fall back to the existing library. */
  function build(object){
    const o={width:1,depth:.6,height:.8,...object},model=builders[o.type]?.(o);
    if(!model){const fallback=furniture3D(object);fallback.traverse(node=>{for(const material of [node.material].flat())if(material?.color&&!material.userData.lifted&&!material.map){material.color.set(lift('#'+material.color.getHexString()));material.userData.lifted=true;}});return fallback;}
    model.rotation.y=-(o.rotation||0)*Math.PI/180;return model;
  }
  return {build,dispose(){for(const texture of textures.values())texture.dispose();}};
}

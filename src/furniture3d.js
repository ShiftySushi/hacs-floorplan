import * as THREE from 'three';
import { panelArrangement } from './catalogue.js';
import { productPreset } from './product-catalogue.js';
import { productStorage3D } from './product-storage3d.js';
import {aeron3D} from './aeron3d.js';
import {printer3D} from './printers3d.js';
import {edifier3D} from './edifier3d.js';
import {shaker3D} from './shaker3d.js';
import {lava3D} from './lava3d.js';
import {iaito3D} from './iaito3d.js';

/** Original, procedural furniture: dimensions in metres, front faces positive Z. */
export function furniture3D(object) {
  const group = new THREE.Group();
  const product=productPreset(object);
  const noah=object.product_id?.startsWith('lyla-');
  const w = object.width || 1, d = object.depth || .6, h = object.height || .8;
  const palette = { wood: object.colour || '#ac8059', dark: '#334148', fabric: object.colour || '#8cabb0', pale: '#eee9dc', white: '#f4f3ed', green: '#5c936c' };
  const materials = new Map();
  const mat = colour => { if (!materials.has(colour)) materials.set(colour, new THREE.MeshStandardMaterial({ color: colour, roughness: .78 })); return materials.get(colour); };
  function box(width, height, depth, x = 0, y = height / 2, z = 0, colour = palette.wood) {
    const rounded=noah&&colour===palette.wood,geometry=new THREE.BoxGeometry(Math.max(.01,width),Math.max(.01,height),Math.max(.01,depth),rounded?16:1,1,rounded?16:1);
    if(rounded){
      const p=geometry.attributes.position,r=Math.min(.04,width/2,depth/2);
      for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.max(0,Math.abs(x)-width/2+r),b=Math.max(0,z-depth/2+r),k=r/Math.hypot(a,b);
        if(a&&b&&k<1)p.setXYZ(i,Math.sign(x)*(width/2-r+a*k),p.getY(i),depth/2-r+b*k);
      }geometry.computeVertexNormals();
    }
    const mesh = new THREE.Mesh(geometry, mat(colour));
    mesh.position.set(x,y,z); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  function ball(radius,x,y,z,colour,scale=[1,1,1]) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius,12,8),mat(colour));mesh.position.set(x,y,z);mesh.scale.set(...scale);mesh.castShadow=true;group.add(mesh);
  }
  function legs(top=h,colour=palette.wood) { for(const x of [-w*.38,w*.38])for(const z of [-d*.36,d*.36])box(.05,top,.05,x,top/2,z,colour); }
  function table() {
    legs(h-.07,object.leg_colour || palette.wood);const top=box(w,.07,d,0,h-.035);
    if(object.surface_finish==='speckled'){
      const data=new Uint8Array(128*128*4);for(let i=0;i<128*128;i++){const v=(i*73%241)<12?165:245;data.set([v,v,v,255],i*4);}const texture=new THREE.DataTexture(data,128,128);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(w*3,d*3);texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;top.material=top.material.clone();top.material.map=texture;top.userData.surfaceFinish='speckled';
    }
  }
  function chair(office=false) { legs(h*.45,object.leg_colour || (office?palette.dark:palette.wood));box(w,h*.13,d,0,h*.48,0,palette.fabric);box(w,h*.48,.09,0,h*.76,-d*.44,palette.fabric); if(office)for(const x of [-w*.48,w*.48])box(.05,.06,d*.65,x,h*.7,0,palette.dark); }
  if(object.variant==='sword'){
    iaito3D(group,object);
  }else if(!shaker3D(object,box)&&!productStorage3D(object,box,ball))switch(object.type) {
    case 'pegboard':{
      box(w,h,d,0,h/2,0,object.colour || '#242628');
      const rows=Math.max(2,Math.round(h/.04)),cols=Math.max(2,Math.round(w/.04));
      const slots=new THREE.InstancedMesh(new THREE.BoxGeometry(.006,.014,.002),mat('#7b939d'),rows*cols),matrix=new THREE.Matrix4();
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){matrix.makeTranslation(w*((col+.5)/cols-.5),h*(row+.5)/rows,d/2+.002);slots.setMatrixAt(row*cols+col,matrix);}group.add(slots);
      for(const y of [h*.27,h*.7])box(w*.82,.014,.09,0,y,d/2+.035,'#222426');
      break;
    }
    case 'extractor_fan':{
      const wall=object.variant==='wall',white=object.colour || '#f4f3ed';
      box(w,h,d,0,h/2,0,white);
      if(wall){
        box(w*.78,h*.78,.01,0,h/2,d/2+.002,'#636968');
        for(let i=0;i<8;i++)box(w*.8,h*.045,.014,0,h*(.18+i*.09),d/2+.01,white);
      }else{
        for(const side of [-1,1]){
          box(w*.78,.01,d*.78,0,side<0?-.002:h+.002,0,'#636968');
          for(let i=0;i<8;i++)box(w*.8,.014,d*.045,0,side<0?-.01:h+.01,d*(-.32+i*.09),white);
        }
      }break;
    }
    case 'rug': box(w,.015,d,0,.012,0,object.colour || '#c5b59a'); for(let z=-d*.42;z<d*.46;z+=.14)box(w*.88,.003,.025,0,.022,z,'#e9dfc8');break;
    case 'sofa':
      box(w,h*.5,d,0,h*.3,0,palette.fabric);box(w,h*.45,d*.18,0,h*.76,-d*.41,palette.fabric);
      for(const x of [-w*.45,w*.45])box(w*.1,h*.62,d,x,h*.48,0,palette.fabric);
      {const seats=Math.max(1,Math.round(w/.7)),seatWidth=w*.82/seats;for(let i=0;i<seats;i++)box(seatWidth-.025,.12,d*.65,-w*.41+seatWidth*(i+.5),h*.6,d*.08,product?palette.fabric:palette.pale);}
      if(object.variant==='corner'){box(w*.3,h*.55,d*.48,-w*.3,h*.3,d*.36,palette.fabric);box(w*.28,.12,d*.5,-w*.3,h*.61,d*.35,palette.pale);}break;
    case 'bed':
      if(product){
        // Slim ottoman frame; total height is the headboard, not the mattress.
        box(w,h*.29,d-.1,0,h*.145,.05);
        box(w,h,.07,0,h/2,-d/2+.035);
        const vertical=object.variant==='ealing',count=vertical?6:3;
        for(let i=0;i<count;i++)box(vertical?w/count-.008:w,vertical?h*.7:h*.7/count-.008,.04,vertical?-w/2+w/count*(i+.5):0,vertical?h*.65:h*.3+h*.7/count*(i+.5),-d/2+.08).userData.bedPart='padding';
        box(w-.04,.24,d-.14,0,h*.29+.12,.05,palette.pale).userData.bedPart='mattress';
        box(w-.02,.06,d*.62,0,h*.29+.26,d*.18,palette.white);
        for(const x of [-w*.24,w*.24])box(w*.42,.12,.4,x,h*.29+.3,-d*.3,palette.white);
        box(.26,.025,.012,0,h*.27,d/2,palette.dark);break;
      }
      box(w,h*.32,d);box(w*.98,h*.4,d*.94,0,h*.5,0,palette.pale);box(w,.8*h,.09,0,h*.55,-d*.48);
      box(w*.99,.08,d*.58,0,h*.75,d*.19,palette.fabric);
      for(const x of object.variant==='single'?[0]:[-w*.24,w*.24])box(w*(object.variant==='single'?.72:.4),.12,d*.17,x,h*.76,-d*.32,palette.white);break;
    case 'dining_table': case 'side_table': case 'desk':
      if(product&&['bekant-140','bekant-160','magnus-pro-xl'].includes(product.id)){
        box(w,.04,d,0,h-.02);const frame=object.colour==='#f1f0eb'||object.colour==='#f5f5f2'?palette.white:palette.dark;
        for(const x of [-w*.38,w*.38]){box(.08,h-.04,.08,x,(h-.04)/2,0,frame);box(.09,.04,d*.9,x,.02,0,frame);}
      }else if(product?.id==='bror-workbench'){legs(h-.04,palette.dark);box(w,.04,d,0,h-.02);box(w,.03,d,0,h*.15,0,palette.dark);}
      else if(product?.id==='vasagle-let326'){box(w,h,d);for(const y of [h*.32,h*.69]){box(w*.92,h*.3,.02,0,y,d/2);box(w*.35,.018,.025,0,y+h*.07,d/2+.02,palette.dark);}}
      else table();
      if(object.type==='desk'&&object.variant!=='plain'){box(w*.35,h*.6,d*.8,-w*.28,h*.4);box(w*.32,h*.32,.05,w*.15,h*1.2,-d*.25,palette.dark);box(w*.2,.02,d*.13,w*.15,h+.025,d*.08,palette.dark);}break;
    case 'chair':chair();break;
    case 'office_chair':if(object.product_id==='aeron-b')aeron3D(group,object.colour);else chair(true);break;
    case 'printer_3d':printer3D(object,box,group);break;
    case 'picture':box(w,h,d);box(w*.94,h*.91,.01,0,h/2,d/2,'#f3efe3');box(w*.81,h*.71,.01,0,h/2,d/2+.006,'#73948b').userData.artwork=true;break;
    case 'tv':{
      const wall=product&&object.variant==='wall',panelDepth=product?Math.min(d,.0243):.06,panelHeight=product&&!wall?h*.9077:h;
      box(w,panelHeight,panelDepth,0,h-panelHeight/2,0,palette.dark);
      box(w*.97,panelHeight*.97,.01,0,h-panelHeight/2,panelDepth/2,'#162b3e').userData.tvScreen=true;
      if(!wall)box(w*.35,.04,product?d:.25,0,.02);break;
    }
    case 'wall_light':{
      const hue=object.product_id==='hue-impress',body=object.colour || '#262727';
      box(w,h,.015,0,h/2,-d/2+.0075,body);
      if(hue){
        box(w,.025,d,0,.0125,0,body);box(w,.025,d,0,h-.0125,0,body);
        for(const x of [-w/2+.008,w/2-.008])box(.016,h,d,x,h/2,0,body);
        box(w*.6,h*.72,d*.6,0,h/2,0,'#eee9dc').userData.lightEmitter=true;
      }else{
        box(w,h,d,0,h/2,0,body);
        for(const y of [.18,.5,.82])box(w*.88,h*.23,.012,0,h*y,d/2,'#eee9dc').userData.lightEmitter=true;
      }break;
    }
    case 'tv_lightstrip':{
      const colour=object.colour || '#eee6fc',thickness=.025;
      box(w,thickness,.025,0,h-thickness/2,0,colour);box(w,thickness,.025,0,thickness/2,0,colour);
      for(const x of [-w/2+thickness/2,w/2-thickness/2])box(thickness,h,.025,x,h/2,0,colour);if(object.sync_media_entity)for(const child of group.children)child.material=child.material.clone();break;
    }
    case 'nanoleaf_panels':{
      const {radius,centres}=panelArrangement(object,w,h);
      for(const [panelIndex,[x,y]] of centres.entries()){const shape=new THREE.Shape();for(let i=0;i<6;i++){const angle=(30+i*60)*Math.PI/180,px=Math.cos(angle)*radius*.97,py=Math.sin(angle)*radius*.97;if(i)shape.lineTo(px,py);else shape.moveTo(px,py);}shape.closePath();
        const panelMaterial=new THREE.MeshStandardMaterial({color:object.colour || '#f2e8fc',roughness:.78});panelMaterial.userData.panelIndex=panelIndex;
        const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.022,bevelEnabled:false}),panelMaterial);mesh.userData.panelIndex=panelIndex;mesh.position.set(x,h/2-y,0);mesh.castShadow=true;group.add(mesh);
      }break;
    }
    case 'speaker':
      if(object.product_id?.startsWith('edifier-s1000db-')){edifier3D(group,object.product_id.endsWith('right'));break;}
      if(object.variant==='sub'){for(const x of [-w*.4,w*.4])box(w*.2,h,d,x,h/2);for(const y of [h*.1,h*.9])box(w,h*.2,d,0,y);}
      else {const bar=new THREE.Mesh(new THREE.CylinderGeometry(h/2,h/2,w,16),mat(palette.wood));bar.rotation.z=Math.PI/2;bar.scale.z=d/h;bar.position.y=h/2;bar.castShadow=bar.receiveShadow=true;group.add(bar);}break;
    case 'computer':if(object.variant==='n5'){box(w,h,d,0,h/2,0,'#272a2b');for(let i=0;i<7;i++)box(w*.9,h*.025,.018,0,h*(.07+i*.06),d/2,'#946d48');for(let i=0;i<18;i++){box(w*.88,.003,.012,0,h*(.57+i*.021),d/2,'#090c0d');box(.003,h*.37,.014,w*(i/20-.425),h*.75,d/2,'#090c0d');}for(let i=0;i<3;i++)box(.012,.008,.02,w*(.16+i*.08),h*.5,d/2+.015,'#bac1c3');break;}if(object.variant==='ps5'){box(w*.75,h*.96,d*.96,0,h/2,0,'#171819');for(const x of [-w/2+.005,w/2-.005]){box(.01,h,d,x);for(let i=0;i<3;i++)box(.012,.01,d,x,h*(.53+i*.035),0,'#171819');}break;}if(object.variant==='north'){box(w,h,d);for(let i=0;i<10;i++)box(w*.045,h*.92,.01,w*(i/10-.45),h/2,d/2-.005,'#795334');break;}box(w,h,d,0,h/2,0,palette.dark);box(w*.82,h*.86,.012,0,h/2,d/2+.008,'#597785');for(const y of [h*.3,h*.7])ball(w*.26,0,y,d/2+.025,object.colour || '#91c4d3',[1,1,.1]);break;
    case 'ultrawide_monitor':{
      const samsung=object.product_id?.startsWith('samsung-'),ultra=object.product_id==='samsung-g93sc-49',ph=samsung?(ultra?.365:.3828):h*.8;
      for(let i=0;i<(samsung?32:1);i++){const count=samsung?32:1,x=w*((i+.5)/count-.5),z=samsung?x*x/(ultra?3.6:2):0;const m=box(w/count+.001,ph,.025,x,h-ph/2,z,object.colour||palette.dark);m.rotation.y=samsung?-Math.atan(x/(ultra?1.8:1)):0;const screen=box(w/count+.001,ph*.94,.005,x,h-ph/2,z+.017,'#548295');screen.rotation.y=m.rotation.y;}
      box(.035,h-ph+.03,.035,0,(h-ph)/2,0,object.colour||palette.dark);box(w*.4,.025,d,0,.0125,0,object.colour||palette.dark);break;
    }
    case 'tv_bench':case 'display_cabinet':case 'bookshelf':
      box(w,.06,d,0,.03);box(w,.06,d,0,h-.03);for(const x of [-w/2+.03,w/2-.03])box(.06,h,d,x);
      if(object.variant!=='cubes')box(w,h,.025,0,h/2,-d/2);
      {const bays=product?.columns || Math.max(1,Math.round(w/(object.variant==='cubes'?.38:.7))),rows=product?.rows || Math.max(1,Math.round(h/.4));
      for(let bay=1;bay<bays;bay++)box(.035,h,d,-w/2+w*bay/bays);
      for(let row=1;row<rows;row++){const y=h*row/rows;box(w,.035,d,0,y);if(object.type!=='tv_bench'&&object.variant!=='cubes'){const books=Math.max(1,Math.floor((w-.12)/.09));for(let i=0;i<books;i++)box(.055,Math.min(.25,h/rows*.75),Math.min(.2,d*.75),-w/2+.08+i*(w-.16)/books,y+Math.min(.25,h/rows*.75)/2,0,['#788e82','#b79877','#a2a8b6','#c8bba6','#819da7'][i%5]);}}}
      if(product?.id==='lyla-sideboard'){for(const x of [-w*.33,w*.33]){box(w*.32,h*.86,.035,x,h*.5,d/2);ball(.012,x,h*.6,d/2+.02,palette.dark);}
      for(let i=0;i<3;i++){box(w*.3,h*.27,.035,0,h*(.2+i*.29),d/2);ball(.012,0,h*(.2+i*.29),d/2+.02,palette.dark);}}
      break;
    case 'piano':
      if(object.variant==='grand'){
        const shape=new THREE.Shape();shape.moveTo(-w*.5,-d*.5);shape.lineTo(w*.5,-d*.5);shape.lineTo(w*.45,0);shape.bezierCurveTo(w*.4,d*.6,-w*.5,d*.65,-w*.5,d*.1);shape.closePath();
        const lid=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false}),mat(palette.dark));lid.rotation.x=-Math.PI/2;lid.position.y=h*.65;lid.castShadow=true;group.add(lid);
        legs(h*.65,palette.dark);box(w,.035,d*.22,0,h*.7,d*.4,palette.white);for(let i=0;i<14;i++)box(.025,.025,d*.11,-w*.4+i*w*.06,h*.73,d*.34,palette.dark);
      }else{const body=product?palette.wood:palette.dark;box(w,h*.8,d*.55,0,h*.6,-d*.2,body);legs(h*.55,body);box(w,.1,d,0,h*.55,0,body);box(w*.9,.035,d*.42,0,h*.62,d*.2,palette.white);for(let i=0;i<14;i++)box(.025,.025,d*.2,-w*.4+i*w*.06,h*.65,d*.09,palette.dark);}break;
    case 'toilet':box(w*.7,h*.7,d*.25,0,h*.58,-d*.35,palette.white);ball(w*.46,0,h*.38,d*.12,palette.white,[1,.65,d/w*.8]);ball(w*.29,0,h*.55,d*.13,'#bbcdd0',[1,.08,d/w*.8]);box(w*.4,h*.3,d*.4,0,h*.15,d*.1,palette.white);break;
    case 'sink':
      if(object.variant==='inset'){
        box(w,.02,d,0,.01,0,'#bfc8cc');box(w*.45,.012,d*.7,-w*.2,.024,0,'#4c626a');
        for(let i=0;i<6;i++)box(w*.35,.008,.012,w*.28,.025,d*(i/8-.3),'#8c999e');
        box(.025,h,.025,0,h/2,-d*.38,'#bfc8cc');box(.025,.025,d*.3,0,h-.012,-d*.23,'#bfc8cc');break;
      }
      box(w,h*.78,d,0,h*.39,0,palette.wood);box(w,.07,d,0,h*.83,0,palette.white);ball(w*.32,0,h*.87,0,'#bacdd0',[1,.08,d/w*.65]);box(.025,.17,.025,0,h*.96,-d*.33,palette.dark);break;
    case 'bath':box(w,.1,d,0,.05,0,palette.white);for(const x of [-w*.46,w*.46])box(w*.08,h,d,x,h/2,0,palette.white);for(const z of [-d*.46,d*.46])box(w,h,d*.08,0,h/2,z,palette.white);box(w*.82,.015,d*.8,0,h*.4,0,'#b9d5d8');break;
    case 'shower':{const chrome=mat(object.colour||'#cbd0d2');chrome.metalness=.75;chrome.roughness=.2;const before=group.children.length;box(w,.08,d,0,.04,0,palette.white);for(const x of [-w*.48,w*.48])box(.03,h,.03,x,h/2,-d*.48,palette.dark);box(w,.035,.035,0,h,-d*.48,palette.dark);box(.03,h*.65,.03,0,h*.55,-d*.46,palette.dark);box(.15,.025,.16,0,h*.9,-d*.35,palette.dark);for(const mesh of group.children.slice(before+1))mesh.material=chrome;break;}
    case 'kitchen_unit':case 'island':case 'kitchen_island':
      if(object.variant==='cooker'){
        box(w,h,d,0,h/2,0,'#9da5a8');box(w*.84,h*.58,.015,0,h*.4,d/2+.008,'#151e23');box(w*.65,.025,.04,0,h*.72,d/2+.02,'#cad0d2');
        box(w,.02,d,0,h,0,'#161e22');for(const x of [-w*.25,w*.25])for(const z of [-d*.25,d*.25]){ball(w*.15,x,h+.015,z,'#78858a',[1,.08,1]);ball(w*.09,x,h+.022,z,'#202729',[1,.08,1]);}
        for(let i=0;i<4;i++)ball(.02,w*(i/5-.3),h*.87,d/2+.016,'#252e31');break;
      }
      if(object.variant==='extractor'){
        box(w,.08,d,0,.04,0,'#aeb8bc');box(w*.4,h-.08,d*.4,0,(h+.08)/2,-d*.3,'#aeb8bc');box(w*.8,.025,d*.7,0,.008,0,'#3c484d');break;
      }
      if(object.variant==='wall'){
        box(w,h,d,0,h/2,0,palette.fabric);
        const count=Math.max(1,Math.round(w/.6));for(let i=0;i<count;i++){const x=-w/2+w*(i+.5)/count;box(w/count-.012,h-.02,.012,x,h/2,d/2+.006,palette.fabric);box(.02,.12,.025,x+w/count*.3,h*.18,d/2+.027,object.handle_colour || palette.dark);}break;
      }
      box(w,h*.93,d,0,h*.465,0,palette.fabric);box(w+.035,h*.07,d+.035,0,h*.965,0,object.worktop_colour || palette.pale);
      {const doors=Math.max(1,Math.round(w/.6)),doorWidth=w/doors;for(let i=0;i<doors;i++){const x=-w/2+doorWidth*(i+.5);box(Math.max(.02,doorWidth-.012),h*.76,.012,x,h*.47,d/2+.006,palette.fabric);box(Math.min(.16,doorWidth*.5),.02,.025,x,h*.78,d/2+.027,object.handle_colour || palette.dark);if(i)box(.009,h*.76,.015,-w/2+doorWidth*i,h*.47,d/2+.014,palette.dark);}}
      break;
    case 'fridge':box(w,h,d,0,h/2,0,object.colour || '#bec6c6');box(w*.94,.02,.02,0,h*.67,d*.51,palette.dark);box(.035,h*.18,.035,w*.35,h*.45,d*.53,object.handle_colour || palette.dark);break;
    case 'plant':box(w*.5,h*.28,d*.5,0,h*.14,0,'#b88868');box(.035,h*.6,.035,0,h*.5,0,palette.wood);for(let i=0;i<5;i++)ball(w*.34,Math.sin(i*2)*w*.22,h*.65+i*h*.035,Math.cos(i*2)*d*.2,palette.green,[1,1.3,1]);break;
    case 'stairs':for(let i=0;i<10;i++){
      const step=box(w,h*(i+1)/10,d/10,0,h*(i+1)/20,-d/2+d*(i+.5)/10,palette.pale);
      // Hollow flight: a continuous sloping soffit leaves usable storage below.
      if(object.variant==='understairs'){
        const p=step.geometry.attributes.position;
        for(let j=0;j<p.count;j++)if(p.getY(j)<0)p.setY(j,Math.max(0,h*((i+.5)/10+p.getZ(j)/d)-.2)-step.position.y);
        p.needsUpdate=true;step.geometry.computeVertexNormals();
      }
    }
      if(object.banister){const x=-w/2+.025;for(let i=0;i<=10;i++){const y=h*i/10,z=-d/2+d*i/10;box(i%5===0?.045:.022,.85,i%5===0?.045:.022,x,y+.425,z,'#f4f3ed');}const rail=box(.055,.055,Math.hypot(d,h),x,h/2+.88,0,'#b38a5f');rail.rotation.x=-Math.atan2(h,d);}
      break;
    case 'lamp':if(object.product_id?.startsWith('mathmos-')){lava3D(group,object);break;}box(w*.55,.035,d*.55,0,.018,0,palette.dark);box(.025,h*.78,.025,0,h*.4,0,palette.dark);box(w,h*.25,d,0,h*.85,0,palette.pale);break;
    case 'radiator':{
      if(object.variant==='towel_rail'){
        const colour=object.colour || '#cdd',chrome=mat(colour);chrome.metalness=colour.toLowerCase()==='#f4f3ed'?0:.65;chrome.roughness=colour.toLowerCase()==='#f4f3ed'?.7:.16;
        const pipe=(length,radius,x,y,turn=0)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,12),chrome);mesh.position.set(x,y,0);mesh.rotation.z=turn;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);};
        for(const x of [-w/2+.012,w/2-.012]){pipe(h,.012,x,h/2);for(const y of [h*.15,h*.85])box(.024,.03,d,x,y,-d/2+.015,colour);}
        for(let i=1;i<15;i++)if(i!==5&&i!==10)pipe(w-.024,.008,0,h*i/15,Math.PI/2);
        break;
      }
      const body=object.colour || palette.white,fins=Math.max(3,Math.min(200,Math.round(w/.055))),pitch=w/fins;
      box(w,h*.86,d*.55,0,h*.53,0,body);
      for(let i=0;i<fins;i++)box(pitch*.68,h*.85,d,-w/2+pitch*(i+.5),h*.53,0,body);
      for(const x of [-w*.44,w*.44])box(.025,h*.18,.025,x,h*.09,0,palette.dark);
      for(const x of [-w*.49,w*.49])box(.035,.06,d*.75,x,h*.14,0,palette.dark);
      break;
    }
    default:box(w,h,d,0,h/2,0,palette.fabric);
  }
  if(product || object.type==='extractor_fan' || object.type==='printer_3d' || object.type==='picture' || object.variant==='ps5'){
    // Decorative details must not enlarge or shrink a measured product's footprint.
    const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());
    for(const child of group.children)child.position.sub(new THREE.Vector3(centre.x,bounds.min.y,centre.z));
    group.scale.set(w/size.x,h/size.y,d/size.z);
  }
  group.rotation.y=-(object.rotation || 0)*Math.PI/180;
  return group;
}

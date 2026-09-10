import * as THREE from 'three';
import { panelArrangement } from './catalogue.js';

/** Original, procedural furniture: dimensions in metres, front faces positive Z. */
export function furniture3D(object) {
  const group = new THREE.Group();
  const w = object.width || 1, d = object.depth || .6, h = object.height || .8;
  const palette = { wood: object.colour || '#ac8059', dark: '#334148', fabric: object.colour || '#8cabb0', pale: '#eee9dc', white: '#f4f3ed', green: '#5c936c' };
  const materials = new Map();
  const mat = colour => { if (!materials.has(colour)) materials.set(colour, new THREE.MeshStandardMaterial({ color: colour, roughness: .78 })); return materials.get(colour); };
  function box(width, height, depth, x = 0, y = height / 2, z = 0, colour = palette.wood) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(.01,width), Math.max(.01,height), Math.max(.01,depth)), mat(colour));
    mesh.position.set(x,y,z); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  function ball(radius,x,y,z,colour,scale=[1,1,1]) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius,12,8),mat(colour));mesh.position.set(x,y,z);mesh.scale.set(...scale);mesh.castShadow=true;group.add(mesh);
  }
  function legs(top=h,colour=palette.wood) { for(const x of [-w*.38,w*.38])for(const z of [-d*.36,d*.36])box(.05,top,.05,x,top/2,z,colour); }
  function table() {legs(h-.07);box(w,.07,d,0,h-.035);}
  function chair(office=false) { legs(h*.45,office?palette.dark:palette.wood);box(w,h*.13,d,0,h*.48,0,palette.fabric);box(w,h*.48,.09,0,h*.76,-d*.44,palette.fabric); if(office)for(const x of [-w*.48,w*.48])box(.05,.06,d*.65,x,h*.7,0,palette.dark); }
  switch(object.type) {
    case 'rug': box(w,.015,d,0,.012,0,object.colour || '#c5b59a'); for(let z=-d*.42;z<d*.46;z+=.14)box(w*.88,.003,.025,0,.022,z,'#e9dfc8');break;
    case 'sofa':
      box(w,h*.5,d,0,h*.3,0,palette.fabric);box(w,h*.45,d*.18,0,h*.76,-d*.41,palette.fabric);
      for(const x of [-w*.45,w*.45])box(w*.1,h*.62,d,x,h*.48,0,palette.fabric);
      {const seats=Math.max(1,Math.round(w/.7)),seatWidth=w*.82/seats;for(let i=0;i<seats;i++)box(seatWidth-.025,.12,d*.65,-w*.41+seatWidth*(i+.5),h*.6,d*.08,palette.pale);}
      if(object.variant==='corner'){box(w*.3,h*.55,d*.48,-w*.3,h*.3,d*.36,palette.fabric);box(w*.28,.12,d*.5,-w*.3,h*.61,d*.35,palette.pale);}break;
    case 'bed':
      box(w,h*.32,d);box(w*.98,h*.4,d*.94,0,h*.5,0,palette.pale);box(w,.8*h,.09,0,h*.55,-d*.48);
      box(w*.99,.08,d*.58,0,h*.75,d*.19,palette.fabric);
      for(const x of object.variant==='single'?[0]:[-w*.24,w*.24])box(w*(object.variant==='single'?.72:.4),.12,d*.17,x,h*.76,-d*.32,palette.white);break;
    case 'dining_table': case 'side_table': case 'desk':table();if(object.type==='desk'&&object.variant!=='plain'){box(w*.35,h*.6,d*.8,-w*.28,h*.4);box(w*.32,h*.32,.05,w*.15,h*1.2,-d*.25,palette.dark);box(w*.2,.02,d*.13,w*.15,h+.025,d*.08,palette.dark);}break;
    case 'chair':chair();break;
    case 'office_chair':chair(true);break;
    case 'tv':box(w,h,.06,0,h/2,0,palette.dark);box(w*.97,h*.97,.012,0,h/2,.036,'#162b3e').userData.tvScreen=true;box(w*.35,.04,.25,0,.02);break;
    case 'tv_lightstrip':{
      const colour=object.colour || '#eee6fc',thickness=.025;
      box(w,thickness,.025,0,h-thickness/2,0,colour);box(w,thickness,.025,0,thickness/2,0,colour);
      for(const x of [-w/2+thickness/2,w/2-thickness/2])box(thickness,h,.025,x,h/2,0,colour);break;
    }
    case 'nanoleaf_panels':{
      const {radius,centres}=panelArrangement(object,w,h);
      for(const [panelIndex,[x,y]] of centres.entries()){const shape=new THREE.Shape();for(let i=0;i<6;i++){const angle=(30+i*60)*Math.PI/180,px=Math.cos(angle)*radius*.97,py=Math.sin(angle)*radius*.97;if(i)shape.lineTo(px,py);else shape.moveTo(px,py);}shape.closePath();
        const panelMaterial=new THREE.MeshStandardMaterial({color:object.colour || '#f2e8fc',roughness:.78});panelMaterial.userData.panelIndex=panelIndex;
        const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.022,bevelEnabled:false}),panelMaterial);mesh.userData.panelIndex=panelIndex;mesh.position.set(x,h/2-y,0);mesh.castShadow=true;group.add(mesh);
      }break;
    }
    case 'computer':box(w,h,d,0,h/2,0,palette.dark);box(w*.82,h*.86,.012,0,h/2,d/2+.008,'#597785');for(const y of [h*.3,h*.7])ball(w*.26,0,y,d/2+.025,object.colour || '#91c4d3',[1,1,.1]);break;
    case 'ultrawide_monitor':box(w,h*.8,.04,0,h*.58,0,palette.dark);box(w*.95,h*.72,.01,0,h*.58,.026,'#548295');box(.035,h*.23,.035,0,h*.12,0,palette.dark);box(w*.4,.025,d,0,.015,0,palette.dark);break;
    case 'tv_bench':case 'display_cabinet':case 'bookshelf':
      box(w,.06,d,0,.03);box(w,.06,d,0,h-.03);for(const x of [-w/2+.03,w/2-.03])box(.06,h,d,x);
      box(w,h,.025,0,h/2,-d/2);
      {const bays=Math.max(1,Math.round(w/(object.variant==='cubes'?.38:.7))),rows=Math.max(1,Math.round(h/.4));
      for(let bay=1;bay<bays;bay++)box(.035,h,d,-w/2+w*bay/bays);
      for(let row=1;row<rows;row++){const y=h*row/rows;box(w,.035,d,0,y);if(object.type!=='tv_bench'&&object.variant!=='cubes'){const books=Math.max(1,Math.floor((w-.12)/.09));for(let i=0;i<books;i++)box(.055,Math.min(.25,h/rows*.75),Math.min(.2,d*.75),-w/2+.08+i*(w-.16)/books,y+Math.min(.25,h/rows*.75)/2,0,['#788e82','#b79877','#a2a8b6','#c8bba6','#819da7'][i%5]);}}}break;
    case 'piano':
      if(object.variant==='grand'){
        const shape=new THREE.Shape();shape.moveTo(-w*.5,-d*.5);shape.lineTo(w*.5,-d*.5);shape.lineTo(w*.45,0);shape.bezierCurveTo(w*.4,d*.6,-w*.5,d*.65,-w*.5,d*.1);shape.closePath();
        const lid=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false}),mat(palette.dark));lid.rotation.x=-Math.PI/2;lid.position.y=h*.65;lid.castShadow=true;group.add(lid);
        legs(h*.65,palette.dark);box(w,.035,d*.22,0,h*.7,d*.4,palette.white);for(let i=0;i<14;i++)box(.025,.025,d*.11,-w*.4+i*w*.06,h*.73,d*.34,palette.dark);
      }else{box(w,h*.8,d*.55,0,h*.6,-d*.2,palette.dark);legs(h*.55,palette.dark);box(w,.1,d,0,h*.55,0,palette.dark);box(w*.9,.035,d*.42,0,h*.62,d*.2,palette.white);for(let i=0;i<14;i++)box(.025,.025,d*.2,-w*.4+i*w*.06,h*.65,d*.09,palette.dark);}break;
    case 'toilet':box(w*.7,h*.7,d*.25,0,h*.58,-d*.35,palette.white);ball(w*.46,0,h*.38,d*.12,palette.white,[1,.65,d/w*.8]);ball(w*.29,0,h*.55,d*.13,'#bbcdd0',[1,.08,d/w*.8]);box(w*.4,h*.3,d*.4,0,h*.15,d*.1,palette.white);break;
    case 'sink':box(w,h*.78,d,0,h*.39,0,palette.wood);box(w,.07,d,0,h*.83,0,palette.white);ball(w*.32,0,h*.87,0,'#bacdd0',[1,.08,d/w*.65]);box(.025,.17,.025,0,h*.96,-d*.33,palette.dark);break;
    case 'bath':box(w,.1,d,0,.05,0,palette.white);for(const x of [-w*.46,w*.46])box(w*.08,h,d,x,h/2,0,palette.white);for(const z of [-d*.46,d*.46])box(w,h,d*.08,0,h/2,z,palette.white);box(w*.82,.015,d*.8,0,h*.4,0,'#b9d5d8');break;
    case 'shower':box(w,.08,d,0,.04,0,palette.white);for(const x of [-w*.48,w*.48])box(.03,h,.03,x,h/2,-d*.48,palette.dark);box(w,.035,.035,0,h,-d*.48,palette.dark);box(.03,h*.65,.03,0,h*.55,-d*.46,palette.dark);box(.15,.025,.16,0,h*.9,-d*.35,palette.dark);break;
    case 'kitchen_unit':case 'island':case 'kitchen_island':
      box(w,h*.93,d,0,h*.465,0,palette.fabric);box(w+.035,h*.07,d+.035,0,h*.965,0,palette.pale);
      {const doors=Math.max(1,Math.round(w/.6)),doorWidth=w/doors;for(let i=0;i<doors;i++){const x=-w/2+doorWidth*(i+.5);box(Math.max(.02,doorWidth-.012),h*.76,.012,x,h*.47,d/2+.006,palette.fabric);box(Math.min(.16,doorWidth*.5),.02,.025,x,h*.78,d/2+.027,palette.dark);if(i)box(.009,h*.76,.015,-w/2+doorWidth*i,h*.47,d/2+.014,palette.dark);}}
      break;
    case 'fridge':box(w,h,d,0,h/2,0,'#bec6c6');box(w*.94,.02,.02,0,h*.67,d*.51,palette.dark);box(.035,h*.18,.035,w*.35,h*.45,d*.53,palette.dark);break;
    case 'plant':box(w*.5,h*.28,d*.5,0,h*.14,0,'#b88868');box(.035,h*.6,.035,0,h*.5,0,palette.wood);for(let i=0;i<5;i++)ball(w*.34,Math.sin(i*2)*w*.22,h*.65+i*h*.035,Math.cos(i*2)*d*.2,palette.green,[1,1.3,1]);break;
    case 'stairs':for(let i=0;i<10;i++)box(w,h*(i+1)/10,d/10,0,h*(i+1)/20,-d/2+d*(i+.5)/10,palette.pale);break;
    case 'lamp':box(w*.55,.035,d*.55,0,.018,0,palette.dark);box(.025,h*.78,.025,0,h*.4,0,palette.dark);box(w,h*.25,d,0,h*.85,0,palette.pale);break;
    case 'radiator':{
      const body=object.colour || palette.white,fins=Math.max(3,Math.min(200,Math.round(w/.055))),pitch=w/fins;
      box(w,h*.86,d*.55,0,h*.53,0,body);
      for(let i=0;i<fins;i++)box(pitch*.68,h*.85,d,-w/2+pitch*(i+.5),h*.53,0,body);
      for(const x of [-w*.44,w*.44])box(.025,h*.18,.025,x,h*.09,0,palette.dark);
      for(const x of [-w*.49,w*.49])box(.035,.06,d*.75,x,h*.14,0,palette.dark);
      break;
    }
    default:box(w,h,d,0,h/2,0,palette.fabric);
  }
  group.rotation.y=-(object.rotation || 0)*Math.PI/180;
  return group;
}

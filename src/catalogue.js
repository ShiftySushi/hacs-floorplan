import { svgElement } from './dom.js';
export const TV_SIZES=[43,50,55,65,75,85];
export function tvDimensions(inches) {
  if(!TV_SIZES.includes(inches))throw Error('Choose a supported TV screen size.');
  const diagonal=inches*.0254,unit=diagonal/Math.hypot(16,9);
  return {width:Number((unit*16).toFixed(4)),height:Number((unit*9).toFixed(4))};
}
const defaultTV=tvDimensions(65);

export const CATALOGUE = [
  ['sofa','Sofa',2.1,.9,.85,'Living'], ['piano','Piano',1.5,.65,1.2,'Living'],
  ['tv','TV',defaultTV.width,.15,defaultTV.height,'Living'], ['tv_bench','TV bench',1.6,.4,.5,'Living'],
  ['side_table','Side table',.5,.5,.55,'Living'], ['display_cabinet','Display cabinet',1,.4,1.8,'Storage'],
  ['bookshelf','Bookshelf',.9,.3,1.8,'Storage'], ['bed','Bed',1.5,2,.6,'Bedroom'],
  ['dining_table','Dining table',1.6,.9,.75,'Dining'], ['chair','Chair',.45,.5,.85,'Dining'],
  ['toilet','Toilet',.4,.65,.8,'Bathroom'], ['sink','Sink',.6,.45,.85,'Bathroom'],
  ['bath','Bath',.75,1.7,.6,'Bathroom'], ['shower','Shower',.9,.9,2.1,'Bathroom'],
  ['desk','Desk',1.2,.6,.75,'Office'], ['office_chair','Computer chair',.65,.65,1.1,'Office'],
  ['kitchen_unit','Kitchen unit',.6,.6,.9,'Kitchen'], ['island','Kitchen island',1.6,.9,.9,'Kitchen'],
  ['fridge','Fridge',.6,.65,1.8,'Kitchen'], ['rug','Rug',2,1.5,.02,'Decor'],
  ['plant','Plant',.5,.5,.9,'Decor'], ['stairs','Stairs',.9,2.5,2.4,'Structure'],
  ['lamp','Floor lamp',.4,.4,1.5,'Decor'], ['wall_light','Outdoor wall light',.14,.07,.26,'Lighting'],
  ['radiator','Radiator',1,.12,.6,'Heating'],
  ['tv_lightstrip','TV light strip',defaultTV.width,.05,defaultTV.height,'Lighting'], ['nanoleaf_panels','Nanoleaf hexagon panels',1.8,.05,.8,'Lighting'],
  ['picture','Framed art',.734,.0355,.4724,'Living'], ['speaker','Speaker',.4,.16,.39,'Living'], ['computer','Computer tower',.22,.45,.45,'Office'], ['ultrawide_monitor','Ultrawide monitor',.95,.22,.42,'Office'],
].map(([type,name,width,depth,height,category])=>({type,name,width,depth,height,category}));

export function panelArrangement(item,width,height) {
  const layout=item.panel_layout || Array.from({length:21},(_,i)=>[Math.floor(i/3),i%3+Math.floor(i/3)%2]);
  const raw=layout.map(([q,r])=>[Math.sqrt(3)*(q+r/2),1.5*r]),xs=raw.map(p=>p[0]),ys=raw.map(p=>p[1]);
  const left=Math.min(...xs)-Math.sqrt(3)/2,right=Math.max(...xs)+Math.sqrt(3)/2,top=Math.min(...ys)-1,bottom=Math.max(...ys)+1;
  const radius=Math.min(width/(right-left),height/(bottom-top));
  return {radius,centres:raw.map(([x,y])=>[(x-(left+right)/2)*radius,(y-(top+bottom)/2)*radius])};
}

// Original, procedural top-down artwork. All styles share the same object anchor.
export function objectGlyph(item, mode='clean') {
  const pixel = mode==='pokemon' || mode==='zelda';
  const palette = mode==='pokemon' ? ['#805345','#ebca96','#4c8b91','#efe1af'] : mode==='zelda' ? ['#544637','#b6975e','#69835e','#d1cc99'] : ['#586774','#bec8cf','#94aeb7','#e5e9e9'];
  const [edge,wood,fabric,white]=palette;
  const g=svgElement('g',{'stroke':edge,'stroke-width':pixel?4:2,'stroke-linejoin':pixel?'miter':'round','shape-rendering':pixel?'crispEdges':'geometricPrecision'});
  const rect=(x,y,w,h,fill=wood,r=3)=>g.append(svgElement('rect',{x,y,width:w,height:h,rx:pixel?0:r,fill}));
  const line=(x1,y1,x2,y2,stroke=edge,width=2)=>g.append(svgElement('line',{x1,y1,x2,y2,stroke,'stroke-width':width}));
  const ellipse=(cx,cy,rx,ry,fill=white)=>g.append(svgElement('ellipse',{cx,cy,rx,ry,fill}));
  const colour=item.colour || fabric;
  if(item.variant==='sword'){rect(0,43,25,14,'#e7d9b4');for(let x=2;x<25;x+=4){line(x,43,x+4,57,colour,2);line(x,57,x+4,43,colour,2);}g.append(svgElement('path',{d:'M25 50Q65 50 98 30',fill:'none',stroke:colour,'stroke-width':12}));line(25,35,25,65,colour,4);}
  else if(item.type==='nanoleaf_panels') {for(const [x,y] of [[22,30],[50,30],[78,30],[36,55],[64,55]])g.append(svgElement('polygon',{points:Array.from({length:6},(_,i)=>`${x+15*Math.cos((30+i*60)*Math.PI/180)},${y+15*Math.sin((30+i*60)*Math.PI/180)}`).join(' '),fill:white}));}
  else if(item.type==='tv_lightstrip'){rect(4,10,92,75,edge);rect(10,16,80,63,item.colour || '#d1a4e5');rect(17,23,66,49,edge);}
  else if(item.type==='computer'){rect(15,5,70,90,edge);rect(23,14,54,70,colour);if(item.variant!=='ps5'){ellipse(50,32,14,14,white);ellipse(50,64,14,14,white);}}
  else if(item.type==='ultrawide_monitor'){rect(2,12,96,55,edge);rect(8,18,84,42,'#729daa');rect(46,68,8,18,edge);rect(24,86,52,7,edge);}
  else if(item.type==='radiator') {rect(3,24,94,52,item.colour || white,3);for(let x=10;x<94;x+=8)line(x,29,x,71);rect(0,41,5,18,edge,1);rect(95,41,5,18,edge,1);}
  else if(item.type==='rug') {rect(2,2,96,96,wood);rect(10,10,80,80,colour);rect(20,20,60,60,wood);for(let i=8;i<96;i+=12){line(i,0,i,5);line(i,95,i,100);} }
  else if(item.type==='sofa') {rect(3,5,94,90,colour,12);rect(12,28,76,57,white,7);line(50,30,50,83);rect(2,23,13,65,colour);rect(85,23,13,65,colour);rect(15,6,70,22,colour);}
  else if(item.type==='bed') {rect(4,3,92,94,wood);rect(10,11,80,81,white,8);rect(10,37,80,55,colour);rect(16,14,29,19,white);rect(55,14,29,19,white);line(12,48,88,48);}
  else if(item.type==='piano') {rect(3,2,94,94,wood);rect(9,9,82,41,edge);rect(9,56,82,32,white,0);for(let i=18;i<90;i+=10)line(i,56,i,87);for(let i=15;i<83;i+=20)rect(i,56,6,18,edge,0);}
  else if(item.type==='tv') {rect(3,10,94,65,edge);rect(10,16,80,48,'#6f919f');line(17,21,42,21,white);rect(44,77,12,12,edge);rect(26,89,48,7,edge);}
  else if(item.type==='kitchen_unit') {g.append(svgElement('rect',{x:0,y:0,width:100,height:100,fill:item.colour || wood,stroke:'none'}));}
  else if(['tv_bench','display_cabinet','bookshelf','fridge'].includes(item.type)) {
    rect(3,3,94,94,item.colour || (item.type==='fridge'?white:wood));line(6,50,94,50);
    if(item.type==='bookshelf')for(let row=0;row<2;row++)for(let i=0;i<6;i++)rect(10+i*14,10+row*47,10,31,[colour,white,'#b47361'][i%3],0);
    else if(item.type==='display_cabinet'){rect(10,10,80,33,'#adc4c5');rect(10,58,80,32,'#adc4c5');}
    else {line(50,5,50,95);line(41,26,41,40);line(59,26,59,40);}
  }
  else if(['side_table','dining_table','island','desk'].includes(item.type)) {rect(3,4,94,92,wood,8);rect(9,10,82,80,item.colour||wood,6);if(item.type==='desk'){rect(22,13,56,33,edge);rect(28,18,44,23,'#94b8bd');rect(28,56,44,18,white);line(34,64,67,64);}else if(item.type==='island'){rect(55,20,31,55,white);ellipse(70,44,10,17,'#acc5cd');}else {line(15,20,84,20,white,1);line(15,80,84,80,edge,1);}}
  else if(['chair','office_chair'].includes(item.type)) {if(item.type==='office_chair'){line(50,50,10,90);line(50,50,90,90);line(50,50,50,99);}rect(16,10,68,74,colour,12);rect(12,4,76,20,item.colour || wood,5);if(item.type==='office_chair'){rect(3,33,12,40,edge);rect(85,33,12,40,edge);}}
  else if(item.type==='toilet') {rect(15,3,70,28,white);ellipse(50,62,33,34);ellipse(50,61,22,24,'#aec9cf');rect(66,9,10,7,edge);}
  else if(['sink','bath'].includes(item.type)) {rect(3,3,94,94,white,18);rect(13,18,74,69,'#bdd3d7',22);ellipse(50,72,4,3,edge);rect(43,3,14,23,edge);}
  else if(item.type==='shower') {rect(3,3,94,94,white);rect(12,12,76,76,'#c7dfe1');line(12,12,88,88,'#a5bfc4');line(12,88,88,12,'#a5bfc4');rect(65,12,15,15,edge);line(3,97,97,97,'#79aeb9',6);}
  else if(item.type==='plant') {ellipse(50,55,28,31,wood);for(const [x,y] of [[28,38],[70,35],[28,66],[68,65],[49,23]])ellipse(x,y,18,23,'#74965b');ellipse(50,48,15,19,'#8dab65');}
  else if(item.type==='stairs') {rect(3,3,94,94,white);for(let y=12;y<98;y+=11)line(4,y,96,y);line(50,86,50,14);line(50,14,40,25);line(50,14,60,25);}
  else if(item.type==='lamp') {ellipse(50,50,38,38,wood);ellipse(50,50,28,28,item.colour||'#efd9a2');ellipse(50,50,6,6,white);}
  if(item.type==='sofa' && item.variant==='corner')rect(4,53,31,44,colour,6);
  if(item.type==='piano' && item.variant==='grand'){g.replaceChildren();g.append(svgElement('path',{d:'M8 94V8H58Q94 8 94 42L70 94Z',fill:wood}));rect(12,65,55,25,white,0);for(let i=20;i<66;i+=8)line(i,65,i,90);}
  if(item.type==='bed' && item.variant==='single'){rect(12,12,76,23,white,6);}
  if(pixel && !['plant','lamp','tv','shower','toilet','sink','bath','stairs','kitchen_unit'].includes(item.type)) {
    if(mode==='pokemon') {
      // Handheld style: stepped highlight corners and warm inset wood grain.
      g.append(svgElement('path',{d:'M7 22V10H22 M78 90H91V77',fill:'none',stroke:'#f4e6bc','stroke-width':3}));
      if(['sofa','bed','chair'].includes(item.type))for(let x=22;x<85;x+=20)rect(x,65,5,5,'#d6b499',0);
    } else {
      // Adventure style: visible woven checker detailing and iron furniture studs.
      if(['sofa','bed','rug','chair','office_chair'].includes(item.type))for(let y=48;y<83;y+=12)for(let x=22;x<83;x+=12)if((x+y)%24===10)rect(x,y,5,5,'#9ead7b',0);
      for(const [x,y] of [[7,7],[87,7],[7,87],[87,87]])rect(x,y,5,5,'#d8c88b',0);
    }
  }
  return g;
}

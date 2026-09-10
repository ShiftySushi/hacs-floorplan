import { svgElement } from './dom.js';
import { objectGlyph } from './catalogue.js';

// Draw in the rendered footprint, using one scale for small details in both axes.
// Length changes add cabinet doors, cushions or treads instead of stretching them.
export function objectArtwork(item, mode, width, depth) {
  const pixel=['pokemon','zelda'].includes(mode), unit=Math.min(width,depth), inset=unit*.05;
  const [edge,wood,fabric,white]=mode==='pokemon'?['#805345','#ebca96','#4c8b91','#efe1af']:mode==='zelda'?['#544637','#b6975e','#69835e','#d1cc99']:['#586774','#bec8cf','#94aeb7','#e5e9e9'];
  const g=svgElement('g',{stroke:edge,'stroke-width':unit*(pixel?.025:.015),'stroke-linejoin':pixel?'miter':'round','shape-rendering':pixel?'crispEdges':'geometricPrecision'});
  g.append(svgElement('rect',{width,height:depth,fill:'transparent',stroke:'none','pointer-events':'all'}));
  const rect=(x,y,w,h,fill=wood,r=inset)=>g.append(svgElement('rect',{x,y,width:Math.max(0,w),height:Math.max(0,h),rx:pixel?0:r,fill}));
  const line=(x1,y1,x2,y2,stroke=edge)=>g.append(svgElement('line',{x1,y1,x2,y2,stroke}));
  const circle=(cx,cy,r,fill)=>g.append(svgElement('circle',{cx,cy,r,fill}));
  const colour=item.colour || fabric;
  const panel=fill=>rect(inset,inset,width-2*inset,depth-2*inset,fill);
  const cabinet=['tv_bench','display_cabinet','bookshelf','fridge'].includes(item.type);
  if(item.type==='radiator') {
    panel(item.colour || white);const fins=Math.max(3,Math.min(200,Math.round((item.width || 1)/.055))),pitch=(width-inset*4)/fins;
    for(let i=0;i<fins;i++)line(inset*2+pitch*(i+.5),inset*2,inset*2+pitch*(i+.5),depth-inset*2);
    rect(0,depth*.32,inset*2,depth*.36,edge,0);rect(width-inset*2,depth*.32,inset*2,depth*.36,edge,0);
  } else if(item.type==='kitchen_unit') {
    // Adjacent cabinet runs share one continuous top; doors are below the surface.
    g.append(svgElement('rect',{x:0,y:0,width,height:depth,fill:item.colour || wood,stroke:'none'}));
  } else if(cabinet) {
    panel(item.colour || (item.type==='fridge'?white:wood));
    const count=Math.max(1,Math.min(100,Math.round(item.width/.55))), bay=(width-2*inset)/count;
    for(let i=0;i<count;i++) {
      const x=inset+i*bay;
      if(i)line(x,inset,x,depth-inset);
      if(item.type==='bookshelf') {
        const books=Math.max(2,Math.floor(bay/(unit*.12)));
        for(let b=0;b<books;b++)rect(x+inset/2+b*(bay-inset)/books,2*inset,(bay-inset)/books*.7,depth-4*inset,[colour,white,'#b47361'][b%3],0);
      } else if(item.type==='display_cabinet')rect(x+inset,2*inset,bay-2*inset,depth-4*inset,'#adc4c5');
      else line(x+bay/2-unit*.08,depth-inset*2,x+bay/2+unit*.08,depth-inset*2);
    }
  } else if(item.type==='sofa') {
    panel(colour);
    const arm=unit*.13,back=unit*.22,seats=Math.max(1,Math.min(30,Math.round(item.width/.7))), seat=(width-2*arm)/seats;
    for(let i=0;i<seats;i++)rect(arm+i*seat+inset/2,back,seat-inset,depth-back-inset*2,white,unit*.08);
    rect(inset,back,arm-inset,depth-back-inset,colour);rect(width-arm,back,arm-inset,depth-back-inset,colour);
    if(item.variant==='corner')rect(arm,depth*.55,Math.min(unit*.7,width-2*arm),depth*.4,colour,unit*.08);
  } else if(item.type==='stairs') {
    panel(white);
    const count=Math.max(2,Math.min(100,Math.round(item.depth/.25))), step=(depth-2*inset)/count;
    for(let i=1;i<count;i++)line(inset,inset+i*step,width-inset,inset+i*step);
    line(width/2,depth-inset*3,width/2,inset*3);line(width/2,inset*3,width/2-unit*.12,inset*5);line(width/2,inset*3,width/2+unit*.12,inset*5);
  } else if(['side_table','dining_table','island','desk','rug','bed','bath','sink','shower'].includes(item.type)) {
    panel(item.colour || (['bath','sink','shower'].includes(item.type)?white:wood));
    if(item.type==='bed') {
      rect(inset*2,inset*2,width-inset*4,depth-inset*4,white,unit*.08);
      const pillowWidth=Math.min(unit*.36,width*.38), pillows=item.variant==='single'?1:2;
      for(let i=0;i<pillows;i++)rect(width*(i+1)/(pillows+1)-pillowWidth/2,inset*3,pillowWidth,unit*.22,white,unit*.04);
      rect(inset*2,unit*.4,width-inset*4,depth-unit*.4-inset*2,colour);line(inset*2,unit*.5,width-inset*2,unit*.5);
    } else if(['bath','sink'].includes(item.type)) {
      rect(inset*2,unit*.2,width-inset*4,depth-unit*.2-inset*2,'#bdd3d7',unit*.18);
      circle(width/2,depth-unit*.18,unit*.025,edge);rect(width/2-unit*.04,inset,unit*.08,unit*.2,edge);
    } else if(item.type==='shower') {
      rect(inset*2,inset*2,width-inset*4,depth-inset*4,'#c7dfe1');line(inset*2,inset*2,width-inset*2,depth-inset*2);line(inset*2,depth-inset*2,width-inset*2,inset*2);circle(width*.7,depth*.3,unit*.06,edge);
    } else if(item.type==='rug') {
      rect(inset*2,inset*2,width-inset*4,depth-inset*4,colour);rect(inset*4,inset*4,width-inset*8,depth-inset*8,wood);
    } else if(item.type==='desk') {
      const monitor=Math.min(width*.65,unit*.8);rect(width/2-monitor/2,unit*.12,monitor,unit*.3,edge);rect(width/2-monitor/2+inset,unit*.15,monitor-2*inset,unit*.22,'#94b8bd');rect(width/2-unit*.24,depth-unit*.32,unit*.48,unit*.15,white);
    } else if(item.type==='island') {
      rect(width-unit*.6,unit*.16,unit*.4,depth-unit*.32,white);circle(width-unit*.4,depth/2,unit*.1,'#acc5cd');
    } else {line(inset*3,inset*3,width-inset*3,inset*3,white);line(inset*3,depth-inset*3,width-inset*3,depth-inset*3);}
  } else if(item.type==='tv') {
    // A TV is seen from above: retain its full width and shallow physical depth.
    rect(inset,inset,width-inset*2,depth*.55,edge,unit*.03);
    line(inset*3,depth*.15,width-inset*3,depth*.15,'#94b8bd');
    rect(width/2-unit*.1,depth*.6,unit*.2,depth*.25,edge);
  } else if(item.type==='piano' && item.variant!=='grand') {
    panel(wood);rect(inset*2,inset*2,width-inset*4,depth*.45,edge);rect(inset*2,depth*.58,width-inset*4,depth*.3,white,0);
    const keys=Math.max(8,Math.min(60,Math.round(item.width/.07))), key=(width-inset*4)/keys;
    for(let i=1;i<keys;i++)line(inset*2+i*key,depth*.58,inset*2+i*key,depth*.88);
    for(let i=1;i<keys;i+=2)rect(inset*2+i*key-key*.2,depth*.58,key*.45,depth*.16,edge,0);
  } else {
    // Chairs, plants, lamps and other fixtures retain their original proportions.
    const art=svgElement('g',{transform:`translate(${(width-unit)/2} ${(depth-unit)/2}) scale(${unit/100})`});art.append(objectGlyph(item,mode));g.append(art);
  }
  if(pixel && (cabinet || ['sofa','bed','rug','desk','dining_table'].includes(item.type))) {
    if(mode==='pokemon') {line(inset*2,inset*2,Math.min(width-inset*2,unit*.3),inset*2,'#f4e6bc');line(inset*2,inset*2,inset*2,unit*.2,'#f4e6bc');}
    else for(const x of [inset*2,width-inset*3])for(const y of [inset*2,depth-inset*3])rect(x,y,inset,inset,'#d8c88b',0);
  }
  return g;
}

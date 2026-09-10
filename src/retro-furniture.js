import { svgElement } from './dom.js';

// Original sprite-like drawings in footprint coordinates. Repeated units grow
// with furniture dimensions; cushions, trim and hardware keep square pixels.
export function retroFurniture(item,mode,width,depth) {
  if(!['pokemon','zelda'].includes(mode))return null;
  const supported=['sofa','side_table','dining_table','desk','island','tv_bench','display_cabinet','bookshelf','chair','office_chair','bed','rug','bath','sink','shower','toilet','tv','computer','ultrawide_monitor','piano','plant','fridge'];
  if(!supported.includes(item.type))return null;
  const modern=mode==='pokemon',u=Math.min(width,depth),p=u/24;
  const edge=modern?'#343b58':'#342c30',timber=item.colour || (modern?'#d6a777':'#856043'),shade=modern?'#92749b':'#543c32',light=modern?'#fff4ce':'#c5ac70';
  const accent=item.colour || (modern?'#65b6bc':'#788655');
  const g=svgElement('g',{'data-retro-furniture':mode,'data-retro-type':item.type,'shape-rendering':'crispEdges',stroke:edge,'stroke-width':p*.75,'stroke-linejoin':'miter'});
  const r=(x,y,w,h,fill,stroke=edge)=>g.append(svgElement('rect',{x,y,width:Math.max(0,w),height:Math.max(0,h),fill,stroke}));
  const path=(d,fill,stroke=edge)=>g.append(svgElement('path',{d,fill,stroke}));
  const ln=(x1,y1,x2,y2,stroke=light)=>g.append(svgElement('line',{x1,y1,x2,y2,stroke,'stroke-width':p*.7}));
  const diamond=(x,y,size,fill)=>path(`M${x} ${y-size}l${size} ${size}l${-size} ${size}l${-size} ${-size}Z`,fill);
  const studs=()=>{for(const x of [2*p,width-3*p])for(const y of [2*p,depth-3*p])r(x,y,p,p,light,light);};
  const base=(fill=timber)=>{r(p,p,width-2*p,depth-2*p,shade);r(p,p,width-3*p,depth-3*p,fill);};
  const stepped=(x,y,w,h,fill)=>path(`M${x+2*p} ${y}h${w-4*p}v${p}h${p}v${h-2*p}h${-p}v${p}h${-(w-4*p)}v${-p}h${-p}v${-(h-2*p)}h${p}Z`,fill);
  const planks=(x,y,w,h)=>{r(x,y,w,h,timber);const n=Math.max(2,Math.min(24,Math.round(w/(6*p))));for(let i=1;i<n;i++)ln(x+i*w/n,y,x+i*w/n,y+h,shade);};
  const textile=(x,y,w,h)=>{r(x,y,w,h,accent);for(let a=x+3*p;a<x+w-2*p;a+=7*p)if(modern){r(a,y+2*p,2*p,2*p,light,light);r(a+2*p,y+4*p,p,p,shade,shade);}else diamond(a,y+h/2,1.5*p,light);};

  if(item.type==='sofa') {
    if(modern){stepped(p,p,width-2*p,depth-2*p,accent);r(3*p,2*p,width-6*p,4*p,light);const n=Math.max(1,Math.min(20,Math.round((item.width || 2)/.65))),w=(width-8*p)/n;for(let i=0;i<n;i++){stepped(4*p+i*w,7*p,w-p,depth-11*p,'#eef2da');ln(5*p+i*w,8*p,Math.max(5*p+i*w,3*p+(i+1)*w),8*p,'#ffffff');}r(p,6*p,3*p,depth-9*p,accent);r(width-4*p,6*p,3*p,depth-9*p,accent);}
    else {base();r(2*p,2*p,width-4*p,4*p,shade);for(let x=4*p;x<width-3*p;x+=5*p)diamond(x,4*p,p,light);textile(4*p,7*p,width-8*p,depth-11*p);r(p,7*p,3*p,depth-9*p,timber);r(width-4*p,7*p,3*p,depth-9*p,timber);studs();}
    if(item.variant==='corner')textile(4*p,depth*.55,Math.min(u*.7,width-8*p),depth*.4);
  } else if(item.type==='bed') {
    base(modern?'#8d79a8':timber);
    if(modern){r(2*p,2*p,width-4*p,depth-4*p,'#ffffe4');stepped(4*p,3*p,width-8*p,5*p,'#fffefa');textile(3*p,10*p,width-6*p,depth-13*p);r(3*p,10*p,width-6*p,2*p,light,light);}
    else {for(const x of [p,width-4*p]){r(x,p,3*p,depth-2*p,timber);diamond(x+1.5*p,3*p,1.5*p,light);}r(4*p,4*p,width-8*p,depth-8*p,'#d6c59f');const count=item.variant==='single'?1:2;for(let i=0;i<count;i++)r(5*p+i*(width-10*p)/count,5*p,(width-12*p)/count,4*p,'#e7d9b3');textile(4*p,11*p,width-8*p,depth-15*p);r(2*p,depth-5*p,width-4*p,3*p,timber);}
  } else if(['tv_bench','display_cabinet','bookshelf','fridge'].includes(item.type)) {
    base(modern?(item.type==='fridge'?'#d9e7ee':'#b8d8de'):timber);
    const bays=Math.max(1,Math.min(30,Math.round((item.width || 1)/.45))),bay=(width-4*p)/bays;
    for(let i=0;i<bays;i++) {
      const x=2*p+i*bay;
      if(item.type==='bookshelf'&&item.variant!=='cubes'){r(x+p,3*p,bay-2*p,depth-6*p,modern?'#708daf':shade);const count=Math.max(2,Math.floor(bay/(2*p)));for(let k=0;k<count;k++)r(x+1.5*p+k*(bay-3*p)/count,4*p,(bay-3*p)/count*.7,depth-8*p,(modern?['#e57987','#f1d37a','#83b9bd']:['#9e7860','#aaa16b','#6b805d'])[k%3]);}
      else if(modern){r(x+p,3*p,bay-2*p,depth-6*p,item.type==='display_cabinet'?'#8fc8df':'#e5f0df');r(x+bay/2-p,depth-5*p,2*p,p,shade,shade);if(item.type==='display_cabinet')ln(x+2*p,5*p,x+bay-3*p,depth*.45,'#e7ffff');}
      else {planks(x+p,3*p,bay-2*p,depth-6*p);r(x+p,depth*.45,bay-2*p,2*p,shade);diamond(x+bay/2,depth*.5,p,light);}
    }
    if(!modern)studs();
  } else if(['side_table','dining_table','desk','island'].includes(item.type)) {
    if(modern){stepped(p,p,width-2*p,depth-2*p,item.colour || '#e7d49e');r(4*p,3*p,width-8*p,2*p,'#fff5d3','#fff5d3');}
    else {base();planks(3*p,3*p,width-6*p,depth-6*p);r(p,depth*.3,width-2*p,p,shade);r(p,depth*.7,width-2*p,p,shade);studs();}
    if(item.type==='desk'&&item.variant!=='plain'){const monitor=Math.min(width*.55,u*.75);if(modern){r(width/2-monitor/2,depth*.15,monitor,u*.34,'#faf4df');r(width/2-monitor/2+p,depth*.15+p,monitor-2*p,u*.24,'#468393');r(width/2-u*.23,depth*.65,u*.46,u*.15,'#d5d9df');}else {r(width*.22,depth*.22,width*.48,depth*.55,'#dec996');ln(width*.3,depth*.35,width*.6,depth*.35,shade);ln(width*.3,depth*.45,width*.65,depth*.45,shade);diamond(width*.76,depth*.35,2*p,'#c39566');}}
    if(item.type==='island'){r(width-u*.65,3*p,u*.45,depth-6*p,modern?'#eff6e8':'#7b7766');r(width-u*.57,5*p,u*.29,depth-10*p,modern?'#8eb5c0':'#454e49');}
  } else if(['chair','office_chair'].includes(item.type)) {
    if(modern){if(item.type==='office_chair'){ln(width*.15,depth*.85,width*.85,depth*.85,edge);ln(width*.5,depth*.55,width*.5,depth-p,edge);}stepped(3*p,2*p,width-6*p,depth-6*p,accent);r(4*p,2*p,width-8*p,5*p,light);r(p,8*p,2*p,depth-13*p,shade);r(width-3*p,8*p,2*p,depth-13*p,shade);}
    else {r(3*p,p,width-6*p,depth-2*p,timber);for(let x=5*p;x<width-4*p;x+=4*p)r(x,2*p,2*p,6*p,light);textile(5*p,10*p,width-10*p,depth-15*p);r(2*p,p,2*p,depth-2*p,shade);r(width-4*p,p,2*p,depth-2*p,shade);}
  } else if(item.type==='rug') {
    r(p,p,width-2*p,depth-2*p,accent);r(3*p,3*p,width-6*p,depth-6*p,light);textile(5*p,5*p,width-10*p,depth-10*p);
    if(!modern){diamond(width/2,depth/2,Math.min(width,depth)*.24,shade);diamond(width/2,depth/2,Math.min(width,depth)*.15,light);}
    for(let x=2*p;x<width-p;x+=3*p){ln(x,0,x,p,light);ln(x,depth-p,x,depth,light);}
  } else if(['bath','sink','shower','toilet'].includes(item.type)) {
    if(modern){stepped(p,p,width-2*p,depth-2*p,'#f6f9e5');stepped(3*p,5*p,width-6*p,depth-8*p,'#94c8d8');r(width/2-p,2*p,2*p,5*p,'#9cabc4');r(width/2-p,depth-6*p,2*p,2*p,edge);if(item.type==='shower'){ln(3*p,4*p,width-4*p,depth-4*p,'#d9ffff');ln(width-4*p,4*p,3*p,depth-4*p,'#d9ffff');}if(item.type==='toilet')r(2*p,2*p,width-4*p,5*p,'#e7eaf0');}
    else {base('#868580');for(let x=3*p;x<width-2*p;x+=5*p)r(x,2*p,3*p,3*p,'#c1b996');r(4*p,6*p,width-8*p,depth-10*p,'#4d787d');ln(6*p,8*p,width-6*p,8*p,'#88b6a2');r(width/2-p,3*p,2*p,4*p,'#ad9564');studs();}
  } else if(['tv','computer','ultrawide_monitor'].includes(item.type)) {
    if(modern){r(p,p,width-2*p,depth*.72,'#d7d6eb');r(3*p,3*p,width-6*p,Math.max(p,depth*.72-5*p),'#3b698d');r(4*p,4*p,Math.max(p,width*.4-4*p),p,'#89dee0');r(width*.3,depth*.8,width*.4,depth*.15,shade);}
    else {base();r(3*p,3*p,width-6*p,depth-6*p,'#253f4b');r(5*p,5*p,width-10*p,depth-10*p,'#507c77');diamond(width/2,depth/2,Math.min(width,depth)*.18,'#b5c884');studs();}
  } else if(item.type==='piano') {
    if(item.variant==='grand')path(`M${p} ${p}H${width*.6}V${3*p}H${width*.8}V${depth*.3}H${width-p}V${depth*.6}H${width*.85}V${depth-p}H${p}Z`,item.colour || (modern?'#8f759b':timber));
    else base(item.colour || (modern?'#8f759b':timber));if(!modern){for(let x=4*p;x<width-3*p;x+=6*p)diamond(x,5*p,p,light);}
    r(3*p,depth*.55,width-6*p,depth*.3,light);const keys=Math.max(8,Math.min(50,Math.round((item.width || 1.5)/.065))),key=(width-6*p)/keys;for(let i=1;i<keys;i++){ln(3*p+i*key,depth*.55,3*p+i*key,depth*.85,shade);if(i%3)r(3*p+i*key,depth*.55,key*.6,depth*.16,edge);}
  } else if(item.type==='plant') {
    r(width*.25,depth*.5,width*.5,depth*.4,modern?'#d59289':timber);
    for(const [x,y,s] of [[.2,.25,.22],[.55,.2,.25],[.32,.08,.25],[.38,.38,.3]])if(modern)stepped(width*x,depth*y,u*s,u*s,'#7fc181');else diamond(width*x+u*s/2,depth*y+u*s/2,u*s*.7,'#879158');
    r(width*.45,depth*.3,2*p,depth*.4,modern?'#3d8d67':'#536348');
  }
  return g;
}

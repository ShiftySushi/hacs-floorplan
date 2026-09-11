// Framed doors, recessed panels and glass wall cupboards, front +Z.
export function shaker3D(o,box){
  if(o.front_style!=='shaker')return false;
  const w=o.width,h=o.height,d=o.depth,c=o.colour||'#eee9d8',metal=o.handle_colour||'#bdc2c4',t=.035;
  const upper=o.variant==='wall'||o.variant==='glass',tall=o.type==='fridge',base=upper?0:.09,top=upper||tall?h:h-.03;
  const front=(x,y,fw,fh,glass=false,drawer=false)=>{
    const z=d/2;
    const pane=box(fw-t*2,fh-t*2,.012,x,y,z-.012,glass?'#b4c5c7':c);
    if(glass){pane.material=pane.material.clone();pane.material.transparent=true;pane.material.opacity=.25;for(const level of [-.22,.12])box(fw-.05,.015,d*.8,x,y+fh*level,0,c);}
    for(const px of [x-fw/2+t/2,x+fw/2-t/2])box(t,fh,.025,px,y,z,c);
    for(const py of [y-fh/2+t/2,y+fh/2-t/2])box(fw,t,.025,x,py,z,c);
    const handleX=drawer?x:x+(tall?-1:1)*fw*.34,handleY=drawer?y:upper||tall?y-fh*.26:y+fh*.3;
    const handle=box(drawer?.13:.018,drawer?.018:.13,.035,handleX,handleY,z+.027,metal);handle.userData.cabinetHandle=true;
  };
  for(const x of [-w/2+.012,w/2-.012])box(.024,top,d,x,top/2,0,c);
  box(w,top,.02,0,top/2,-d/2+.01,c);box(w,.02,d,0,top-.01,0,c);box(w,.02,d,0,base,0,c);
  if(!upper)box(w-.02,.09,d-.08,0,.045,-.025,c);
  if(tall){front(0,base+(top-base)*.2,w-.01,(top-base)*.4-.01);front(0,base+(top-base)*.7,w-.01,(top-base)*.6-.01);}
  else if(o.variant==='drawers')for(let i=0;i<3;i++)front(0,base+(top-base)*(i+.5)/3,w-.01,(top-base)/3-.01,false,true);
  else{const count=Math.max(1,Math.round(w/.5));for(let i=0;i<count;i++)front(-w/2+w*(i+.5)/count,(top+base)/2,w/count-.01,top-base-.01,o.variant==='glass');}
  if(upper||tall){box(w+.025,.035,d+.025,0,h-.0175,0,c);}
  else box(w,.03,d,0,h-.015,0,o.worktop_colour||'#444544').userData.worktop=true;
  return true;
}

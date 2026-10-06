/** Beds and bedroom storage. Headboards sit at negative Z. */
export function bedroomAssets({kit,tone,cloth,wood,seeded,bookColours}){
  const linens=[['#9fb0b8','#f1ede4'],['#c7b594','#f4efe6'],['#a9b7a2','#f2eee6'],['#b98f86','#f4eee8']];
  function bed(o){
    const {group,soft,box,cyl}=kit(),w=o.width,d=o.depth,h=o.height,frame=cloth(o.colour||'#676769'),next=seeded(o.id),[duvet,sheet]=linens[Math.floor(next()*linens.length)],head=.11,body=d-head;
    for(const x of [-w/2+.08,w/2-.08])for(const z of [-d/2+.12,d/2-.08])cyl(.03,.08,x,0,z,'#2a2523');
    soft(w,.28,body,0,.08,head/2,frame,.05);
    // Channelled headboard: separate upright pads so each seam gets a line.
    const pads=Math.max(3,Math.round(w/.3));soft(w+.04,h-.06,head*.6,0,.06,-d/2+head*.3,frame,.03);
    for(let i=0;i<pads;i++)soft(w/pads-.012,h-.42,head*.6,-w/2+w/pads*(i+.5),.4,-d/2+head*.75,frame,.035);
    soft(w-.04,.22,body-.06,0,.36,head/2,sheet,.07);
    const cover=body*.64;soft(w+.03,.09,cover,0,.56,d/2-cover/2-.02,cloth(duvet),.04);soft(w+.03,.05,.2,0,.61,d/2-cover-.02+.1,sheet,.025);
    const pillow=w>1.45?w*.44:w*.45;for(const side of [-1,1]){const p=soft(pillow,.13,.42,side*(w/4-.005),.58,-d/2+head+.27,sheet,.06);p.rotation.set(.12,side*.06,0);}
    const throwRug=soft(w+.05,.035,.42,0,.65,d/2-.3,cloth(tone(duvet,-.18)),.015);throwRug.rotation.y=.03;
    return group;
  }
  // Flat-fronted chests: a nightstand is one column of drawers, a dresser two.
  function chest(o){
    const {group,box,cyl,ball}=kit(),w=o.width,d=o.depth,h=o.height,colour=o.colour||'#302723',body=wood(colour),front=wood(tone(colour,.035)),columns=w>1?2:1,rows=Math.max(2,Math.round((h-.06)/.24)),cw=(w-.03)/columns,rh=(h-.07)/rows,next=seeded(o.id);
    box(w,h-.02,d,0,0,0,body);box(w+.012,.02,d+.012,0,h-.02,0,o.product_id?.includes('glass')?'#cfdcda':wood(tone(colour,.05)));
    for(let c=0;c<columns;c++)for(let r=0;r<rows;r++)box(cw-.014,rh-.014,.014,-w/2+.015+cw*(c+.5),.045+rh*r,d/2+.003,front);
    if(columns===1){for(let i=0;i<2;i++)box(.16,.022,.22,-w*.12,h+i*.022,0,bookColours[Math.floor(next()*bookColours.length)]).rotation.y=(next()-.5)*.4;cyl(.03,.06,w*.2,h,d*.12,'#d9cfbd',.04);ball(.045,w*.2,h+.1,d*.12,'#5f9468');}
    else{cyl(.05,.16,-w*.3,h,0,'#c8695a',.035);box(.3,.03,.2,w*.18,h,0,'#efe7d6');box(.1,.14,.012,w*.36,h,-d*.2,'#2f4858');}
    return group;
  }
  return {bed,side_table:o=>o.variant==='malm'?chest(o):null};
}

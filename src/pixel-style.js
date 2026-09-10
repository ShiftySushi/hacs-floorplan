import { svgElement } from './dom.js';

// Original tile artwork: no extracted game sprites or third-party asset pack.
export function pixelPattern(id,mode,material,colour) {
  const handheld=mode==='pokemon', pattern=svgElement('pattern',{id,width:64,height:64,patternUnits:'userSpaceOnUse','shape-rendering':'crispEdges','data-pixel-style':mode});
  const rect=(x,y,width,height,fill)=>pattern.append(svgElement('rect',{x,y,width,height,fill}));
  if(material==='wall') {
    rect(0,0,64,64,handheld?'#795951':'#393d49');
    for(let row=0;row<4;row++)for(let column=-1;column<3;column++) {
      const x=column*32+(row%2)*16,y=row*16;
      rect(x+2,y+2,28,12,handheld?'#c98d6f':'#787e8a');rect(x+2,y+2,28,3,handheld?'#e6b696':'#adb0b5');rect(x+26,y+5,4,9,handheld?'#a46f60':'#565d6c');
    }
  } else if(material==='wood') {
    rect(0,0,64,64,handheld?'#987056':'#68533e');
    for(let y=0;y<64;y+=16)for(let x=-32;x<64;x+=32) {
      const offset=(y%32===0?0:16),left=x+offset;
      rect(left+2,y+2,29,13,colour || (handheld?'#e2b77d':'#b59a66'));
      rect(left+2,y+2,29,2,handheld?'#ffdf9d':'#d2bd85');rect(left+6,y+8,12,2,handheld?'#c99967':'#917348');rect(left+22,y+11,5,2,handheld?'#c99967':'#917348');
    }
  } else if(material==='tile') {
    rect(0,0,64,64,handheld?'#778d96':'#393d49');
    for(let y=0;y<64;y+=32)for(let x=0;x<64;x+=32){rect(x+2,y+2,28,28,colour || (handheld?'#d2e4dc':'#8d998a'));rect(x+2,y+2,28,3,handheld?'#f8fff0':'#c0c6ab');rect(x+26,y+5,4,25,handheld?'#a5c1bb':'#647568');if(!handheld){rect(x+11,y+10,10,12,'#73847a');rect(x+14,y+13,4,6,'#b4ba9c');}}
  } else {
    rect(0,0,64,64,colour || (handheld?'#c37e84':'#737d69'));
    if(handheld)for(let y=4;y<64;y+=16)for(let x=4;x<64;x+=16){rect(x,y,4,4,'#edb5a2');rect(x+4,y+4,4,4,'#a75f75');}
    else for(let y=0;y<64;y+=16)for(let x=0;x<64;x+=16){rect(x+6,y,4,16,'#b4ad78');rect(x,y+6,16,4,'#b4ad78');rect(x+6,y+6,4,4,'#56634e');}
  }
  return pattern;
}

export function pixelRoomTrim(points,mode) {
  const group=svgElement('g',{'data-pixel-room-trim':mode,'pointer-events':'none'});
  const top=Math.min(...points.map(p=>p[1]));
  for(let i=0;i<points.length;i++) {
    const a=points[i],b=points[(i+1)%points.length];
    if(Math.abs(a[1]-b[1])>1 || Math.abs(a[1]-top)>1)continue;
    const x=Math.min(a[0],b[0]),width=Math.abs(a[0]-b[0]);
    group.append(svgElement('rect',{x,y:top,width,height:mode==='pokemon'?22:28,fill:mode==='pokemon'?'#b56f62':'#555b69',stroke:mode==='pokemon'?'#774d4e':'#303645','stroke-width':3}));
    group.append(svgElement('rect',{x:x+3,y:top+3,width:Math.max(0,width-6),height:5,fill:mode==='pokemon'?'#f0bd93':'#b1b3bd'}));
    for(let n=16;n<width-8;n+=32)group.append(svgElement('rect',{x:x+n,y:top+10,width:mode==='pokemon'?3:12,height:mode==='pokemon'?10:13,fill:mode==='pokemon'?'#d59978':'#7d8491'}));
  }
  return group;
}

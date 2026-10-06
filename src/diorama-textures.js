import * as THREE from 'three';

// Small painted textures drawn at start-up: no downloads, deterministic output.
function random(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function canvasTexture(size,draw,repeat=true){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;draw(canvas.getContext('2d'),size);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  if(repeat)texture.wrapS=texture.wrapT=THREE.RepeatWrapping;return texture;
}
const shade=(colour,amount)=>'#'+new THREE.Color(colour).offsetHSL(0,0,amount).getHexString();

/** Floor boards: one tile covers 1.6 m, with uneven plank tones and hand-wobbled seams. */
export function planks(colour){
  return canvasTexture(512,(c,size)=>{
    const next=random(7),rows=8,h=size/rows;
    for(let row=0;row<rows;row++){
      let x=-next()*size*.5;
      while(x<size){const w=size*(.45+next()*.4);c.fillStyle=shade(colour,(next()-.5)*.07);c.fillRect(x,row*h,w,h);
        c.strokeStyle=shade(colour,-.16);c.lineWidth=1.5;c.beginPath();c.moveTo(x,row*h);c.lineTo(x+(next()-.5)*2,row*h+h);c.stroke();
        for(let i=0;i<5;i++){c.strokeStyle=shade(colour,-.05-next()*.04);c.lineWidth=.8;c.globalAlpha=.5;const y=row*h+h*(.15+next()*.7),from=x+w*next()*.6;c.beginPath();c.moveTo(from,y);c.bezierCurveTo(from+w*.1,y+2,from+w*.2,y-2,from+w*(.2+next()*.2),y+(next()-.5)*3);c.stroke();c.globalAlpha=1;}
        x+=w;}
      c.strokeStyle=shade(colour,-.2);c.lineWidth=1.6;c.beginPath();c.moveTo(0,row*h);for(let i=1;i<=8;i++)c.lineTo(size*i/8,row*h+(next()-.5)*1.2);c.stroke();
    }
  });
}

/** Square tiles with soft grout; one texture tile covers 0.9 m. */
export function tiles(colour){
  return canvasTexture(256,(c,size)=>{
    const next=random(11),n=3,cell=size/n;
    for(let row=0;row<n;row++)for(let col=0;col<n;col++){c.fillStyle=shade(colour,-.04+(next()-.5)*.05);c.fillRect(col*cell,row*cell,cell,cell);}
    c.strokeStyle=shade(colour,-.22);c.lineWidth=3;for(let i=0;i<=n;i++){c.beginPath();c.moveTo(i*cell+(next()-.5),0);c.lineTo(i*cell+(next()-.5),size);c.moveTo(0,i*cell+(next()-.5));c.lineTo(size,i*cell+(next()-.5));c.stroke();}
  });
}

/** Soft vertical grain for furniture timber. */
export function grain(colour){
  return canvasTexture(256,(c,size)=>{
    const next=random(19);c.fillStyle=colour;c.fillRect(0,0,size,size);
    for(let i=0;i<70;i++){c.strokeStyle=shade(colour,(next()-.6)*.12);c.globalAlpha=.55;c.lineWidth=.6+next()*1.6;const x=next()*size;c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x+(next()-.5)*14,size*.3,x+(next()-.5)*14,size*.7,x+(next()-.5)*8,size);c.stroke();}
  });
}

/** Woven cloth: fine cross-hatch speckle. */
export function fabric(colour){
  return canvasTexture(128,(c,size)=>{
    const next=random(41);c.fillStyle=colour;c.fillRect(0,0,size,size);
    for(let i=0;i<1400;i++){c.fillStyle=shade(colour,(next()-.5)*.1);c.fillRect(next()*size,next()*size,i%2?3:1,i%2?1:3);}
  });
}

/** A bordered rug with a simple diamond repeat; drawn once across the whole rug. */
export function rug(base='#7f3b35',accent='#e2c49a',second='#2f4858'){
  return canvasTexture(512,(c,size)=>{
    const next=random(3);c.fillStyle=base;c.fillRect(0,0,size,size);
    for(let i=0;i<5000;i++){c.fillStyle=shade(base,(next()-.5)*.08);c.fillRect(next()*size,next()*size,2,2);}
    c.strokeStyle=accent;c.lineWidth=10;c.strokeRect(26,26,size-52,size-52);c.strokeStyle=second;c.lineWidth=14;c.strokeRect(50,50,size-100,size-100);
    c.strokeStyle=accent;c.lineWidth=3;c.strokeRect(68,68,size-136,size-136);
    for(let row=0;row<4;row++)for(let col=0;col<4;col++){const x=120+col*91,y=120+row*91,r=(row+col)%2?26:34;
      c.fillStyle=(row+col)%2?second:accent;c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r,y);c.lineTo(x,y+r);c.lineTo(x-r,y);c.closePath();c.fill();
      c.fillStyle=base;c.beginPath();c.moveTo(x,y-r*.4);c.lineTo(x+r*.4,y);c.lineTo(x,y+r*.4);c.lineTo(x-r*.4,y);c.closePath();c.fill();}
  },false);
}

/** Radial falloff for light halos and floor pools. */
export function halo(){
  return canvasTexture(128,(c,size)=>{
    const g=c.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.18,'rgba(255,255,255,.55)');g.addColorStop(.45,'rgba(255,255,255,.16)');g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;c.fillRect(0,0,size,size);
  },false);
}

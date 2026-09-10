export function tvIsOn(state) {return ['on','playing','paused','idle','buffering'].includes(state?.state);}

export const tvSceneIndex=(time,count)=>count?Math.floor(Math.max(0,time)/300000)%count:0;

/** Portable stills, loaded once per TV; letterboxing preserves the composition. */
export function tvSlideshow(scenes,changed){
  let disposed=false;
  const images=(scenes || []).filter(s=>typeof s.image==='string'&&/^(\/(?!\/)|https?:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(s.image)).map(s=>{
    const image=new Image();image.crossOrigin='anonymous';
    image.onload=()=>{if(!disposed)changed();};image.src=s.image;return image;
  });
  return {count:images.length,draw(context,width,height,time){
    const image=images[tvSceneIndex(time,images.length)];
    context.fillStyle='#080e14';context.fillRect(0,0,width,height);
    if(!image?.naturalWidth)return;
    const scale=Math.min(width/image.naturalWidth,height/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;
    context.drawImage(image,(width-w)/2,(height-h)/2,w,h);
  },dispose(){disposed=true;for(const image of images)image.onload=null;}};
}

/** Original local mini-programmes; time is milliseconds, no external media. */
export function drawTVFrame(context,width,height,time=0) {
  const t=Math.max(0,time)/1000,programme=Math.floor(t/8)%3;
  context.save();context.scale(width/256,height/144);
  const rect=(x,y,w,h,c)=>{context.fillStyle=c;context.fillRect(x,y,w,h);};
  const circle=(x,y,r,c)=>{context.fillStyle=c;context.beginPath();context.arc(x,y,r,0,Math.PI*2);context.fill();};
  const polygon=(points,c)=>{context.fillStyle=c;context.beginPath();points.forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y));context.closePath();context.fill();};
  if(programme===0){
    rect(0,0,256,144,'#70b8d2');circle(204,28,17,'#ffe7a2');
    for(let i=0;i<3;i++){const x=(i*96+t*8)%330-35;circle(x,26+i*9,13,'#e9f0e5');circle(x+15,25+i*9,17,'#e9f0e5');}
    polygon([[0,110],[52,45],[97,100],[149,55],[210,104],[256,70],[256,144],[0,144]],'#689581');
    polygon([[0,119],[53,94],[110,116],[180,86],[256,112],[256,144],[0,144]],'#3c7562');
    rect(0,125,256,4,'#d5c1a0');const train=(t*31)%340-70;
    for(let i=0;i<3;i++){rect(train-i*28,108,26,15,i===0?'#ce6d54':'#dcb371');rect(train-i*28+4,111,15,5,'#c6e2e2');circle(train-i*28+6,125,3,'#334957');circle(train-i*28+21,125,3,'#334957');}
  }else if(programme===1){
    rect(0,0,256,144,'#273e68');rect(13,13,137,72,'#81b7c6');
    for(let i=0;i<8;i++){const h=20+(i*17)%49;rect(18+i*16,85-h,12,h,['#48667b','#597b8c','#71999c'][i%3]);}
    circle(196,44,16,'#d8aa89');polygon([[174,61],[213,61],[225,113],[164,113]],'#6f8caa');rect(185,58,21,6,'#d8aa89');rect(141,101,103,14,'#b58c78');rect(0,115,256,29,'#e8ece5');rect(0,115,57,29,'#ba5d55');
    for(let i=0;i<6;i++)rect(70+i*36-(t*8)%36,123,24,4,'#52677e');rect(8,122,38,5,'#fff5de');rect(8,132,25,3,'#efd4bd');
  }else{
    rect(0,0,256,144,'#326c9b');rect(0,120,256,24,'#c4b790');
    for(let i=0;i<8;i++){const x=15+i*33;polygon([[x,123],[x-8,90+Math.sin(t+i)*7],[x+2,103],[x+7,77],[x+8,123]],'#5ca897');}
    for(let i=0;i<4;i++){const x=(t*(14+i*3)+i*71)%300-25,y=35+i*20+Math.sin(t+i)*6,c=['#efb967','#e87e71','#a6cb85','#c0a8d0'][i];polygon([[x-12,y],[x-24,y-9],[x-24,y+9]],c);circle(x,y,12,c);circle(x+5,y-3,2,'#263d58');}
    for(let i=0;i<6;i++)circle(30+i*41,125-(t*17+i*23)%125,2,'#9cc8d2');
  }
  polygon([[239,7],[245,13],[239,19],[233,13]],'#f4e8ba');context.restore();
}

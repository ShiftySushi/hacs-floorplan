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

/** Original, seamlessly cross-faded ambient films, entirely local and portable. */
export function drawTVFrame(ctx,width,height,time=0) {
  const t=Math.max(0,time)/1000,phase=t/16,index=Math.floor(phase)%12,mix=Math.max(0,(phase%1-.85)/.15);
  const palettes=[['#030e25','#38d8b4','#6455ed'],['#240d37','#fd6685','#28b8dd'],['#20133b','#ecab52','#7e4279'],['#021627','#36bed1','#e5dfa5'],['#07091d','#668bdf','#e964a7'],['#143034','#9ac985','#e4d18c'],['#190d29','#dc74b6','#8175e8'],['#062339','#39b9d4','#e98d73'],['#26132d','#e78e40','#bf527b'],['#081b30','#84cdba','#497bb8'],['#1c133a','#866de5','#eea1a2'],['#091e23','#59bd8b','#c2de8b']];
  function film(n,alpha){
    const p=palettes[n];ctx.save();ctx.globalAlpha=alpha;ctx.scale(width/960,height/540);
    const bg=ctx.createLinearGradient(0,0,960,540);bg.addColorStop(0,p[0]);bg.addColorStop(1,p[2]);ctx.fillStyle=bg;ctx.fillRect(0,0,960,540);
    for(let i=0;i<70;i++){const x=(i*137.7+t*(1+n%3))%960,y=(i*83.3)%540;ctx.fillStyle='#ffffff55';ctx.beginPath();ctx.arc(x,y,.5+(i%3)*.4,0,7);ctx.fill();}
    if(n%3===0){
      for(let i=0;i<18;i++){ctx.beginPath();ctx.moveTo(-30,560);for(let x=-30;x<=990;x+=12){const y=245+Math.sin(x/180+t*.17+i*.13)*90+Math.sin(x/83-t*.09)*22+i*7;ctx.lineTo(x,y);}ctx.lineTo(990,560);const g=ctx.createLinearGradient(0,140,0,550);g.addColorStop(0,p[1]+'18');g.addColorStop(.6,p[1]+'30');g.addColorStop(1,p[0]+'aa');ctx.fillStyle=g;ctx.fill();}
    }else if(n%3===1){
      ctx.globalCompositeOperation='screen';for(let i=0;i<7;i++){const x=480+Math.sin(t*.06+i*1.8)*310,y=270+Math.cos(t*.08+i)*160,r=150+i*9,g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,(i%2?p[1]:p[2])+'aa');g.addColorStop(1,p[0]+'00');ctx.fillStyle=g;ctx.fillRect(0,0,960,540);}
    }else{
      for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(-30,560);for(let x=-30;x<=990;x+=10)ctx.lineTo(x,210+i*37+Math.sin(x/210+t*.035+i*.7)*65+Math.cos(x/120+i)*24);ctx.lineTo(990,560);ctx.fillStyle=i%2?p[1]:p[2];ctx.globalAlpha=alpha*(.2+i*.09);ctx.fill();}
    }ctx.restore();
  }
  film(index,1);if(mix)film((index+1)%12,mix*mix*(3-2*mix));
}

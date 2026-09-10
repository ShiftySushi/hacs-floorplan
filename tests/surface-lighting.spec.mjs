import {test,expect} from '@playwright/test';

test('a fifth light colours and dims real 3D surfaces at night without a floor glow map',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/demo/');
  await page.evaluate(()=>{
    const card=document.querySelector('floorplan-card');
    card.setConfig({type:'custom:floorplan-card',appearance:{mode:'3d'},floors:[{id:'room',width_m:4,depth_m:4,rooms:[],walls:[{id:'wall',a:[0,10],b:[100,10],height:2.4}],objects:[{id:'table',type:'dining_table',x:50,y:50,width:2,depth:1,height:.8,colour:'#bbbbbb'}],entities:Array.from({length:5},(_,i)=>({entity:`light.test${i}`,x:50,y:50,fixture:'pendant'}))}]});
  });
  async function sample(brightness,rgb){
    await page.evaluate(({brightness,rgb})=>{
      const card=document.querySelector('floorplan-card');card.hass={states:{'sun.sun':{state:'below_horizon',attributes:{elevation:-12}},...Object.fromEntries(Array.from({length:5},(_,i)=>[`light.test${i}`,{state:i===4&&brightness?'on':'off',attributes:{brightness,rgb_color:rgb}}]))}};
    },{brightness,rgb});
    const canvas=page.locator('floorplan-card canvas').first();await expect(canvas).toBeVisible();
    const bytes=await canvas.screenshot();
    return page.evaluate(async base64=>{const image=new Image();image.src=`data:image/png;base64,${base64}`;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data,sum=[0,0,0];for(let i=0;i<data.length;i+=4)for(let j=0;j<3;j++)sum[j]+=data[i+j];return sum.map(v=>v/(data.length/4));},bytes.toString('base64'));
  }
  const off=await sample(0,[255,255,255]),red=await sample(255,[255,0,0]),dim=await sample(30,[255,0,0]),blue=await sample(255,[0,0,255]);
  expect(red[0]).toBeGreaterThan(off[0]+.2);expect(red[0]).toBeGreaterThan(dim[0]+.2);
  expect(red[0]-off[0]).toBeGreaterThan(red[2]-off[2]);
  expect(blue[2]-off[2]).toBeGreaterThan(blue[0]-off[0]);
});

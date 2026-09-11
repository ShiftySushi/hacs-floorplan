import {test,expect} from '@playwright/test';

for(const cutaway of [false,true])test(`solid walls block light and doorways transmit it (cutaway ${cutaway})`,async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const errors=[];page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  async function configure(open){await page.evaluate(({open,cutaway})=>{
    const c=document.querySelector('floorplan-card');
    c.setConfig({type:'custom:floorplan-card',appearance:{mode:'3d',quality:'low'},floors:[{id:'test',width_m:4,depth_m:4,rooms:[],walls:[{id:'divider',a:[0,cutaway?70:50],b:[100,cutaway?70:50],height:2.4,thickness:.15,openings:open?[{id:'door',type:'door',offset:.5,width:1.2,height:2.1}]:[]}],objects:[{id:'strip',type:'tv_lightstrip',x:50,y:cutaway?48:28,width:.4,depth:.025,height:.3,elevation_m:1.1,light_entity:'light.strip'},{id:'receiver',type:'dining_table',x:50,y:cutaway?88:75,width:1.1,depth:.6,height:.7,colour:'#cccccc'}]}]});
  },{open,cutaway});}
  async function sample(on){
    await page.evaluate(on=>{document.querySelector('floorplan-card').hass={states:{'sun.sun':{state:'below_horizon',attributes:{elevation:-15}},'light.strip':{state:on?'on':'off',attributes:{brightness:255,rgb_color:[255,0,0]}}}};},on);
    const canvas=page.locator('floorplan-card canvas').first();await expect(canvas).toBeVisible();const png=await canvas.screenshot();
    return page.evaluate(async base64=>{const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const {data}=ctx.getImageData(0,Math.floor(canvas.height*.55),canvas.width,Math.floor(canvas.height*.4));let red=0;for(let i=0;i<data.length;i+=4)red+=data[i]-data[i+2];return red/(data.length/4);},png.toString('base64'));
  }
  await configure(false);const closedOff=await sample(false),closedOn=await sample(true);
  if(cutaway)expect(JSON.parse(await page.locator('floorplan-card .plan-3d').getAttribute('data-wall-opacities')).some(opacity=>opacity<1)).toBe(true);
  await configure(true);const openOff=await sample(false),openOn=await sample(true);
  expect(errors.filter(e=>/shader|WebGL|VALIDATE_STATUS/i.test(e))).toEqual([]);
  if(!cutaway)expect(Math.abs(closedOn-closedOff)).toBeLessThan(.15);
  expect(openOn-openOff).toBeGreaterThan(closedOn-closedOff+.2);

});

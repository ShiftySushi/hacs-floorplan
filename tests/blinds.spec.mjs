import {test,expect} from '@playwright/test';
test('window blinds animate closed and reopen without rotating the camera',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{const card=document.querySelector('floorplan-card');card.setConfig({type:'custom:floorplan-card',appearance:{mode:'3d'},floors:[{id:'blinds',width_m:4,depth_m:4,rooms:[{id:'room',name:'Room',points:[[0,0],[100,0],[100,100],[0,100]],lights:['light.pendant']}],walls:[{id:'north',a:[0,0],b:[100,0],height:2.4,openings:[{id:'window',type:'window',frame:'fixed',offset:.5,width:3,height:1.5,sill:.7}]}],objects:[],entities:[{entity:'light.pendant',x:50,y:50,fixture:'pendant'}]}]});card.hass={states:{'sun.sun':{state:'above_horizon',attributes:{elevation:45}}}};});
  const plan=page.locator('.plan-3d'),canvas=plan.locator('canvas').first();await expect(canvas).toBeVisible();
  await page.waitForTimeout(1200); // Allow the card entrance animation to finish.
  const bounds=await canvas.boundingBox(),position={x:bounds.width*.57,y:bounds.height*.31};
  async function brightness(){const bytes=await canvas.screenshot();return page.evaluate(async base64=>{const image=new Image();image.src=`data:image/png;base64,${base64}`;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(c.width*.45,c.height*.6,12,12).data;let sum=0;for(let i=0;i<data.length;i+=4)sum+=data[i]+data[i+1]+data[i+2];return sum/(data.length/4)/3;},bytes.toString('base64'));}
  const azimuth=await plan.getAttribute('data-view-azimuth'),open=await brightness();
  await canvas.click({position});await page.waitForTimeout(1550);const closed=await brightness();
  expect(open).toBeGreaterThan(closed+20);
  await expect(plan).toHaveAttribute('data-view-azimuth',azimuth);
  await canvas.click({position});await page.waitForTimeout(1550);const reopened=await brightness();
  expect(Math.abs(reopened-open)).toBeLessThan(3);
  // At night, shutting a blind must preserve electric light and ambient fill.
  await page.evaluate(()=>{document.querySelector('floorplan-card').hass={states:{'sun.sun':{state:'below_horizon',attributes:{elevation:-12}},'light.pendant':{state:'on',attributes:{brightness:255,color_temp_kelvin:2700}}}};});
  await page.waitForTimeout(1550);const litOpen=await brightness();
  await canvas.click({position});await page.waitForTimeout(1550);const litClosed=await brightness();
  expect(Math.abs(litClosed-litOpen)).toBeLessThan(5);
  expect(litClosed).toBeGreaterThan(40);
  expect(errors).toEqual([]);
});

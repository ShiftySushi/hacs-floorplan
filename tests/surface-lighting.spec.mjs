import {test,expect} from '@playwright/test';

test('a connected dressing zone receives the bedroom window daylight and follows its blind',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  async function sample(linked,closed=false){
    await page.evaluate(linked=>{const card=document.querySelector('floorplan-card');card.blindStates={};card.setConfig({appearance:{mode:'3d'},floors:[{id:'connected-zones',width_m:6,depth_m:4,rooms:[{id:'bedroom',name:'Bedroom',daylight_group:'suite',points:[[0,0],[50,0],[50,100],[0,100]],lights:[],colour:'#e4d8bf',material:'carpet'},{id:'dressing',name:'Dressing',...(linked?{daylight_group:'suite'}:{}),points:[[50,0],[100,0],[100,100],[50,100]],lights:[],colour:'#e4d8bf',material:'carpet'}],walls:[{id:'north',a:[0,0],b:[100,0],thickness:.15,height:2.4,openings:[{id:'window',type:'window',offset:.25,width:1.2,height:1.2,sill:.9}]}],objects:[],entities:[]}]});card.hass={states:{'sun.sun':{state:'above_horizon',attributes:{elevation:45}}}};},linked);
    const canvas=page.locator('floorplan-card canvas').first();await expect(canvas).toBeVisible();if(closed)await page.getByRole('button',{name:'Close all blinds',exact:true}).click();
    const bytes=await canvas.screenshot();
    if(linked&&!closed)await canvas.screenshot({path:'/tmp/connected-zone-daylight.png'});
    return page.evaluate(async b=>{const image=new Image();image.src='data:image/png;base64,'+b;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;let sum=0;for(let i=0;i<data.length;i+=4)sum+=data[i]+data[i+1]+data[i+2];return sum/(data.length/4*3);},bytes.toString('base64'));
  }
  const separate=await sample(false),open=await sample(true),closed=await sample(true,true);expect(open).toBeGreaterThan(separate+2);expect(closed).toBeLessThan(open-2);
});

test('windowless carpet stays dim in daylight but responds to its electric light',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  async function sample(window,light){
    await page.evaluate(({window,light})=>{
      const card=document.querySelector('floorplan-card');
      card.setConfig({appearance:{mode:'3d'},floors:[{id:'windowless-check',width_m:4,depth_m:4,rooms:[{id:'room',name:'Room',points:[[5,5],[95,5],[95,95],[5,95]],material:'carpet',colour:'#e4d8bf',lights:['light.ceiling']}],objects:[],entities:[{entity:'light.ceiling',x:50,y:50,fixture:'pendant'}],walls:window?[{id:'north',a:[5,5],b:[95,5],thickness:.15,height:2.4,openings:[{id:'window',type:'window',width:1.2,height:1.2,sill:.9,offset:.5,blinds:false}]}]:[]}]});
      card.hass={states:{'sun.sun':{state:'above_horizon',attributes:{elevation:45}},'light.ceiling':{state:light?'on':'off',attributes:{brightness:255,rgb_color:[255,255,255]}}}};
    },{window,light});
    const plan=page.locator('.plan-3d');await expect(plan.locator('canvas').first()).toBeVisible();
    await plan.evaluate(e=>e.style.setProperty('background','#000','important'));
    const bytes=await plan.locator('canvas').first().screenshot();
    return page.evaluate(async b=>{const image=new Image();image.src='data:image/png;base64,'+b;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;let sum=0;for(let i=0;i<data.length;i+=4)sum+=data[i]+data[i+1]+data[i+2];return sum/(data.length/4*3);},bytes.toString('base64'));
  }
  const dark=await sample(false,false),lit=await sample(false,true),daylit=await sample(true,false);
  expect(lit).toBeGreaterThan(dark*1.3);
  expect(daylit).toBeGreaterThan(dark*1.3);
});

test('a fifth light colours and dims real 3D surfaces at night without a floor glow map',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
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

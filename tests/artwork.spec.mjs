import {test,expect} from '@playwright/test';
test('rotation selects the image for the screen orientation',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{
    const image=(w,h,colour)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.fillStyle=colour;ctx.fillRect(0,0,w,h);return c.toDataURL();};
    window.landscape=image(160,90,'red');window.portrait=image(90,160,'blue');window.artDraws=[];
    const draw=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(...args){if(this.canvas.width===512)window.artDraws.push(args[0].src);return draw.apply(this,args);};
    const card=document.querySelector('floorplan-card');card.setConfig({type:'custom:floorplan-card',appearance:{mode:'3d'},floors:[{id:'orientation',width_m:3,depth_m:3,objects:[{id:'art',type:'picture',x:50,y:50,width:1.4,height:.8,depth:.04,artwork_image:window.landscape,artwork_portrait_image:window.portrait}],walls:[],rooms:[{id:'room',name:'Gallery',material:'tile',colour:'#ffffff',points:[[0,0],[100,0],[100,100],[0,100]],lights:[]}],entities:[]}]});card.hass={states:{}};
  });
  await expect.poll(()=>page.evaluate(()=>window.artDraws.at(-1)===window.landscape)).toBe(true);
  await page.getByRole('button',{name:'Rotate artwork',exact:true}).click({force:true});
  await expect.poll(()=>page.evaluate(()=>window.artDraws.at(-1)===window.portrait)).toBe(true);
  await page.getByRole('button',{name:'Rotate artwork',exact:true}).click({force:true});
  await expect.poll(()=>page.evaluate(()=>window.artDraws.at(-1)===window.landscape)).toBe(true);
});
test('artwork follows HA image and clicking the frame preserves portrait preference',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{
    const image=colour=>{const c=document.createElement('canvas');c.width=160;c.height=90;const ctx=c.getContext('2d');ctx.fillStyle=colour;ctx.fillRect(0,0,160,90);return c.toDataURL();};
    window.artBlue=image('#0000ff');
    const card=document.querySelector('floorplan-card');
    card.setConfig({type:'custom:floorplan-card',title:'Art test',appearance:{mode:'3d'},floors:[{id:'gallery',width_m:3,depth_m:3,objects:[{id:'art',type:'picture',name:'Artwork',colour:'#808080',x:50,y:50,width:1.4,height:.8,depth:.04,elevation_m:1,media_entity:'media_player.canvas',artwork_image:image('#ff0000')}],rooms:[{id:'room',name:'Gallery',material:'tile',colour:'#ffffff',points:[[0,0],[100,0],[100,100],[0,100]],lights:[]}],walls:[],entities:[]}]});card.hass={states:{}};
  });
  const canvas=page.locator('.plan-3d canvas').first();await expect(canvas).toBeVisible();
  async function pixels(blue=false){const image=(await canvas.screenshot()).toString('base64');return page.evaluate(async({image,blue})=>{const img=new Image();img.src='data:image/png;base64,'+image;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;let count=0,x=0,y=0;for(let i=0;i<d.length;i+=4){const a=d[i+(blue?2:0)],b=d[i+(blue?0:2)];if(a>10&&a>b*2&&a>d[i+1]*2){count++;x+=(i/4)%c.width;y+=Math.floor(i/4/c.width);}}return {count,x:x/count/img.width,y:y/count/img.height};},{image,blue});}
  await expect.poll(async()=>(await pixels()).count).toBeGreaterThan(30);
  const red=await pixels(),bounds=await canvas.boundingBox();await canvas.click({position:{x:red.x*bounds.width,y:red.y*bounds.height}});
  await expect.poll(()=>page.evaluate(()=>Object.values(document.querySelector('floorplan-card').viewStates).some(s=>s.portraits?.['gallery:art']))).toBe(true);
  await page.evaluate(()=>{document.querySelector('floorplan-card').hass={states:{'media_player.canvas':{state:'playing',attributes:{entity_picture:window.artBlue}}}};});
  await expect.poll(async()=>(await pixels(true)).count).toBeGreaterThan(30);
  await expect.poll(async()=>(await pixels()).count).toBeLessThan(5);
  await page.evaluate(()=>{const old=document.querySelector('floorplan-card'),next=document.createElement('floorplan-card');next.setConfig(old.config);next.hass=old._hass;old.replaceWith(next);});
  await expect.poll(()=>page.evaluate(()=>Object.values(document.querySelector('floorplan-card').viewStates).some(s=>s.portraits?.['gallery:art']))).toBe(true);
  await page.getByRole('button',{name:'Rotate artwork',exact:true}).click({force:true});
  await expect.poll(()=>page.evaluate(()=>Object.values(document.querySelector('floorplan-card').viewStates).some(s=>s.portraits?.['gallery:art']))).toBe(false);
  expect(errors).toEqual([]);
});

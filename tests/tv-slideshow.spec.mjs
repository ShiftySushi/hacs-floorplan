import {test,expect} from '@playwright/test';

test('3D TV advances its still after five minutes and goes dark when off',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.clock.install();
  await page.evaluate(()=>{
    const image=colour=>{const c=document.createElement('canvas');c.width=160;c.height=90;const ctx=c.getContext('2d');ctx.fillStyle=colour;ctx.fillRect(0,0,160,90);return c.toDataURL();};
    window.stills=[image('#ff0000'),image('#0000ff')];window.tvDraws=[];window.tvFills=[];
    const draw=CanvasRenderingContext2D.prototype.drawImage,fill=CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.drawImage=function(...args){if(window.stills.includes(args[0].src)){window.tvCanvas=this.canvas;window.tvDraws.push(args[0].src);}return draw.apply(this,args);};
    CanvasRenderingContext2D.prototype.fillRect=function(...args){if(this.canvas===window.tvCanvas)window.tvFills.push(this.fillStyle);return fill.apply(this,args);};
    const card=document.querySelector('floorplan-card');
    card.setConfig({type:'custom:floorplan-card',title:'TV test',appearance:{mode:'3d'},floors:[{id:'tv-room',width_m:3,depth_m:3,objects:[{id:'tv',type:'tv',x:50,y:50,width:1.4,height:.8,depth:.08,elevation_m:.6,media_entity:'media_player.tv',tv_scenes:window.stills.map(image=>({image}))}],rooms:[{id:'room',name:'TV room',points:[[0,0],[100,0],[100,100],[0,100]],lights:[]}],walls:[],entities:[]}]});
    card.hass={states:{'media_player.tv':{state:'playing',attributes:{}}}};
  });
  await expect.poll(()=>page.evaluate(()=>window.tvDraws.at(-1)===window.stills[0])).toBe(true);
  await page.clock.fastForward(290000);
  expect(await page.evaluate(()=>window.tvDraws.includes(window.stills[1]))).toBe(false);
  await page.clock.fastForward(10100);
  await expect.poll(()=>page.evaluate(()=>window.tvDraws.at(-1)===window.stills[1])).toBe(true);
  const canvas=page.locator('.plan-3d canvas').first(),png=(await canvas.screenshot()).toString('base64');
  const point=await page.evaluate(async png=>{const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;let n=0,x=0,y=0;for(let i=0;i<d.length;i+=4)if(d[i+2]>50&&d[i+2]>d[i]*2&&d[i+2]>d[i+1]*2){n++;x+=(i/4)%c.width;y+=Math.floor(i/4/c.width);}return {x:x/n/c.width,y:y/n/c.height,n};},png);
  expect(point.n).toBeGreaterThan(30);const bounds=await canvas.boundingBox();
  await canvas.click({position:{x:point.x*bounds.width,y:point.y*bounds.height}});
  await expect.poll(()=>page.evaluate(()=>window.tvDraws.at(-1)===window.stills[0])).toBe(true);
  await page.clock.fastForward(290000);
  expect(await page.evaluate(()=>window.tvDraws.at(-1)===window.stills[0])).toBe(true);
  await page.clock.fastForward(10100);
  await expect.poll(()=>page.evaluate(()=>window.tvDraws.at(-1)===window.stills[1])).toBe(true);
  await page.evaluate(()=>{window.tvFills=[];document.querySelector('floorplan-card').hass={states:{'media_player.tv':{state:'off',attributes:{}}}};});
  await expect.poll(()=>page.evaluate(()=>window.tvFills.at(-1))).toBe('#080e14');
});

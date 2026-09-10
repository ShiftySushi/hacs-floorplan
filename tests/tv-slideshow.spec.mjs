import {test,expect} from '@playwright/test';

test('3D TV advances its still after five minutes and goes dark when off',async({page})=>{
  await page.goto('/demo/');
  await page.clock.install();
  await page.evaluate(()=>{
    const image=colour=>{const c=document.createElement('canvas');c.width=160;c.height=90;const ctx=c.getContext('2d');ctx.fillStyle=colour;ctx.fillRect(0,0,160,90);return c.toDataURL();};
    window.stills=[image('#ff0000'),image('#0000ff')];window.tvDraws=[];window.tvFills=[];
    const draw=CanvasRenderingContext2D.prototype.drawImage,fill=CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.drawImage=function(...args){if(this.canvas.width===960)window.tvDraws.push(args[0].src);return draw.apply(this,args);};
    CanvasRenderingContext2D.prototype.fillRect=function(...args){if(this.canvas.width===960)window.tvFills.push(this.fillStyle);return fill.apply(this,args);};
    const card=document.querySelector('floorplan-card');
    card.setConfig({type:'custom:floorplan-card',title:'TV test',appearance:{mode:'3d'},floors:[{id:'tv-room',width_m:3,depth_m:3,objects:[{id:'tv',type:'tv',x:50,y:50,width:1.4,height:.8,depth:.08,elevation_m:.6,media_entity:'media_player.tv',tv_scenes:window.stills.map(image=>({image}))}],rooms:[{id:'room',name:'TV room',points:[[0,0],[100,0],[100,100],[0,100]],lights:[]}],walls:[],entities:[]}]});
    card.hass={states:{'media_player.tv':{state:'playing',attributes:{}}}};
  });
  await expect.poll(()=>page.evaluate(()=>window.tvDraws.at(-1)===window.stills[0])).toBe(true);
  await page.clock.fastForward(299000);
  expect(await page.evaluate(()=>window.tvDraws.includes(window.stills[1]))).toBe(false);
  await page.clock.fastForward(1100);
  await expect.poll(()=>page.evaluate(()=>window.tvDraws.at(-1)===window.stills[1])).toBe(true);
  await page.evaluate(()=>{window.tvFills=[];document.querySelector('floorplan-card').hass={states:{'media_player.tv':{state:'off',attributes:{}}}};});
  await expect.poll(()=>page.evaluate(()=>window.tvFills.at(-1))).toBe('#080e14');
});

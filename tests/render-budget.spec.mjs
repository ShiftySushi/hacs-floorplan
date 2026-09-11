import {test,expect} from '@playwright/test';

test('decorative TV frames use bounded wake-ups and stop when the TV is off',async({page})=>{
  await page.addInitScript(()=>{window.frameCallbacks=0;const raf=window.requestAnimationFrame;window.requestAnimationFrame=callback=>raf.call(window,time=>{window.frameCallbacks++;callback(time);});});
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{const card=document.querySelector('floorplan-card');card.setConfig({appearance:{mode:'3d'},floors:[{id:'test',width_m:4,depth_m:4,rooms:[{id:'room',name:'Room',points:[[0,0],[100,0],[100,100],[0,100]],lights:[]}],walls:[],entities:[],objects:[{id:'tv',type:'tv',x:50,y:50,width:1.4,height:.8,depth:.15,media_entity:'media_player.tv'}]}]});card.hass={states:{'media_player.tv':{state:'playing',attributes:{}}}};});
  await expect(page.locator('floorplan-card canvas')).toBeVisible();await page.waitForTimeout(1500);
  await page.evaluate(()=>window.frameCallbacks=0);await page.waitForTimeout(1200);const active=await page.evaluate(()=>window.frameCallbacks);expect(active).toBeGreaterThan(2);expect(active).toBeLessThan(20);
  await page.evaluate(()=>{document.querySelector('floorplan-card').hass={states:{'media_player.tv':{state:'off',attributes:{}}}};});await page.waitForTimeout(1000);await page.evaluate(()=>window.frameCallbacks=0);await page.waitForTimeout(1200);expect(await page.evaluate(()=>window.frameCallbacks)).toBeLessThan(3);
});

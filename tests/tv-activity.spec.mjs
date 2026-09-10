import {test,expect} from '@playwright/test';
test('TV screen animates from media-player power independently of its light strip',async({page})=>{
  await page.goto('/demo/');
  await page.evaluate(()=>{const c=document.querySelector('floorplan-card'),config=structuredClone(c.config);config.floors[0].objects.push({id:'tv-test',type:'tv',x:50,y:50,width:1.44,depth:.15,height:.81,media_entity:'media_player.tv'});c.setConfig(config);c.hass={...c._hass,states:{...c._hass.states,'media_player.tv':{state:'playing',attributes:{}}}};});
  const card=page.locator('floorplan-card'),screen=card.locator('[data-tv-screen="tv-test"]');
  await expect(screen).toBeVisible();
  const screenSize=await screen.evaluate(el=>({width:Number(el.getAttribute('width')),height:Number(el.getAttribute('height'))}));
  expect(screenSize.height/screenSize.width).toBeLessThan(.05);
  const frame=await screen.getAttribute('href');
  await expect.poll(()=>screen.getAttribute('href')).not.toBe(frame);
  await page.evaluate(()=>{const c=document.querySelector('floorplan-card');c.hass={...c._hass,states:{...c._hass.states,'media_player.tv':{state:'off',attributes:{}}}};});
  await expect(screen).toBeHidden();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{const c=document.querySelector('floorplan-card');c.hass={...c._hass,states:{...c._hass.states,'media_player.tv':{state:'on',attributes:{}}}};});
  await expect(screen).toBeVisible();const still=await screen.getAttribute('href');await page.waitForTimeout(180);expect(await screen.getAttribute('href')).toBe(still);
  await card.getByRole('button',{name:'3D',exact:true}).click();await expect(card.locator('canvas')).toBeVisible();
});

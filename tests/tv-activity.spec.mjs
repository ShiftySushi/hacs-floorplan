import {test,expect} from '@playwright/test';
test('TV screen follows media-player power without rebuilding the view',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{const c=document.querySelector('floorplan-card'),config=structuredClone(c.config);config.floors[0].objects.push({id:'tv-test',type:'tv',x:50,y:50,width:1.44,depth:.15,height:.81,media_entity:'media_player.tv'});c.setConfig(config);c.hass={...c._hass,states:{...c._hass.states,'media_player.tv':{state:'playing',attributes:{}}}};});
  const card=page.locator('floorplan-card'),plan=card.locator('.plan-diorama'),tv=()=>plan.evaluate(node=>node.stats().televisions.find(t=>t.id==='tv-test'));
  await expect(plan.locator('canvas')).toBeVisible();
  expect(await tv()).toEqual({id:'tv-test',on:true});
  await page.evaluate(()=>{const c=document.querySelector('floorplan-card');c.hass={...c._hass,states:{...c._hass.states,'media_player.tv':{state:'off',attributes:{}}}};});
  await expect.poll(tv).toEqual({id:'tv-test',on:false});
  // The canvas is updated in place, never rebuilt, when a device changes state.
  await plan.evaluate(node=>{node.dataset.kept='yes';});
  await page.evaluate(()=>{const c=document.querySelector('floorplan-card');c.hass={...c._hass,states:{...c._hass.states,'media_player.tv':{state:'on',attributes:{}}}};});
  await expect.poll(tv).toEqual({id:'tv-test',on:true});await expect(plan).toHaveAttribute('data-kept','yes');
});

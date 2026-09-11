import {test,expect} from '@playwright/test';

test('all storeys has per-floor overlays and an inspection toggle without rebuilding the camera',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{
    const card=document.querySelector('floorplan-card'),config=JSON.parse(document.querySelector('#config').textContent);
    const original=config.floors[0];
    config.floors=[original,{...structuredClone(original),id:'upper',name:'Upper',rotation:90,elevation:4}];
    config.floors.forEach((floor,index)=>{floor.entities=[{entity:'light.diner',name:`Storey ${index} light`,x:25,y:25}];floor.rooms=[{id:`room-${index}`,name:`Room ${index}`,points:[[0,0],[100,0],[100,100],[0,100]],lights:['light.diner'],presence:[],temperature_entity:'sensor.temperature'}];floor.objects=[];});
    card.setConfig(config);
  });
  const card=page.locator('floorplan-card');
  await card.getByRole('button',{name:'3D',exact:true}).click();
  const modes=await card.locator('.view-modes').boundingBox();
  await card.getByRole('button',{name:'All storeys',exact:true}).click();
  await expect(card.locator('.marker')).toHaveCount(4);
  await expect(card.locator('.temperature-marker')).toHaveCount(2);
  await expect.poll(async()=>card.locator('.marker').evaluateAll(nodes=>new Set(nodes.map(n=>n.style.left+','+n.style.top)).size)).toBe(4);
  expect(await card.locator('.view-modes').boundingBox()).toEqual(modes);
  await expect(card.locator('.plan-slot .floor-tabs')).toBeVisible();
  await card.locator('canvas').evaluate(canvas=>canvas.dataset.retained='yes');
  await card.getByRole('button',{name:'Hide overlays',exact:true}).click();
  await expect(card.locator('.marker')).toHaveCount(0);
  await expect(card.locator('.outdoor-temperature')).toHaveCount(0);
  await expect(card.locator('canvas')).toHaveAttribute('data-retained','yes');
  await card.getByRole('button',{name:'Show overlays',exact:true}).click();
  await expect(card.locator('.marker')).toHaveCount(4);
  await expect(card.locator('canvas')).toHaveAttribute('data-retained','yes');
  await page.screenshot({path:`/tmp/storey-overlays-${test.info().project.name}.png`});
});

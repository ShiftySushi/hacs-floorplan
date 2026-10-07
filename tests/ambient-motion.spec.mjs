import {test,expect} from '@playwright/test';
test('entrance and progressive controls respect interaction',async({page},info)=>{
 await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));const card=page.locator('floorplan-card');
 await expect(card.locator('ha-card')).toHaveClass(/has-entered/);
 await expect(card.locator('.plan-diorama canvas')).toBeVisible();
 await card.getByRole('button',{name:'Lighting',exact:true}).click();
 await expect(card.locator('.inspector-slot')).toBeVisible();
 await page.screenshot({path:`/tmp/ambient-controls-${info.project.name}.png`});
});
test('reduced motion suppresses the entrance and holds the illustrated view still',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));const card=page.locator('floorplan-card');
 await expect(card.locator('.plan')).toHaveCSS('animation-name','none');
 // With reduced motion lamps hold a steady level instead of shimmering.
 const plan=card.locator('.plan-diorama');await expect(plan.locator('canvas')).toBeVisible();
 const lit=()=>plan.evaluate(node=>{const floor=document.querySelector('floorplan-card').config.floors[0],light=floor.entities.find(e=>e.entity.startsWith('light.'));return JSON.stringify(node.sampleLight(floor.id,[light.x,light.y]));});
 const first=await lit();await page.waitForTimeout(700);expect(await lit()).toBe(first);
});

import {test,expect} from '@playwright/test';

test('live workspace fits a tall plan and keeps editing separate',async({page})=>{
  await page.goto('/demo/');
  const card=page.locator('floorplan-card');
  await page.evaluate(()=>{const card=document.querySelector('floorplan-card');const config=structuredClone(card.config);config.floors[0].aspect_ratio=.6;card.setConfig(config);});
  await expect.poll(async()=>{const r=await card.locator('.plan').boundingBox();return !!r&&r.y>=0&&r.y+r.height<=page.viewportSize().height;}).toBe(true);
  await expect(page.locator('floorplan-card-editor')).toBeHidden();
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  await expect(page.locator('floorplan-card-editor')).toBeVisible();
  await expect(card).toBeHidden();
  await page.getByRole('button',{name:'Live view',exact:true}).click();
  await expect(card).toBeVisible();
  await expect.poll(async()=>{const r=await card.locator('.plan').boundingBox();return !!r&&r.y+r.height<=page.viewportSize().height;}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

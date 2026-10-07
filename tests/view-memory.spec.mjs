import {test,expect} from '@playwright/test';
test('overlay toggle survives refresh and remains readable',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));const card=page.locator('floorplan-card');
  await card.getByRole('button',{name:'Hide overlays',exact:true}).click();
  const show=card.getByRole('button',{name:'Show overlays',exact:true});
  await expect(show).toBeVisible();
  const colours=await show.evaluate(node=>{const s=getComputedStyle(node);return [s.color,s.backgroundColor];});
  expect(colours[0]).not.toBe(colours[1]);
  await page.reload();await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));await expect(show).toBeVisible();
  await expect(page.getByRole('button',{name:'Live view',exact:true}).locator('svg')).toBeVisible();
  await page.screenshot({path:`/tmp/view-memory-${test.info().project.name}.png`});
});

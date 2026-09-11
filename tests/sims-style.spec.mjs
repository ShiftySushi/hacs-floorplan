import {test,expect} from '@playwright/test';
test('Sims-like is a selectable 3D custom style retaining lighting controls and layout',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));const card=page.locator('floorplan-card');
  await card.getByRole('combobox',{name:'Custom style',exact:true}).selectOption('sims');
  await expect(card.locator('canvas')).toBeVisible();
  await card.getByRole('button',{name:'Diner: On',exact:true}).click();await expect(card.getByRole('button',{name:'Diner: Off',exact:true})).toBeVisible();
  await expect(card.locator('canvas')).toBeVisible();
  await card.getByRole('button',{name:'2D',exact:true}).click();await expect(card.locator('svg.floor-image')).toBeVisible();
});

import {test,expect} from '@playwright/test';
test('furniture editor uses 2D independently of live style and offers editable 3D height preview',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  const e=page.locator('floorplan-card-editor');
  await e.evaluate(el=>{el.config.appearance.mode='pokemon';el.render();});
  await e.getByRole('button',{name:'3. Furniture',exact:true}).click();
  await expect(e.locator('[data-retro-furniture]')).toHaveCount(0);
  await expect(e.getByRole('button',{name:'2D edit',exact:true})).toHaveAttribute('aria-pressed','true');
  await e.getByRole('combobox',{name:'Placed furniture',exact:true}).selectOption('furniture-0');
  await e.getByRole('button',{name:'Unlock editing',exact:true}).click();
  await e.getByRole('button',{name:'3D preview',exact:true}).click();
  await expect(e.locator('canvas')).toBeVisible();
  await e.getByLabel('Height (metres)',{exact:true}).fill('1.25');await e.getByLabel('Height (metres)',{exact:true}).press('Tab');
  await expect(e.locator('canvas')).toBeVisible();
  expect(await e.evaluate(el=>el.config.appearance.mode)).toBe('pokemon');
  await e.getByRole('button',{name:'2D edit',exact:true}).click();
  await expect(e.getByLabel('Height (metres)',{exact:true})).toHaveValue('1.25');
  await expect(e.locator('canvas')).toHaveCount(0);
});

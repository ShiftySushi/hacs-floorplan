import {test,expect} from '@playwright/test';
test('all walls hide and restore independently of cutaway mode',async({page})=>{
  await page.goto('/demo/');
  await page.getByRole('button',{name:'3D',exact:true}).click();
  const plan=page.locator('.plan-3d');await expect(plan.locator('canvas').first()).toBeVisible();
  await page.getByRole('button',{name:'Hide all walls',exact:true}).click({force:true});
  await expect.poll(async()=>JSON.parse(await plan.getAttribute('data-wall-opacities')||'[]').every(x=>x===0)).toBe(true);
  expect(JSON.parse(await plan.getAttribute('data-wall-opacities')).length).toBeGreaterThan(0);
  await page.evaluate(()=>{const old=document.querySelector('floorplan-card'),next=document.createElement('floorplan-card');next.setConfig(old.config);next.hass=old._hass;old.replaceWith(next);});
  await expect(page.getByRole('button',{name:'Show walls',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Show walls',exact:true}).click({force:true});
  await expect.poll(async()=>JSON.parse(await plan.getAttribute('data-wall-opacities')||'[]').some(x=>x===1)).toBe(true);
  await expect(page.getByRole('button',{name:'Hide all walls',exact:true})).toHaveAttribute('aria-pressed','false');
});

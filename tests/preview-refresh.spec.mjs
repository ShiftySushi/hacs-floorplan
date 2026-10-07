import {test,expect} from '@playwright/test';

test('refresh restores simulated lights and dark mode before revealing the app',async({page})=>{
  test.setTimeout(45000);
  // A cold start compiles the illustrated view's shaders, which is slow on software graphics.
  await page.goto('/demo/');await expect(page.locator('#boot')).toHaveCount(0,{timeout:15000});
  await page.evaluate(()=>document.querySelector('floorplan-card')._hass.callService('light','turn_on',{entity_id:['light.diner'],brightness_pct:23,rgb_color:[17,83,140]}));
  await page.getByRole('button',{name:'Diner: On',exact:true}).click();
  await page.getByRole('button',{name:'Toggle theme',exact:true}).click();
  await expect(page.locator('body')).toHaveClass(/dark/);
  await page.reload();await expect(page.locator('#boot')).toHaveCount(0,{timeout:15000});
  await expect(page.locator('body')).toHaveClass(/dark/);await expect(page.getByRole('button',{name:'Diner: Off',exact:true})).toBeAttached();
  expect(await page.evaluate(()=>document.querySelector('floorplan-card')._hass.states['light.diner'].attributes.rgb_color)).toEqual([17,83,140]);
  expect(await page.evaluate(()=>document.querySelector('floorplan-card')._hass.states['light.diner'].attributes.brightness)).toBe(59);
});

test('slow cold loads show a styled graphic and hide unstyled content',async({page})=>{
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route('**/dist/hacs-floorplan.js',async route=>{await gate;await route.continue();});
  await page.addInitScript(()=>localStorage.setItem('floorplan-preview-theme','dark'));
  await page.goto('/demo/',{waitUntil:'commit'});
  await expect(page.locator('#boot')).toBeVisible();await expect(page.locator('main')).toHaveCSS('visibility','hidden');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(page.locator('#boot svg')).toHaveCSS('width','72px');
  release();await page.waitForLoadState('load');
  await expect(page.locator('#boot')).toHaveCount(0,{timeout:15000});await expect(page.getByRole('navigation',{name:'Workspace'})).toBeVisible();
});

test('a failed bundle load keeps styled recovery controls rather than an empty page',async({page})=>{
  await page.route('**/dist/hacs-floorplan.js',route=>route.abort());await page.goto('/demo/');
  await expect(page.getByRole('alert')).toContainText('could not load');await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();
  await expect(page.locator('main')).toHaveCSS('visibility','hidden');
});

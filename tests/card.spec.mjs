import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/demo/'); });
test('built card exposes only compatible controls and surfaces failed commands', async ({ page }) => {
  const card = page.locator('floorplan-card');
  await card.getByRole('button',{name:'Select lights',exact:true}).click();
  await card.getByRole('button', { name: 'Utility: Off', exact: true }).click();
  await expect(card.getByRole('slider')).toHaveCount(0);
  await expect(card.locator('input[type=color]')).toHaveCount(0);
  await card.getByRole('button', { name: 'All lights', exact: true }).click();
  await expect(card.getByLabel('Brightness · 3 of 4 lights')).toBeVisible();
  await expect(card.getByLabel('Colour · 1 of 4 lights')).toBeVisible();
  await card.getByLabel('Colour · 1 of 4 lights').fill('#ff0000');
  await expect(page.locator('#events')).toContainText('"rgb_color"');
  const latest = await page.locator('#events').textContent();
  expect(latest).toContain('light.diner');
  expect(latest).not.toContain('light.utility');
  await page.getByText('Demo tools',{exact:true}).click();
  await page.getByRole('button', { name: 'Simulate service failure', exact: true }).click();
  await card.getByRole('button', { name: 'Turn off', exact: true }).click();
  await expect(card.getByRole('alert')).toContainText('Some lights could not be updated');
});
test('light clicks toggle power directly and explicit selection supports single-light adjustments',async({page})=>{
  const card=page.locator('floorplan-card');
  await card.getByRole('button',{name:'Diner: On',exact:true}).click();
  await expect(card.getByRole('button',{name:'Diner: Off',exact:true})).toBeVisible();
  await expect(card.locator('.marker[aria-pressed=true]')).toHaveCount(0);
  await expect(card.getByRole('button',{name:'Turn on',exact:true})).toHaveCount(0);
  await card.getByRole('button',{name:'Diner: Off',exact:true}).press('Enter');
  await expect(card.getByRole('button',{name:'Diner: On',exact:true})).toBeVisible();
  const calls=await page.locator('#events').textContent();
  await card.getByRole('button',{name:'Select lights',exact:true}).click();
  await card.getByRole('button',{name:'Diner: On',exact:true}).click();
  await expect(card.getByLabel('Colour · 1 of 1 lights')).toBeVisible();
  await expect(card.getByRole('button',{name:'Diner: On',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(await page.locator('#events').textContent()).toEqual(calls);
  await card.getByRole('button',{name:'Select lights',exact:true}).click();
  await expect(card.locator('.marker[aria-pressed=true]')).toHaveCount(0);
  await expect(card.getByLabel('Colour · 1 of 1 lights')).toHaveCount(0);
  await card.getByRole('button',{name:'Diner: On',exact:true}).click();
  await expect(card.getByRole('button',{name:'Diner: Off',exact:true})).toBeVisible();
});
test('room illumination follows light state independently of presence', async ({ page }) => {
  const card = page.locator('floorplan-card');
  await card.getByRole('button', { name: 'Kitchen & diner Lit · Presence detected', exact: true }).click();
  await card.getByRole('button', { name: 'Turn off', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Kitchen & diner Dark · Presence detected', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Toggle presence', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Kitchen & diner Dark · No presence', exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Temperature: 21.4 °C', exact: true }).click();
  await expect(page.locator('#events')).toContainText('Entity details requested: sensor.temperature');
});
test('guided setup uploads a public SVG and places group members without YAML', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const editor = page.locator('floorplan-card-editor'), card = page.locator('floorplan-card');
  await page.getByText('Demo tools',{exact:true}).click();
  await page.getByRole('button', { name: 'Start empty setup', exact: true }).click();
  await editor.getByRole('button', { name: 'Add floor', exact: true }).click();
  await editor.getByLabel('Choose floorplan image',{exact:true}).setInputFiles('demo/sample.svg');
  await expect(card.locator('svg image')).toHaveAttribute('href', /^data:image\/svg\+xml;base64,/);
  await editor.getByRole('button', { name: 'Rotate right', exact: true }).click();
  await expect(editor.getByLabel('Rotation (degrees clockwise)')).toHaveValue('90');
  await editor.getByRole('button', { name: '5. Groups', exact: true }).click();
  await editor.getByRole('button', { name: 'Add group', exact: true }).click();
  await editor.locator('fieldset select').selectOption('light.diner');
  await editor.locator('fieldset select').selectOption('light.kitchen');
  await page.getByRole('button',{name:'Live view',exact:true}).click();
  await card.getByRole('button', { name: 'Group 1', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Diner: On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(card.getByRole('button', { name: 'Kitchen: On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const size = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(size.width).toBeLessThanOrEqual(size.viewport);
  expect(errors).toEqual([]);
});

test('large group lists are collapsed and selection controls stay separate',async({page,isMobile})=>{
  await page.goto('/demo/');
  await page.evaluate(()=>{const card=document.querySelector('floorplan-card');const config=structuredClone(card.config);config.groups=Array.from({length:12},(_,i)=>({name:`Test group ${i+1}`,entities:['light.diner']}));card.groupsOpen=undefined;card.setConfig(config);});
  const card=page.locator('floorplan-card'),groups=card.locator('.group-section');
  await expect(groups).not.toHaveAttribute('open','');
  await groups.locator('summary').click();
  await card.getByRole('button',{name:'Test group 12',exact:true}).click();
  await expect(card.getByRole('button',{name:'Turn off',exact:true})).toBeVisible();
  await expect(groups).toHaveAttribute('open','');
  if(!isMobile){
    await card.locator('.light-choices').evaluate(el=>{el.scrollTop=el.scrollHeight;});
    const button=await card.getByRole('button',{name:'Turn off',exact:true}).boundingBox();
    const controls=await card.locator('.controls').boundingBox();
    expect(button.y).toBeGreaterThanOrEqual(controls.y);
    expect(button.y+button.height).toBeLessThanOrEqual(controls.y+controls.height);
  }
});

test('unconnected lights cannot send commands even if HA has a matching entity',async({page})=>{
  await page.goto('/demo/');
  const count=await page.evaluate(async()=>{const card=document.querySelector('floorplan-card');const config=structuredClone(card.config);config.floors[0].entities[0].unbound=true;card.setConfig(config);let calls=0;card.hass={...card._hass,callService:async()=>{calls++;}};await card.control('on',undefined,['light.diner']);return calls;});
  expect(count).toBe(0);
  await expect(page.locator('floorplan-card').getByRole('button',{name:'light.diner: Not connected',exact:true})).toBeDisabled();
});

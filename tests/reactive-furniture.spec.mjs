import {test,expect} from '@playwright/test';

test('a decorative light can be placed, raised and connected in the furniture editor',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  const editor=page.locator('floorplan-card-editor');
  await editor.getByRole('button',{name:'Unlock editing',exact:true}).click();
  await editor.getByLabel('Find furniture').fill('TV light');
  await editor.getByRole('button',{name:'TV light strip',exact:true}).click();
  await editor.getByRole('button',{name:'Place furniture in centre',exact:true}).click();
  await expect(editor.getByRole('combobox',{name:'TV screen size',exact:true})).toHaveValue('65');
  await editor.getByRole('combobox',{name:'TV screen size',exact:true}).selectOption('75');
  await editor.getByLabel('Height above floor (metres)',{exact:true}).fill('0.55');
  await editor.getByLabel('Height above floor (metres)',{exact:true}).press('Tab');
  await editor.getByRole('combobox',{name:'Reactive light entity',exact:true}).selectOption('light.diner');
  const config=JSON.parse(await page.locator('#config').textContent()),strip=config.floors[0].objects.at(-1);
  expect(strip).toMatchObject({type:'tv_lightstrip',elevation_m:.55,light_entity:'light.diner'});
  expect(strip.width).toBeCloseTo(75*.0254*16/Math.hypot(16,9),4);
  expect(strip.height).toBeCloseTo(75*.0254*9/Math.hypot(16,9),4);
  await page.getByRole('button',{name:'Live view',exact:true}).click();
  // The strip paints its own pool into the light map, in the colour and strength of its entity.
  const card=page.locator('floorplan-card'),plan=card.locator('.plan-diorama'),pool=()=>plan.evaluate((node,point)=>node.sampleLight(document.querySelector('floorplan-card').config.floors[0].id,point),[strip.x,strip.y]);
  await expect(plan.locator('canvas')).toBeVisible();
  const sum=rgb=>rgb.reduce((a,b)=>a+b,0),lit=await pool();
  await card.getByRole('button',{name:'Diner: On',exact:true}).click();
  await expect.poll(async()=>sum(await pool())).toBeLessThan(sum(lit));
  const dark=await pool();
  await page.evaluate(()=>{const c=document.querySelector('floorplan-card');c.hass={...c._hass,states:{...c._hass.states,'light.diner':{state:'on',attributes:{supported_color_modes:['rgb'],brightness:128,rgb_color:[20,80,255]}}}};});
  await expect.poll(async()=>{const now=await pool();return now[2]-dark[2]>now[0]-dark[0]+20;}).toBe(true);
});

import {test,expect} from '@playwright/test';

test('place lights over furniture, assign a room, move and undo',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  const editor=page.locator('floorplan-card-editor');
  await editor.getByRole('button',{name:'4. Lights & sensors',exact:true}).click();
  await editor.getByLabel('Room for new lights').selectOption({index:1});
  await editor.getByRole('button',{name:'Spotlight',exact:true}).click();
  const furniture=editor.locator('[data-object-id]').first();
  await furniture.click({force:true});
  const read=()=>editor.evaluate(e=>e.config);
  const placed=await read(),light=placed.floors[0].entities.find(e=>e.unbound);
  expect(light).toMatchObject({fixture:'spot',unbound:true});
  expect(placed.floors[0].rooms[0].lights).toContain(light.entity);
  await editor.getByRole('button',{name:'Move '+light.entity,exact:true}).click();
  const row=editor.locator('details[open]').filter({hasText:'Not connected'});
  await row.getByLabel('X position (%)',{exact:true}).fill('35');
  await row.getByLabel('X position (%)',{exact:true}).press('Tab');
  expect((await read()).floors[0].entities.find(e=>e.entity===light.entity).x).toBe(35);
  await editor.getByRole('button',{name:'Undo',exact:true}).click();
  expect((await read()).floors[0].entities.find(e=>e.entity===light.entity).x).toBe(light.x);
});

test('cutaway walls fade through intermediate opacity and settle',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));const card=page.locator('floorplan-card');
  await card.getByRole('button',{name:'3D',exact:true}).click();
  const plan=card.locator('.plan');
  await expect(plan).toHaveAttribute('data-wall-opacities',/.+/);
  await card.getByRole('button',{name:'Toggle cutaway walls',exact:true}).click({force:true});
  const values=async()=>JSON.parse(await plan.getAttribute('data-wall-opacities'));
  await expect.poll(async()=>(await values()).some(v=>v>.08&&v<1),{intervals:[20]}).toBe(true);
  await expect.poll(async()=>(await values()).every(v=>v===1)).toBe(true);
});

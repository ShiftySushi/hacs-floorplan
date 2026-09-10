import {test,expect} from '@playwright/test';
test('preview master toggle follows light states and makes simulation explicit',async({page})=>{
  await page.goto('/demo/');
  const tools=page.getByRole('group',{name:'Preview controls — simulated devices',exact:true});
  await expect(tools.getByText('Preview only',{exact:true})).toBeVisible();
  await tools.getByRole('button',{name:'Preview lights: turn all off',exact:true}).click();
  await expect(page.locator('floorplan-card').getByRole('button',{name:'Diner: Off',exact:true})).toBeVisible();
  await tools.getByRole('button',{name:'Preview lights: turn all on',exact:true}).click();
  await expect(page.locator('floorplan-card').getByRole('button',{name:'Diner: On',exact:true})).toBeVisible();
  { const panel=page.locator('floorplan-card'); if(await panel.getByRole('button',{name:'Lighting',exact:true}).count()) await panel.getByRole('button',{name:'Lighting',exact:true}).click(); }
  await page.locator('floorplan-card').getByRole('button',{name:'Turn All lights off',exact:true}).click();
  await expect(tools.getByRole('button',{name:'Preview lights: turn all on',exact:true})).toBeVisible();
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`/tmp/preview-controls-${test.info().project.name}.png`});
});

import {test,expect} from '@playwright/test';
test('graphical card reveals controls and remembers a collapsible lighting panel',async({page},info)=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));const card=page.locator('floorplan-card');
  await expect(card.locator('.card-title')).toHaveCount(0);
  await expect(card.getByRole('region',{name:'Light controls'})).toBeHidden();
  const stage=card.locator('.plan-slot'),tools=card.locator('.stage-tools');
  if(info.project.name==='desktop'){
    await page.mouse.move(0,0);await expect(tools).toHaveCSS('opacity','0');
    await stage.hover();await expect(tools).toHaveCSS('opacity','1');
  }else await expect(tools).toHaveCSS('opacity','1');
  await card.getByRole('button',{name:'Lighting',exact:true}).click();
  await expect(card.locator('.inspector-slot')).toBeVisible();
  await page.screenshot({path:`/tmp/contextual-open-${info.project.name}.png`});
  await card.getByRole('button',{name:'Hide lighting',exact:true}).click();
  await expect(card.locator('.inspector-slot')).toBeHidden();
  await page.reload();
  await expect(card.locator('.inspector-slot')).toBeHidden();
  await card.getByRole('button',{name:'3D',exact:true}).click();
  await expect(card.locator('canvas')).toBeVisible();
  const bounds=await tools.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
  if(info.project.name==='desktop'){
    await page.mouse.move(0,0);await expect(tools).toHaveCSS('opacity','0');
    await card.getByRole('button',{name:'Lighting',exact:true}).press('Tab');
    await expect(tools).toHaveCSS('opacity','1');
  }
  await page.screenshot({path:`/tmp/contextual-closed-${info.project.name}.png`});
});

import {test,expect} from '@playwright/test';

test('clicking a desk places equipment on it, and support survives moving and undo',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{const config={type:'custom:floorplan-card',floors:[{id:'test',width_m:5,depth_m:5,objects:[{id:'desk',type:'desk',variant:'plain',x:50,y:50,width:2,depth:1,height:.75,rotation:0}]}]};document.querySelector('floorplan-card').setConfig(config);document.querySelector('floorplan-card-editor').setConfig(config);});
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();const editor=page.locator('floorplan-card-editor');
  await editor.getByRole('button',{name:'3. Furniture',exact:true}).click();await editor.getByRole('button',{name:'Unlock editing',exact:true}).click();
  await editor.getByLabel('Find furniture').fill('P1S');await editor.locator('.furniture-palette').getByRole('button',{name:/Bambu Lab P1S/}).click();
  await editor.locator('[data-object-id="desk"]').click();
  await expect(editor.getByLabel('Height above floor (metres)',{exact:true})).toHaveValue('0.75');
  const printerId=await editor.getByLabel('Placed furniture').inputValue();expect(printerId).not.toBe('desk');
  await editor.getByLabel('X position (%)',{exact:true}).fill('10');await editor.getByLabel('X position (%)',{exact:true}).press('Tab');
  await expect(editor.getByLabel('Height above floor (metres)',{exact:true})).toHaveValue('0');
  await editor.getByRole('button',{name:'Undo',exact:true}).click();
  await expect(editor.getByLabel('Height above floor (metres)',{exact:true})).toHaveValue('0.75');
  await editor.getByLabel('Placed furniture').selectOption('desk');
  await editor.getByLabel('X position (%)',{exact:true}).fill('60');await editor.getByLabel('X position (%)',{exact:true}).press('Tab');
  await editor.getByLabel('Height (metres)',{exact:true}).fill('0.9');await editor.getByLabel('Height (metres)',{exact:true}).press('Tab');
  await editor.getByLabel('Placed furniture').selectOption(printerId);
  await expect(editor.getByLabel('Height above floor (metres)',{exact:true})).toHaveValue('0.9');
  await expect(editor.getByLabel('X position (%)',{exact:true})).toHaveValue('60');
});

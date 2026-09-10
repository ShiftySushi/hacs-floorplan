import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/demo/'); });
const scene = async page => JSON.parse(await page.locator('#config').textContent());

test('furniture can be placed, resized, varied and restored with undo and redo', async ({ page }) => {
  const editor=page.locator('floorplan-card-editor');
  const initial=(await scene(page)).floors[0].objects?.length || 0;
  await editor.getByRole('button',{name:'3. Furniture',exact:true}).click();
  await editor.getByLabel('Find furniture').fill('piano');
  await editor.getByRole('button',{name:'Piano',exact:true}).click();
  await editor.getByRole('button',{name:'Place furniture in centre',exact:true}).click();
  await expect(editor.getByLabel('Placed furniture').locator('option')).toHaveCount(initial+2);
  await editor.getByLabel('Placed furniture').selectOption('');
  await editor.getByRole('button',{name:'Zoom in',exact:true}).click();
  await editor.locator('[data-object-id]').last().click();
  await expect(editor.getByLabel('Furniture variant')).toBeVisible();
  await editor.getByRole('button',{name:'Fit floorplan',exact:true}).click();
  await editor.getByLabel('Furniture variant').selectOption('grand');
  await editor.getByLabel('Width (metres)',{exact:true}).fill('1.8');
  await editor.getByLabel('Width (metres)',{exact:true}).press('Tab');
  let item=(await scene(page)).floors[0].objects.at(-1);
  expect(item).toMatchObject({type:'piano',x:50,y:50,width:1.8,variant:'grand'});
  await editor.getByRole('button',{name:'Undo',exact:true}).click();
  await expect(editor.getByLabel('Width (metres)',{exact:true})).toHaveValue('1.5');
  await editor.getByRole('button',{name:'Redo',exact:true}).click();
  await expect(editor.getByLabel('Width (metres)',{exact:true})).toHaveValue('1.8');
  await editor.getByRole('button',{name:'Rotate furniture',exact:true}).click();
  await expect(editor.getByLabel('Object rotation (degrees)')).toHaveValue('90');
  await editor.getByRole('button',{name:'Duplicate furniture',exact:true}).click();
  let objects=(await scene(page)).floors[0].objects;
  expect(objects).toHaveLength(initial+2);expect(objects.at(-1).id).not.toBe(objects.at(-2).id);
  await editor.getByRole('button',{name:'Remove furniture',exact:true}).click();
  expect((await scene(page)).floors[0].objects).toHaveLength(initial+1);
});

test('all render modes retain selected lights and compatible controls', async ({ page }) => {
  const card=page.locator('floorplan-card');
  await card.getByRole('button',{name:'All lights',exact:true}).click();
  for(const name of ['Pokémon style','Zelda style','Furnished 3D','Clean 2D']) {
    await card.getByRole('button',{name,exact:true}).click();
    await expect(card.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(card.getByRole('button',{name:'Diner: On',exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(card.getByLabel('Brightness · 3 of 4 lights')).toBeVisible();
    await expect(card.getByLabel('Colour · 1 of 4 lights')).toBeVisible();
  }
  await card.getByRole('button',{name:'Turn off',exact:true}).click();
  await expect(card.getByRole('button',{name:'Diner: Off',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('3D canvas survives state updates and controls work after context loss', async ({ page }) => {
  const card=page.locator('floorplan-card');
  await card.getByRole('button',{name:'Furnished 3D',exact:true}).click();
  const canvas=card.locator('canvas');
  await expect(canvas).toHaveCount(1);
  const original=await canvas.elementHandle();
  await page.getByRole('button',{name:'Toggle presence',exact:true}).click();
  expect(await original.evaluate(node=>node.isConnected)).toBe(true);
  await card.getByRole('button',{name:'All lights',exact:true}).click();
  await card.getByRole('button',{name:'Turn off',exact:true}).click();
  expect(await original.evaluate(node=>node.isConnected)).toBe(true);
  await canvas.dispatchEvent('webglcontextlost',{cancelable:true});
  await expect(card.getByText('3D graphics were interrupted. Showing 2D.',{exact:true})).toBeVisible();
  await expect(card.locator('svg.floor-image')).toBeVisible();
  await card.getByRole('button',{name:'Turn on',exact:true}).click();
  await expect(card.getByRole('button',{name:'Diner: On',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#events')).toContainText('turn_on');
});

test('malformed and unsupported scene imports leave the existing scene intact', async ({ page }) => {
  const editor=page.locator('floorplan-card-editor'), before=await scene(page);
  await editor.getByText('Import or export your private scene',{exact:true}).click();
  const upload=editor.getByLabel('Import scene JSON');
  await upload.setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
  await expect(editor.getByRole('alert')).toContainText('Scene was not imported');
  expect(await scene(page)).toEqual(before);
  await editor.getByText('Import or export your private scene',{exact:true}).click();
  await upload.setInputFiles({name:'future.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...before,scene_version:999}))});
  await expect(editor.getByRole('alert')).toContainText('version is not supported');
  expect(await scene(page)).toEqual(before);
});

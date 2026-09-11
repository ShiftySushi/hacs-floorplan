import { test, expect } from '@playwright/test';

// Exercise the real asynchronous upload path against a delayed HA-shaped endpoint.
async function beginDelayedUpload(page) {
  let release;
  const waitForRelease = new Promise(resolve => { release = resolve; });
  await page.route('**/api/image/upload', async route => { await waitForRelease; await route.fulfill({json:{id:'upload-test'}}); });
  await page.route('**/api/image/serve/upload-test/original', route => route.fulfill({path:'demo/sample.svg',contentType:'image/svg+xml'}));
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  await page.evaluate(() => { const editor=document.querySelector('floorplan-card-editor'); editor.hass={...editor._hass,fetchWithAuth:(url,options)=>fetch(url,options)}; });
  const editor=page.locator('floorplan-card-editor');
  await editor.getByRole('button',{name:'1. Floors',exact:true}).click();
  await editor.getByLabel('Choose floorplan image',{exact:true}).setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4hUAAAAASUVORK5CYII=','base64')});
  await expect(editor.getByText('Uploading image…',{exact:true})).toBeVisible();
  return {editor,release};
}

test('image upload survives a concurrent configuration edit',async({page})=>{
  const {editor,release}=await beginDelayedUpload(page);
  try {
    await editor.getByLabel('Card title',{exact:true}).fill('Edited during upload');
    await editor.getByLabel('Card title',{exact:true}).press('Tab');
    release();
    await expect(page.locator('floorplan-card').locator('svg image')).toHaveAttribute('href','/api/image/serve/upload-test/original');
    await expect(editor.getByLabel('Card title',{exact:true})).toHaveValue('Edited during upload');
    await expect(editor.getByRole('alert')).toHaveCount(0);
  } finally { release(); }
});

test('image upload reports a removed floor without restoring it',async({page})=>{
  const {editor,release}=await beginDelayedUpload(page);
  try {
    await editor.getByRole('button',{name:'Remove floor',exact:true}).click();
    await editor.getByRole('button',{name:'Remove this floor and assignments',exact:true}).click();
    release();
    await expect(editor.getByRole('alert')).toContainText('The floor was removed while its image was uploading');
    await expect(editor.getByLabel('Floor name',{exact:true})).toHaveCount(0);
  } finally { release(); }
});

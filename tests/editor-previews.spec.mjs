import {test,expect} from '@playwright/test';

async function twoStoreys(page){
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  await page.evaluate(()=>{
    const editor=document.querySelector('floorplan-card-editor'),config=JSON.parse(document.querySelector('#config').textContent),ground=config.floors[0];
    config.floors=[ground,{...structuredClone(ground),id:'upper',name:'Upper'}];editor.setConfig(config);editor.emit();
  });
  return page.locator('floorplan-card-editor');
}
// Chromium warns when it has to drop the oldest WebGL context to make room for a new one.
const watch=page=>{const warnings=[];page.on('console',message=>{if(/WebGL context/i.test(message.text()))warnings.push(message.text());});return warnings;};
const lost=page=>page.evaluate(()=>[...document.querySelectorAll('floorplan-card,floorplan-card-editor')].flatMap(host=>[...host.shadowRoot.querySelectorAll('.hint')]).map(node=>node.textContent).filter(text=>/3D/.test(text)));

test('the review step previews every storey and repeated edits never exhaust WebGL contexts',async({page})=>{
  test.setTimeout(120000);
  const warnings=watch(page),editor=await twoStoreys(page);
  await editor.getByRole('button',{name:'6. Review',exact:true}).click();
  await expect(editor.locator('.review-floor')).toHaveCount(2);
  await expect(editor.locator('.review-floor .plan-diorama canvas')).toHaveCount(2);
  await expect(editor.locator('.review-floor h3',{hasText:'Upper'})).toHaveCount(1);
  // Every change redraws both previews. Browsers keep only so many WebGL contexts alive and
  // drop the oldest, so each discarded preview has to give its context back at once.
  const toggle=editor.getByLabel('Hide radiators',{exact:true});
  for(let i=0;i<12;i++){
    await editor.locator('.review-floor canvas').first().evaluate(canvas=>{canvas.dataset.old='yes';});
    await toggle.evaluate(el=>{el.checked=!el.checked;el.dispatchEvent(new Event('change'));});
    await expect(editor.locator('.review-floor .plan-diorama canvas')).toHaveCount(2);await expect(editor.locator('canvas[data-old]')).toHaveCount(0);
  }
  expect(await lost(page)).toEqual([]);expect(warnings).toEqual([]);
  await expect(page.locator('floorplan-card').locator('.plan-diorama canvas')).toHaveCount(1);
});

test('the furniture preview draws the chosen storey and survives switching storeys',async({page})=>{
  test.setTimeout(120000);
  const warnings=watch(page),editor=await twoStoreys(page);
  await editor.getByRole('button',{name:'3. Furniture',exact:true}).click();
  for(let i=0;i<10;i++){
    await editor.locator('.editor-toolbar select').selectOption(String(i%2));
    await editor.getByRole('button',{name:'3D preview',exact:true}).click();
    await expect(editor.locator('.plan-diorama canvas')).toHaveCount(1);
    await expect(editor.getByText('Preview clearance; edit in 2D.')).toBeVisible();
    await editor.getByRole('button',{name:'2D edit',exact:true}).click();
    await expect(editor.locator('canvas')).toHaveCount(0);
  }
  expect(await lost(page)).toEqual([]);expect(warnings).toEqual([]);
  await expect(page.locator('floorplan-card').locator('.plan-diorama canvas')).toHaveCount(1);
});

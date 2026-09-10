import {test,expect} from '@playwright/test';

test('hover smoothly restores the manual camera without saving the idle angle',async({page})=>{
  test.setTimeout(45000);
  await page.goto('/demo/');const card=page.locator('floorplan-card');
  await card.getByRole('button',{name:'3D',exact:true}).click();
  const plan=card.locator('.plan'),canvas=card.locator('canvas').first();
  await card.locator('.display-settings summary').click();
  await card.getByLabel('Slow idle rotation (3D)',{exact:true}).check();
  await card.locator('.display-settings summary').click();
  const box=await canvas.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();await page.mouse.move(box.x+box.width/2+80,box.y+box.height/2,{steps:8});await page.mouse.up();
  const anchor=Number(await plan.getAttribute('data-view-azimuth'));
  await page.mouse.move(0,0);
  await expect.poll(async()=>Number(await plan.getAttribute('data-idle-angle')),{timeout:14000}).toBeGreaterThan(.02);
  const before=Number(await plan.getAttribute('data-idle-angle'));
  await plan.dispatchEvent('pointerenter',{pointerType:'mouse'});
  await expect(plan).toHaveAttribute('data-idle-state','returning');
  await expect.poll(async()=>{const angle=Number(await plan.getAttribute('data-idle-angle'));return angle>0&&angle<before;},{intervals:[20]}).toBe(true);
  await expect(plan).toHaveAttribute('data-idle-angle','0');
  expect(Number(await plan.getAttribute('data-view-azimuth'))).toBeCloseTo(anchor,5);
  // Staying hovered must not restart rotation after the usual idle delay.
  await page.waitForTimeout(8500);
  await expect(plan).toHaveAttribute('data-idle-angle','0');
  await page.reload();
  await expect.poll(async()=>Number(await card.locator('.plan').getAttribute('data-view-azimuth'))).toBeCloseTo(anchor,5);
});

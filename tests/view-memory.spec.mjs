import {test,expect} from '@playwright/test';
test('view and camera survive refresh and overlay toggle remains readable',async({page})=>{
  await page.goto('/demo/');const card=page.locator('floorplan-card');
  for(const mode of ['2D','3D']){
    await card.getByRole('button',{name:mode,exact:true}).click();
    await card.getByRole('button',{name:'Zoom in',exact:true}).click();
    await card.getByRole('button',{name:mode==='2D'?'Pan right':'Orbit right',exact:true}).click();
    const read=()=>page.evaluate(()=>{const c=document.querySelector('floorplan-card');return {mode:c.viewMode || c.config.appearance.mode,cameras:c.viewStates};});
    const before=await read();
    await page.reload();await expect(card.getByRole('button',{name:mode,exact:true})).toHaveAttribute('aria-pressed','true');
    await expect.poll(read).toEqual(before);
  }
  await card.getByRole('button',{name:'Hide overlays',exact:true}).click();
  const show=card.getByRole('button',{name:'Show overlays',exact:true});
  await expect(show).toBeVisible();
  const colours=await show.evaluate(node=>{const s=getComputedStyle(node);return [s.color,s.backgroundColor];});
  expect(colours[0]).not.toBe(colours[1]);
  await page.reload();await expect(show).toBeVisible();
  await expect(page.getByRole('button',{name:'Live view',exact:true}).locator('svg')).toBeVisible();
  await page.screenshot({path:`/tmp/view-memory-${test.info().project.name}.png`});
});

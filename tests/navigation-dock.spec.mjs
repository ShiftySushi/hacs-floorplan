import {test,expect} from '@playwright/test';
test('navigation remains below the plan when zooming and switching renderers',async({page})=>{
  await page.goto('/demo/');const card=page.locator('floorplan-card');
  for(const mode of ['2D','3D']){
    await card.getByRole('button',{name:mode,exact:true}).click();
    const dock=card.locator('.docked-navigation');await expect(dock).toBeVisible();
    await dock.getByRole('button',{name:'Zoom in',exact:true}).click();
    await dock.getByRole('button',{name:mode==='2D'?'Fit floorplan':'Reset 3D view',exact:true}).click();
    await card.locator('.plan').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});
    const plan=await card.locator('.plan').boundingBox(),bounds=await dock.boundingBox();
    if(mode==='2D')expect(bounds.y).toBeGreaterThanOrEqual(plan.y+plan.height);
    else {const stage=await card.locator('.plan-slot').boundingBox();expect(Math.abs(plan.y-stage.y)).toBeLessThan(1);expect(Math.abs(plan.height-stage.height)).toBeLessThan(1);}
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x+bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
    await card.getByRole('button',{name:'Hide overlays',exact:true}).click();
    await expect(dock).toBeVisible();
    await card.getByRole('button',{name:'Show overlays',exact:true}).click();
    await page.screenshot({path:`/tmp/navigation-${mode}-${test.info().project.name}.png`});
  }
});

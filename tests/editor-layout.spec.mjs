import {test,expect} from '@playwright/test';
test('editor forms fit and remain reachable across setup steps',async({page},testInfo)=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();const editor=page.locator('floorplan-card-editor');
  for(const name of ['1. Floors','2. Rooms','3. Furniture','4. Lights & sensors','5. Groups','6. Review']){
    await editor.getByRole('button',{name,exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const panel of await editor.locator('.setup-panel,.furniture-panel').all()){
      expect(await panel.evaluate(e=>e.scrollHeight<=e.clientHeight+2)).toBe(true);
      expect(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+2)).toBe(true);
    }
    if(name==='3. Furniture'){
      await editor.getByRole('button',{name:'Unlock editing',exact:true}).click();
      const actions=editor.locator('.furniture-panel>.row');
      expect(await actions.evaluate(e=>parseFloat(getComputedStyle(e).gap))).toBeGreaterThanOrEqual(8);
      await page.screenshot({path:`/tmp/editor-furniture-${testInfo.project.name}.png`});
    }
    if(name==='4. Lights & sensors')await page.screenshot({path:`/tmp/editor-lights-${testInfo.project.name}.png`});
  }
});

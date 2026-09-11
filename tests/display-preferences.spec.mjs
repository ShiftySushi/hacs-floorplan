import {test,expect} from '@playwright/test';
test('overlay preferences persist independently and rotation refits without editing geometry',async({page},info)=>{
 await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));const card=page.locator('floorplan-card');
 await card.evaluate(el=>{const config=structuredClone(el.config);config.floors[0].aspect_ratio=.6;el.setConfig(config);});
 const before=await card.evaluate(el=>JSON.stringify(el.config.floors));
 await card.locator('.display-settings summary').click();
 await card.getByLabel('Temperature labels visibility',{exact:true}).selectOption('always');
 await card.getByLabel('Light buttons visibility',{exact:true}).selectOption('hidden');
 await card.getByLabel('Overlay size',{exact:true}).fill('0.65');
 await card.locator('.display-settings summary').click();
 await expect(card.locator('.overlay-lights').first()).toBeHidden();
 if(info.project.name==='desktop'){await page.mouse.move(0,0);await expect(card.locator('.overlay-temperatures').first()).toHaveCSS('opacity','1');}
 await expect(card.locator('.overlay-temperatures').first()).toHaveCSS('scale','0.65');
 const ratio=await card.locator('.plan').evaluate(el=>el.offsetWidth/el.offsetHeight);
 await card.getByRole('button',{name:'Rotate floorplan right',exact:true}).click();
 await expect.poll(()=>card.locator('.plan').evaluate(el=>el.offsetWidth/el.offsetHeight)).toBeCloseTo(1/ratio,1);
 expect(await card.evaluate(el=>JSON.stringify(el.config.floors))).toBe(before);
 await page.reload();await card.evaluate(el=>{const config=structuredClone(el.config);config.floors[0].aspect_ratio=.6;el.setConfig(config);});await expect(card.locator('.overlay-lights').first()).toBeHidden();
 await expect.poll(()=>card.locator('.plan').evaluate(el=>el.offsetWidth/el.offsetHeight)).toBeCloseTo(1/ratio,1);
 await card.locator('.display-settings summary').click();
 await expect(card.locator('.stage-tools')).toHaveCSS('opacity','1');
 const popup=await card.locator('.display-popover').boundingBox();expect(popup.x).toBeGreaterThanOrEqual(0);expect(popup.x+popup.width).toBeLessThanOrEqual(page.viewportSize().width);
 await page.screenshot({path:`/tmp/display-preferences-${info.project.name}.png`});
});

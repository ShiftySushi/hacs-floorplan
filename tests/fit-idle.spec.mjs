import {test,expect} from '@playwright/test';
test('3D fills the stage and fits a long floor across orbit angles',async({page})=>{
 await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));const card=page.locator('floorplan-card');
 await card.evaluate(el=>{const c=structuredClone(el.config);c.floors[0].width_m=5;c.floors[0].depth_m=18;el.setConfig(c);});
 await card.getByRole('button',{name:'3D',exact:true}).click();
 const dimensions=await card.evaluate(el=>{const p=el.shadowRoot.querySelector('.plan'),s=el.shadowRoot.querySelector('.plan-slot'),css=getComputedStyle(s);return {width:p.offsetWidth,available:s.clientWidth};});
 expect(Math.abs(dimensions.width-dimensions.available)).toBeLessThan(2);
 await card.getByRole('button',{name:'Reset 3D view',exact:true}).click();
 for(let i=0;i<8;i++){
  await card.getByRole('button',{name:'Orbit right',exact:true}).click();
  const corners=JSON.parse(await card.locator('.plan').getAttribute('data-fitted-bounds'));
  for(const [x,y] of corners){expect(Math.abs(x)).toBeLessThan(1);expect(Math.abs(y)).toBeLessThan(1);}
 }
 await page.screenshot({path:`/tmp/fitted-3d-${test.info().project.name}.png`});
});
test('live updates restoring focus do not prevent idle rotation',async({page})=>{
 await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));const card=page.locator('floorplan-card');await card.getByRole('button',{name:'3D',exact:true}).click();
 await card.locator('.display-settings summary').click();await card.getByLabel('Slow idle rotation (3D)',{exact:true}).check();await card.locator('.display-settings summary').click();
 await card.evaluate(el=>{window.idleTestTimer=setInterval(()=>{el.hass={...el._hass};},200);});
 await expect.poll(async()=>Number(await card.locator('.plan').getAttribute('data-idle-angle')),{timeout:12000}).toBeGreaterThan(.001);
 await page.evaluate(()=>clearInterval(window.idleTestTimer));
});

import {test,expect} from '@playwright/test';
test('utility icons align and display settings fit both themes',async({page},info)=>{
 await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));const card=page.locator('floorplan-card');
 await card.getByRole('button',{name:'3D',exact:true}).click();
 const tools=card.locator('.stage-tools'),utilities=card.getByRole('group',{name:'Floorplan tools',exact:true});
 if(info.project.name==='desktop'){
  const bounds=await tools.boundingBox(),centre=await utilities.boundingBox();
  expect(Math.abs(centre.x+centre.width/2-bounds.x-bounds.width/2)).toBeLessThan(2);
 }
 const icons=utilities.locator(':scope > button, summary');
 const sizes=await icons.evaluateAll(nodes=>nodes.map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})));
 const offsets=await icons.evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect(),i=n.querySelector('svg').getBoundingClientRect();return {x:i.x+i.width/2-b.x-b.width/2,y:i.y+i.height/2-b.y-b.height/2};}));
 for(const offset of offsets){expect(Math.abs(offset.x)).toBeLessThan(.5);expect(Math.abs(offset.y)).toBeLessThan(.5);}
 expect(sizes).toHaveLength(3);for(const size of sizes){expect(size.w).toBe(36);expect(size.h).toBe(36);}
 await card.getByLabel('Display settings',{exact:true}).click();
 await expect(card.getByRole('heading',{name:'Display settings',exact:true})).toBeVisible();
 for(const theme of ['light','dark']){
  if(theme==='dark')await page.getByRole('button',{name:'Toggle theme',exact:true}).click();
  const popup=card.locator('.display-popover');
  const background=await popup.evaluate(el=>getComputedStyle(el).backgroundColor);await expect(utilities.locator('button').first()).toHaveCSS('background-color',background);
  const bounds=await popup.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
  await expect(card.getByLabel('Light buttons visibility',{exact:true})).toContainText('Show on hover or focus');
  const stage=await card.locator('.plan-slot').boundingBox();expect(bounds.y+bounds.height).toBeLessThanOrEqual(stage.y+stage.height);
  await page.screenshot({path:`/tmp/display-polish-${theme}-${info.project.name}.png`});
 }
});

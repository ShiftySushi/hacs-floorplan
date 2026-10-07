import {test,expect} from '@playwright/test';

test('lighting list retains scroll during live updates and refreshes',async({page},info)=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const card=page.locator('floorplan-card');
  await card.evaluate(el=>{
    const config=structuredClone(el.config);config.information={enabled:false,items:[]};
    config.floors[0].rooms=Array.from({length:35},(_,i)=>({id:`room-${i}`,name:`Room ${i}`,points:[[0,0],[100,0],[100,100],[0,100]],lights:['light.test']}));
    el.setConfig(config);el.inspectorOpen=true;el.hass={states:{'light.test':{state:'off',attributes:{}}}};
  });
  const list=card.locator('.light-choices');
  if(info.project.name==='mobile')await card.getByRole('button',{name:'Turn Room 25 on',exact:true}).scrollIntoViewIfNeeded();
  else await list.evaluate(el=>el.scrollTop=700);
  const before=await list.evaluate(el=>({list:el.scrollTop,page:window.scrollY}));
  expect(info.project.name==='mobile'?before.page:before.list).toBeGreaterThan(100);
  await card.evaluate(el=>{el.hass={states:{'light.test':{state:'on',attributes:{}}}};});
  await expect(card.getByRole('button',{name:'Turn Room 25 off',exact:true})).toBeAttached();
  expect(await list.evaluate(el=>el.scrollTop)).toBe(before.list);
  expect(await page.evaluate(()=>window.scrollY)).toBe(before.page);
  await card.evaluate(el=>el.render());
  expect(await list.evaluate(el=>el.scrollTop)).toBe(before.list);
  expect(await page.evaluate(()=>window.scrollY)).toBe(before.page);
});

test('Display Settings keeps its scroll position on live and timed refreshes',async({page},info)=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const card=page.locator('floorplan-card');
  await card.locator('summary[aria-label="Display settings"]').click();
  const popover=card.locator('.display-popover');
  await popover.evaluate(el=>el.scrollTop=el.scrollHeight);
  const scroll=await popover.evaluate(el=>el.scrollTop);expect(scroll).toBeGreaterThan(100);
  await card.evaluate(el=>{const id=el.config.floors[0].entities.find(e=>e.entity.startsWith('light.')).entity;el.hass={...el._hass,states:{...el._hass.states,[id]:{...el._hass.states[id],state:el._hass.states[id]?.state==='on'?'off':'on'}}};});
  await expect(popover).toBeVisible();expect(await popover.evaluate(el=>el.scrollTop)).toBe(scroll);
  await card.evaluate(el=>el.render());
  await expect(popover).toBeVisible();expect(await popover.evaluate(el=>el.scrollTop)).toBe(scroll);
  await card.getByLabel('Hide light fixtures',{exact:true}).evaluate(el=>{el.checked=!el.checked;el.dispatchEvent(new Event('change'));});
  await expect(popover).toBeVisible();expect(await popover.evaluate(el=>el.scrollTop)).toBe(scroll);
  await page.screenshot({path:info.outputPath('display-settings-scroll.png')});
});

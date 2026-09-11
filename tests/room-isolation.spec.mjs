import {test,expect} from '@playwright/test';

test('room isolation and physical fixture toggles preserve the saved scene',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const card=page.locator('floorplan-card');
  const configure=()=>card.evaluate(c=>{c.setConfig({appearance:{mode:'3d'},floors:[{id:'isolation-test',width_m:6,depth_m:3,rooms:[{id:'left',name:'Studio',points:[[0,0],[50,0],[50,100],[0,100]],lights:['light.ceiling']},{id:'right',name:'Kitchen',points:[[50,0],[100,0],[100,100],[50,100]],lights:[]}],walls:[{id:'back',a:[0,0],b:[100,0],height:2.4,thickness:.15}],objects:[{id:'radiator',type:'radiator',x:20,y:15,width:1.2,height:.6,depth:.12,colour:'#ffffff'},{id:'chair',type:'chair',x:75,y:50,width:.8,height:.9,depth:.8,colour:'#2266dd'}],entities:[{entity:'light.ceiling',x:25,y:50,fixture:'pendant'}]}]});c.hass={states:{'light.ceiling':{state:'on',attributes:{brightness:255}},'sun.sun':{state:'above_horizon',attributes:{elevation:40}}}};});
  await configure();const original=await card.evaluate(c=>JSON.stringify(c.config.floors));await expect(card.locator('canvas')).toBeVisible();
  await card.getByLabel('Isolate room',{exact:true}).selectOption('left');
  expect(await card.evaluate(c=>JSON.parse(c.planKey)[0].objects.map(o=>o.id))).toEqual(['radiator']);expect(await card.evaluate(c=>JSON.parse(c.planKey)[0].rooms.map(r=>r.id))).toEqual(['left']);
  const before=await card.locator('canvas').screenshot();await card.locator('.display-settings summary').click();
  await card.getByLabel('Hide light fixtures',{exact:true}).check();await card.getByLabel('Hide radiators',{exact:true}).check();await card.locator('.display-settings summary').click();
  const after=await card.locator('canvas').screenshot();expect(after.equals(before)).toBe(false);
  expect(await card.evaluate(c=>JSON.stringify(c.config.floors))).toBe(original);
  await page.screenshot({path:`/tmp/room-isolation-${info.project.name}.png`});
  await page.reload();await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));await configure();await expect(card.getByLabel('Isolate room',{exact:true})).toHaveValue('left');
  await card.locator('.display-settings summary').click();await expect(card.getByLabel('Hide radiators',{exact:true})).toBeChecked();await expect(card.getByLabel('Hide light fixtures',{exact:true})).toBeChecked();await card.locator('.display-settings summary').click();
  await card.getByLabel('Isolate room',{exact:true}).selectOption('');expect(await card.evaluate(c=>JSON.parse(c.planKey)[0].objects.length)).toBe(2);
});

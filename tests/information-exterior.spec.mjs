import {test,expect} from '@playwright/test';
test('information stays visible, updates independently, and exterior returns to the live interior',async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const card=page.locator('floorplan-card');
  await card.evaluate(el=>{
    const config=structuredClone(el.config);config.appearance.mode='3d';
    config.information={enabled:true,items:[{type:'weather',entity:'weather.example'},{type:'calendar',entity:'calendar.example'},{type:'people'},{type:'updates'},{type:'low_battery'},{type:'entity',entity:'sensor.power',label:'Household energy'}]};
    config.exterior={width_m:12,depth_m:12,height_m:5,items:[{id:'lawn',type:'box',x:0,y:-.1,z:0,width:12,height:.1,depth:12,colour:'#869f69'},{id:'house',type:'box',x:0,y:0,z:0,width:4,height:3,depth:5},{id:'roof',type:'surface',vertices:[[-2,3,2.5],[2,3,2.5],[0,5,0]]},{id:'car',type:'car',x:4,y:0,z:0,width:1.85,height:1.44,depth:4.69}]};
    config.floors[0].objects.push({id:'pattern-test',type:'tv_lightstrip',x:50,y:50,width:1.6,height:.025,depth:.025,pattern_entity:'sensor.pattern',colour_entity:'sensor.colour',fill_entity:'sensor.fill'});
    el.setConfig(config);el.hass={...el._hass,states:{...el._hass.states,'weather.example':{state:'sunny',attributes:{temperature:19,temperature_unit:'°C',friendly_name:'Weather'}},'calendar.example':{state:'off',attributes:{message:'Dinner with friends',start_time:'2099-09-11T18:00:00',end_time:'2099-09-11T19:00:00',friendly_name:'Calendar'}},'person.example':{state:'home',attributes:{friendly_name:'Alex'}},'update.example':{state:'off'},'sensor.battery':{state:'12',attributes:{device_class:'battery'}},'sensor.power':{state:'650',attributes:{unit_of_measurement:'W'}},'sensor.pattern':{state:'progressive-fill'},'sensor.colour':{state:'#ff3030'},'sensor.fill':{state:'50'}}};
  });
  await expect(card.locator('.information-panel')).toContainText('650 W');
  await card.getByRole('button',{name:'Hide overlays',exact:true}).click();await expect(card.locator('.information-panel')).toBeVisible();
  await card.evaluate(el=>{el.__canvas=el.plan.querySelector('canvas');el.hass={...el._hass,states:{...el._hass.states,'sensor.power':{state:'920',attributes:{unit_of_measurement:'W'}}}};});
  await expect(card.locator('.information-panel')).toContainText('920 W');expect(await card.evaluate(el=>el.__canvas===el.plan.querySelector('canvas'))).toBe(true);
  await card.getByRole('button',{name:'Exterior',exact:true}).click();
  await expect.poll(()=>card.locator('.plan-3d').getAttribute('data-fitted-bounds')).not.toBeNull();
  const bounds=await card.locator('.plan-3d').evaluate(el=>JSON.parse(el.dataset.fittedBounds));expect(bounds.flat().every(Number.isFinite)).toBe(true);
  await page.screenshot({path:info.outputPath('information-exterior.png')});
  const panel=await card.locator('.information-panel').boundingBox();expect(panel.x).toBeGreaterThanOrEqual(0);expect(panel.x+panel.width).toBeLessThanOrEqual(page.viewportSize().width);
  await card.locator('.information-panel summary').click();await expect(card.locator('.information-item').first()).toBeHidden();
  await card.getByRole('button',{name:'Exterior',exact:true}).click();
  await card.getByRole('button',{name:'2D',exact:true}).click();
  await expect(card.locator('[data-strip-pattern="progressive-fill"]')).toHaveAttribute('data-strip-fill','0.5');
  await card.evaluate(el=>{el.hass={...el._hass,states:{...el._hass.states,'sensor.pattern':{state:'off'}}};});await expect(card.locator('[data-strip-pattern]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('review editor saves and reorders chosen information entities',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{const card=document.querySelector('floorplan-card'),editor=document.createElement('floorplan-card-editor');editor.hass={states:{'sensor.power':{state:'400',attributes:{friendly_name:'Power'}}}};editor.setConfig({floors:[],groups:[]});editor.step=5;document.body.replaceChildren(editor);editor.render();});
  const editor=page.locator('floorplan-card-editor');
  await editor.getByLabel('Information type',{exact:true}).selectOption('entity');await editor.getByRole('button',{name:'Add information',exact:true}).click();
  await editor.getByLabel('Label',{exact:true}).fill('Energy');await editor.getByLabel('Label',{exact:true}).blur();
  await editor.getByLabel('Information type',{exact:true}).selectOption('low_battery');await editor.getByRole('button',{name:'Add information',exact:true}).click();
  await editor.getByRole('button',{name:'Move up',exact:true}).last().click();
  expect(await editor.evaluate(el=>el.config.information.items.map(i=>i.type))).toEqual(['low_battery','entity']);
  await expect(editor.getByRole('combobox',{name:'Information entity',exact:true})).toHaveValue('sensor.power');
  await editor.getByRole('button',{name:'Undo',exact:true}).click();expect(await editor.evaluate(el=>el.config.information.items[0].label)).toBe('Energy');
});

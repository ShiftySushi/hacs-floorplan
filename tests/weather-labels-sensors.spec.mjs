import {test,expect} from '@playwright/test';

test('weather, sensor mounting and combined labels work through the editor and live updates',async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{
    const card=document.querySelector('floorplan-card'),editor=document.querySelector('floorplan-card-editor');
    const states={...card._hass.states,'weather.example':{state:'rainy',attributes:{temperature:14,temperature_unit:'°C'}},'lock.example':{state:'locked',attributes:{friendly_name:'Front lock'}},'sensor.energy':{state:'450',attributes:{friendly_name:'Energy',unit_of_measurement:'W'}}};
    Object.assign(card._hass.states,states);card.hass={...card._hass};editor.hass=card._hass;
    const config=structuredClone(card.config);config.information={items:[{type:'weather',entity:'weather.example'}]};config.outdoor_temperature_entity='sensor.temperature';config.weather={entity:'weather.example'};card.setConfig(config);editor.setConfig(config);
  });
  const editor=page.locator('floorplan-card-editor'),card=page.locator('floorplan-card');
  await expect(card.locator('.outdoor-temperature')).toHaveCount(0);
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  await editor.getByRole('button',{name:'4. Lights & sensors',exact:true}).click();
  await editor.getByRole('button',{name:'Entity & room labels',exact:true}).click();
  await editor.getByRole('button',{name:'Add label',exact:true}).click();
  await editor.getByLabel('Label title',{exact:true}).fill('Room overview');await editor.getByLabel('Label title',{exact:true}).blur();
  await editor.getByRole('combobox',{name:'Add entity to label',exact:true}).selectOption('lock.example');
  await editor.getByRole('combobox',{name:'Add entity to label',exact:true}).selectOption('sensor.energy');
  await editor.getByLabel('Label X (%)',{exact:true}).fill('45');await editor.getByLabel('Label X (%)',{exact:true}).blur();
  await expect(card.locator('.entity-label')).toContainText('450 W');
  await expect(card.locator('.entity-label')).toContainText('locked');
  await page.screenshot({path:`/private/tmp/label-editor-${info.project.name}.png`});
  await editor.getByRole('button',{name:'3. Furniture',exact:true}).click();
  await editor.getByRole('button',{name:'Unlock editing',exact:true}).click();
  await editor.getByLabel('Find furniture',{exact:true}).fill('Everything Presence Pro');
  await editor.getByRole('button',{name:'Everything Presence Pro',exact:true}).click();
  await editor.getByRole('button',{name:'Place furniture in centre',exact:true}).click();
  await editor.getByRole('combobox',{name:'Sensor mounting',exact:true}).selectOption('corner');
  await editor.getByRole('combobox',{name:'Room corner',exact:true}).selectOption('1');
  await editor.getByRole('group',{name:'Sensor presence entities',exact:true}).getByRole('combobox',{name:'Add entity',exact:true}).selectOption('binary_sensor.motion');
  expect(await editor.evaluate(el=>el.config.floors[0].objects.at(-1).elevation_m)).toBeGreaterThan(2);
  await page.getByRole('button',{name:'Live view',exact:true}).click();
  await card.getByRole('button',{name:'3D',exact:true}).click();
  await expect(card.locator('.plan-3d')).toHaveAttribute('data-fitted-bounds',/.+/);
  await card.evaluate(el=>{el.__canvas=el.plan.querySelector('canvas');el.hass={...el._hass,states:{...el._hass.states,'sensor.energy':{state:'720',attributes:{friendly_name:'Energy',unit_of_measurement:'W'}}}};});
  await expect(card.locator('.entity-label')).toContainText('720 W');expect(await card.evaluate(el=>el.__canvas===el.plan.querySelector('canvas'))).toBe(true);
  expect(await card.locator('.entity-label').evaluate(node=>node.scrollHeight<=node.clientHeight+2)).toBe(true);
  await page.screenshot({path:`/private/tmp/weather-labels-${info.project.name}.png`});
  await card.evaluate(el=>{el.__opened='';el.addEventListener('hass-more-info',e=>el.__opened=e.detail.entityId,{once:true});});
  await card.getByRole('button',{name:'Front lock: locked',exact:true}).click();expect(await card.evaluate(el=>el.__opened)).toBe('lock.example');
  expect(errors).toEqual([]);
});

test('weather changes render in exterior without rebuilding the canvas',async({page},info)=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const card=page.locator('floorplan-card');
  await card.evaluate(el=>{
    const config=structuredClone(el.config);config.weather={entity:'weather.example',intensity:.85};config.exterior={width_m:14,depth_m:14,height_m:5,items:[{id:'ground',type:'box',x:0,y:-.1,z:0,width:14,height:.1,depth:14,colour:'#788f63'},{id:'house',type:'box',x:0,y:0,z:0,width:5,height:3,depth:6,colour:'#dbcfb6'},{id:'roof',type:'box',x:0,y:3,z:0,width:5.4,height:.15,depth:6.4,colour:'#414a52'}]};el.setConfig(config);el.viewMode='3d';el.exterior=true;el.render();el.__canvas=el.plan.querySelector('canvas');
  });
  for(const condition of ['rainy','snowy','fog','sunny']){
    await card.evaluate((el,state)=>{el.hass={...el._hass,states:{...el._hass.states,'weather.example':{state,attributes:{}}}};},condition);
    await expect(card.locator('.plan-3d')).toHaveAttribute('data-fitted-bounds',/.+/);
    expect(await card.evaluate(el=>el.__canvas===el.plan.querySelector('canvas'))).toBe(true);
    if(condition==='snowy')await page.screenshot({path:`/private/tmp/weather-exterior-${info.project.name}.png`});
  }
});

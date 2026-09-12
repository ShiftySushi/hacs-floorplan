import {test,expect} from '@playwright/test';
test('custom layouts render numeric charts, gauges and any entity on desktop and mobile',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.locator('floorplan-card').evaluate(card=>{
    const config=structuredClone(card.config);config.information={title:'Home overview',width:720,max_height:65,columns:4,density:'comfortable',items:[{type:'heading',label:'Comfort and energy'},{type:'entity',entity:'climate.office',attribute:'current_temperature',unit:'°C',precision:1,label:'Office temperature',display:'line',history_hours:6,graph_height:120,column_span:3,text_size:'large'},{type:'entity',entity:'sensor.battery',label:'Battery',display:'gauge',min:0,max:100},{type:'entity',entity:'sensor.power',label:'Power readings',display:'bar',history_hours:24,column_span:2},{type:'entity',entity:'switch.lamp',label:'Desk lamp',align:'right'}]};
    window.historyCalls=[];window.moreInfo=[];card.addEventListener('hass-more-info',e=>window.moreInfo.push(e.detail.entityId));card.setConfig(config);
    card.hass={...card._hass,states:{...card._hass.states,'climate.office':{state:'heat',attributes:{current_temperature:21.25}},'sensor.battery':{state:'62',attributes:{unit_of_measurement:'%'}},'sensor.power':{state:'120',attributes:{unit_of_measurement:'W'}},'switch.lamp':{state:'on',attributes:{}}},callApi:async(method,path)=>{
      window.historyCalls.push(path);const records=[20,21,null,23,21.25].map((value,i)=>({last_updated:new Date(Date.now()-(5-i)*3600000).toISOString(),state:value===null?'unavailable':String(value),attributes:{current_temperature:value}}));return [records];
    }};
  });
  const card=page.locator('floorplan-card'),panel=card.locator('.information-panel');
  await expect(panel.locator('svg[role=img]')).toHaveCount(2);await expect(panel.locator('meter')).toHaveAttribute('value','62');
  await expect(panel).toContainText('21.3 °C');await expect(panel).toContainText('Desk lamp');expect(await page.evaluate(()=>window.historyCalls.length)).toBe(2);
  const grid=panel.locator('.information-grid');expect(await grid.evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length)).toBe(info.project.name==='mobile'?2:4);
  expect(await panel.evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
  await panel.getByRole('button',{name:'Office temperature: 21.3 °C'}).click();expect(await page.evaluate(()=>window.moreInfo)).toEqual(['climate.office']);
  await page.screenshot({path:info.outputPath('custom-information.png')});
  await panel.evaluate(n=>n.scrollTop=n.scrollHeight);await page.screenshot({path:info.outputPath('custom-information-bottom.png')});
  await card.evaluate(card=>{card.style.setProperty('--primary-text-color','#eee');card.style.setProperty('--secondary-text-color','#999');card.style.setProperty('--card-background-color','#343638');});
  await page.screenshot({path:info.outputPath('custom-information-dark.png')});
  await card.evaluate(card=>{card.hass={...card._hass,states:{...card._hass.states,'sensor.battery':{state:'unavailable',attributes:{}}}};});
  await expect(panel).toContainText('A numeric reading is needed');expect(await page.evaluate(()=>window.historyCalls.length)).toBe(2);
  await card.evaluate(card=>{for(const entry of Object.values(card.informationHistory))entry.requestedAt=0;card._hass.callApi=async()=>{throw Error('offline');};card.render();});
  await expect(panel.locator('.information-chart').filter({hasText:'Could not refresh'})).toHaveCount(2);await expect(panel.locator('svg[role=img]')).toHaveCount(2);
  await card.evaluate(card=>{for(const entry of Object.values(card.informationHistory))entry.points=[];card.render();});
  await expect(panel.locator('.information-chart').filter({hasText:'History unavailable'})).toHaveCount(2);
});
test('editor supports non-sensor entities, graph options, duplication and saved arrangements',async({page},info)=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{const editor=document.createElement('floorplan-card-editor');editor.hass={states:{'climate.office':{state:'heat',attributes:{current_temperature:21}}}};editor.setConfig({floors:[],groups:[]});editor.step=5;document.body.replaceChildren(editor);editor.render();});
  const editor=page.locator('floorplan-card-editor');await editor.getByRole('button',{name:'Add information',exact:true}).click();
  await expect(editor.getByRole('combobox',{name:'Information entity',exact:true})).toHaveValue('climate.office');
  await editor.getByRole('combobox',{name:'Display',exact:true}).selectOption('line');await editor.getByRole('combobox',{name:'History period',exact:true}).selectOption('6');
  await editor.getByLabel('Attribute (optional)',{exact:true}).fill('current_temperature');await editor.getByLabel('Attribute (optional)',{exact:true}).blur();
  await editor.getByRole('combobox',{name:'Columns',exact:true}).selectOption('4');await editor.getByRole('combobox',{name:'Column span',exact:true}).selectOption('3');
  await editor.getByLabel('Panel width (px)',{exact:true}).fill('640');await editor.getByLabel('Panel width (px)',{exact:true}).blur();
  await editor.getByRole('combobox',{name:'Information entity',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('information-editor.png')});
  await editor.getByRole('button',{name:'Duplicate item',exact:true}).click();await editor.getByLabel('Label',{exact:true}).last().fill('Copy');await editor.getByLabel('Label',{exact:true}).last().blur();
  await editor.getByRole('button',{name:'Move down',exact:true}).first().click();
  const config=await editor.evaluate(e=>JSON.parse(JSON.stringify(e.config)));expect(config.information).toMatchObject({width:640,columns:4,items:[{label:'Copy',entity:'climate.office',display:'line',history_hours:6,attribute:'current_temperature',column_span:3},{entity:'climate.office'}]});
  await editor.evaluate((e,config)=>{e.setConfig(config);e.render();},config);await expect(editor.getByRole('combobox',{name:'Display',exact:true}).first()).toHaveValue('line');
  await editor.getByLabel('Information type',{exact:true}).selectOption('heading');await editor.getByRole('button',{name:'Add information',exact:true}).click();expect(await editor.evaluate(e=>e.config.information.items.at(-1).type)).toBe('heading');
});

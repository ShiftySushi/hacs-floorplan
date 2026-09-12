import {test,expect} from '@playwright/test';
async function setup(page){
  await page.route('**/api/camera_proxy/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#d8e8ea"/><path d="M0 180V120L100 60L230 130L320 90V180" fill="#698976"/><text x="16" y="28" font-size="16">Fictional camera</text></svg>'}));
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.locator('floorplan-card').evaluate(card=>{
    const s=(state,attributes={})=>({state:String(state),attributes});window.liveCalls=[];window.calendarCalls=[];
    const states={'sensor.temperature':s(21,{unit_of_measurement:'°C'}),'sensor.humidity':s(54),'sensor.pm':s(42,{unit_of_measurement:'µg/m³'}),'sensor.voc':s(90),'binary_sensor.presence':s('on'),'input_boolean.sleep':s('off'),'vacuum.example':s('docked',{supported_features:8212}),'sensor.printer':s('printing'),'sensor.progress':s(42,{unit_of_measurement:'%'}),'sensor.time':s(25,{unit_of_measurement:'min'}),'sensor.bed':s(60,{unit_of_measurement:'°C'}),'sensor.job':s('Fictional model'),'sensor.demand':s(40),'sensor.power':s(120,{unit_of_measurement:'W'}),'sensor.energy':s(.5,{unit_of_measurement:'kWh'}),'camera.example':s('idle',{entity_picture:'/api/camera_proxy/camera.example',friendly_name:'Example camera'}),'binary_sensor.door':s('on'),'lock.door':s('locked'),'sensor.count':s(1),'sensor.names':s('Example remote'),'sensor.unrelated_battery':s(1,{device_class:'battery'}),'calendar.a':s('off',{friendly_name:'Home'}),'calendar.b':s('off',{friendly_name:'Work'}),'device_tracker.car':s('home',{heading:90}),'binary_sensor.charging':s('on')};
    const config={title:'Live controls fixture',appearance:{mode:'clean'},groups:[],information:{items:[{type:'low_battery',count_entity:'sensor.count',names_entity:'sensor.names'},{type:'calendar',entities:['calendar.a','calendar.b']}]},floors:[{id:'test',name:'Example floor',width_m:6,depth_m:6,rooms:[{id:'room',name:'Example room',points:[[0,0],[100,0],[100,100],[0,100]],lights:[],presence:['binary_sensor.presence'],temperature_entity:'sensor.temperature',humidity_entity:'sensor.humidity',pm25_entity:'sensor.pm',voc_entity:'sensor.voc',heating_demand_entity:'sensor.demand',controls:[{entity:'input_boolean.sleep',label:'Sleep Mode'},{entity:'vacuum.example',label:'Vacuum'}],energy:[{label:'Printer plug',power_entity:'sensor.power',energy_entity:'sensor.energy'}]}],entities:[],walls:[{id:'wall',a:[0,0],b:[100,0],height:2.4,thickness:.15,openings:[{id:'door',name:'Example door',type:'door',offset:.3,width:1,height:2,sill:0,contact_entity:'binary_sensor.door',lock_entity:'lock.door'}]}],objects:[{id:'printer',name:'Example printer',type:'printer_3d',variant:'toolchanger',x:25,y:30,width:.6,height:.7,depth:.6,status_entity:'sensor.printer',progress_entity:'sensor.progress',time_left_entity:'sensor.time',bed_temperature_entity:'sensor.bed',job_entity:'sensor.job',camera_entity:'camera.example'},{id:'radiator',type:'radiator',x:70,y:10,width:1,height:.6,depth:.15}]}],exterior:{width_m:8,depth_m:8,height_m:3,items:[{id:'ground',type:'box',x:0,y:-.1,z:0,width:8,height:.1,depth:8},{id:'car',type:'car',x:1,y:0,z:0,width:1.8,height:1.4,depth:4.6,presence_entity:'device_tracker.car',charging_entity:'binary_sensor.charging'},{id:'bell',type:'doorbell',x:-2,y:0,z:0,width:.2,height:1,depth:.2,camera_entity:'camera.example',contact_entity:'binary_sensor.door'}]}};
    const hass={states,callApi:async(method,path)=>{window.calendarCalls.push(path);const start=new Date(Date.now()+(path.includes('calendar.a')?7200000:3600000)),end=new Date(+start+3600000);return [{summary:path.includes('calendar.a')?'Later event':'Earlier event',start:{dateTime:start.toISOString()},end:{dateTime:end.toISOString()}}];},callService:async(domain,service,data)=>{window.liveCalls.push({domain,service,data});if(window.failCommand)throw Error('offline');if(domain==='input_boolean')states[data.entity_id]=s(service==='turn_on'?'on':'off');card.hass={...hass};}};
    card.setConfig(config);card.hass=hass;
  });
}
test('information readouts remain legible with dark theme and unavailable devices',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await setup(page);
  await page.locator('floorplan-card').evaluate(card=>{
    card.style.setProperty('--primary-text-color','#eee');card.style.setProperty('--secondary-text-color','#999');card.style.setProperty('--card-background-color','#343638');
    const config=structuredClone(card.config);config.information.items=[{type:'updates'},{type:'entity',label:'Solar now',entity:'sensor.power'},{type:'entity',label:'Solar today',entity:'sensor.energy'},{type:'calendar',entities:['calendar.a','calendar.b']},{type:'energy',label:'Network / infrastructure',energy:[{label:'Router',power_entity:'sensor.offline'},{label:'Home server',power_entity:'sensor.power',energy_entity:'sensor.energy'}]}];card.setConfig(config);
    card.hass={...card._hass,states:{...card._hass.states,'sensor.temperature':{state:'26',attributes:{unit_of_measurement:'°C'}},'binary_sensor.door':{state:'unavailable'},'update.core':{state:'on',attributes:{friendly_name:'Core Update'}},'calendar.a':{state:'off',attributes:{friendly_name:'Webcal://example.test/racing.ics'}}}};
  });
  const card=page.locator('floorplan-card'),panel=card.locator('.information-panel');
  await expect(panel).not.toContainText('Webcal');await expect(panel).toContainText('Core');await expect(panel).not.toContainText('Core Update');await expect(panel.locator('.information-energy-row')).toHaveCount(2);
  await expect(card.locator('.device-marker').filter({hasText:'Contact unavailable'}).first()).toContainText('Locked');
  await expect(card.locator('.room-readout')).toHaveCSS('color','rgb(112, 67, 38)');
  await expect(panel.locator('.information-date').first()).toBeVisible();
  await page.screenshot({path:info.outputPath('information-cleanup.png')});
  await panel.evaluate(node=>node.scrollTop=node.scrollHeight);
  await page.screenshot({path:info.outputPath('information-energy.png')});
  await panel.locator('summary').evaluate(node=>node.parentElement.open=false);
  await card.locator('.room-readout').hover();
  await page.screenshot({path:info.outputPath('room-contrast.png')});
});
test('room cards expose current readings, controls, errors and energy on desktop and mobile',async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);const card=page.locator('floorplan-card');
  await expect(card.locator('.information-panel')).toContainText('1 low');await expect(card.locator('.information-panel')).not.toContainText('unavailable');
  await expect.poll(()=>page.evaluate(()=>window.calendarCalls.length)).toBe(2);
  const titles=card.locator('.information-item').last().locator('button .information-value');await expect(titles).toHaveText(['Earlier event','Later event']);
  await expect(card.locator('.room-readout-values')).toHaveText('21.0 °C · 54%');await expect(card.locator('.room-readout')).toHaveClass(/occupied/);
  if(info.project.name==='mobile')await card.locator('.information-panel summary').click();
  if(info.project.name==='desktop'){await card.locator('.room-readout').hover();await expect(card.getByRole('dialog')).toHaveCount(0);}
  await card.locator('.room-readout').click();
  const panel=card.getByRole('dialog');await expect(panel).toContainText('Air quality above');await expect(panel).toContainText('120 W now · 0.50 kWh today');
  await panel.getByRole('button',{name:'Sleep Mode: Turn on',exact:true}).click();await expect(panel).toContainText('Sleep Mode: on');
  await panel.getByRole('button',{name:'Vacuum: Dock',exact:true}).click();expect(await page.evaluate(()=>window.liveCalls.at(-1))).toEqual({domain:'vacuum',service:'return_to_base',data:{entity_id:'vacuum.example'}});
  await page.evaluate(()=>window.failCommand=true);await panel.getByRole('button',{name:'Sleep Mode: Turn off',exact:true}).click();await expect(panel).toContainText('Command failed');
  await card.evaluate(el=>{el.hass={...el._hass,states:{...el._hass.states,'sensor.printer':{state:'error',attributes:{}}}};});
  await expect(panel.locator('.device-error')).toContainText('Printer error');await expect(card.getByRole('button',{name:'Printer: error',exact:true})).toBeAttached();
  await panel.getByRole('button',{name:'Open Example camera',exact:true}).scrollIntoViewIfNeeded();await expect(panel.locator('img')).toBeVisible();
  const scroll=await panel.evaluate(el=>el.scrollTop);
  await card.evaluate(el=>{el.hass={...el._hass,states:{...el._hass.states,'sensor.humidity':{state:'55',attributes:{}}}};});
  expect(await panel.evaluate(el=>el.scrollTop)).toBe(scroll);await expect(panel).toContainText('55%');
  const bounds=await panel.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
  await panel.evaluate(el=>el.scrollTop=0);await page.screenshot({path:info.outputPath('room-controls.png')});
  await panel.getByRole('button',{name:'Close room controls',exact:true}).click();await expect(panel).toHaveCount(0);expect(errors).toEqual([]);
});
test('3D states update without replacing the canvas and exterior camera is usable',async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);const card=page.locator('floorplan-card');await card.getByRole('button',{name:'3D',exact:true}).click();
  await expect(card.locator('.plan-3d')).toHaveAttribute('data-printer-states','["printing"]');await expect(card.locator('.plan-3d')).toHaveAttribute('data-doors-open','1');
  await card.evaluate(el=>{el.__canvas=el.plan.querySelector('canvas');el.hass={...el._hass,states:{...el._hass.states,'sensor.printer':{state:'error',attributes:{}},'binary_sensor.door':{state:'off',attributes:{}}}};});
  await expect(card.locator('.plan-3d')).toHaveAttribute('data-printer-states','["error"]');await expect(card.locator('.plan-3d')).toHaveAttribute('data-doors-open','0');expect(await card.evaluate(el=>el.__canvas===el.plan.querySelector('canvas'))).toBe(true);
  await card.getByRole('button',{name:'Exterior',exact:true}).click();await expect(card.locator('.exterior-camera img')).toBeVisible();await expect(card.locator('.exterior-camera')).toHaveCSS('opacity','1');await expect(card.locator('.plan-3d')).toHaveCSS('opacity','1');await page.screenshot({path:info.outputPath('exterior-live.png')});
  await expect.poll(()=>card.locator('.plan-3d').getAttribute('data-vehicle-states')).toContain('"visible":true');
  await card.evaluate(el=>{el.hass={...el._hass,states:{...el._hass.states,'device_tracker.car':{state:'not_home',attributes:{heading:90}}}};});
  await expect.poll(()=>card.locator('.plan-3d').getAttribute('data-vehicle-states')).toContain('"visible":false');
  await card.evaluate(el=>{el.hass={...el._hass,states:{...el._hass.states,'camera.example':{state:'unavailable',attributes:{}}}};});await expect(card.locator('.exterior-camera')).toContainText('Camera unavailable');expect(errors).toEqual([]);
});

test('room editor retains live bindings and allows unbound energy devices',async({page})=>{
  await setup(page);await page.locator('floorplan-card').evaluate(card=>{const editor=document.createElement('floorplan-card-editor');editor.hass=card._hass;editor.setConfig(card.config);editor.step=1;document.body.replaceChildren(editor);editor.render();});
  const editor=page.locator('floorplan-card-editor');await editor.getByText('Room status, controls and energy',{exact:true}).click();
  await expect(editor.getByRole('combobox',{name:'Humidity sensor',exact:true})).toHaveValue('sensor.humidity');
  await editor.getByRole('button',{name:'Add energy device',exact:true}).click();await expect(editor.getByRole('combobox',{name:'Current power sensor',exact:true}).last()).toHaveValue('');
  await editor.getByLabel('Device label',{exact:true}).last().fill('Unbound network device');await editor.getByLabel('Device label',{exact:true}).last().blur();
  expect(await editor.evaluate(el=>el.config.floors[0].rooms[0].energy.at(-1))).toEqual({label:'Unbound network device',power_entity:'',energy_entity:''});
  await editor.getByRole('combobox',{name:'Current power sensor',exact:true}).last().selectOption('sensor.power');await editor.getByRole('combobox',{name:'Daily energy sensor',exact:true}).last().selectOption('sensor.energy');
  expect(await editor.evaluate(el=>el.config.floors[0].rooms[0].energy.at(-1).energy_entity)).toBe('sensor.energy');
});

test('small 3D fittings accept nearby taps while preserving drag behaviour',async({page})=>{
  await setup(page);const card=page.locator('floorplan-card');
  await card.evaluate(el=>{el.setConfig({title:'Small fitting',appearance:{mode:'3d'},floors:[{id:'small',width_m:4,depth_m:4,rooms:[{id:'small-room',name:'Small room',points:[[0,0],[100,0],[100,100],[0,100]],lights:['light.small']}],walls:[],objects:[],entities:[{entity:'light.small',x:50,y:50,fixture:'spot'}]}],groups:[]});el.hass={states:{'light.small':{state:'on',attributes:{friendly_name:'Small light'}}},callService:async(domain,service,data)=>{window.liveCalls.push({domain,service,data});}};});
  const marker=card.getByRole('button',{name:'Small light: On',exact:true});await expect(marker).toBeVisible();const box=await marker.boundingBox();
  await card.getByRole('button',{name:'Hide overlays',exact:true}).click();await page.mouse.click(box.x+box.width/2+18,box.y+box.height/2);
  await expect.poll(()=>page.evaluate(()=>window.liveCalls.at(-1)?.service)).toBe('turn_off');
});

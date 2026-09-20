import {test,expect} from '@playwright/test';

test('floor choices stay ordered and exclusive, and camera visibility applies across views',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/api/camera_proxy/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#98b8ae"/></svg>'}));
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const card=page.locator('floorplan-card');
  const configure=()=>card.evaluate(el=>{
    const config=structuredClone(el.config),base=config.floors[0];
    base.id='camera-test';base.name='Ground';base.rooms[0].controls=[{entity:'camera.example',label:'Room camera'}];
    config.floors=[base,{...structuredClone(base),id:'upper',name:'Upper',elevation:3}];
    config.weather={entity:'weather.example',intensity:.8};
    config.exterior={width_m:14,depth_m:14,height_m:5,items:[
      {id:'ground',type:'box',x:0,y:-.1,z:0,width:14,height:.1,depth:14,colour:'#788f63'},
      {id:'house',type:'box',x:0,y:0,z:0,width:5,height:3,depth:6,colour:'#dbcfb6'},
      {id:'camera',type:'doorbell',x:3,y:1,z:0,width:.1,height:.2,depth:.05,camera_entity:'camera.example'},
      {id:'door',type:'box',x:0,y:0,z:3,width:1,height:2,depth:.1,camera_entity:'camera.example',contact_entity:'binary_sensor.door'}
    ]};el.setConfig(config);
    el.hass={...el._hass,states:{...el._hass.states,'camera.example':{state:'idle',attributes:{entity_picture:'/api/camera_proxy/camera.example'}},'binary_sensor.door':{state:'off',attributes:{}},'weather.example':{state:'cloudy',attributes:{}}}};
  });
  await configure();
  const choices=card.getByRole('group',{name:'Floors',exact:true});
  const selected=async name=>{
    await expect(choices.getByRole('button')).toHaveText(['Ground','Upper','External','All']);
    await expect(choices.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(choices.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true');
  };
  await selected('Ground');
  for(const name of ['All','External','External','All','Upper','Ground']){await choices.getByRole('button',{name,exact:true}).click();await selected(name);}
  await card.evaluate(el=>{el.activeRoom={floorId:el.floorId,roomId:el.config.floors[0].rooms[0].id};el.renderRoomPanel();});
  await expect(card.locator('.room-panel .room-camera')).toHaveCount(1);
  await card.getByLabel('Display settings',{exact:true}).click();await card.getByLabel('Hide cameras',{exact:true}).check();
  await expect(card.locator('.room-panel .room-camera')).toHaveCount(0);
  await expect(card.getByRole('button',{name:'Room camera details',exact:true})).toHaveCount(0);
  await page.screenshot({path:`/tmp/view-options-settings-${info.project.name}.png`});
  await card.getByLabel('Display settings',{exact:true}).click();await card.getByRole('button',{name:'Close room controls',exact:true}).click();
  await choices.getByRole('button',{name:'External',exact:true}).click();await selected('External');
  await expect(card.locator('.room-camera')).toHaveCount(0);
  await expect(card.locator('.exterior-camera')).toHaveCount(1);await expect(card.locator('.exterior-camera')).toContainText('Closed');
  await expect(card.locator('.plan-3d')).toHaveAttribute('data-fitted-bounds',/.+/);
  await page.screenshot({path:`/tmp/view-options-exterior-${info.project.name}.png`});
  await page.reload();await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));await configure();
  await selected('External');await expect(card.locator('.room-camera')).toHaveCount(0);
  await card.getByLabel('Display settings',{exact:true}).click();await expect(card.getByLabel('Hide cameras',{exact:true})).toBeChecked();
  await card.getByLabel('Hide cameras',{exact:true}).uncheck();await expect(card.locator('.room-camera')).toHaveCount(2);
  await card.getByLabel('Display settings',{exact:true}).click();
  await card.getByRole('button',{name:'2D',exact:true}).click();await selected('Ground');
  await choices.getByRole('button',{name:'All',exact:true}).click();await selected('All');await expect(card.locator('.plan-3d')).toBeVisible();
});

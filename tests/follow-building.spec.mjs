import {test,expect} from '@playwright/test';

test('connected All view and Follow mode reveal live occupied rooms without rebuilding WebGL',async({page},info)=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const card=page.locator('floorplan-card');
  await card.evaluate(el=>{
    const rooms=floor=>[
      {id:'left',name:`Left ${floor}`,points:[[0,0],[50,0],[50,100],[0,100]],lights:[],presence:[`binary_sensor.${floor}_left`]},
      {id:'right',name:`Right ${floor}`,points:[[50,0],[100,0],[100,100],[50,100]],lights:[],presence:[`binary_sensor.${floor}_right`]}
    ];
    const walls=()=>[
      {id:'west',a:[0,0],b:[0,100],height:2.4,thickness:.15,openings:[]},
      {id:'east',a:[100,0],b:[100,100],height:2.4,thickness:.15,openings:[]},
      {id:'north',a:[0,0],b:[100,0],height:2.4,thickness:.15,openings:[]},
      {id:'south',a:[0,100],b:[100,100],height:2.4,thickness:.15,openings:[]},
      {id:'divider',a:[50,0],b:[50,100],height:2.4,thickness:.15,openings:[]}
    ];
    const floors=['ground','first','second'].map((id,index)=>({id,name:id[0].toUpperCase()+id.slice(1),width_m:8,depth_m:6,rooms:rooms(id),walls:walls(),entities:[],objects:[{id:`stairs-${id}`,type:'stairs',x:25,y:50,width:.9,depth:2.5,height:2.4,rotation:0}],...(index===2?{}:{})}));
    el.setConfig({appearance:{mode:'3d',quality:'low'},floors,groups:[],exterior:{width_m:12,depth_m:12,height_m:6,items:[{id:'house',type:'box',x:0,y:0,z:0,width:8,height:6,depth:6}]}});
    const states={'sun.sun':{state:'above_horizon',attributes:{elevation:35}}};
    for(const floor of ['ground','first','second'])for(const room of ['left','right'])states[`binary_sensor.${floor}_${room}`]={state:floor==='ground'&&room==='left'?'on':'off',attributes:{}};
    el.hass={states,config:{latitude:51,longitude:0}};
  });
  const choices=card.getByRole('group',{name:'Floors',exact:true});
  await expect(choices.getByRole('button')).toHaveText(['Ground','First','Second','External','All']);
  await expect(card.getByRole('button',{name:'Follow active rooms',exact:true})).toHaveText('Follow');
  expect(await card.locator('.follow-toggle').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await choices.getByRole('button',{name:'External',exact:true}).click();
  const external=card.locator('.plan-3d');
  await expect(external).toHaveAttribute('data-interior','false');
  await external.locator('canvas').evaluate(canvas=>canvas.dataset.retained='yes');
  await card.getByRole('button',{name:'Hide walls and roof',exact:true}).click();
  await expect(external).toHaveAttribute('data-interior','true');
  await expect(external.locator('canvas')).toHaveAttribute('data-retained','yes');
  await expect(external.getByText('Second',{exact:true})).toBeVisible();
  await card.evaluate(el=>{el.hass={...el._hass,states:{...el._hass.states,'binary_sensor.first_right':{state:'on',attributes:{}}}};});
  await expect(external).toHaveAttribute('data-interior','true');
  await expect(external.locator('canvas')).toHaveAttribute('data-retained','yes');
  await expect(card.locator('.room-readout').filter({hasText:'Right first'})).toBeVisible();
  await page.screenshot({path:info.outputPath('external-inside.png')});
  await card.getByRole('button',{name:'Show exterior',exact:true}).click();
  await expect(external.getByText('Second',{exact:true})).toBeHidden();
  await expect(card.locator('.room-readout').filter({hasText:'Right first'})).toBeHidden();
  await card.evaluate(el=>{el.hass={...el._hass,states:{...el._hass.states,'binary_sensor.first_right':{state:'off',attributes:{}}}};});
  await choices.getByRole('button',{name:'All',exact:true}).click();
  const plan=card.locator('.plan-3d');await expect(plan.locator('canvas')).toBeVisible();
  await expect(card.getByRole('button',{name:'Show exterior walls',exact:true})).toHaveAttribute('aria-pressed','true');
  await card.getByRole('button',{name:'Show exterior walls',exact:true}).click();await expect(card.getByRole('button',{name:'Hide exterior walls',exact:true})).toHaveAttribute('aria-pressed','false');
  await card.getByRole('button',{name:'Hide exterior walls',exact:true}).click();await expect(card.getByRole('button',{name:'Show exterior walls',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:info.outputPath('all-connected-house.png')});
  const follow=card.getByRole('button',{name:'Follow active rooms',exact:true});await follow.click();
  await expect(card.getByRole('button',{name:'Stop Follow mode',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(card.locator('.room-readout')).toContainText('Left ground');
  await plan.locator('canvas').evaluate(canvas=>canvas.dataset.followRetained='yes');
  await card.evaluate(el=>{
    const states={...el._hass.states,'binary_sensor.ground_left':{state:'off',attributes:{}},'binary_sensor.second_right':{state:'on',attributes:{}}};
    el.hass={...el._hass,states};
  });
  await expect(card.locator('.room-readout')).toContainText('Right second');
  await page.waitForTimeout(700);
  await expect(plan.locator('canvas')).toHaveAttribute('data-follow-retained','yes');
  await page.screenshot({path:info.outputPath('follow-connected-house.png')});
  await choices.getByRole('button',{name:'Ground',exact:true}).click();
  await expect(card.getByRole('button',{name:'Follow active rooms',exact:true})).toHaveAttribute('aria-pressed','false');
});

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

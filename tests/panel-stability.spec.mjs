import {test,expect} from '@playwright/test';

test('identically named rooms retain their own light and device bindings',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const card=page.locator('floorplan-card');
  await card.evaluate(el=>{
    const room=(id,x)=>({id,name:'Room',points:[[x,0],[x+40,0],[x+40,100],[x,100]],lights:[`light.${id}`],controls:[{entity:`switch.${id}`,label:'Fan'}]});
    el.setConfig({appearance:{mode:'3d'},floors:[{id:'test',rooms:[room('a',0),room('b',60)],walls:[],objects:[],entities:[]}],groups:[]});
    window.commands=[];el.hass={states:Object.fromEntries(['light.a','light.b','switch.a','switch.b'].map(id=>[id,{state:'off',attributes:{}}])),callService:async(domain,service,data)=>window.commands.push({domain,service,...data})};
  });
  await card.locator('[data-room-id="a"]').click();
  await card.evaluate(el=>el.__roomPanel=el.shadowRoot.querySelector('.room-panel'));
  // The non-modal panel can cover B on mobile; keyboard activation remains valid.
  await card.locator('[data-room-id="b"]').press('Enter');
  await card.getByRole('button',{name:'Lights on',exact:true}).click();
  expect(await page.evaluate(()=>window.commands[0].entity_id)).toEqual(['light.b']);
  await card.getByRole('button',{name:'Fan: Turn on',exact:true}).click();
  expect(await page.evaluate(()=>window.commands[1].entity_id)).toBe('switch.b');
  await card.getByRole('button',{name:'Close room controls'}).click();
  await expect(card.locator('[data-room-id="b"]')).toBeFocused();
});

test('refresh preserves room-marker stacking and clickability over overlapping sensors',async({page},info)=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const card=page.locator('floorplan-card');
  await card.evaluate(el=>{
    el.setConfig({appearance:{mode:'3d'},floors:[{id:'test',rooms:[{id:'room',name:'Room',lights:[],points:[[0,0],[100,0],[100,100],[0,100]]}],entities:[{entity:'sensor.temperature',x:50,y:50}],objects:[],walls:[]}],groups:[]});
    el.__order=[...el.plan.querySelectorAll('.marker')].map(n=>n.dataset.roomId||n.getAttribute('aria-label'));el.__room=el.plan.querySelector('.room-readout');
    el.render();
  });
  expect(await card.evaluate(el=>[...el.plan.querySelectorAll('.marker')].map(n=>n.dataset.roomId||n.getAttribute('aria-label')))).toEqual(await card.evaluate(el=>el.__order));
  expect(await card.evaluate(el=>el.__room===el.plan.querySelector('.room-readout'))).toBe(true);
  // Force overlap independently of camera projection and the room anchor heuristic.
  await card.evaluate(el=>{const sensor=el.plan.querySelector('.sensor'),room=el.plan.querySelector('.room-readout');sensor.style.left=room.style.left;sensor.style.top=room.style.top;});
  await card.locator('.room-readout').click();await expect(card.getByRole('dialog')).toBeVisible();
  await page.screenshot({path:info.outputPath('overlapping-room-markers.png')});
});

test('live updates preserve summary scroll, collapsed state and unchanged room labels',async({page},info)=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const card=page.locator('floorplan-card');
  await card.evaluate(el=>{
    const config=structuredClone(el.config);config.appearance.mode='3d';
    config.information={columns:2,items:Array.from({length:16},(_,i)=>({type:'entity',entity:`sensor.test_${i}`,label:`Reading ${i+1}`,icon:'temperature',colour:'#477b9b',full_width:i>=6}))};
    config.floors[0].rooms[0].temperature_entity='sensor.test_0';
    config.floors[0].entities=config.floors[0].entities.filter(item=>item.entity.startsWith('light.'));
    el.setConfig(config);el.hass={...el._hass,states:{...el._hass.states,...Object.fromEntries(config.information.items.map(i=>[i.entity,{state:'21',attributes:{unit_of_measurement:'°C'}}]))}};
    el.__panel=el.shadowRoot.querySelector('.information-panel');el.__label=el.shadowRoot.querySelector('.room-readout');el.__canvas=el.plan.querySelector('canvas');
    el.__panel.scrollTop=90;
  });
  const panel=card.locator('.information-panel');
  await card.evaluate(el=>el.render());
  expect(await card.evaluate(el=>el.__panel===el.shadowRoot.querySelector('.information-panel'))).toBe(true);
  // The scroll value survives even when a displayed value changes.
  await card.evaluate(el=>{el.hass={...el._hass,states:{...el._hass.states,'sensor.test_15':{state:'22',attributes:{unit_of_measurement:'°C'}}}};});
  await expect(panel).toContainText('22 °C');
  expect(await panel.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  expect(await card.evaluate(el=>el.__label===el.shadowRoot.querySelector('.room-readout'))).toBe(true);
  expect(await card.evaluate(el=>el.__canvas===el.plan.querySelector('canvas'))).toBe(true);
  await panel.evaluate(el=>{el.scrollTop=0;});
  await page.screenshot({path:info.outputPath('summary-grid.png')});
  await card.evaluate(el=>{el.style.setProperty('--card-background-color','#24252d');el.style.setProperty('--primary-text-color','#ececf0');el.style.setProperty('--secondary-text-color','#b4b5c0');el.card.style.setProperty('--fp-surface','#24252d');el.card.style.setProperty('--fp-text','#ececf0');el.card.style.setProperty('--fp-line','#555560');});
  await page.screenshot({path:info.outputPath('summary-grid-dark.png')});
  await panel.locator('summary').click();
  await card.evaluate(el=>{el.hass={...el._hass,states:{...el._hass.states,'sensor.test_15':{state:'23',attributes:{unit_of_measurement:'°C'}}}};});
  await expect(panel).not.toHaveAttribute('open');
  await card.locator('.room-readout').first().click();await expect(card.getByRole('dialog')).toBeVisible();
  await page.screenshot({path:info.outputPath('room-readout-panel.png')});
  await card.getByRole('button',{name:'Close room controls'}).click();
  await card.evaluate(el=>el.render());await expect(card.getByRole('dialog')).toHaveCount(0);
});

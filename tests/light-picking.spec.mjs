import {test,expect} from '@playwright/test';
test('clicking an actual 3D fitting toggles its room spots; dragging never toggles',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{
    const card=document.querySelector('floorplan-card');
    card.setConfig({title:'Picking fixture',appearance:{mode:'3d'},groups:[],floors:[{id:'test',width_m:4,depth_m:4,rooms:[{id:'bath',name:'Bathroom',points:[[0,0],[100,0],[100,100],[0,100]],lights:['light.a','light.b','light.p','light.offline','light.unbound']}],entities:[{entity:'light.a',x:40,y:50,fixture:'spot'},{entity:'light.b',x:60,y:50,fixture:'spot'},{entity:'light.p',x:75,y:70,fixture:'pendant'},{entity:'light.offline',x:20,y:20,fixture:'spot'},{entity:'light.unbound',x:80,y:20,fixture:'spot',unbound:true}],walls:[],objects:[]}]});
    window.lightCalls=[];const states=Object.fromEntries(['a','b','p','unbound'].map(id=>['light.'+id,{state:id==='b'?'off':'on',attributes:{friendly_name:id}}]));states['light.offline']={state:'unavailable',attributes:{}};
    const hass={states,callService:async(domain,service,data)=>{window.lightCalls.push({domain,service,data});for(const id of data.entity_id)states[id]={...states[id],state:service==='turn_off'?'off':'on'};card.hass={...hass};}};card.hass=hass;
  });
  const marker=page.getByRole('button',{name:'a: On',exact:true});await expect(marker).toBeVisible();await page.waitForTimeout(1000);
  const box=await marker.boundingBox(),point={x:box.x+box.width/2,y:box.y+box.height/2};
  await page.getByRole('button',{name:'Hide overlays',exact:true}).click();
  const azimuth=await page.locator('.plan-3d').getAttribute('data-view-azimuth');
  await page.mouse.click(point.x,point.y);
  await expect.poll(()=>page.evaluate(()=>window.lightCalls)).toEqual([{domain:'light',service:'turn_off',data:{entity_id:['light.a','light.b']}}]);
  await expect(page.locator('.plan-3d')).toHaveAttribute('data-view-azimuth',azimuth);
  await page.mouse.click(point.x,point.y);
  await expect.poll(()=>page.evaluate(()=>window.lightCalls.at(-1).service)).toBe('turn_on');
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+30,point.y+10);await page.mouse.move(point.x,point.y);await page.mouse.up();
  expect(await page.evaluate(()=>window.lightCalls.length)).toBe(2);
});

import {test,expect} from '@playwright/test';

test('the External view is illustrated, follows daylight and shows only the site markers',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const card=page.locator('floorplan-card');
  await card.evaluate(el=>{
    const config=structuredClone(el.config);
    // A fictional plot: lawn, a flat-roofed house, a parked car and a doorbell with a door contact.
    config.exterior={width_m:14,depth_m:14,height_m:5,items:[
      {id:'lawn',type:'box',x:0,y:-.1,z:0,width:14,height:.1,depth:14,colour:'#788f63',finish:'grass'},
      {id:'house',type:'box',x:-2,y:0,z:0,width:6,height:3,depth:7,colour:'#dbcfb6'},
      {id:'roof',type:'box',x:-2,y:3,z:0,width:6.4,height:.2,depth:7.4,colour:'#414a52'},
      {id:'car',type:'car',x:4,y:0,z:2,width:1.85,height:1.44,depth:4.69,rotation:0,presence_entity:'device_tracker.car',charging_entity:'binary_sensor.charging'},
      {id:'bell',type:'doorbell',x:1.1,y:1.2,z:2,width:.06,height:.16,depth:.03,name:'Front door',contact_entity:'binary_sensor.front_door'}]};
    el.setConfig(config);
    el.hass={...el._hass,states:{...el._hass.states,'sun.sun':{state:'below_horizon',attributes:{elevation:-20}},'device_tracker.car':{state:'home',attributes:{}},'binary_sensor.charging':{state:'on',attributes:{}},'binary_sensor.front_door':{state:'off',attributes:{}}}};
  });
  const interior=await card.locator('.marker').count();expect(interior).toBeGreaterThan(1);
  await card.getByRole('button',{name:'External',exact:true}).click();
  const plan=card.locator('.plan-exterior');await expect(plan.locator('canvas')).toBeVisible();await expect(plan).toHaveAttribute('data-fitted-bounds',/.+/);
  // The fixed angle has no orbit, zoom or wall controls, and room markers stay indoors.
  await expect(plan.getByRole('button')).toHaveCount(0);
  await expect(card.locator('.marker')).toHaveCount(1);await expect(card.locator('.exterior-camera')).toContainText('Closed');
  await expect(plan).toHaveAttribute('data-vehicle-states',/"visible":true,"charging":true/);
  await expect(plan).toHaveAttribute('data-daylight','0.00');
  await plan.locator('canvas').evaluate(canvas=>{canvas.dataset.kept='yes';});
  await card.evaluate(el=>{el.hass={...el._hass,states:{...el._hass.states,'sun.sun':{state:'above_horizon',attributes:{elevation:45}},'device_tracker.car':{state:'not_home',attributes:{}}}};});
  await expect.poll(async()=>Number(await plan.getAttribute('data-daylight')),{timeout:10000}).toBeGreaterThan(.5);
  await expect(plan).toHaveAttribute('data-vehicle-states',/"visible":false/);
  await expect(plan.locator('canvas')).toHaveAttribute('data-kept','yes');
  // Leaving returns to the rooms with their own markers.
  await card.locator('.floor-tabs button').first().click();
  await expect(card.locator('.plan-diorama canvas')).toBeVisible();await expect(card.locator('.plan-exterior')).toHaveCount(0);
  await expect(card.locator('.marker')).toHaveCount(interior);
});

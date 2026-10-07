import {test,expect} from '@playwright/test';

test('sloping ceilings stand only where they hide nothing, and a rooflight lets daylight in',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{
    const card=document.querySelector('floorplan-card'),config=JSON.parse(document.querySelector('#config').textContent),floor=config.floors[0];
    // One fictional 8 m room seen from the south-east, with a fitted wardrobe along its west wall.
    Object.assign(floor,{width_m:8,depth_m:8,entities:[],objects:[],rooms:[{id:'room',name:'Room',points:[[0,0],[100,0],[100,100],[0,100]],lights:[],presence:[]}],
      walls:[{id:'north',a:[0,0],b:[100,0],thickness:.15,height:2.4},{id:'east',a:[100,0],b:[100,100],thickness:.15,height:2.4},{id:'south',a:[100,100],b:[0,100],thickness:.15,height:2.4},{id:'west',a:[0,100],b:[0,0],thickness:.15,height:2.4,wardrobe_doors:{finish:'mirror',side:1,count:4}}],
      ceiling_slopes:[
        {id:'far',vertices:[[0,0,1.2],[100,0,1.2],[100,10,2.4],[0,10,2.4]]},
        {id:'near',vertices:[[0,100,1.2],[100,100,1.2],[100,90,2.4],[0,90,2.4]]},
        {id:'roof',type:'rooflight',vertices:[[40,30,2.4],[60,30,2.4],[60,45,2.4],[40,45,2.4]]}]});
    config.floors=[floor];card.setConfig(config);card.hass={...card._hass,states:{...card._hass.states,'sun.sun':{state:'above_horizon',attributes:{elevation:45}}}};
  });
  const plan=page.locator('floorplan-card').locator('.plan-diorama');await expect(plan.locator('canvas')).toBeVisible();
  // The far slope is backdrop; the near one would cover the room; glass is always see-through.
  expect((await plan.evaluate(node=>node.stats())).ceilings).toEqual(['solid','clear','clear']);
  const light=point=>plan.evaluate((node,point)=>node.sampleLight(document.querySelector('floorplan-card').config.floors[0].id,point),point);
  await expect.poll(async()=>{const under=await light([50,37]),away=await light([50,85]);return under[2]>20&&under[0]+under[1]+under[2]>away[0]+away[1]+away[2];},{timeout:10000}).toBe(true);
  await page.screenshot({path:`/tmp/diorama-ceilings-${test.info().project.name}.png`});
});

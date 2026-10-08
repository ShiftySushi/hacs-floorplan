import {test,expect} from '@playwright/test';

// One fictional 8 m room seen from the south-east: the north and west walls stand, the others are cut.
const room=[[0,0],[100,0],[100,100],[0,100]];
async function open(page,{objects=[],door,states={}}={}){
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(({room,objects,door,states})=>{
    const card=document.querySelector('floorplan-card'),config=JSON.parse(document.querySelector('#config').textContent),floor=config.floors[0];
    Object.assign(floor,{width_m:8,depth_m:8,entities:[],objects,rooms:[{id:'room',name:'Room',points:room,lights:[],presence:[]}],
      walls:[{id:'north',a:[0,0],b:[100,0],thickness:.15,height:2.4,openings:door?[door]:[]},{id:'east',a:[100,0],b:[100,100],thickness:.15,height:2.4},{id:'south',a:[100,100],b:[0,100],thickness:.15,height:2.4},{id:'west',a:[0,100],b:[0,0],thickness:.15,height:2.4}]});
    config.floors=[floor];card.setConfig(config);card.hass={...card._hass,states:{...card._hass.states,...states}};
  },{room,objects,door,states});
  const card=page.locator('floorplan-card'),plan=card.locator('.plan-diorama');await expect(plan.locator('canvas')).toBeVisible();
  const set=next=>page.evaluate(next=>{const card=document.querySelector('floorplan-card');card.hass={...card._hass,states:{...card._hass.states,...next}};},next);
  const light=point=>plan.evaluate((node,point)=>node.sampleLight(document.querySelector('floorplan-card').config.floors[0].id,point),point);
  return {card,plan,set,light};
}
const sum=rgb=>rgb[0]+rgb[1]+rgb[2];

test('a radiator warms the floor around it while it is heating',async({page})=>{
  const {plan,set,light}=await open(page,{objects:[{id:'radiator',type:'radiator',x:50,y:4,width:1,depth:.12,height:.6,elevation_m:.15,heating_entity:'climate.room'}],states:{'climate.room':{state:'heat',attributes:{hvac_action:'idle'}}}});
  await expect(plan).toHaveAttribute('data-radiators-heating','0');expect(sum(await light([50,8]))).toBe(0);
  await set({'climate.room':{state:'heat',attributes:{hvac_action:'heating'}}});
  await expect(plan).toHaveAttribute('data-radiators-heating','1');
  await expect.poll(async()=>{const [r,g,b]=await light([50,8]);return r>20&&r>b*1.5&&g<r;},{timeout:8000}).toBe(true);
  await set({'climate.room':{state:'heat',attributes:{hvac_action:'idle'}}});
  await expect.poll(async()=>sum(await light([50,8])),{timeout:8000}).toBe(0);
});

test('a door with a contact sensor follows it open and shut',async({page})=>{
  const {plan,set}=await open(page,{door:{id:'door',type:'door',offset:.5,width:.9,height:2.1,contact_entity:'binary_sensor.door'},states:{'binary_sensor.door':{state:'off',attributes:{}}}});
  await expect(plan).toHaveAttribute('data-doors-open','0');
  await set({'binary_sensor.door':{state:'on',attributes:{}}});await expect(plan).toHaveAttribute('data-doors-open','1');
  await set({'binary_sensor.door':{state:'unavailable',attributes:{}}});await expect(plan).toHaveAttribute('data-doors-open','0');
});

test('an addressable strip lights only the filled part of its length',async({page})=>{
  const strip={id:'strip',type:'tv_lightstrip',x:50,y:50,width:4,depth:.05,height:.8,pattern_entity:'sensor.strip_pattern',colour_entity:'sensor.strip_colour',fill_entity:'sensor.strip_fill'};
  const {set,light}=await open(page,{objects:[strip],states:{'sensor.strip_pattern':{state:'off',attributes:{}},'sensor.strip_colour':{state:'#00ff00',attributes:{}},'sensor.strip_fill':{state:'25',attributes:{}}}});
  expect(sum(await light([50,50]))).toBe(0);
  await set({'sensor.strip_pattern':{state:'full-fill',attributes:{}}});
  await expect.poll(async()=>{const [r,g,b]=await light([50,50]);return g>40&&g>r*2&&g>b*2;},{timeout:8000}).toBe(true);
  // A quarter filled from the left: the pool sits over the left end and is dimmer overall.
  await set({'sensor.strip_pattern':{state:'progressive-fill',attributes:{}}});
  await expect.poll(async()=>{const left=sum(await light([32,50])),right=sum(await light([68,50]));return left>0&&left>right;},{timeout:8000}).toBe(true);
});

test('printers, presence sensors, slideshows and ghosted wall fittings report their live state',async({page})=>{
  // The public demo's own fictional image stands in for a saved TV still.
  const still='/demo/sample.svg?still';
  const art=page.waitForRequest(request=>request.url().includes('/demo/sample.svg?cover'));
  const {plan,set}=await open(page,{objects:[
    {id:'printer',type:'printer_3d',x:30,y:30,width:.4,depth:.4,height:.5,status_entity:'sensor.printer_status'},
    {id:'sensor',type:'everything_presence_one',x:20,y:5,width:.065,depth:.035,height:.065,elevation_m:1.8,presence_entities:['binary_sensor.presence']},
    {id:'tv',type:'tv',x:60,y:10,width:1.44,depth:.15,height:.81,elevation_m:.6,media_entity:'media_player.tv',tv_scenes:[{image:still}]},
    {id:'frame',type:'picture',x:40,y:2,width:.7,depth:.04,height:.5,elevation_m:1.3,media_entity:'media_player.frame'},
    // Hung on the near wall, which is cut to a kerb, so it is drawn as a ghost rather than dropped.
    {id:'cut',type:'picture',x:50,y:98,rotation:180,width:.7,depth:.04,height:.5,elevation_m:1.3}],
    states:{'sensor.printer_status':{state:'idle',attributes:{}},'binary_sensor.presence':{state:'on',attributes:{}},'media_player.tv':{state:'on',attributes:{}},'media_player.frame':{state:'playing',attributes:{entity_picture:'/demo/sample.svg?cover'}}}});
  await art;
  await expect(plan).toHaveAttribute('data-printer-states','["idle"]');
  await set({'sensor.printer_status':{state:'printing',attributes:{}}});await expect(plan).toHaveAttribute('data-printer-states','["printing"]');
  await set({'sensor.printer_status':{state:'error',attributes:{}}});await expect(plan).toHaveAttribute('data-printer-states','["error"]');
  const stats=await plan.evaluate(node=>node.stats());
  expect(stats.slideshows).toBe(1);expect(stats.ghosts).toBe(1);expect(stats.televisions).toEqual([{id:'tv',on:true}]);
});

test('daylight comes in through a window unless its blind is drawn, and fades in the evening',async({page})=>{
  const {plan,set,light}=await open(page,{door:{id:'window',type:'window',offset:.5,width:1.6,height:1.2,sill:.9,blinds:true},states:{'sun.sun':{state:'below_horizon',attributes:{elevation:-20}}}});
  await expect(plan).toHaveAttribute('data-daylight','0.00');expect(sum(await light([50,12]))).toBe(0);
  await set({'sun.sun':{state:'above_horizon',attributes:{elevation:45}}});
  await expect.poll(async()=>Number(await plan.getAttribute('data-daylight')),{timeout:10000}).toBeGreaterThan(.5);
  // Daylight is cool: bluer than a lamp, and it lands just inside the window.
  const lit=await light([50,12]);expect(lit[2]).toBeGreaterThan(lit[0]);expect(sum(lit)).toBeGreaterThan(sum(await light([50,90])));
  await expect(plan).toHaveAttribute('data-blinds-closed','0');
  await page.evaluate(()=>{const card=document.querySelector('floorplan-card'),floor=card.config.floors[0];card.blindStates[JSON.stringify([floor.id,'north','window'])]=true;card.render();});
  await expect(plan).toHaveAttribute('data-blinds-closed','1');
  await expect.poll(async()=>sum(await light([50,12])),{timeout:8000}).toBeLessThan(sum(lit)*.3);
  await set({'sun.sun':{state:'below_horizon',attributes:{elevation:-20}}});
  await expect.poll(async()=>sum(await light([50,12])),{timeout:10000}).toBe(0);
});

test('a blind and a turning frame can be reached and worked from the keyboard',async({page})=>{
  const {plan}=await open(page,{door:{id:'window',type:'window',name:'Garden window',offset:.75,width:1.6,height:1.2,sill:.9,blinds:true},
    objects:[{id:'frame',type:'picture',name:'Hall frame',x:25,y:2,width:.7,depth:.04,height:.5,elevation_m:1.3,media_entity:'media_player.frame'}]});
  const blind=plan.getByRole('button',{name:'Garden window blind: drawn'}),frame=plan.getByRole('button',{name:'Hall frame: turned to portrait'});
  await expect(blind).toHaveAttribute('aria-pressed','false');await expect(frame).toHaveAttribute('aria-pressed','false');
  await blind.focus();await page.keyboard.press('Enter');
  await expect(blind).toHaveAttribute('aria-pressed','true');await expect(plan).toHaveAttribute('data-blinds-closed','1');
  await frame.focus();await page.keyboard.press('Space');
  await expect(frame).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>Object.values(document.querySelector('floorplan-card').viewStates).some(view=>Object.values(view.portraits||{}).includes(true)))).toBe(true);
  // The hotspots sit on the things they work, inside the drawing.
  const box=await plan.boundingBox();for(const spot of [blind,frame]){const at=await spot.boundingBox();expect(at.x).toBeGreaterThan(box.x);expect(at.x+at.width).toBeLessThan(box.x+box.width);}
  await page.screenshot({path:test.info().outputPath('keyboard-hotspot.png')});
});

test('every redrawn furniture type has an illustrated model, and a floor lamp lights its own shade',async({page})=>{
  const types=[['office_chair',.65,.65,1.1],['island',1.6,.9,.9],['plant',.5,.5,.9],['lamp',.4,.4,1.5],['wall_light',.14,.07,.26],['computer',.22,.45,.45],['speaker',.4,.16,.39],['extractor_fan',.2,.06,.2],['pegboard',.76,.035,.56],['printer_3d',.4,.4,.5],['nanoleaf_panels',1.8,.05,.8],['hue_motion_sensor',.055,.028,.055]];
  const {plan}=await open(page,{objects:types.map(([type,width,depth,height],i)=>({id:type,type,width,depth,height,x:15+i%4*22,y:20+Math.floor(i/4)*28,...(type==='extractor_fan'?{variant:'wall'}:{}),...(type==='lamp'?{light_entity:'light.diner'}:{})})),
    states:{'light.diner':{state:'on',attributes:{brightness:255,rgb_color:[255,120,40],supported_color_modes:['rgb']}}}});
  expect((await plan.evaluate(node=>node.stats())).fallbacks).toEqual([]);
  // The lamp's pool takes the light's colour: warm, so red leads blue under it.
  await expect.poll(async()=>{const lit=await plan.evaluate(node=>node.sampleLight(document.querySelector('floorplan-card').config.floors[0].id,[81,20]));return lit[0]-lit[2];},{timeout:8000}).toBeGreaterThan(20);
  await page.screenshot({path:test.info().outputPath('redrawn-furniture.png')});
});

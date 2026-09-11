import {test,expect} from '@playwright/test';
test('furniture and lights place by click and centre without randomUUID',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(crypto,'randomUUID',{value:undefined,configurable:true}));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();const editor=page.locator('floorplan-card-editor');
  await editor.getByRole('button',{name:'Unlock editing',exact:true}).click();
  const counts=()=>editor.evaluate(e=>[e.config.floors[0].objects.length,e.config.floors[0].entities.length]);const before=await counts();
  await editor.getByLabel('Find furniture').fill('piano');
  await editor.locator('.furniture-palette').getByRole('button',{name:'Piano',exact:true}).click();
  await editor.getByRole('button',{name:'Place furniture in centre',exact:true}).click();
  await editor.getByRole('button',{name:'Add furniture',exact:true}).first().click();
  await editor.locator('.furniture-palette').getByRole('button',{name:'Piano',exact:true}).click();
  await editor.locator('.furniture-canvas .plan').click({position:{x:30,y:30},force:true});
  await expect.poll(async()=>(await counts())[0]).toBe(before[0]+2);
  await editor.getByRole('button',{name:'4. Lights & sensors',exact:true}).click();
  await editor.getByRole('button',{name:'Spotlight',exact:true}).click();await editor.getByRole('button',{name:'Place in centre',exact:true}).click();
  await editor.getByRole('button',{name:'Pendant light',exact:true}).click();await editor.locator('.plan').click({position:{x:30,y:30},force:true});
  await expect.poll(async()=>(await counts())[1]).toBe(before[1]+2);
  expect(errors).toEqual([]);
});
test('Nanoleaf artwork stays within its shallow footprint in each 2D style',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  for(const mode of ['clean','pokemon','zelda']){
    await page.evaluate(mode=>{const card=document.querySelector('floorplan-card');card.setConfig({type:'custom:floorplan-card',appearance:{mode},floors:[{id:'panels',width_m:5,depth_m:5,rooms:[{id:'room',name:'Room',points:[[0,0],[100,0],[100,100],[0,100]],lights:[]}],objects:[{id:'panels',type:'nanoleaf_panels',x:50,y:20,width:3,depth:.05,height:1}],walls:[],entities:[]}]});},mode);
    const bounds=await page.locator('floorplan-card [data-object-id="panels"] [data-panel-index]').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBBox();return {top:b.y,bottom:b.y+b.height,limit:n.ownerSVGElement.viewBox.baseVal.height*.05/5};}));
    expect(bounds.length).toBeGreaterThan(0);expect(Math.max(...bounds.map(b=>b.bottom))-Math.min(...bounds.map(b=>b.top))).toBeLessThanOrEqual(bounds[0].limit);
  }
});

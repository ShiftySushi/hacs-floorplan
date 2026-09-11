import {test,expect} from '@playwright/test';

test('clicking a desk places equipment on it, and support survives moving and undo',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{const config={type:'custom:floorplan-card',floors:[{id:'test',width_m:5,depth_m:5,objects:[{id:'desk',type:'desk',variant:'plain',x:50,y:50,width:2,depth:1,height:.75,rotation:0}]}]};document.querySelector('floorplan-card').setConfig(config);document.querySelector('floorplan-card-editor').setConfig(config);});
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();const editor=page.locator('floorplan-card-editor');
  await editor.getByRole('button',{name:'3. Furniture',exact:true}).click();await editor.getByRole('button',{name:'Unlock editing',exact:true}).click();
  await editor.getByLabel('Find furniture').fill('P1S');await editor.locator('.furniture-palette').getByRole('button',{name:/Bambu Lab P1S/}).click();
  await editor.locator('[data-object-id="desk"]').click();
  await expect(editor.getByLabel('Height above floor (metres)',{exact:true})).toHaveValue('0.75');
  const printerId=await editor.getByLabel('Placed furniture').inputValue();expect(printerId).not.toBe('desk');
  await editor.getByLabel('X position (%)',{exact:true}).fill('10');await editor.getByLabel('X position (%)',{exact:true}).press('Tab');
  await expect(editor.getByLabel('Height above floor (metres)',{exact:true})).toHaveValue('0');
  await editor.getByRole('button',{name:'Undo',exact:true}).click();
  await expect(editor.getByLabel('Height above floor (metres)',{exact:true})).toHaveValue('0.75');
  await editor.getByLabel('Placed furniture').selectOption('desk');
  await editor.getByLabel('X position (%)',{exact:true}).fill('60');await editor.getByLabel('X position (%)',{exact:true}).press('Tab');
  await editor.getByLabel('Height (metres)',{exact:true}).fill('0.9');await editor.getByLabel('Height (metres)',{exact:true}).press('Tab');
  await editor.getByLabel('Placed furniture').selectOption(printerId);
  await expect(editor.getByLabel('Height above floor (metres)',{exact:true})).toHaveValue('0.9');
  await expect(editor.getByLabel('X position (%)',{exact:true})).toHaveValue('60');
});

test('Aeron, printer architectures and Edifier speakers render in 3D',async({page,isMobile})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  for(const [name,objects,width,depth] of [
    ['speakers',['left','right'].map((side,i)=>({id:side,type:'speaker',product_id:`edifier-s1000db-${side}`,x:30+i*40,y:50,width:.2032,depth:.2667,height:.3429,rotation:i?25:0})),.8,.65],
    ['aeron',[{id:'chair',type:'office_chair',product_id:'aeron-b',x:50,y:50,width:.658,depth:.598,height:1.09,colour:'#383a39',rotation:0}],1.4,1.4],
    ['printers',['snapmaker-u1','bambu-p1s','bambu-a1','prusa-mini'].map((id,i)=>({id,type:'printer_3d',product_id:id,variant:['toolchanger','enclosed','bedslinger','cantilever'][i],x:25+(i%2)*50,y:25+Math.floor(i/2)*50,width:.58,depth:.5,height:.65,colour:i===2?'#c7cecf':'#353a3d'})),2,2],
  ]){
    await page.evaluate(({objects,width,depth})=>{const c=document.querySelector('floorplan-card');c.setConfig({type:'custom:floorplan-card',appearance:{mode:'3d',quality:'high'},floors:[{id:'models',width_m:width,depth_m:depth,objects,walls:[{id:'edge',a:[0,0],b:[100,0],height:.03,thickness:.02}]}]});c.hass={states:{'sun.sun':{state:'above_horizon',attributes:{elevation:35}}}};},{objects,width,depth});
    const canvas=page.locator('floorplan-card canvas').first();await expect(canvas).toBeVisible();
    await canvas.screenshot({path:`/tmp/floorplan-${name}-${isMobile?'mobile':'desktop'}.png`});
  }
  expect(errors.filter(e=>/shader|WebGL|VALIDATE_STATUS|Error/i.test(e))).toEqual([]);
});

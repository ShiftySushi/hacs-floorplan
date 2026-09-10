import { test, expect } from '@playwright/test';
test('mapped light can be rebound without moving it or breaking its group',async({page})=>{
  await page.goto('/demo/');
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  const editor=page.locator('floorplan-card-editor');
  await editor.getByRole('button',{name:'4. Lights & sensors',exact:true}).click();
  await editor.locator('summary').filter({hasText:/^Diner$/}).click();
  await editor.getByRole('combobox',{name:'Light fixture',exact:true}).selectOption('spot');
  await editor.locator('summary').filter({hasText:/^Diner$/}).click();
  await editor.getByRole('combobox',{name:'Assigned entity',exact:true}).selectOption('light.bedroom');
  const config=JSON.parse(await page.locator('#config').textContent());
  expect(config.floors[0].entities.find(e=>e.entity==='light.bedroom')).toMatchObject({x:25,y:25,fixture:'spot'});
  expect(config.groups.find(g=>g.name==='All lights').entities).toContain('light.bedroom');
  expect(config.floors[0].rooms[0].lights).not.toContain('light.diner');
});

test.beforeEach(async ({ page }) => { await page.goto('/demo/'); });
const scene = async page => JSON.parse(await page.locator('#config').textContent());

test('furniture can be placed, resized, varied and restored with undo and redo', async ({ page }) => {
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  const editor=page.locator('floorplan-card-editor');
  const initial=(await scene(page)).floors[0].objects?.length || 0;
  await editor.getByRole('button',{name:'3. Furniture',exact:true}).click();
  await editor.getByRole('button',{name:'Unlock editing',exact:true}).click();
  await editor.getByLabel('Find furniture').fill('piano');
  await editor.getByRole('button',{name:'Piano',exact:true}).click();
  await editor.getByRole('button',{name:'Place furniture in centre',exact:true}).click();
  await expect(editor.getByRole('combobox',{name:'Placed furniture',exact:true}).locator('option')).toHaveCount(initial+2);
  await editor.getByRole('combobox',{name:'Placed furniture',exact:true}).selectOption('');
  await editor.getByRole('button',{name:'Zoom in',exact:true}).click();
  await editor.locator('[data-object-id]').last().click();
  await expect(editor.getByRole('combobox',{name:'Furniture variant',exact:true})).toBeVisible();
  await editor.getByRole('button',{name:'Fit floorplan',exact:true}).click();
  await editor.getByRole('combobox',{name:'Furniture variant',exact:true}).selectOption('grand');
  await editor.getByLabel('Width (metres)',{exact:true}).fill('1.8');
  await editor.getByLabel('Width (metres)',{exact:true}).press('Tab');
  let item=(await scene(page)).floors[0].objects.at(-1);
  expect(item).toMatchObject({type:'piano',x:50,y:50,width:1.8,variant:'grand'});
  await editor.getByRole('button',{name:'Undo',exact:true}).click();
  await expect(editor.getByLabel('Width (metres)',{exact:true})).toHaveValue('1.5');
  await editor.getByRole('button',{name:'Redo',exact:true}).click();
  await expect(editor.getByLabel('Width (metres)',{exact:true})).toHaveValue('1.8');
  await editor.getByRole('button',{name:'Rotate furniture',exact:true}).click();
  await expect(editor.getByLabel('Object rotation (degrees)')).toHaveValue('90');
  await editor.getByRole('button',{name:'Duplicate furniture',exact:true}).click();
  let objects=(await scene(page)).floors[0].objects;
  expect(objects).toHaveLength(initial+2);expect(objects.at(-1).id).not.toBe(objects.at(-2).id);
  await editor.getByRole('button',{name:'Remove furniture',exact:true}).click();
  expect((await scene(page)).floors[0].objects).toHaveLength(initial+1);
});

test('all render modes retain selected lights and compatible controls', async ({ page }) => {
  const card=page.locator('floorplan-card');
  const marker=card.getByRole('button',{name:'Diner: On',exact:true});
  await expect(marker).toBeVisible();
  await card.locator('.plan').evaluate(async el=>{await Promise.all(el.getAnimations().map(animation=>animation.finished));});
  const beforeZoom=await marker.boundingBox();
  await card.getByRole('button',{name:'Zoom in',exact:true}).click();
  await expect.poll(async()=>(await marker.boundingBox())?.width).toBeCloseTo(beforeZoom.width,0);
  await card.getByRole('button',{name:'Fit floorplan',exact:true}).click();
  { const panel=page.locator('floorplan-card'); if(await panel.getByRole('button',{name:'Lighting',exact:true}).count()) await panel.getByRole('button',{name:'Lighting',exact:true}).click(); }
  await card.getByRole('button',{name:'Adjust All lights',exact:true}).click();
  for(const name of ['pokemon','zelda','3D','2D']) {
    if(['pokemon','zelda'].includes(name)){await card.getByRole('combobox',{name:'Custom style',exact:true}).selectOption(name);await expect(card.getByRole('combobox',{name:'Custom style',exact:true})).toHaveValue(name);}
    else{await card.getByRole('button',{name,exact:true}).click();await expect(card.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true');}
    await expect(card.getByRole('button',{name:'Diner: On',exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(card.getByLabel('Brightness · 3 of 4 lights')).toBeVisible();
    await expect(card.getByLabel('Colour · 1 of 4 lights')).toBeVisible();
  }
  await card.getByRole('button',{name:'Turn off',exact:true}).click();
  await expect(card.getByRole('button',{name:'Diner: Off',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('3D canvas survives state updates and controls work after context loss', async ({ page }) => {
  const card=page.locator('floorplan-card');
  await card.getByRole('button',{name:'3D',exact:true}).click();
  const canvas=card.locator('canvas');
  await expect(canvas).toHaveCount(1);
  const original=await canvas.elementHandle();
  await page.getByRole('button',{name:'Toggle presence',exact:true}).click();
  expect(await original.evaluate(node=>node.isConnected)).toBe(true);
  { const panel=page.locator('floorplan-card'); if(await panel.getByRole('button',{name:'Lighting',exact:true}).count()) await panel.getByRole('button',{name:'Lighting',exact:true}).click(); }
  await card.getByRole('button',{name:'Adjust All lights',exact:true}).click();
  await card.getByRole('button',{name:'Turn off',exact:true}).click();
  expect(await original.evaluate(node=>node.isConnected)).toBe(true);
  await canvas.dispatchEvent('webglcontextlost',{cancelable:true});
  await expect(card.getByText('3D graphics were interrupted. Showing 2D.',{exact:true})).toBeVisible();
  await expect(card.locator('svg.floor-image')).toBeVisible();
  await card.getByRole('button',{name:'Turn on',exact:true}).click();
  await expect(card.getByRole('button',{name:'Diner: On',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#events')).toContainText('turn_on');
});

test('malformed and unsupported scene imports leave the existing scene intact', async ({ page }) => {
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  const editor=page.locator('floorplan-card-editor'), before=await scene(page);
  await editor.getByRole('button',{name:'Import / export',exact:true}).click();
  const upload=editor.getByLabel('Import configuration JSON');
  await upload.setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
  await expect(editor.getByRole('alert')).toContainText('Configuration was not imported');
  expect(await scene(page)).toEqual(before);
  await upload.setInputFiles({name:'future.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...before,scene_version:999}))});
  await expect(editor.getByRole('alert')).toContainText('version is not supported');
  expect(await scene(page)).toEqual(before);
});

test('full configuration export embeds images and round-trips into another card',async({page,browser})=>{
  const editor=page.locator('floorplan-card-editor');
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  await page.evaluate(()=>{
    const editor=document.querySelector('floorplan-card-editor'),config=structuredClone(editor.config);
    config.outdoor_temperature_entity='sensor.outdoor';
    config.title='Configured home · café';
    config.appearance={mode:'zelda',furniture_opacity:.73,labels:true,quality:'high',display:{lights:'auto',temperatures:'always',heating:'hidden',controls:'always',size:.75,idle_rotation:true}};
    Object.assign(config.floors[0],{width_m:12,depth_m:14,offset_x_m:1.2,offset_z_m:-.8,elevation_m:.4});
    const artwork='data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#456789"/></svg>');
    config.floors[0].style_images={pokemon:'/demo/sample.svg',zelda:artwork};
    Object.assign(config.floors[0].rooms[0],{material:'carpet',colour:'#abc123'});
    Object.assign(config.floors[0].objects[0],{x:31.25,y:22.75,width:2.1,depth:1.2,height:.83,rotation:135,colour:'#987654',elevation_m:.15,style_images:{pokemon:'/demo/sample.svg',zelda:artwork}});
    Object.assign(config.floors[0].objects.find(o=>o.type==='tv'),{media_entity:'media_player.tv',light_entity:'light.tv',elevation_m:.65,colour:'#102030'});
    Object.assign(config.floors[0].entities[0],{fixture:'pendant',height_m:2.15});
    config.floors[0].walls[0].openings[0].sill=.7;
    config.floors[0].rooms[0].temperature_entity='sensor.temperature';
    config.floors[0].objects.push({id:'radiator-transfer',type:'radiator',x:10,y:30,width:1,depth:.12,height:.6,heating_entity:'climate.example'});
    config.floors[0].objects.push({id:'panels-transfer',type:'nanoleaf_panels',x:50,y:10,width:1.8,depth:.05,height:.8,elevation_m:1.7,colour:'#12abcd',light_entity:'light.panels',panel_effect:'wave',panel_layout:[[0,0],[1,0],[1,1]]});
    config.floors[0].objects.find(o=>o.type==='sofa').variant='corner';
    const upper=structuredClone(config.floors[0]);upper.id='upper';upper.name='Upper floor';upper.rotation=90;
    upper.entities.push({entity:'light.draft',unbound:true,name:'Future pendant',fixture:'pendant',x:40,y:60});
    upper.rooms[0].lights.push('light.draft');config.floors.push(upper);
    config.groups.push({name:'Future lights',entities:['light.draft']});
    editor.setConfig(config);editor.emit();
  });
  const original=await page.evaluate(()=>document.querySelector('floorplan-card-editor').config);
  await editor.getByRole('button',{name:'Import / export',exact:true}).click();
  const downloaded=page.waitForEvent('download');
  await editor.getByRole('button',{name:'Export full configuration',exact:true}).click();
  const download=await downloaded;
  expect(download.suggestedFilename()).toBe('floorplan-configuration.json');
  const stream=await download.createReadStream(),chunks=[];
  for await(const chunk of stream)chunks.push(chunk);
  const buffer=Buffer.concat(chunks),exported=JSON.parse(buffer.toString());
  expect(await scene(page)).toEqual(original);
  expect(exported.floors.length).toBe(original.floors.length);
  for(const [i,floor] of exported.floors.entries()){
    expect(floor.image).toMatch(/^data:image\//);
    const expected=structuredClone(original.floors[i]);
    expected.image=floor.image;
    for(const [target,source] of [[expected,floor],...expected.objects.map((item,j)=>[item,floor.objects[j]])]){
      for(const key of Object.keys(target.style_images || {})){
        expect(source.style_images[key]).toMatch(/^data:image\//);
        if(target.style_images[key].startsWith('data:'))expect(source.style_images[key]).toBe(target.style_images[key]);
        target.style_images[key]=source.style_images[key];
      }
    }
    expect(floor).toEqual(expected);
  }
  expect({...exported,floors:original.floors}).toEqual(original);
  await page.evaluate(()=>{const editor=document.querySelector('floorplan-card-editor');editor.setConfig({type:'custom:floorplan-card',title:'Destination card',floors:[],groups:[]});editor.emit();});
  await editor.getByLabel('Import configuration JSON').setInputFiles({name:'transfer.json',mimeType:'application/json',buffer});
  await expect(editor.locator('#configuration-transfer [role=status]')).toContainText('Imported');
  expect(await scene(page)).toEqual(exported);
  await editor.getByRole('button',{name:'Undo',exact:true}).click();
  expect((await scene(page)).title).toBe('Destination card');
  expect((await scene(page)).floors).toEqual([]);
  const destination=await browser.newContext(),fresh=await destination.newPage();
  await fresh.goto('http://127.0.0.1:8125/demo/');
  await fresh.route('**/demo/sample.svg',route=>route.abort());
  await fresh.getByRole('button',{name:'Edit layout',exact:true}).click();
  const freshEditor=fresh.locator('floorplan-card-editor');
  await freshEditor.getByRole('button',{name:'Import / export',exact:true}).click();
  await freshEditor.getByLabel('Import configuration JSON').setInputFiles({name:'complete.json',mimeType:'application/json',buffer});
  await expect.poll(()=>scene(fresh)).toEqual(exported);
  await fresh.getByRole('button',{name:'Live view',exact:true}).click();
  await expect(fresh.locator('floorplan-card svg.floor-image')).toBeVisible();
  await destination.close();
});

test('missing artwork prevents a partial export without changing the configuration',async({page})=>{
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  const editor=page.locator('floorplan-card-editor'),original=await scene(page),downloads=[];
  page.on('download',download=>downloads.push(download));
  await page.route('**/demo/sample.svg',route=>route.fulfill({status:404,body:'Missing artwork'}));
  await editor.getByRole('button',{name:'Import / export',exact:true}).click();
  await editor.getByRole('button',{name:'Export full configuration',exact:true}).click();
  await expect(editor.getByRole('alert').filter({hasText:'Could not include a floor image'})).toBeVisible();
  expect(downloads).toHaveLength(0);
  expect(await scene(page)).toEqual(original);
});

test('unconnected elements can be arranged and assigned before binding to Home Assistant',async({page})=>{
  await page.evaluate(()=>{const editor=document.querySelector('floorplan-card-editor');editor.hass={...editor._hass,states:{...editor._hass.states,'sensor.outdoor_temperature':{state:'12',attributes:{friendly_name:'Outdoor temperature'}}}};});
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  const editor=page.locator('floorplan-card-editor');
  await editor.getByRole('button',{name:'4. Lights & sensors',exact:true}).click();
  await editor.getByRole('button',{name:'Temperature',exact:true}).click();
  await editor.locator('.setup-canvas .plan').click({position:{x:40,y:40}});
  const row=editor.locator('details[open]').filter({hasText:'Not connected'});
  await expect(row).toHaveCount(1);
  const draft=(await scene(page)).floors[0].entities.find(e=>e.unbound);
  const markerNode=editor.getByRole('button',{name:`Move ${draft.entity}`,exact:true});
  await markerNode.scrollIntoViewIfNeeded();const bounds=await markerNode.boundingBox();
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2+25,bounds.y+bounds.height/2+20,{steps:5});await page.mouse.up();
  await expect.poll(async()=>(await scene(page)).floors[0].entities.find(e=>e.entity===draft.entity).x).not.toBe(draft.x);
  await row.getByLabel('Display name',{exact:true}).fill('Study temperature');await row.getByLabel('Display name',{exact:true}).press('Tab');
  await row.getByRole('combobox',{name:'Element room',exact:true}).selectOption({index:1});
  const before=await scene(page),marker=before.floors[0].entities.find(e=>e.unbound);
  expect(marker.name).toBe('Study temperature');
  expect(before.floors[0].rooms[0].temperature_entity).toBe(marker.entity);
  await row.getByRole('combobox',{name:'Assigned entity',exact:true}).selectOption('sensor.outdoor_temperature');
  const after=await scene(page),bound=after.floors[0].entities.find(e=>e.entity==='sensor.outdoor_temperature');
  expect(bound).toMatchObject({name:marker.name,x:marker.x,y:marker.y});expect(bound.unbound).toBeUndefined();
  expect(after.floors[0].rooms[0].temperature_entity).toBe('sensor.outdoor_temperature');
  await editor.getByRole('button',{name:'Undo',exact:true}).click();
  expect((await scene(page)).floors[0].entities.find(e=>e.entity===marker.entity).unbound).toBe(true);
});

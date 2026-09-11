import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('file upload replaces a populated card as one undoable change and resets the old editing session',async({page},info)=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();const editor=page.locator('floorplan-card-editor');
  await editor.evaluate(el=>{
    const previous=structuredClone(el.config);previous.information={items:[{type:'entity',entity:'sensor.old_summary'}]};el.setConfig(previous);
    window.beforeReplacement=structuredClone(el.config);window.replacementEvents=[];
    el.addEventListener('config-changed',event=>{window.replacementEvents.push(structuredClone(event.detail.config));el.setConfig(structuredClone(event.detail.config));});
    // The old scene has an active wall/calibration operation and cached furniture
    // view. None of these references belongs to the replacement scene.
    el.step=1;el.floorIndex=el.config.floors.length-1;el.wallDrawing=true;el.wallDraft=[[20,20]];el.calibrating=true;el.calibrationPoints=[[10,10]];el.placementRoom=el.config.floors[0].rooms[0].id;el.furnitureViews=new Map([['old',{zoom:3}]]);el.render();
  });
  await editor.getByRole('button',{name:'Import / export',exact:true}).click();
  const incoming={type:'custom:floorplan-card',title:'Replacement layout',appearance:{mode:'clean'},floors:[{id:'replacement',name:'Replacement floor',width_m:5,depth_m:5,rooms:[{id:'replacement-room',name:'Replacement room',points:[[0,0],[100,0],[100,100],[0,100]],lights:['light.new']}],entities:[{entity:'light.new',x:40,y:40}],walls:[],objects:[{id:'replacement-chair',type:'chair',x:30,y:30}]}],groups:[{name:'Replacement group',entities:['light.new']}]};
  const file={name:'replacement.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))};
  await editor.getByLabel('Import configuration JSON',{exact:true}).setInputFiles(file);
  await expect(editor.locator('#configuration-transfer').getByRole('status')).toContainText('Imported 1 floor and 1 group');
  expect(await editor.evaluate(el=>({floor:el.config.floors[0].id,floors:el.config.floors.length,groups:el.config.groups.map(g=>g.name),objects:el.config.floors[0].objects.map(o=>o.id),step:el.step,wallDrawing:el.wallDrawing,calibrating:el.calibrating,placementRoom:el.placementRoom,views:el.furnitureViews?.size||0}))).toEqual({floor:'replacement',floors:1,groups:['Replacement group'],objects:['replacement-chair'],step:0,wallDrawing:false,calibrating:false,placementRoom:'',views:0});
  await expect(editor.getByRole('alert')).toHaveCount(0);expect(await page.evaluate(()=>window.replacementEvents.length)).toBe(1);
  expect(await editor.evaluate(el=>'information' in el.config)).toBe(false);
  await page.screenshot({path:info.outputPath('replace-populated.png')});
  await editor.getByRole('button',{name:'Undo',exact:true}).click();expect(await editor.evaluate(el=>JSON.stringify(el.config)===JSON.stringify(window.beforeReplacement))).toBe(true);
  await editor.getByRole('button',{name:'Redo',exact:true}).click();await expect(editor.getByRole('textbox',{name:'Card title',exact:true})).toHaveValue('Replacement layout');
  await editor.getByLabel('Import configuration JSON',{exact:true}).setInputFiles({...file,buffer:Buffer.from('{invalid')});await expect(editor.getByRole('alert')).toContainText('Configuration was not imported');
  expect(await editor.evaluate(el=>el.config.floors[0].id)).toBe('replacement');
  await editor.getByLabel('Import configuration JSON',{exact:true}).setInputFiles(file);await expect(editor.getByRole('alert')).toHaveCount(0);
});

test('HA import preserves newer catalogue objects and reports incompatible types without replacing the scene',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const result=await page.locator('floorplan-card-editor').evaluate(async editor=>{
    const raw=structuredClone(editor.config);
    raw.floors[0].objects=['extractor_fan','pegboard','printer_3d'].map((type,i)=>({id:`fixture-${i}`,type,x:20+i*20,y:50}));
    let emitted;
    editor.addEventListener('config-changed',event=>emitted=event.detail.config);
    editor.hass={states:{}};
    await editor.importScene(new File([JSON.stringify(raw)],'scene.json',{type:'application/json'}));
    const types=emitted?.floors[0].objects.map(o=>o.type),saved=JSON.stringify(editor.config);
    raw.floors[0].objects[0].type='future-fixture';emitted=undefined;
    await editor.importScene(new File([JSON.stringify(raw)],'future.json',{type:'application/json'}));
    return {types,error:editor.error,preserved:JSON.stringify(editor.config)===saved,emitted:!!emitted};
  });
  expect(result.types).toEqual(['extractor_fan','pegboard','printer_3d']);
  expect(result.error).toContain('Unsupported furniture type "future-fixture"');
  expect(result.error).toContain('Update the Home Assistant floorplan card');
  expect(result.preserved).toBe(true);expect(result.emitted).toBe(false);
});

test('large TV stills and framed artwork store compactly and re-export with their images',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  const editor=page.locator('floorplan-card-editor');
  const result=await editor.evaluate(async el=>{
    const config=structuredClone(el.config),canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;
    // Valid PNG with trailing padding: a large portable image without personal assets.
    const data='data:image/png;base64,'+btoa(atob(canvas.toDataURL().split(',')[1])+'x'.repeat(1100000));
    const artwork={id:'art',type:'picture',x:30,y:40,width:.7,height:.5,depth:.04,artwork_image:data};
    const tv={id:'tv',type:'tv',x:50,y:60,width:1.4,height:.8,depth:.1,media_entity:'media_player.tv',tv_scenes:Array.from({length:6},(_,i)=>({title:`Still ${i}`,image:data}))};
    config.floors[0].objects=[artwork,tv];
    let emitted,uploads=0;
    el.hass={...el._hass,fetchWithAuth:async(url)=>{
      if(url==='/api/image/upload'){uploads++;return new Response(JSON.stringify({id:'tv-art'}),{status:200});}
      if(url==='/api/image/serve/tv-art/original')return fetch(data);
      throw Error('Unexpected endpoint');
    }};
    el.addEventListener('config-changed',e=>{emitted=structuredClone(e.detail.config);},{once:true});
    await el.importScene(new File([JSON.stringify(config)],'backup.json'));
    if(!emitted)return {error:el.error};
    el.setConfig(JSON.parse(JSON.stringify(emitted)));
    return {uploads,size:new Blob([JSON.stringify(emitted)]).size,objects:el.config.floors[0].objects};
  });
  expect(result.error).toBeUndefined();expect(result.uploads).toBe(1);expect(result.size).toBeLessThan(1024*1024);
  expect(result.objects[0].artwork_image).toBe('/api/image/serve/tv-art/original');
  expect(result.objects[1].tv_scenes.every(s=>s.image===result.objects[0].artwork_image)).toBe(true);
  const download=page.waitForEvent('download');await editor.evaluate(el=>el.exportScene());
  const exported=JSON.parse(await readFile(await (await download).path(),'utf8'));
  const [art,tv]=exported.floors[0].objects;
  expect(art.artwork_image).toMatch(/^data:image\/png;base64,/);
  expect(tv.tv_scenes).toEqual(Array.from({length:6},(_,i)=>({title:`Still ${i}`,image:art.artwork_image})));
  expect({...art,artwork_image:result.objects[0].artwork_image}).toEqual(result.objects[0]);
  expect({...tv,tv_scenes:result.objects[1].tv_scenes}).toEqual(result.objects[1]);
});

test('HA import stores artwork before emitting a compact, reloadable configuration',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  const editor=page.locator('floorplan-card-editor');
  const result=await editor.evaluate(async el=>{
    const original=structuredClone(el.config),imported=structuredClone(original);
    // A valid SVG with enough embedded data to exceed HA's default websocket limit.
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"><!--'+'x'.repeat(4*1024*1024)+'--><rect width="64" height="32" fill="red"/></svg>';
    const data='data:image/svg+xml;base64,'+btoa(svg);
    imported.floors[0].image=data;imported.floors[0].style_images={pokemon:data};
    imported.floors[0].objects[0].style_images={zelda:data};
    let emitted,uploads=0,mime;
    el.hass={...el._hass,fetchWithAuth:async(url,options)=>{
      if(url!=='/api/image/upload')throw Error('Unexpected endpoint');
      uploads++;mime=options.body.get('file').type;
      if(emitted)throw Error('Configuration emitted before images were stored');
      return new Response(JSON.stringify({id:'fixture-image'}),{status:200});
    }};
    el.addEventListener('config-changed',e=>{emitted=structuredClone(e.detail.config);},{once:true});
    await el.importScene(new File([JSON.stringify(imported)],'scene.json'));
    const size=new Blob([JSON.stringify(emitted)]).size;
    el.setConfig(JSON.parse(JSON.stringify(emitted)));
    const saved=structuredClone(el.config);
    return {uploads,mime,size,saved,original};
  });
  expect(result.uploads).toBe(1);expect(result.mime).toBe('image/png');expect(result.size).toBeLessThan(1024*1024);
  const floor=result.saved.floors[0];
  expect(floor.image).toBe('/api/image/serve/fixture-image/original');
  expect(floor.style_images.pokemon).toBe(floor.image);expect(floor.objects[0].style_images.zelda).toBe(floor.image);
  delete floor.style_images;delete floor.objects[0].style_images;floor.image=result.original.floors[0].image;
  expect(result.saved).toEqual(result.original);
});

test('failed HA artwork upload preserves the previous configuration and emits nothing',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  const editor=page.locator('floorplan-card-editor');
  const result=await editor.evaluate(async el=>{
    const before=JSON.stringify(el.config),next=structuredClone(el.config);
    next.floors[0].image='data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>');
    let events=0;el.addEventListener('config-changed',()=>events++);
    el.hass={...el._hass,fetchWithAuth:async()=>new Response('',{status:403})};
    await el.importScene(new File([JSON.stringify(next)],'scene.json'));
    return {events,unchanged:before===JSON.stringify(el.config)};
  });
  expect(result).toEqual({events:0,unchanged:true});
  await expect(editor.getByRole('alert')).toContainText('could not store imported artwork');
});

import {test,expect} from '@playwright/test';

test('HA import stores artwork before emitting a compact, reloadable configuration',async({page})=>{
  await page.goto('/demo/');
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
  await page.goto('/demo/');await page.getByRole('button',{name:'Edit layout',exact:true}).click();
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

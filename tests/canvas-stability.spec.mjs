import {test,expect} from '@playwright/test';

test('unrelated HA messages retain hovered controls while light changes still render',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const result=await page.locator('floorplan-card').evaluate(card=>{
    const button=card.shadowRoot.querySelector('.overlay-toggle'),hass=card._hass;
    for(let i=0;i<20;i++)card.hass={...hass,states:{...hass.states,'sensor.unrelated':{state:String(i),attributes:{}}}};
    const retained=button===card.shadowRoot.querySelector('.overlay-toggle');
    // Also support mutable demo state objects, not only HA's immutable snapshots.
    const light=card.config.floors[0].entities.find(e=>e.entity.startsWith('light.')).entity;
    const next=card._hass;next.states[light]={...next.states[light],state:'off'};card.hass=next;
    return {retained,updated:[...card.shadowRoot.querySelectorAll('.marker')].some(m=>m.getAttribute('aria-label')?.endsWith(': Off'))};
  });
  expect(result).toEqual({retained:true,updated:true});
});

test('3D entrance and control hover do not repeatedly clear the drawing buffer',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{
    window.bufferResizes=0;
    for(const key of ['width','height']){
      const descriptor=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,key);
      Object.defineProperty(HTMLCanvasElement.prototype,key,{...descriptor,set(value){
        if(this.closest('.plan-3d'))window.bufferResizes++;
        descriptor.set.call(this,value);
      }});
    }
    const card=document.querySelector('floorplan-card');card.viewMode='3d';card.render();
  });
  const canvas=page.locator('floorplan-card .plan-3d canvas').first();await expect(canvas).toBeVisible();
  await page.locator('floorplan-card .plan').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});
  // Initial layout may resize once after fitting, but CSS arrival must not resize WebGL.
  expect(await page.evaluate(()=>window.bufferResizes)).toBeLessThanOrEqual(6);
  await page.evaluate(()=>{window.bufferResizes=0;});
  const card=page.locator('floorplan-card');await card.hover();
  const button=card.locator('.display-settings summary');
  await button.hover();
  for(let i=0;i<12;i++){
    await button.dispatchEvent('pointermove',{clientX:200+i,clientY:100});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  }
  expect(await page.evaluate(()=>window.bufferResizes)).toBe(0);
  // A real layout resize still updates the backing buffer.
  await card.evaluate(el=>{el.style.display='block';el.style.width='650px';});
  await expect.poll(()=>page.evaluate(()=>window.bufferResizes)).toBeGreaterThan(0);
});

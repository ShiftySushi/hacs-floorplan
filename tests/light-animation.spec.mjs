import {test,expect} from '@playwright/test';

test('lights fade through intermediate levels and panels animate only when enabled',async({page})=>{
  await page.goto('/demo/');
  await page.evaluate(()=>{
    const floor={id:'test',name:'Test',aspect_ratio:1,width_m:5,rooms:[{id:'room',name:'Room',points:[[0,0],[100,0],[100,100],[0,100]],lights:['light.test']}],entities:[{entity:'light.test',x:50,y:50}],objects:[{id:'panels',type:'nanoleaf_panels',x:50,y:30,width:2,depth:.1,height:1,light_entity:'light.test',panel_effect:'rainbow'}]};
    const states={'light.test':{state:'on',attributes:{rgb_color:[50,150,255]}}};
    const card=document.querySelector('floorplan-card');floor.image=card.config.floors[0].image;
    card.setConfig({...card.config,floors:[floor],appearance:{mode:'clean'}});card.hass={...card._hass,states};
  });
  const glow=page.locator('[data-object-glow="panels"]'),panel=page.locator('[data-object-id="panels"] [data-panel-index]').first();
  const initial=await panel.getAttribute('fill');
  await expect.poll(()=>panel.getAttribute('fill')).not.toBe(initial);
  const opacity=()=>glow.evaluate(el=>Number(el.ownerSVGElement?.querySelector(el.getAttribute('fill').slice(4,-1))?.firstElementChild.getAttribute('stop-opacity')));
  await page.evaluate(()=>{const c=document.querySelector('floorplan-card');c.hass={...c._hass,states:{'light.test':{state:'off',attributes:{}}}};});
  await expect.poll(async()=>{const level=await opacity();return level>0&&level<.44;},{intervals:[20]}).toBe(true);
  await expect(glow).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{const c=document.querySelector('floorplan-card');c.hass={...c._hass,states:{'light.test':{state:'on',attributes:{rgb_color:[50,150,255]}}}};});
  await expect.poll(opacity).toBe(.45);
  const stable=await panel.getAttribute('fill');
  await page.waitForTimeout(150);expect(await panel.getAttribute('fill')).toBe(stable);
});

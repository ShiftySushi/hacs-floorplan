import {test,expect} from '@playwright/test';

test('rendered light pools brighten locally, respect room boundaries and show RGB',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const result=await page.evaluate(async()=>{
    const card=document.querySelector('floorplan-card');
    card.setConfig({type:'custom:floorplan-card',floors:[{id:'test',name:'Test',aspect_ratio:1,width_m:10,depth_m:10,rooms:[{id:'a',name:'Room',points:[[0,0],[60,0],[60,100],[0,100]],lights:['light.a','light.b'],colour:'#cccccc'},{id:'b',name:'Neighbour',points:[[60,0],[100,0],[100,100],[60,100]],lights:['light.c'],colour:'#cccccc'}],entities:[{entity:'light.a',x:50,y:20,fixture:'spot'},{entity:'light.b',x:20,y:80,fixture:'spot'},{entity:'light.c',x:80,y:20}]}]});
    // Light is painted into the diorama's light map, which is readable where WebGL pixels are not.
    async function sample(a,b,brightness=255,colour=[255,255,255]) {
      card.hass={states:{'sun.sun':{state:'below_horizon',attributes:{elevation:-10}},'light.a':{state:a,attributes:{brightness,rgb_color:colour}},'light.b':{state:b,attributes:{brightness:255}},'light.c':{state:'off',attributes:{}}}};
      const plan=card.shadowRoot.querySelector('.plan-diorama');
      return [[50,20],[20,80],[65,20]].map(point=>plan.sampleLight('test',point));
    }
    return {off:await sample('off','off'),one:await sample('on','off'),all:await sample('on','on'),dim:await sample('on','off',40),red:await sample('on','off',255,[255,0,0])};
  });
  const luminance=rgb=>rgb.reduce((a,b)=>a+b,0);
  expect(result.off[0]).toEqual([0,0,0]);
  expect(luminance(result.one[0])).toBeGreaterThan(luminance(result.off[0])+100);
  expect(result.one[1]).toEqual(result.off[1]);
  expect(result.one[2]).toEqual(result.off[2]);
  expect(luminance(result.all[1])).toBeGreaterThan(luminance(result.one[1])+100);
  expect(luminance(result.dim[0])).toBeLessThan(luminance(result.one[0]));
  expect(result.red[0][0]).toBeGreaterThan(result.red[0][1]+60);
});

import {test,expect} from '@playwright/test';

test('rendered light pools brighten locally, respect room boundaries and show RGB',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const result=await page.evaluate(async()=>{
    const card=document.querySelector('floorplan-card');
    card.setConfig({type:'custom:floorplan-card',floors:[{id:'test',name:'Test',aspect_ratio:1,width_m:10,depth_m:10,rooms:[{id:'a',name:'Room',points:[[0,0],[60,0],[60,100],[0,100]],lights:['light.a','light.b'],colour:'#cccccc'},{id:'b',name:'Neighbour',points:[[60,0],[100,0],[100,100],[60,100]],lights:['light.c'],colour:'#cccccc'}],entities:[{entity:'light.a',x:50,y:20,fixture:'spot'},{entity:'light.b',x:20,y:80,fixture:'spot'},{entity:'light.c',x:80,y:20}]}]});
    async function sample(a,b,brightness=255,colour=[255,255,255]) {
      card.hass={states:{'sun.sun':{state:'below_horizon',attributes:{elevation:-10}},'light.a':{state:a,attributes:{brightness,rgb_color:colour}},'light.b':{state:b,attributes:{brightness:255}},'light.c':{state:'off',attributes:{}}}};
      const svg=card.shadowRoot.querySelector('svg.floor-image').cloneNode(true);svg.setAttribute('width','1000');svg.setAttribute('height','1000');
      const image=new Image(),url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
      try {image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=1000;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return [[500,200],[200,800],[650,200]].map(([x,y])=>Array.from(ctx.getImageData(x,y,1,1).data).slice(0,3));} finally {URL.revokeObjectURL(url);}
    }
    return {off:await sample('off','off'),one:await sample('on','off'),all:await sample('on','on'),dim:await sample('on','off',40),red:await sample('on','off',255,[255,0,0])};
  });
  const luminance=rgb=>rgb.reduce((a,b)=>a+b,0);
  expect(luminance(result.one[0])).toBeGreaterThan(luminance(result.off[0])+100);
  expect(result.one[1]).toEqual(result.off[1]);
  expect(result.one[2]).toEqual(result.off[2]);
  expect(luminance(result.all[1])).toBeGreaterThan(luminance(result.one[1])+100);
  expect(luminance(result.dim[0])).toBeLessThan(luminance(result.one[0]));
  expect(result.red[0][0]).toBeGreaterThan(result.red[0][1]+60);
});

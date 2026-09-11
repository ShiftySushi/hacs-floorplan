import {test,expect} from '@playwright/test';
test('window wall sections fade as one wall while orbiting',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{
    const card=document.querySelector('floorplan-card');
    card.setConfig({appearance:{mode:'3d'},floors:[{id:'cutaway-seam',width_m:8,depth_m:8,rooms:[],objects:[],entities:[],walls:[{id:'window-wall',a:[10,50],b:[90,50],height:2.4,thickness:.15,openings:[{id:'window',type:'window',width:1.2,height:1.2,sill:.9,offset:.5}]}]}]});
  });
  const plan=page.locator('.plan-3d');
  for(let i=0;i<3;i++){
    await expect.poll(async()=>{
      const opacity=JSON.parse(await plan.getAttribute('data-wall-opacities')||'[]');
      return opacity.length>2&&Math.max(...opacity)-Math.min(...opacity)<.002;
    }).toBe(true);
    await page.getByRole('button',{name:'Orbit right',exact:true}).click({force:true});
  }
});
test('all walls hide and restore independently of cutaway mode',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.getByRole('button',{name:'3D',exact:true}).click();
  const plan=page.locator('.plan-3d');await expect(plan.locator('canvas').first()).toBeVisible();
  await page.getByRole('button',{name:'Hide all walls',exact:true}).click({force:true});
  await expect.poll(async()=>JSON.parse(await plan.getAttribute('data-wall-opacities')||'[]').every(x=>x===0)).toBe(true);
  expect(JSON.parse(await plan.getAttribute('data-wall-opacities')).length).toBeGreaterThan(0);
  await page.evaluate(()=>{const old=document.querySelector('floorplan-card'),next=document.createElement('floorplan-card');next.setConfig(old.config);next.hass=old._hass;old.replaceWith(next);});
  await expect(page.getByRole('button',{name:'Show walls',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Show walls',exact:true}).click({force:true});
  await expect.poll(async()=>JSON.parse(await plan.getAttribute('data-wall-opacities')||'[]').some(x=>x===1)).toBe(true);
  await expect(page.getByRole('button',{name:'Hide all walls',exact:true})).toHaveAttribute('aria-pressed','false');
});

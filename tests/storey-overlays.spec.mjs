import {test,expect} from '@playwright/test';

test('all storeys has per-floor overlays that follow the stack and spread without rebuilding the canvas',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{
    const card=document.querySelector('floorplan-card'),config=JSON.parse(document.querySelector('#config').textContent);
    const original=config.floors[0];
    config.floors=[original,{...structuredClone(original),id:'upper',name:'Upper',rotation:90,elevation:4}];
    config.floors.forEach((floor,index)=>{floor.entities=[{entity:'light.diner',name:`Storey ${index} light`,x:25,y:25}];floor.rooms=[{id:`room-${index}`,name:`Room ${index}`,points:[[0,0],[100,0],[100,100],[0,100]],lights:['light.diner'],presence:[],temperature_entity:'sensor.temperature'}];floor.objects=[];});
    card.setConfig(config);
  });
  const card=page.locator('floorplan-card');
  await card.getByRole('button',{name:'All',exact:true}).click();
  await expect(card.locator('.marker')).toHaveCount(4);
  await expect(card.locator('.temperature-marker')).toHaveCount(2);
  await expect.poll(async()=>card.locator('.marker').evaluateAll(nodes=>new Set(nodes.map(n=>n.style.left+','+n.style.top)).size)).toBe(4);
  // Stacked, the lower storey's overlays are covered by the floor above and stay hidden until the storeys spread.
  const plan=card.locator('.plan-diorama');await expect(plan).toHaveAttribute('data-spread','0');
  await expect.poll(()=>card.locator('.marker:not([hidden])').count()).toBeLessThan(4);
  await plan.locator('canvas').press('Enter');await expect(plan).toHaveAttribute('data-spread','1');
  await expect.poll(()=>card.locator('.marker:not([hidden])').count(),{timeout:8000}).toBe(4);
  await plan.locator('canvas').press('Escape');await expect(plan).toHaveAttribute('data-spread','0');
  await expect(card.locator('.plan-slot .floor-tabs')).toBeVisible();
  await card.locator('canvas').evaluate(canvas=>canvas.dataset.retained='yes');
  await card.getByRole('button',{name:'Hide overlays',exact:true}).click();
  await expect(card.locator('.marker')).toHaveCount(0);
  await expect(card.locator('.outdoor-temperature')).toHaveCount(0);
  await expect(card.locator('canvas')).toHaveAttribute('data-retained','yes');
  await card.getByRole('button',{name:'Show overlays',exact:true}).click();
  await expect(card.locator('.marker')).toHaveCount(4);
  await expect(card.locator('canvas')).toHaveAttribute('data-retained','yes');
  await page.screenshot({path:`/tmp/storey-overlays-${test.info().project.name}.png`});
});

test('all storeys gathers a room\'s lights into one marker that opens its floor',async({page})=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{
    const card=document.querySelector('floorplan-card'),config=JSON.parse(document.querySelector('#config').textContent);
    const original=config.floors[0];
    config.floors=[original,{...structuredClone(original),id:'upper',name:'Upper',elevation:4}];
    config.floors.forEach((floor,index)=>{floor.entities=[25,50,75].map(x=>({entity:`light.spot_${x}`,name:`Light ${x}`,x,y:40}));floor.rooms=[{id:`room-${index}`,name:`Room ${index}`,points:[[0,0],[100,0],[100,100],[0,100]],lights:[],presence:[]}];floor.objects=[];});
    card.setConfig(config);
  });
  const card=page.locator('floorplan-card');
  await card.getByRole('button',{name:'All',exact:true}).click();
  await expect(card.locator('.marker.overlay-lights')).toHaveCount(2);
  const cluster=card.getByRole('button',{name:/^Room 1: 3 lights, \d on\. Show Upper$/});
  await expect(cluster.locator('.cluster-count')).toHaveText('3');
  // Selecting lights needs each one, so the clusters open out again.
  await card.getByRole('button',{name:'Lighting',exact:true}).click();
  await card.getByRole('button',{name:'Select lights',exact:true}).click();
  await expect(card.locator('.marker.overlay-lights')).toHaveCount(6);
  await card.getByRole('button',{name:'Select lights',exact:true}).click();
  await card.locator('.plan-diorama canvas').press('Enter');await expect(card.locator('.plan-diorama')).toHaveAttribute('data-spread','1');
  await page.screenshot({path:test.info().outputPath('light-clusters.png')});
  await cluster.click();
  await expect(card.getByRole('button',{name:'Upper',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(card.locator('.marker.overlay-lights')).toHaveCount(3);
});

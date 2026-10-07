import {test,expect} from '@playwright/test';

async function twoStoreys(page){
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{
    const card=document.querySelector('floorplan-card'),config=JSON.parse(document.querySelector('#config').textContent),original=config.floors[0];
    config.floors=[original,{...structuredClone(original),id:'upper',name:'Upper'}];
    config.floors.forEach((floor,index)=>{floor.entities=[{entity:'light.diner',name:`Storey ${index} light`,x:92,y:92}];floor.rooms=[{id:`room-${index}`,name:`Room ${index}`,points:[[0,0],[100,0],[100,100],[0,100]],lights:['light.diner'],presence:[]}];floor.objects=[];});
    card.setConfig(config);
  });
  const card=page.locator('floorplan-card');await card.getByRole('button',{name:'All',exact:true}).click();
  const plan=card.locator('.plan-diorama');await expect(plan).toHaveAttribute('data-spread','0');return {card,plan};
}

test('hovering spreads the storeys only after the pointer rests on the drawing',async({page},info)=>{
  test.skip(info.project.name!=='desktop','Hover needs a mouse.');
  const {card,plan}=await twoStoreys(page),box=await plan.locator('canvas').boundingBox();
  // A pointer that goes to a marker and stays there leaves the stack alone.
  const marker=card.locator('.marker:not([hidden])').first();await marker.hover();await page.waitForTimeout(700);
  await expect(plan).toHaveAttribute('data-spread','0');
  // Resting on the drawing itself opens it; leaving closes it again.
  await page.mouse.move(box.x+box.width*.3,box.y+box.height*.6);
  await expect(plan).toHaveAttribute('data-spread','1');
  await page.mouse.move(2,2);await expect(plan).toHaveAttribute('data-spread','0');
});

test('ground-left ordering and marker scaling apply to the whole-house view',async({page})=>{
  const {card,plan}=await twoStoreys(page);
  await expect.poll(()=>plan.evaluate(node=>Number(node.style.getPropertyValue('--fp-storey-scale')))).toBeGreaterThanOrEqual(.6);
  expect(await plan.evaluate(node=>Number(node.style.getPropertyValue('--fp-storey-scale')))).toBeLessThanOrEqual(1);
  await card.locator('.display-settings summary').click();
  await card.getByLabel('Ground floor on the left when spread (All view)',{exact:true}).check();
  const ordered=card.locator('.plan-diorama');await expect(ordered).toHaveAttribute('data-spread-direction','1');
  await ordered.locator('canvas').press('Enter');await expect(ordered).toHaveAttribute('data-spread','1');
  // Spread, the ground storey's marker sits to the left of the upper storey's.
  await expect.poll(async()=>{const left=await card.locator('.marker.overlay-lights:not([hidden])').evaluateAll(nodes=>nodes.map(node=>parseFloat(node.style.left)));return left.length===2&&left[0]<left[1];},{timeout:8000}).toBe(true);
});

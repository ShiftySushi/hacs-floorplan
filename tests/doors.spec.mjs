import {test,expect} from '@playwright/test';

test('clicking a door leaf opens it and restores that state after refresh',async({page})=>{
  const config={title:'Door fixture',appearance:{mode:'3d'},floors:[{id:'test',width_m:4,depth_m:4,rooms:[{id:'room',name:'Room',points:[[0,0],[100,0],[100,100],[0,100]],lights:[]}],walls:[{id:'wall',a:[0,50],b:[100,50],height:2.4,openings:[{id:'door',type:'door',width:1.6,height:2.1,offset:.5,frame:'solid',blinds:false}]}]}]};
  async function load(){await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));await page.evaluate(c=>document.querySelector('floorplan-card').setConfig(c),config);}
  await load();const plan=page.locator('.plan-3d');await expect(plan).toHaveAttribute('data-doors-open','0');
  await page.waitForTimeout(350);
  const bounds=JSON.parse(await plan.getAttribute('data-fitted-bounds')),box=await plan.locator('canvas').boundingBox(),t=1.1/2.5;
  const point=[0,1].map(axis=>[0,2,4,6].reduce((sum,i)=>sum+bounds[i][axis]*(1-t)+bounds[i+1][axis]*t,0)/4);
  await page.mouse.click(box.x+(point[0]+1)*box.width/2,box.y+(1-point[1])*box.height/2);
  await expect(plan).toHaveAttribute('data-doors-open','1');
  await load();await expect(page.locator('.plan-3d')).toHaveAttribute('data-doors-open','1');
});

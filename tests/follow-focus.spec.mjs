import {test,expect} from '@playwright/test';

async function house(page){
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  await page.evaluate(()=>{
    const card=document.querySelector('floorplan-card'),config=JSON.parse(document.querySelector('#config').textContent),ground=config.floors[0];
    config.floors=[ground,{...structuredClone(ground),id:'upper',name:'Upper'}];
    // Each fictional storey is split into a west and an east room with its own presence sensor.
    config.floors.forEach((floor,index)=>{floor.entities=[];floor.objects=[];floor.walls=[];floor.rooms=['west','east'].map((side,i)=>({id:side,name:`${floor.name||'Ground'} ${side}`,points:i?[[50,0],[100,0],[100,100],[50,100]]:[[0,0],[50,0],[50,100],[0,100]],lights:[],presence:[`binary_sensor.${index?'upper':'ground'}_${side}`]}));});
    card.setConfig(config);
    card.hass={...card._hass,states:{...card._hass.states,'binary_sensor.ground_west':{state:'on',attributes:{}},'binary_sensor.ground_east':{state:'off',attributes:{}},'binary_sensor.upper_west':{state:'off',attributes:{}},'binary_sensor.upper_east':{state:'off',attributes:{}}}};
  });
  const card=page.locator('floorplan-card');
  return {card,set:next=>page.evaluate(next=>{const card=document.querySelector('floorplan-card');card.hass={...card._hass,states:{...card._hass.states,...Object.fromEntries(Object.entries(next).map(([id,state])=>[id,{state,attributes:{}}]))}};},next)};
}

test('Follow shows the whole house, keeps occupied rooms lit and follows them as they change',async({page})=>{
  const {card,set}=await house(page),follow=card.getByRole('button',{name:'Follow',exact:true}),choices=card.getByRole('group',{name:'Floors',exact:true});
  await choices.getByRole('button',{name:'Upper',exact:true}).click();await expect(follow).toHaveAttribute('aria-pressed','false');
  await follow.click();await expect(follow).toHaveAttribute('aria-pressed','true');
  // The occupied room is downstairs, so the storeys spread to show it.
  const plan=card.locator('.plan-diorama');await expect(plan).toHaveAttribute('data-focus','1');await expect(plan).toHaveAttribute('data-spread','1');
  await expect(choices.getByRole('button',{name:'All',exact:true})).toHaveAttribute('aria-pressed','true');
  await plan.locator('canvas').evaluate(canvas=>{canvas.dataset.kept='yes';});
  await set({'binary_sensor.upper_east':'on'});await expect(plan).toHaveAttribute('data-focus','2');
  // With nobody home nothing is singled out and the house stacks again.
  await set({'binary_sensor.upper_east':'off','binary_sensor.ground_west':'off'});await expect(plan).toHaveAttribute('data-focus','0');await expect(plan).toHaveAttribute('data-spread','0');
  await expect(plan.locator('canvas')).toHaveAttribute('data-kept','yes');
  await set({'binary_sensor.ground_west':'on'});await expect(plan).toHaveAttribute('data-focus','1');
  // Choosing a floor leaves Follow.
  await choices.getByRole('button',{name:'Upper',exact:true}).click();await expect(follow).toHaveAttribute('aria-pressed','false');
  await expect(card.locator('.plan-diorama')).toHaveAttribute('data-focus','0');
});

test('one room of a floor can be focused by hand',async({page})=>{
  const {card}=await house(page);
  await card.getByRole('group',{name:'Floors',exact:true}).getByRole('button',{name:'Upper',exact:true}).click();
  const focus=card.getByLabel('Focus room',{exact:true});await expect(focus).toHaveValue('');
  await focus.selectOption('east');await expect(card.locator('.plan-diorama')).toHaveAttribute('data-focus','1');
  // The choice belongs to that floor: the other floor is whole, and coming back restores it.
  const choices=card.getByRole('group',{name:'Floors',exact:true});
  await choices.locator('button').first().click();await expect(card.getByLabel('Focus room',{exact:true})).toHaveValue('');await expect(card.locator('.plan-diorama')).toHaveAttribute('data-focus','0');
  await choices.getByRole('button',{name:'Upper',exact:true}).click();await expect(card.getByLabel('Focus room',{exact:true})).toHaveValue('east');await expect(card.locator('.plan-diorama')).toHaveAttribute('data-focus','1');
  await card.getByLabel('Focus room',{exact:true}).selectOption('');await expect(card.locator('.plan-diorama')).toHaveAttribute('data-focus','0');
  // The picker steps aside in the whole-house and outside views.
  await card.getByRole('group',{name:'Floors',exact:true}).getByRole('button',{name:'All',exact:true}).click();await expect(card.getByLabel('Focus room',{exact:true})).toHaveCount(0);
});

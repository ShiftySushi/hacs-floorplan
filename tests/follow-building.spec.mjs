import {test,expect} from '@playwright/test';

test('connected All view and Follow mode reveal live occupied rooms without rebuilding WebGL',async({page},info)=>{
  await page.goto('/demo/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  const card=page.locator('floorplan-card');
  await card.evaluate(el=>{
    const rooms=floor=>[
      {id:'left',name:`Left ${floor}`,points:[[0,0],[50,0],[50,100],[0,100]],lights:[],presence:[`binary_sensor.${floor}_left`]},
      {id:'right',name:`Right ${floor}`,points:[[50,0],[100,0],[100,100],[50,100]],lights:[],presence:[`binary_sensor.${floor}_right`]}
    ];
    const walls=()=>[
      {id:'west',a:[0,0],b:[0,100],height:2.4,thickness:.15,openings:[]},
      {id:'east',a:[100,0],b:[100,100],height:2.4,thickness:.15,openings:[]},
      {id:'north',a:[0,0],b:[100,0],height:2.4,thickness:.15,openings:[]},
      {id:'south',a:[0,100],b:[100,100],height:2.4,thickness:.15,openings:[]},
      {id:'divider',a:[50,0],b:[50,100],height:2.4,thickness:.15,openings:[]}
    ];
    const floors=['ground','first','second'].map((id,index)=>({id,name:id[0].toUpperCase()+id.slice(1),width_m:8,depth_m:6,rooms:rooms(id),walls:walls(),entities:[],objects:[{id:`stairs-${id}`,type:'stairs',x:25,y:50,width:.9,depth:2.5,height:2.4,rotation:0}],...(index===2?{}:{})}));
    el.setConfig({appearance:{mode:'3d',quality:'low'},floors,groups:[],exterior:{width_m:12,depth_m:12,height_m:6,items:[{id:'house',type:'box',x:0,y:0,z:0,width:8,height:6,depth:6}]}});
    const states={'sun.sun':{state:'above_horizon',attributes:{elevation:35}}};
    for(const floor of ['ground','first','second'])for(const room of ['left','right'])states[`binary_sensor.${floor}_${room}`]={state:floor==='ground'&&room==='left'?'on':'off',attributes:{}};
    el.hass={states,config:{latitude:51,longitude:0}};
  });
  const choices=card.getByRole('group',{name:'Floors',exact:true});
  await expect(choices.getByRole('button')).toHaveText(['Ground','First','Second','External','All']);
  await choices.getByRole('button',{name:'All',exact:true}).click();
  const plan=card.locator('.plan-3d');await expect(plan.locator('canvas')).toBeVisible();
  await expect(card.getByRole('button',{name:'Show exterior walls',exact:true})).toHaveAttribute('aria-pressed','true');
  await card.getByRole('button',{name:'Show exterior walls',exact:true}).click();await expect(card.getByRole('button',{name:'Hide exterior walls',exact:true})).toHaveAttribute('aria-pressed','false');
  await card.getByRole('button',{name:'Hide exterior walls',exact:true}).click();await expect(card.getByRole('button',{name:'Show exterior walls',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:info.outputPath('all-connected-house.png')});
  const follow=card.getByRole('button',{name:'Follow active rooms',exact:true});await follow.click();
  await expect(card.getByRole('button',{name:'Stop Follow mode',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(card.locator('.room-readout')).toContainText('Left ground');
  await plan.locator('canvas').evaluate(canvas=>canvas.dataset.followRetained='yes');
  await card.evaluate(el=>{
    const states={...el._hass.states,'binary_sensor.ground_left':{state:'off',attributes:{}},'binary_sensor.second_right':{state:'on',attributes:{}}};
    el.hass={...el._hass,states};
  });
  await expect(card.locator('.room-readout')).toContainText('Right second');
  await page.waitForTimeout(700);
  await expect(plan.locator('canvas')).toHaveAttribute('data-follow-retained','yes');
  await page.screenshot({path:info.outputPath('follow-connected-house.png')});
  await choices.getByRole('button',{name:'Ground',exact:true}).click();
  await expect(card.getByRole('button',{name:'Follow active rooms',exact:true})).toHaveAttribute('aria-pressed','false');
});

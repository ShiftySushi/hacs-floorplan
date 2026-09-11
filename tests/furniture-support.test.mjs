import test from 'node:test';
import assert from 'node:assert/strict';
import {placeOnSurface,updateFurniture,removeFurniture} from '../src/furniture-support.js';
import {normaliseScene} from '../src/scene.js';

test('speakers sit on shelving rather than inside it',()=>{
  const shelf={id:'shelf',type:'bookshelf',product_id:'kallax-2x2',x:50,y:50,width:.765,depth:.39,height:.765};
  const speaker={id:'speaker',type:'speaker',x:52,y:50,width:.2032,depth:.2667,height:.3429};
  const floor={width_m:4,depth_m:4,objects:[shelf,speaker]};placeOnSurface(floor,speaker);
  assert.equal(speaker.support_id,'shelf');assert.equal(speaker.elevation_m,.765);
  updateFurniture(floor,shelf,{height:1.465});assert.equal(speaker.elevation_m,1.465);
});

test('rotated elevated tables support equipment and carry it as one scene change',()=>{
  const table={id:'desk',type:'desk',x:50,y:50,width:2,depth:1,height:.75,elevation_m:.1,rotation:90};
  const printer={id:'printer',type:'printer_3d',x:50,y:60,width:.4,depth:.4,height:.5,rotation:0};
  const floor={id:'test',width_m:10,depth_m:5,objects:[table,printer]};
  placeOnSurface(floor,printer);assert.equal(printer.support_id,'desk');assert.equal(printer.elevation_m,.85);
  updateFurniture(floor,table,{x:60,rotation:180,height:.9});
  assert.equal(printer.x,55);assert.equal(printer.y,50);assert.equal(printer.rotation,90);assert.equal(printer.elevation_m,1);
  const exported=normaliseScene({floors:[floor]});assert.equal(JSON.parse(JSON.stringify(exported)).floors[0].objects[1].support_id,'desk');
  updateFurniture(floor,printer,{x:10,y:10});assert.equal(printer.support_id,undefined);assert.equal(printer.elevation_m,0);
  updateFurniture(floor,printer,{x:60,y:50});assert.equal(printer.support_id,'desk');
  updateFurniture(floor,printer,{elevation_m:1.2});assert.equal(printer.support_id,undefined);assert.equal(printer.elevation_m,1.2);
  updateFurniture(floor,printer,{x:10,y:10});assert.equal(printer.elevation_m,1.2,'manual elevation is preserved off furniture');
  updateFurniture(floor,printer,{x:60,y:50});removeFurniture(floor,table);assert.equal(printer.elevation_m,0);assert.equal(printer.support_id,undefined);
});

test('equipment chooses the highest surface, while chairs stay on the floor',()=>{
  const floor={width_m:5,depth_m:5,objects:[{id:'low',type:'desk',x:50,y:50,width:2,depth:1,height:.7},{id:'high',type:'side_table',x:50,y:50,width:1,depth:1,height:.9}]};
  for(const type of ['printer_3d','office_chair']){
    const item={id:type,type,x:50,y:50};placeOnSurface(floor,item);assert.equal(item.support_id,type==='printer_3d'?'high':undefined);
  }
});

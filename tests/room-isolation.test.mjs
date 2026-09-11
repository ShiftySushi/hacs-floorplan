import test from 'node:test';
import assert from 'node:assert/strict';
import {isolateRoomFloor} from '../src/room-isolation.js';
import {furniture3D} from '../src/furniture3d.js';
import {renderPixelRatio} from '../src/plan3d.js';
import {displaySettings} from '../src/display-settings.js';

test('automatic sharpness uses high DPI while bounding the rendered pixel count',()=>{
  assert.equal(renderPixelRatio(500,400,2),2);
  const ratio=renderPixelRatio(1400,900,2);assert.ok(ratio>1.4&&ratio<2);assert.ok(1400*900*ratio*ratio<=2500001);
  assert.equal(renderPixelRatio(1400,900,2,'high'),2);assert.equal(renderPixelRatio(1400,900,2,'low'),1);
});
test('base cabinet handles sit near the top, fridge handles left, upper cabinet handles stay low',()=>{
  for(const [type,variant] of [['kitchen_unit','base'],['kitchen_unit','wall'],['fridge','']]){
    const m=furniture3D({type,variant,front_style:'shaker',width:.6,depth:.6,height:type==='fridge'?2.2:.9}),handles=m.children.filter(n=>n.userData.cabinetHandle);
    assert.ok(handles.length);for(const h of handles)if(type==='fridge')assert.ok(h.position.x<0);else if(variant==='wall')assert.ok(h.position.y<.45);else assert.ok(h.position.y>.65);
  }
  assert.equal(displaySettings({hide_light_fixtures:true,hide_radiators:true}).hide_radiators,true);
});
test('room isolation clips long walls and ceilings, preserves opening positions and never edits the scene',()=>{
  const floor={id:'floor',width_m:10,depth_m:6,rooms:[{id:'left',points:[[0,0],[50,0],[50,100],[0,100]],lights:['light.left']},{id:'right',points:[[50,0],[100,0],[100,100],[50,100]],lights:['light.right']}],walls:[{id:'top',a:[0,0],b:[100,0],thickness:.15,height:2.4,openings:[{id:'window',width:1,offset:.25,type:'window',sill:.9,height:1.2}]},{id:'divider',a:[50,0],b:[50,100],thickness:.15,height:2.4},{id:'far',a:[100,0],b:[100,100],thickness:.15,height:2.4}],objects:[{id:'desk-left',x:25,y:50},{id:'desk-right',x:75,y:50}],entities:[{entity:'light.left',x:25,y:50},{entity:'light.right',x:75,y:50}],ceiling_slopes:[{id:'slope',vertices:[[0,0,1],[100,0,1],[100,100,2.4],[0,100,2.4]]}]};
  const before=JSON.stringify(floor),isolated=isolateRoomFloor(floor,'left');assert.equal(JSON.stringify(floor),before);assert.equal(isolated.rooms.length,1);assert.deepEqual(isolated.objects.map(o=>o.id),['desk-left']);assert.equal(isolated.entities.length,1);assert.equal(isolated.walls.length,2);
  const top=isolated.walls.find(w=>w.id.startsWith('top')),opening=top.openings[0];assert.ok(top.b[0]<52);assert.ok(Math.abs(top.a[0]+(top.b[0]-top.a[0])*opening.offset-25)<1e-6);
  assert.ok(isolated.ceiling_slopes.every(s=>s.vertices.every(v=>v[0]<=50.00001)));assert.equal(isolateRoomFloor(floor,'missing'),floor);
});

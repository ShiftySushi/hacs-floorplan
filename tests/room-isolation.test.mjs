import test from 'node:test';
import assert from 'node:assert/strict';
import {furniture3D} from '../src/furniture3d.js';
import {displaySettings} from '../src/display-settings.js';

test('base cabinet handles sit near the top, fridge handles left, upper cabinet handles stay low',()=>{
  for(const [type,variant] of [['kitchen_unit','base'],['kitchen_unit','wall'],['fridge','']]){
    const m=furniture3D({type,variant,front_style:'shaker',width:.6,depth:.6,height:type==='fridge'?2.2:.9}),handles=m.children.filter(n=>n.userData.cabinetHandle);
    assert.ok(handles.length);for(const h of handles)if(type==='fridge')assert.ok(h.position.x<0);else if(variant==='wall')assert.ok(h.position.y<.45);else assert.ok(h.position.y>.65);
  }
  assert.equal(displaySettings({hide_light_fixtures:true,hide_radiators:true}).hide_radiators,true);
});
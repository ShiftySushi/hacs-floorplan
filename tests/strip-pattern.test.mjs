import test from 'node:test';
import assert from 'node:assert/strict';
import {stripAppearance,updateStrip} from '../src/strip-pattern.js';
import {furniture3D} from '../src/furniture3d.js';
const object={id:'strip',type:'tv_lightstrip',width:1.6,height:.025,depth:.025,pattern_entity:'sensor.pattern',colour_entity:'sensor.colour',fill_entity:'sensor.fill',light_entity:'light.strip'};
const states=(pattern,fill='50')=>({'sensor.pattern':{state:pattern},'sensor.colour':{state:'#ff0000'},'sensor.fill':{state:fill},'light.strip':{state:'on'}});
test('strip patterns use full bounds, fixed centre and configurable local direction',()=>{
  assert.equal(stripAppearance(object,states('off')).level,0);
  assert.ok(Math.abs(stripAppearance(object,states('center-dot','100')).fraction-.05)<1e-9);
  assert.equal(stripAppearance(object,states('full-fill','0')).fraction,1);
  const a=stripAppearance(object,states('progressive-fill'));assert.equal(a.fraction,.5);assert.equal(a.centre,-.25);assert.deepEqual(a.colour,[255,0,0]);
  assert.equal(stripAppearance({...object,fill_direction:'right-to-left'},states('progressive-fill')).centre,.25);
  for(const bad of ['unknown','unavailable','',null])assert.equal(stripAppearance(object,states('progressive-fill',bad)).fraction,0);
  assert.equal(stripAppearance(object,states('progressive-fill','150')).fraction,1);
  assert.equal(stripAppearance(object,states('progressive-fill','-5')).fraction,0);
  assert.equal(stripAppearance(object,states('unavailable')).level,0);
});
test('3D emitter changes extent without scaling the fixture or lighting its casing',()=>{
  const model=furniture3D(object),emitter=model.children.find(n=>n.userData.stripEmitter);
  updateStrip(model,object,states('progressive-fill','25'));assert.equal(emitter.scale.x,.25);assert.ok(Math.abs(emitter.position.x+.6)<1e-9);assert.equal(model.scale.x,1);
  updateStrip(model,object,states('center-dot'));assert.equal(emitter.position.x,0);assert.ok(Math.abs(emitter.scale.x-.05)<1e-9);
  updateStrip(model,object,states('off'));assert.equal(emitter.visible,false);
});

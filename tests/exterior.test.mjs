import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {validateExterior} from '../src/exterior.js';
import {exterior3D} from '../src/exterior3d.js';
import {exteriorTexture} from '../src/exterior-materials.js';
test('exterior lights and charger react to HA updates without rebuilding geometry',()=>{
  const config={width_m:10,depth_m:10,height_m:5,items:[{id:'lamp',type:'light',x:0,y:2,z:0,width:.2,height:.2,depth:.1,light_entity:'light.porch'},{id:'charger',type:'charger',x:1,y:1,z:0,width:.2,height:.4,depth:.1,charging_entity:'binary_sensor.car_charging',connected_entity:'binary_sensor.car_connected',plugged_cable:[[0,0,0],[1,-.8,1],[2,-.3,2]]}]};
  validateExterior(config);const model=exterior3D(config),lamp=model.getObjectByName('lamp').children.find(n=>n.isPointLight),charger=model.getObjectByName('charger'),cables=charger.children.filter(n=>n.geometry?.type==='TubeGeometry');
  assert.equal(lamp.intensity,0);assert.deepEqual(cables.map(n=>n.visible),[true,false]);
  model.updateStates({'light.porch':{state:'on',attributes:{brightness:128,rgb_color:[255,0,0]}},'binary_sensor.car_charging':{state:'on'}});
  assert.ok(lamp.intensity>1.9);assert.equal(lamp.color.g,0);assert.deepEqual(cables.map(n=>n.visible),[false,true]);
  model.updateStates({'binary_sensor.car_connected':{state:'on'}});assert.deepEqual(cables.map(n=>n.visible),[false,true]);
  model.updateStates({});assert.equal(lamp.intensity,0);assert.deepEqual(cables.map(n=>n.visible),[true,false]);
  assert.throws(()=>validateExterior({...config,items:[{...config.items[1],plugged_cable:[[0,NaN,1],[0,0,0]]}]}),/Cable/);
});
test('exterior geometry is data-driven and finite including a car and arbitrary roof surfaces',()=>{
  const config={width_m:20,depth_m:20,height_m:9,items:[{id:'car',type:'car',x:3,y:0,z:2,width:1.85,depth:4.69,height:1.44,colour:'#666666'},{id:'roof',type:'surface',vertices:[[-2,3,0],[2,3,0],[0,5,0]]}]};
  validateExterior(config);const scene=exterior3D(config),bounds=new THREE.Box3().setFromObject(scene);assert.ok(bounds.max.y>=5);assert.ok(scene.getObjectByName('car'));assert.ok(Number.isFinite(bounds.min.x));
  assert.throws(()=>validateExterior({...config,items:[{...config.items[0],width:NaN}]}));
});
test('parked cars preserve their configured orientation through tracker updates',()=>{
  for(const rotation of [0,90,-90]){
    const car={id:'parked',type:'car',x:0,y:0,z:0,width:1.8,depth:4.6,height:1.4,rotation,presence_entity:'device_tracker.example',charging_entity:'binary_sensor.charging'};
    const scene=exterior3D({items:[car]}),model=scene.getObjectByName(car.id);
    for(const heading of [90,180,undefined]){
      scene.updateStates({'device_tracker.example':{state:'home',attributes:{heading}},'binary_sensor.charging':{state:'on'}});
      assert.equal(model.rotation.y,rotation*Math.PI/180);assert.equal(model.visible,true);assert.equal(model.userData.charging,true);
    }
    scene.updateStates({'device_tracker.example':{state:'not_home',attributes:{heading:270}}});
    assert.equal(model.visible,false);assert.equal(model.rotation.y,rotation*Math.PI/180);
  }
});
test('cars without a parked orientation can follow heading and reset when it becomes unavailable',()=>{
  const scene=exterior3D({items:[{id:'car',type:'car',x:0,y:0,z:0,width:1.8,depth:4.6,height:1.4,presence_entity:'device_tracker.example'}]}),model=scene.getObjectByName('car');
  scene.updateStates({'device_tracker.example':{state:'home',attributes:{heading:90}}});assert.equal(model.rotation.y,Math.PI/2);
  scene.updateStates({'device_tracker.example':{state:'home',attributes:{}}});assert.equal(model.rotation.y,0);
});
test('packed scene meshes survive validation and use their own vertices instead of the generic car',()=>{
  const encode=array=>Buffer.from(array.buffer).toString('base64');
  const part={positions:encode(new Int16Array([-15000,0,0,15000,0,0,0,30000,30000])),indices:encode(new Uint16Array([0,1,2])),colour:'#666666'};
  const config={width_m:10,depth_m:10,height_m:5,models:{example:{parts:[part]}},items:[{id:'imported',type:'car',model:'example',x:0,y:.025,z:0,width:2,depth:4,height:1.5}]};
  validateExterior(config);const model=exterior3D(config),bounds=new THREE.Box3().setFromObject(model),meshes=[];model.traverse(n=>{if(n.isMesh)meshes.push(n);});
  assert.equal(meshes.length,1);assert.equal(meshes[0].geometry.attributes.position.count,3);assert.equal(bounds.min.y,.025);assert.equal(bounds.max.y,1.525);assert.equal(bounds.max.z,4);
  assert.throws(()=>validateExterior({...config,models:{example:{parts:[{...part,indices:encode(new Uint16Array([0,1,3]))}]}}}),/out of bounds/);
  assert.throws(()=>validateExterior({...config,models:{}}),/missing/);
});
test('grass has repeatable fine detail and planting uses cutout leaves instead of a solid sphere',()=>{
  const a=exteriorTexture('grass'),b=exteriorTexture('grass');assert.deepEqual(a.image.data,b.image.data);assert.ok(new Set(a.image.data).size>50);
  const model=exterior3D({items:[{id:'shrub',type:'plant',x:0,y:0,z:0,width:.7,height:.8,depth:.7}]});let leaves;model.traverse(n=>{if(n.isInstancedMesh)leaves=n;});assert.equal(leaves.count,180);assert.equal(leaves.material.alphaTest,.5);assert.ok(leaves.material.map.image.data.some((v,i)=>i%4===3&&v===0));
});

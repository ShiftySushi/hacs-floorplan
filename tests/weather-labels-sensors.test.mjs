import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normaliseConfig} from '../src/lights.js';
import {weatherAppearance,weatherEntity} from '../src/weather.js';
import {weather3D} from '../src/weather3d.js';
import {labelValue} from '../src/entity-labels.js';
import {sceneEntities} from '../src/ha-updates.js';
import {sensorPlacement,sensorTypes} from '../src/presence-sensors.js';
import {furniture3D} from '../src/furniture3d.js';
import {roomState} from '../src/rooms.js';
import {Box3,Group,Vector3} from 'three';

const scene=()=>({floors:[{id:'example',width_m:10,depth_m:10,rooms:[{id:'room',name:'Room',points:[[10,10],[90,10],[90,90],[10,90]],lights:[],presence:[]}],walls:[{id:'wall',a:[10,10],b:[90,10],height:2.4}],objects:[]} ]});
test('labels accept any HA domain, preserve bindings and expose attributes safely',()=>{
  const config=scene();config.floors[0].labels=[{id:'label',x:50,y:50,room_id:'room',items:['lock.front','switch.example','sensor.energy','input_boolean.mode','climate.room'].map(entity=>({entity}))}];
  const normal=normaliseConfig(config);assert.deepEqual(normal.floors[0].labels,config.floors[0].labels);assert(sceneEntities(normal).has('lock.front'));
  assert.equal(labelValue({entity:'sensor.energy'},{'sensor.energy':{state:'3.2',attributes:{unit_of_measurement:'kWh'}}}),'3.2 kWh');
  assert.equal(labelValue({entity:'climate.room',attribute:'temperature',unit:'°C'},{'climate.room':{state:'heat',attributes:{temperature:21}}}),'21 °C');
  assert.equal(labelValue({entity:'lock.front'},{}),'Unavailable');
  normal.floors[0].labels[0].items[0].entity='bad';assert.throws(()=>normaliseConfig(normal),/entity/);
});
test('weather follows selected entity and responds to all HA precipitation states',()=>{
  const config={information:{items:[{type:'weather',entity:'weather.home'}]}};assert.equal(weatherEntity(config),'weather.home');
  const states={'weather.first':{state:'sunny'},'weather.home':{state:'rainy'}};
  assert.equal(weatherAppearance(states,{entity:'weather.home'}).rain,true);assert.equal(weatherAppearance(states,{entity:'weather.missing'}).rain,false);
  for(const [state,key] of [['pouring','rain'],['snowy','snow'],['snowy-rainy','snow'],['hail','hail'],['fog','fog'],['lightning','storm'],['windy','wind']])assert.equal(weatherAppearance({'weather.home':{state}},{entity:'weather.home'})[key],true);
  assert.equal(weatherAppearance(states,{enabled:false}).clouds,0);
  assert.equal(weatherAppearance({'weather.offline':{state:'unavailable'},...states}).condition,'sunny');
});
test('precipitation stays outside shelters and freezes for reduced motion',()=>{
  const world=new Group(),bounds=new Box3(new Vector3(-5,0,-5),new Vector3(5,3,5)),weather=weather3D(world,bounds,[bounds]);
  const states={'weather.home':{state:'rainy'}},settings={entity:'weather.home'};
  assert.equal(weather.update(states,settings,1000,true),false);
  const rain=weather.group.children[0],before=Array.from(rain.geometry.attributes.position.array);
  weather.update(states,settings,2000,true);assert.deepEqual(Array.from(rain.geometry.attributes.position.array),before);
  for(let i=0;i<rain.geometry.drawRange.count;i++){const p=rain.geometry.attributes.position;if(p.getY(i)>-10)assert(Math.abs(p.getX(i))>5||Math.abs(p.getZ(i))>5);}
  assert.equal(weather.update(states,settings,3000,false),true);
  weather.update({},settings,4000,false);assert.equal(weather.group.visible,false);
});
test('sensor models have distinct lenses and mounts follow wall and room geometry',()=>{
  const config=scene(),floor=config.floors[0];
  for(const type of sensorTypes){
    const item={id:type,type,x:50,y:50,width:.07,height:.07,depth:.03,presence_entities:['binary_sensor.occupied'],presence_room:'room'};floor.objects=[item];
    const model=furniture3D(item);assert(new Box3().setFromObject(model).getSize(new Vector3()).length()>0);assert(model.children.some(n=>n.userData.presenceLED));
    assert.equal(roomState(floor.rooms[0],{'binary_sensor.occupied':{state:'on',attributes:{}}},floor).occupied,true);
    item.mount={kind:'wall',wall_id:'wall',offset:.5,side:1};const p=sensorPlacement(floor,item);assert.equal(p.x,50);assert(p.y>10);assert.equal(p.rotation,0);
    item.mount={kind:'corner',room_id:'room',corner:0};const corner=sensorPlacement(floor,item);assert(corner.x>10&&corner.y>10);assert(corner.elevation_m>2);
    assert.doesNotThrow(()=>normaliseConfig(config));
    item.mount.corner=99;assert.throws(()=>normaliseConfig(config),/corner/);
  }
});

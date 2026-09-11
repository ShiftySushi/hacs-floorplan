import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneEntities,sceneState} from '../src/ha-updates.js';

test('unrelated HA updates preserve the scene but configured devices and daylight still update',()=>{
  const ids=sceneEntities({floors:[{objects:[{media_entity:'media_player.tv',light_entity:'light.strip'}],rooms:[{temperature_entity:'sensor.room'}]}]});
  const sceneChanged=(a,b,ids)=>sceneState(a,ids)!==sceneState(b,ids);
  const before={states:{'light.strip':{state:'on',attributes:{brightness:100}},'sensor.other':{state:'1'}}};
  assert.equal(sceneChanged(before,{states:{...before.states,'sensor.other':{state:'2'}}},ids),false);
  assert.equal(sceneChanged(before,{states:{...before.states,'light.strip':{state:'on',attributes:{brightness:100},last_updated:'new'}}},ids),false);
  for(const [id,state] of [['light.strip',{state:'on',attributes:{brightness:200}}],['sensor.room',{state:'20'}],['media_player.tv',{state:'playing'}],['sun.sun',{state:'above_horizon'}],['weather.home',{state:'cloudy'}]])assert.equal(sceneChanged(before,{states:{...before.states,[id]:state}},ids),true);
  assert.equal(sceneChanged(before,{...before,config:{latitude:51,longitude:0}},ids),true);
});

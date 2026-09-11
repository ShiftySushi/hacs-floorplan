import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lightToggleIds} from '../src/light-targets.js';
const config=()=>({groups:[{name:'Floor',entities:['light.a','light.b','light.p','light.strip','light.other']}],floors:[{id:'floor',rooms:[{lights:['light.a','light.b','light.p','light.strip']}],entities:[{entity:'light.a',fixture:'spot'},{entity:'light.b',fixture:'spot'},{entity:'light.p',fixture:'pendant'},{entity:'light.strip'}],objects:[{light_entity:'light.strip'}]}]});
test('room spots group without the pendant, accent or broad floor group',()=>{
  const c=config();assert.deepEqual(lightToggleIds(c,'floor','light.a'),['light.a','light.b']);assert.deepEqual(lightToggleIds(c,'floor','light.p'),['light.p']);assert.deepEqual(lightToggleIds(c,'floor','light.strip'),['light.strip']);
});
test('specific configured groups take precedence and stay floor-aware',()=>{
  const c=config();c.groups.push({name:'Pair',entities:['light.a','light.p']});assert.deepEqual(lightToggleIds(c,'floor','light.a'),['light.a','light.p']);assert.deepEqual(lightToggleIds(c,'missing','light.a'),['light.a']);
});

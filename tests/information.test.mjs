import test from 'node:test';
import assert from 'node:assert/strict';
import {informationRows,validateInformation} from '../src/information.js';
import {sceneEntities,sceneState} from '../src/ha-updates.js';
const state=(state,attributes={})=>({state,attributes});
test('information summaries distinguish unavailable devices, people away, updates and low batteries',()=>{
  const panel={items:[{type:'people'},{type:'updates'},{type:'low_battery'}]};
  const states={'person.a':state('home',{friendly_name:'Alex'}),'person.b':state('away'),'update.core':state('on'),'sensor.battery':state('12',{device_class:'battery'}),'sensor.missing':state('unavailable',{device_class:'battery'}),'sensor.empty':state('',{device_class:'battery'})};
  const rows=informationRows(panel,states);assert.equal(rows[0].value,'Alex');assert.equal(rows[1].value,'1 available');assert.equal(rows[2].value,'1 low');assert.match(rows[2].detail,/1 unavailable/);
  assert.equal(informationRows(panel,{})[0].value,'Unavailable');
  const config={information:panel},ids=sceneEntities(config);
  assert.notEqual(sceneState({states},ids),sceneState({states:{...states,'update.core':state('off')}},ids));
  assert.notEqual(sceneState({states},ids),sceneState({states:{...states,'person.c':state('home')}},ids));
});
test('weather, calendar and arbitrary measurements are safe structured readouts',()=>{
  const panel={items:[{type:'weather',entity:'weather.home'},{type:'calendar',entity:'calendar.home'},{type:'entity',entity:'sensor.power'}]};
  validateInformation(panel);
  const rows=informationRows(panel,{'weather.home':state('partly-cloudy',{temperature:18,temperature_unit:'°C'}),'calendar.home':state('off',{message:'Family dinner',start_time:'2026-09-12T18:00:00',end_time:'2026-09-12T19:00:00'}),'sensor.power':state('450',{unit_of_measurement:'W'})},new Date('2026-09-11T12:00:00'));
  assert.equal(rows[0].value,'18°C · partly cloudy');assert.equal(rows[1].value,'Family dinner');assert.equal(rows[2].value,'450 W');
  assert.throws(()=>validateInformation({items:[{type:'weather',entity:'sensor.invalid'}]}));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {informationRows,validateInformation} from '../src/information.js';
import {sceneEntities,sceneState} from '../src/ha-updates.js';
const state=(state,attributes={})=>({state,attributes});
test('automatic summaries suppress missing counts but explicit selections remain diagnostic',()=>{
  const states={'update.online':state('on'),'update.offline':state('unavailable')};
  const row=item=>informationRows({items:[{type:'updates',...item}]},states)[0];
  assert.doesNotMatch(row({}).detail,/unavailable/);
  assert.match(row({entities:Object.keys(states)}).detail,/1 unavailable/);
  assert.doesNotMatch(row({entities:Object.keys(states),show_unavailable:false}).detail,/unavailable/);
  assert.equal(row({entities:['update.offline']}).unavailable,true);
});
test('information presentation validates and survives row generation',()=>{
  const item={type:'entity',entity:'sensor.power',icon:'power',colour:'#abcdef',full_width:true,show_details:false};
  validateInformation({columns:3,items:[item]});
  const row=informationRows({items:[item]},{'sensor.power':state('12')})[0];
  assert.equal(row.colour,item.colour);assert.equal(row.icon,'power');assert.equal(row.fullWidth,true);assert.equal(row.showDetails,false);
  for(const patch of [{icon:'invalid'},{colour:'red;display:none'},{show_details:'false'}])assert.throws(()=>validateInformation({items:[{...item,...patch}]}));
  assert.throws(()=>validateInformation({columns:4,items:[]}));
});
test('information summaries distinguish unavailable devices, people away, updates and low batteries',()=>{
  const panel={items:[{type:'people'},{type:'updates'},{type:'low_battery',show_unavailable:true}]};
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

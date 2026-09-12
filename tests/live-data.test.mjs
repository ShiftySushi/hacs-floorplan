import {test} from 'node:test';
import assert from 'node:assert/strict';
import {roomEnvironment,energySummary,radiatorEntity,validateLiveFields,doorState,doorDescription} from '../src/live-data.js';
import {heatingState} from '../src/heating.js';
import {informationRows} from '../src/information.js';
import {sceneEntities} from '../src/ha-updates.js';
import {calendarEvents,refreshCalendars} from '../src/calendar-data.js';
import {furniture3D} from '../src/furniture3d.js';
import {updatePrinter3D} from '../src/printers3d.js';
const s=(state,attributes={})=>({state:String(state),attributes});
test('door descriptions distinguish contact availability from lock state',()=>{
  const door={contact_entity:'binary_sensor.door',lock_entity:'lock.door'};
  assert.equal(doorDescription(door,{'lock.door':s('locked')}),'Contact unavailable · Locked');
  assert.equal(doorDescription(door,{'binary_sensor.door':s('off'),'lock.door':s('unlocked')}),'Closed · Unlocked');
  assert.equal(doorDescription({lock_entity:'lock.door'},{'lock.door':s('locked')}),'Locked');
});
test('calendar feed URLs never appear in event metadata or refresh failures',()=>{
  for(const name of ['Webcal://example.test/feed.ics','https://example.test/events','example.test/feed.ics']){
    const result=calendarEvents({entities:['calendar.racing']},{'calendar.racing':s('off',{friendly_name:name})},{'calendar.racing':{error:true,events:[{summary:'Qualifying',start:{date:'2026-09-12'},end:{date:'2026-09-13'}}]}},new Date('2026-09-11'));
    assert.equal(result.events[0].source,'');assert.equal(result.events[0].time,'All day');assert.doesNotMatch(result.events[0].detail,/example|webcal|ics/i);assert.deepEqual(result.failures,['Calendar']);
  }
});
test('information energy uses device rows and update names remove only trailing suffixes',()=>{
  const rows=informationRows({items:[{type:'energy',energy:[{label:'Router',power_entity:'sensor.missing'}]},{type:'updates'}]},{'update.core':s('on',{friendly_name:'Core Update'}),'update.tool':s('on',{friendly_name:'Update Manager'})});
  assert.equal(rows[0].value,'Readings unavailable');assert.equal(rows[0].energyRows[0].label,'Router');assert.doesNotMatch(rows[0].detail,/Router/);assert.equal(rows[1].detail,'Core, Update Manager');
});
test('room environment treats unavailable readings as unknown and uses configurable warning levels',()=>{
  const room={humidity_entity:'sensor.h',pm25_entity:'sensor.p',voc_entity:'sensor.v'};
  assert.deepEqual(roomEnvironment(room,{'sensor.h':s(52),'sensor.p':s('unavailable'),'sensor.v':s(151)}),{humidity:'52%',pm25:null,voc:151,warning:true});
  assert.equal(roomEnvironment({...room,voc_warning:200},{'sensor.v':s(151)}).warning,false);
});
test('battery summary never rescans devices and still watches the configured summary',()=>{
  const item={type:'low_battery',count_entity:'sensor.count',names_entity:'sensor.names'},config={information:{items:[item]}};
  const row=informationRows(config.information,{'sensor.count':s(0),'sensor.names':s(''),'sensor.low':s(2,{device_class:'battery'})})[0];
  assert.equal(row.value,'0 low');assert.equal(row.detail,'');assert.ok(!sceneEntities(config).has('@low_battery'));assert.ok(sceneEntities(config).has('sensor.names'));
  assert.equal(informationRows(config.information,{'sensor.count':s('unavailable'),'sensor.names':s('Lamp')})[0].value,'Unavailable');
});
test('room demand is an explicit radiator proxy and numeric zero is idle',()=>{
  const floor={rooms:[{id:'room',points:[[0,0],[100,0],[100,100],[0,100]],heating_demand_entity:'sensor.demand'}]};
  assert.equal(radiatorEntity({x:50,y:50,heating_entity:'climate.old'},floor),'sensor.demand');
  assert.equal(heatingState(s(0)),'idle');assert.equal(heatingState(s(10)),'heating');assert.equal(heatingState(s('unavailable')),'unknown');
  assert.equal(doorState({contact_entity:'binary_sensor.d'},{'binary_sensor.d':s('on')}),'Open');
});
test('plug totals convert W/kW and Wh/kWh and flag incomplete readings',()=>{
  const items=[{label:'A',power_entity:'sensor.p',energy_entity:'sensor.e'},{label:'Unbound',power_entity:'',energy_entity:''}];
  const summary=energySummary(items,{'sensor.p':s(.5,{unit_of_measurement:'kW'}),'sensor.e':s(1200,{unit_of_measurement:'Wh'})});assert.equal(summary.power,'500 W');assert.equal(summary.energy,'1.20 kWh');assert.equal(summary.partial,true);assert.doesNotThrow(()=>validateLiveFields({energy:items}));
  assert.throws(()=>validateLiveFields({camera_entity:'sensor.invalid'}));
});
test('calendar merge sorts overlapping events from every source and excludes ended events',()=>{
  const now=new Date('2026-09-11T12:00:00Z'),item={entities:['calendar.a','calendar.b']};
  const cache={'calendar.a':{events:[{summary:'Later',start:{dateTime:'2026-09-11T15:00:00Z'},end:{dateTime:'2026-09-11T16:00:00Z'}}]},'calendar.b':{events:[{summary:'Earlier',start:{dateTime:'2026-09-11T13:00:00Z'},end:{dateTime:'2026-09-11T16:00:00Z'}},{summary:'Ended',start:{date:'2026-09-10'},end:{date:'2026-09-11'}}]}};
  assert.deepEqual(calendarEvents(item,{},cache,now).events.map(e=>e.title),['Earlier','Later']);assert.match(calendarEvents(item,{},cache,now).events[0].detail,/calendar.b/);
});
test('calendar fetching is cached, preserves failure context and rejects stale configuration responses',async()=>{
  let resolve,requests=0;const host={isConnected:true,config:{information:{items:[{type:'calendar',entities:['calendar.a']}]}},_hass:{callApi:()=>{requests++;return new Promise(r=>resolve=r);}},render(){}};
  const pending=refreshCalendars(host);await refreshCalendars(host);assert.equal(requests,1);host.calendarGeneration++;resolve([]);await pending;assert.equal(host.calendarCache,undefined);
  host.calendarRequestedAt=0;host._hass.callApi=async()=>{throw Error('offline');};await refreshCalendars(host);assert.equal(host.calendarCache['calendar.a'].error,true);
});
test('printer moves its nozzle only while printing and exposes an error indicator',()=>{
  const object={type:'printer_3d',variant:'toolchanger',width:.5,height:.6,depth:.5,status_entity:'sensor.printer'},model=furniture3D(object);
  let head,indicator;model.traverse(n=>{if(n.userData.printerPart==='toolhead')head=n;if(n.userData.printerIndicator)indicator=n;});
  const rest=head.position.clone();assert.equal(updatePrinter3D(model,object,{'sensor.printer':s('printing')},500),true);assert.notDeepEqual(head.position,rest);
  updatePrinter3D(model,object,{'sensor.printer':s('printing')},1000,true);assert.deepEqual(head.position,rest);
  assert.equal(updatePrinter3D(model,object,{'sensor.printer':s('error')},1500),false);assert.equal(model.userData.printerStatus,'error');assert.equal(indicator.material.emissiveIntensity,2);
});

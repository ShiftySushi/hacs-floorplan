import {test} from 'node:test';
import assert from 'node:assert/strict';
import {historyPoints,historyKey,refreshInformationHistory,resetInformationHistory,numericValue} from '../src/information-history.js';
import {validateInformation,informationRows} from '../src/information.js';
import {normaliseConfig} from '../src/lights.js';
const state=(state,attributes={})=>({state,attributes});
test('all entity domains, attributes and layout settings survive normalisation',()=>{
  const information={title:'My home',position:'bottom-right',width:640,max_height:60,columns:4,density:'comfortable',items:[{type:'heading',label:'Comfort'},{type:'entity',entity:'climate.office',attribute:'current_temperature',unit:'°C',precision:1,display:'line',history_hours:6,graph_height:180,column_span:3,min_height:150,text_size:'large',align:'right'}]};
  const config=normaliseConfig({floors:[],groups:[],information});assert.deepEqual(normaliseConfig(JSON.parse(JSON.stringify(config))).information,information);
  const rows=informationRows(information,{'climate.office':state('heat',{current_temperature:20.25})});assert.equal(rows[1].value,'20.3 °C');assert.equal(rows[0].value,'');
  for(const patch of [{column_span:5},{width:100},{min_height:-1},{graph_height:301},{precision:4},{history_hours:0},{min:10,max:5},{attribute:{}},{display:'html'}]){
    const panel=structuredClone(information);if('width' in patch)Object.assign(panel,patch);else Object.assign(panel.items[1],patch);assert.throws(()=>validateInformation(panel));
  }
  assert.doesNotThrow(()=>validateInformation({items:Array.from({length:48},()=>({type:'entity',entity:'switch.example'}))}));
});
test('numeric history retains zero, gaps, boundaries and attribute timestamps',()=>{
  assert.equal(numericValue(''),null);assert.equal(numericValue(false),null);assert.equal(numericValue('0'),0);
  const item={attribute:'temperature'},record=(time,value,stateValue='on')=>({last_changed:new Date(0).toISOString(),last_updated:new Date(time).toISOString(),state:stateValue,attributes:{temperature:value}});
  assert.deepEqual(historyPoints([record(5,2),record(20,0),record(30,4,'unavailable'),record(40,8),record(90,9)],item,10,50),[{time:10,value:2},{time:20,value:0},{time:30,value:null},{time:40,value:8}]);
  const long=Array.from({length:5000},(_,i)=>({last_changed:new Date(i).toISOString(),state:i===2500?'unavailable':String(i===1234?10000:i%10)}));
  const points=historyPoints(long,{},0,5000);assert.ok(points.length<=600);assert.ok(points.some(p=>p.value===10000));assert.ok(points.some(p=>p.value===null));
});
test('history requests are scoped, deduplicated, cached and stale-safe',async()=>{
  const item={type:'entity',entity:'sensor.power',display:'line',history_hours:6},requests=[];let resolve;
  const host={isConnected:true,config:{information:{items:[item,{...item,display:'bar'}]}},_hass:{callApi:(method,path)=>{requests.push(path);return new Promise(r=>resolve=r);}},render(){}};
  const pending=refreshInformationHistory(host);await refreshInformationHistory(host);assert.equal(requests.length,1);assert.match(requests[0],/filter_entity_id=sensor.power/);assert.match(requests[0],/no_attributes/);
  resetInformationHistory(host);resolve([[{state:'5',last_changed:new Date().toISOString()}]]);await pending;assert.deepEqual(host.informationHistory,{});
  host._hass.callApi=async()=>[];await refreshInformationHistory(host);assert.deepEqual(host.informationHistory[historyKey(item)].points,[]);
  host.informationHistory[historyKey(item)].requestedAt=0;host._hass.callApi=async()=>{throw Error('offline');};await refreshInformationHistory(host);assert.equal(host.informationHistory[historyKey(item)].error,true);
  resetInformationHistory(host);host.config.information.items=[{...item,attribute:'temperature'}];host._hass.callApi=async(method,path)=>{assert.doesNotMatch(path,/no_attributes|minimal_response/);return [];};await refreshInformationHistory(host);
});

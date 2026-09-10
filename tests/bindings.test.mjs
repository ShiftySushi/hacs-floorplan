import test from 'node:test';
import assert from 'node:assert/strict';
import { reassignEntity } from '../src/bindings.js';
import { EditorHistory } from '../src/editor-history.js';

const fixture = () => ({floors:[
  {id:'lower',entities:[{entity:'light.placeholder',x:20,y:40,name:'Ceiling',fixture:'pendant'}],rooms:[{lights:['light.placeholder','light.actual'],presence:['binary_sensor.placeholder']}]},
  {id:'upper',entities:[{entity:'light.placeholder',x:80,y:60}],rooms:[{lights:['light.placeholder'],presence:[]}]},
],groups:[{name:'Selected lights',entities:['light.placeholder','light.actual']}]});

test('reassignment preserves placement and updates all references as one undoable change',()=>{
  const original=fixture(),snapshot=structuredClone(original),history=new EditorHistory(original);
  const result=reassignEntity(original,'light.placeholder','light.actual');history.commit(result);
  assert.deepEqual(original,snapshot);
  assert.deepEqual(result.floors[0].entities[0],{entity:'light.actual',x:20,y:40,name:'Ceiling',fixture:'pendant'});
  assert.deepEqual(result.floors[1].entities[0],{entity:'light.actual',x:80,y:60});
  assert.deepEqual(result.floors.map(f=>f.rooms[0].lights),[['light.actual'],['light.actual']]);
  assert.deepEqual(result.groups[0].entities,['light.actual']);
  assert.deepEqual(history.undo(),snapshot);assert.deepEqual(history.redo(),result);
});

test('duplicate marker on any affected floor rejects the entire reassignment',()=>{
  const original=fixture();original.floors[1].entities.push({entity:'light.actual',x:50,y:50});
  const snapshot=structuredClone(original);
  assert.throws(()=>reassignEntity(original,'light.placeholder','light.actual'),/already has a marker/);
  assert.deepEqual(original,snapshot);
  assert.throws(()=>reassignEntity(original,'light.placeholder','sensor.actual'),/same type/);
  assert.deepEqual(original,snapshot);
});

test('presence reassignment keeps occupancy bindings and marker position',()=>{
  const original=fixture();original.floors[0].entities.push({entity:'binary_sensor.placeholder',x:30,y:30});
  const result=reassignEntity(original,'binary_sensor.placeholder','binary_sensor.actual');
  assert.deepEqual(result.floors[0].rooms[0].presence,['binary_sensor.actual']);
  assert.deepEqual(result.floors[0].entities[1],{entity:'binary_sensor.actual',x:30,y:30});
  assert.deepEqual(result.groups,original.groups);
});

test('connecting a draft element clears its draft state and preserves room and group references',()=>{
  const config=fixture();config.floors[0].entities[0].unbound=true;
  const result=reassignEntity(config,'light.placeholder','light.actual');
  assert.equal(result.floors[0].entities[0].unbound,undefined);
  assert.equal(config.floors[0].entities[0].unbound,true);
  assert.deepEqual(result.groups[0].entities,['light.actual']);
  const temperature={floors:[{entities:[{entity:'sensor.draft',unbound:true,x:10,y:20}],rooms:[{temperature_entity:'sensor.draft'}]}],groups:[],outdoor_temperature_entity:'sensor.draft'};
  const connected=reassignEntity(temperature,'sensor.draft','sensor.actual');
  assert.equal(connected.floors[0].rooms[0].temperature_entity,'sensor.actual');
  assert.equal(connected.outdoor_temperature_entity,'sensor.actual');
  assert.deepEqual(connected.floors[0].entities[0],{entity:'sensor.actual',x:10,y:20});
});

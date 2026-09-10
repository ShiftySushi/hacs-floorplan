import {test} from 'node:test';
import assert from 'node:assert/strict';
import {daylightLevel,stageColour} from '../src/daylight.js';
test('sun elevation drives night, twilight and day independently of local clock',()=>{
  const level=e=>daylightLevel({'sun.sun':{state:'above_horizon',attributes:{elevation:e}}});
  assert.equal(level(-10),0);assert.equal(level(40),1);assert.ok(level(0)>0&&level(0)<1);
  assert.equal(daylightLevel({},new Date(2026,0,1,0)),0);
  assert.equal(daylightLevel({},new Date(2026,0,1,12)),1);
  assert.equal(daylightLevel({'sun.sun':{state:'unavailable',attributes:{elevation:50}}},new Date(2026,0,1,0)),0);
});
test('cloud cover reduces daylight and styles retain distinct day and night palettes',()=>{
  const sun={'sun.sun':{state:'above_horizon',attributes:{elevation:30}}};
  assert.equal(daylightLevel({...sun,'weather.home':{state:'cloudy',attributes:{cloud_coverage:100}}}),.65);
  assert.notEqual(stageColour('pokemon',1),stageColour('zelda',1));
  assert.notEqual(stageColour('clean',1),stageColour('clean',0));
});

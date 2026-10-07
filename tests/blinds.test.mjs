import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {blindTransmission} from '../src/wall-occlusion3d.js';
test('daylight is weighted by glazed area, including windows without blinds',()=>{
  assert.equal(blindTransmission([{area:1,value:0}]),1);
  assert.ok(Math.abs(blindTransmission([{area:1,value:1}])-.08)<1e-9);
  assert.ok(Math.abs(blindTransmission([{area:1,value:1},{area:3,value:0}])-.77)<1e-9);
  assert.equal(blindTransmission([]),0);
  assert.equal(blindTransmission(undefined),1);
});

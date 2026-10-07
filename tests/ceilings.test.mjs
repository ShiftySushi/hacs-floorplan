import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {normaliseScene} from '../src/scene.js';

const slope=()=>({id:'slope',vertices:[[0,0,1],[30,0,2.4],[30,100,2.4],[0,100,1]]});
test('invalid slope coordinates and degenerate surfaces fail validation',()=>{
  for(const vertices of [[],[[0,0,1],[101,0,2],[30,100,2],[0,100,1]],[[0,0,-1],[30,0,2],[30,100,2],[0,100,1]],[[0,0,1],[0,10,2],[0,20,2],[0,30,1]]])assert.throws(()=>normaliseScene({floors:[{ceiling_slopes:[{id:'bad',vertices}]}]}),/Ceiling/);
});
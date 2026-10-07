import test from 'node:test';
import assert from 'node:assert/strict';
import {createFade,createGlide,FADE_MS} from '../src/diorama-live.js';

const off={level:0,colour:[255,231,190]},warm={level:1,colour:[255,200,120]},blue={level:.5,colour:[0,0,255]};

test('the first reading shows at once and a change eases over the fade time',()=>{
  const fade=createFade();
  assert.deepEqual(fade(off,1000),{level:0,colour:off.colour});
  // Switching on: nothing yet, half way at the midpoint, settled at the end and after.
  assert.equal(fade(warm,2000).level,0);
  assert.equal(fade(warm,2000+FADE_MS/2).level,.5);
  assert.deepEqual(fade(warm,2000+FADE_MS).colour,warm.colour);assert.equal(fade(warm,9000).level,1);
  // A light coming on takes its own colour from the start rather than fading from the off tint.
  const next=createFade();next(off,0);next(warm,10);assert.deepEqual(next(warm,100).colour,warm.colour);
});

test('a change part-way through a fade starts from what is showing',()=>{
  const fade=createFade();fade(off,0);fade(warm,0);
  const half=fade(warm,FADE_MS/2);assert.equal(half.level,.5);
  assert.equal(fade(blue,FADE_MS/2).level,.5);
  const settled=fade(blue,FADE_MS*2);assert.equal(settled.level,.5);assert.deepEqual(settled.colour,blue.colour);
});

test('reduced motion shows every change immediately',()=>{
  const fade=createFade();fade(off,0,true);
  assert.equal(fade(warm,1,true).level,1);assert.equal(fade(off,2,true).level,0);
});

test('a glide eases one value and can be redirected mid-way',()=>{
  const glide=createGlide(.62);
  assert.equal(glide(.62,0),.62);
  assert.equal(glide(0,100),.62);
  assert.ok(Math.abs(glide(0,100+FADE_MS/2)-.31)<1e-9);
  assert.equal(glide(0,100+FADE_MS),0);
  glide(1,5000);const part=glide(1,5000+FADE_MS/2);assert.ok(Math.abs(part-.5)<1e-9);
  assert.ok(Math.abs(glide(0,5000+FADE_MS/2)-.5)<1e-9);
  assert.equal(glide(1,9000,true),1);
});

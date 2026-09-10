import test from 'node:test';
import assert from 'node:assert/strict';
import {tvSceneIndex,tvSlideshow,tvIsOn} from '../src/tv-animation.js';
import {normaliseScene} from '../src/scene.js';

test('six TV stills change every five minutes and survive a scene round trip',()=>{
  assert.equal(tvSceneIndex(299999,6),0);
  for(let i=0;i<12;i++)assert.equal(tvSceneIndex(i*300000,6),i%6);
  assert.equal(tvIsOn({state:'off'}),false);assert.equal(tvIsOn({state:'playing'}),true);
  const tv={id:'tv',type:'tv',x:50,y:50,media_entity:'media_player.tv',tv_scenes:Array.from({length:6},(_,i)=>({title:`Scene ${i}`,image:`/local/scene-${i}.jpg`}))};
  const scene=normaliseScene({floors:[{id:'room',objects:[tv]}]});
  assert.deepEqual(normaliseScene(JSON.parse(JSON.stringify(scene))).floors[0].objects[0].tv_scenes,tv.tv_scenes);
  assert.throws(()=>normaliseScene({floors:[{id:'room',objects:[{...tv,tv_scenes:[{image:'javascript:bad'}]}]}]}));
});

test('still selection letterboxes without stretching and ignores late loads after disposal',()=>{
  const original=globalThis.Image,images=[];let changes=0,draw;
  globalThis.Image=class {constructor(){this.naturalWidth=800;this.naturalHeight=400;images.push(this);}};
  try{
    const slides=tvSlideshow([{image:'/local/one.jpg'},{image:'/local/two.jpg'}],()=>changes++);
    const ctx={fillRect(){},drawImage(...args){draw=args;}};
    slides.draw(ctx,960,540,299999);assert.deepEqual(draw,[images[0],0,30,960,480]);
    slides.draw(ctx,960,540,300000);assert.equal(draw[0],images[1]);
    const loaded=images[0].onload;loaded();assert.equal(changes,1);slides.dispose();loaded();assert.equal(changes,1);
  }finally{globalThis.Image=original;}
});

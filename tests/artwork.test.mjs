import test from 'node:test';
import assert from 'node:assert/strict';
import {artworkURL,safeArtwork} from '../src/artwork3d.js';
import {normaliseScene} from '../src/scene.js';
import {imageReferences} from '../src/image-references.js';
test('HA artwork uses entity_picture with a portable fallback',()=>{
  const object={id:'art',type:'picture',x:50,y:50,width:.734,height:.4724,depth:.0355,elevation_m:1.3,media_entity:'media_player.canvas',artwork_image:'/local/wave.jpg',artwork_portrait_image:'/local/portrait.jpg'};
  assert.equal(artworkURL(object,{}),object.artwork_image);
  assert.equal(artworkURL(object,{'media_player.canvas':{attributes:{entity_picture:'/api/media_player_proxy/media_player.canvas?token=example'}}}),'/api/media_player_proxy/media_player.canvas?token=example');
  for(const url of ['javascript:alert(1)','//untrusted.invalid/a','file:///a'])assert.equal(safeArtwork(url),'');
  const scene=normaliseScene({floors:[{id:'art',objects:[object]}]});assert.deepEqual(normaliseScene(JSON.parse(JSON.stringify(scene))),scene);
  assert.throws(()=>normaliseScene({floors:[{id:'art',objects:[{...object,artwork_image:'javascript:bad'}]}]}));
  assert.throws(()=>normaliseScene({floors:[{id:'art',objects:[{...object,artwork_portrait_image:'javascript:bad'}]}]}));
  assert.ok(imageReferences(scene).some(([o,key])=>key==='artwork_portrait_image'&&o[key]===object.artwork_portrait_image));
});

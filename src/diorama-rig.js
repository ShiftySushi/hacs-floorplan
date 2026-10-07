import * as THREE from 'three';
import {createGlide} from './diorama-live.js';

export const STAGE='#15161a',DAY_STAGE='#4b5d72';
const clamp=value=>Math.max(0,Math.min(1,value||0));
/** Stage colour behind the drawing for a daylight level from 0 (evening) to 1 (full day). */
export const stageShade=(daylight=0)=>'#'+new THREE.Color(STAGE).lerp(new THREE.Color(DAY_STAGE),clamp(daylight)).getHexString();

/**
 * The illustrated views' shared lighting. Evening is the resting look: cool and never
 * black, so warm lamps have something to push against. Daylight is one grade between
 * the two looks rather than a second rig; the same key light is the moon and the sun.
 * `towards` is the horizontal unit vector pointing at the camera. `gain` scales every
 * light, for scenes whose materials answer the same rig more dimly.
 */
export function createRig(scene,towards,daylight=0,gain=1){
  const sky=new THREE.HemisphereLight('#8793c8','#54413a',.92),key=new THREE.DirectionalLight('#8da2dc',.3),fill=new THREE.DirectionalLight('#d8c2ad',.7);
  key.position.copy(towards).multiplyScalar(4).add(new THREE.Vector3(-towards.z*3,7,towards.x*3));
  // A soft fill from the viewer keeps the backs of foreground furniture readable.
  fill.position.copy(towards).multiplyScalar(5).setY(3.2);scene.add(sky,key,fill);
  // Ghosted fittings and cut-out leaves are drawn on the overlay layer and need the same light.
  for(const light of [sky,key,fill])light.layers.enable(1);
  const pairs={sky:['#8793c8','#e4ecff'],ground:['#54413a','#b7a68f'],key:['#8da2dc','#fff0d2'],stage:[STAGE,DAY_STAGE],horizon:['#1c1e25','#667e96']},glide=createGlide(clamp(daylight),2500),colour=new THREE.Color();
  for(const pair of Object.values(pairs))pair.splice(0,2,new THREE.Color(pair[0]),new THREE.Color(pair[1]));
  let shown=-1,stage=STAGE,horizon=STAGE;
  /**
   * Ease towards `level`; returns the level showing, the sky's `stage` and `horizon` colours
   * and whether it has settled. The horizon stays dark enough for light overlay text.
   */
  function grade(level,now,instant=false){
    const target=clamp(level),day=glide(target,now,instant);
    if(day!==shown){
      shown=day;sky.color.lerpColors(...pairs.sky,day);sky.groundColor.lerpColors(...pairs.ground,day);sky.intensity=(.92+.5*day)*gain;
      key.color.lerpColors(...pairs.key,day);key.intensity=(.3+.8*day)*gain;fill.intensity=(.7-.2*day)*gain;stage='#'+colour.lerpColors(...pairs.stage,day).getHexString();horizon='#'+colour.lerpColors(...pairs.horizon,day).getHexString();
    }
    return {day,stage,horizon,settled:day===target};
  }
  return {grade};
}

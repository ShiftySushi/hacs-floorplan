import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {wardrobeDoors} from '../src/wardrobe-doors3d.js';
import {normaliseScene} from '../src/scene.js';

test('built-in door fronts sit outside the selected wall face with distinct mirror finishes',()=>{
  for(const finish of ['plain','mirror'])for(const side of [-1,1]){
    const parent=new THREE.Group(),wall={height:2.4,thickness:.6,wardrobe_doors:{finish,side,count:4}};
    const meshes=wardrobeDoors(parent,wall,2.4);parent.updateMatrixWorld();
    for(const mesh of meshes){const box=new THREE.Box3().setFromObject(mesh);assert.ok(side===1?box.min.z>.3:box.max.z<-.3);assert.ok(box.min.x>=0&&box.max.x<=2.4);}
    assert.equal(meshes.some(mesh=>mesh.material.metalness>.4&&mesh.material.roughness<.1),finish==='mirror');
  }
});
test('door and blind options survive scene export; invalid options fail',()=>{
  const wall={id:'wall',a:[0,0],b:[100,0],wardrobe_doors:{finish:'mirror',side:-1,count:4},openings:[{id:'window',type:'window',offset:.5,width:1,blinds:false}]};
  const scene=normaliseScene({floors:[{width_m:5,depth_m:5,walls:[wall]}]});assert.deepEqual(normaliseScene(JSON.parse(JSON.stringify(scene))),scene);
  for(const front of [{finish:'glass',side:1,count:4},{finish:'mirror',side:0,count:4},{finish:'plain',side:1,count:0}])assert.throws(()=>normaliseScene({floors:[{walls:[{...wall,wardrobe_doors:front}]}]}),/Wardrobe/);
});

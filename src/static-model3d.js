import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Batch fixed parts inside one item. Interactive and animated items keep their
// meshes, material identities and picking metadata intact.
export function batchStaticModel(model){
  model.updateMatrixWorld(true);
  const inverse=model.matrixWorld.clone().invert(),batches=new Map();
  model.traverse(node=>{
    if(!node.isMesh||node.isInstancedMesh||Array.isArray(node.material)||!node.visible)return;
    const key=[node.material.uuid,node.castShadow,node.receiveShadow,!!node.geometry.index,Object.keys(node.geometry.attributes).sort().join(',')].join(':');
    if(!batches.has(key))batches.set(key,[]);batches.get(key).push(node);
  });
  const removed=new Set();
  for(const nodes of batches.values()){
    if(nodes.length<2)continue;
    const copies=nodes.map(node=>node.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,node.matrixWorld)));
    const geometry=mergeGeometries(copies,false);copies.forEach(g=>g.dispose());if(!geometry)continue;
    const mesh=new THREE.Mesh(geometry,nodes[0].material);mesh.castShadow=nodes[0].castShadow;mesh.receiveShadow=nodes[0].receiveShadow;
    for(const node of nodes){removed.add(node.geometry);node.removeFromParent();}model.add(mesh);
  }
  model.traverse(node=>removed.delete(node.geometry));removed.forEach(g=>g.dispose());return model;
}

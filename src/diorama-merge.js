import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Collapse a storey's static meshes into one mesh per material. A furnished
 * house is thousands of small boxes; drawn singly, twice a frame for the ink
 * pass, they cost far more than their triangles do.
 */
export function consolidate(root){
  root.updateMatrixWorld(true);
  const inverse=root.matrixWorld.clone().invert(),groups=new Map(),remove=[];
  (function visit(node){
    if(node.userData.animate)return;
    if(node.isMesh&&!node.isInstancedMesh&&!Array.isArray(node.material)&&node.layers.mask===1&&node.visible&&!node.userData.tvScreen){
      const geometry=(node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,node.matrixWorld));
      for(const name of Object.keys(geometry.attributes))if(!['position','normal','uv'].includes(name))geometry.deleteAttribute(name);
      if(geometry.attributes.normal&&geometry.attributes.uv){if(!groups.has(node.material))groups.set(node.material,[]);groups.get(node.material).push(geometry);remove.push(node);}
    }
    for(const child of node.children)visit(child);
  })(root);
  for(const node of remove){node.geometry.dispose();node.removeFromParent();}
  for(const [material,geometries] of groups){
    const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
    for(const geometry of geometries)geometry.dispose();
  }
}

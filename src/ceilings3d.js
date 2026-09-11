import * as THREE from 'three';

// Floor-local percentages and heights in metres, retained in portable scenes.
export function ceilingMeshes(floor, position) {
  return (floor.ceiling_slopes || []).map(slope => {
    const vertices=slope.vertices.map(([x,y,height])=>position([x,y],height));
    const geometry=new THREE.BufferGeometry().setFromPoints(vertices);
    geometry.setIndex(Array.from({length:Math.max(0,vertices.length-2)},(_,i)=>[0,i+1,i+2]).flat());geometry.computeVertexNormals();
    const rooflight=slope.type==='rooflight';
    const material=new THREE.MeshStandardMaterial({color:rooflight?'#afcbd5':'#ece8dc',roughness:rooflight?.15:.95,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name=slope.id;mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.userData.ceiling=true;
    // Keep the real vertices local to the mesh so cutaway uses its centre.
    geometry.computeBoundingBox();const centre=geometry.boundingBox.getCenter(new THREE.Vector3());
    geometry.translate(-centre.x,-centre.y,-centre.z);mesh.position.copy(centre);
    if(rooflight){mesh.castShadow=false;const frame=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:'#f5f4ed'}));mesh.add(frame);mesh.userData.rooflight=true;}
    return mesh;
  });
}

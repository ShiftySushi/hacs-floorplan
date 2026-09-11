import * as THREE from 'three';

// Deterministic, metre-scaled textures keep exported scenes self-contained.
export function exteriorTexture(finish){
  const size=128,data=new Uint8Array(size*size*4);let seed=731;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const noise=random(),i=(y*size+x)*4;let v=190+noise*55,alpha=255;
    if(finish==='grass')v=145+noise*95+12*Math.sin(x*.13)*Math.cos(y*.09);
    if(finish==='asphalt')v=145+noise*80;
    if(finish==='paving')v=x%64<2||y%64<2?130:210+noise*35;
    if(finish==='brick'){const row=Math.floor(y/16),mortar=y%16<2||(x+(row%2)*32)%64<2;v=mortar?245:155+noise*65+15*Math.sin(Math.floor((x+row%2*32)/64)*12+row*7);}
    if(finish==='leaf'){
      const nx=(x-63.5)/60,ny=(y-63.5)/62;
      alpha=Math.abs(nx)<.65*Math.sin(Math.PI*(ny+1)/2)*(1-.2*Math.abs(ny))?255:0;
      v=155+noise*65+(Math.abs(nx)<.025||Math.abs((ny+nx*1.6)% .24)<.012?40:0);
    }
    data.set([v,v,v,alpha],i);
  }
  if(finish==='grass')for(let i=0;i<2800;i++){
    const x=Math.floor(random()*size),y=Math.floor(random()*size),length=2+Math.floor(random()*5),shade=130+random()*120;
    for(let j=0;j<length;j++){const px=(x+Math.floor(j*.35))%size,py=(y+j)%size;data.set([shade,shade,shade,255],(py*size+px)*4);}
  }
  const texture=new THREE.DataTexture(data,size,size);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}

export function plantedShrub(item,material){
  const group=new THREE.Group(),leaves=new THREE.InstancedMesh(new THREE.PlaneGeometry(.11,.19),material,180),matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
  for(let i=0;i<180;i++){
    const a=i*2.399963,r=Math.sqrt((i+.5)/180),y=1-2*(i+.5)/180,ring=Math.sqrt(1-y*y);
    const position=new THREE.Vector3(Math.cos(a)*ring*item.width*.5,item.height*(.52+y*.44),Math.sin(a)*ring*item.depth*.5);
    q.setFromEuler(new THREE.Euler(Math.sin(i*3)*1.1,a,Math.cos(i)*.6));matrix.compose(position,q,new THREE.Vector3(.7+r,.7+r,1));leaves.setMatrixAt(i,matrix);
  }
  leaves.castShadow=true;leaves.receiveShadow=true;group.add(leaves);return group;
}

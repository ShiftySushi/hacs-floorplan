import {CanvasTexture,SRGBColorSpace} from 'three';

export const safeArtwork=url=>typeof url==='string'&&/^(\/(?!\/)|https?:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(url)?url:'';
export function artworkURL(object,states){return safeArtwork(states[object.media_entity]?.attributes?.entity_picture)||safeArtwork(object.artwork_image);}

export function artwork3D(object,model,view,key,changed){
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d'),texture=new CanvasTexture(canvas);
  texture.colorSpace=SRGBColorSpace;
  model.traverse(n=>{if(n.userData.artwork){n.material.map=texture;n.material.color.set('#ffffff');}});
  const scale=model.scale.clone(),base=model.position.y;
  let current,loaded,serial=0,disposed=false,lastStates={};
  function paint(){
    const portrait=!!view.portraits?.[key],w=portrait?object.height:object.width,h=portrait?object.width:object.height;
    model.scale.set(scale.x*w/object.width,scale.y*h/object.height,scale.z);model.position.y=base+(object.height-h)/2;
    canvas.width=canvas.height=512;context.fillStyle='#f3efe3';context.fillRect(0,0,512,512);
    if(loaded){const ratio=Math.min(w/loaded.width,h/loaded.height),iw=loaded.width*ratio/w*512,ih=loaded.height*ratio/h*512;context.drawImage(loaded,(512-iw)/2,(512-ih)/2,iw,ih);}
    texture.needsUpdate=true;
  }
  function update(states){
    lastStates=states;
    const portrait=view.portraits?.[key]?object.width>object.height:object.height>object.width;
    const fallback=safeArtwork(portrait?object.artwork_portrait_image:object.artwork_image);
    const url=(object.artwork_portrait_image&&fallback)||artworkURL(object,states);if(url===current)return;current=url;const request=++serial;
    loaded=null;paint();
    if(!url){loaded=null;paint();return;}
    const load=(src,fallback)=>{const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{if(disposed||request!==serial)return;loaded=image;paint();changed();};image.onerror=()=>{if(disposed||request!==serial)return;if(fallback&&fallback!==src)load(fallback,'');else{loaded=null;paint();changed();}};image.src=src;};
    load(url,fallback||safeArtwork(object.artwork_image));
  }
  paint();
  return {model,update,toggle(){view.portraits ??={};view.portraits[key]=!view.portraits[key];paint();update(lastStates);changed();},dispose(){disposed=true;serial++;texture.dispose();}};
}

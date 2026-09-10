import {imageReferences} from './image-references.js';
// Portable files carry their artwork; HA dashboard messages should carry only URLs.
export async function prepareImportedConfig(config, hass) {
  const result=structuredClone(config);
  if(!hass?.fetchWithAuth)return result;
  const cache=new Map();
  for(const [container,key] of imageReferences(result)){
    const url=container[key];if(!url?.startsWith('data:image/'))continue;
    if(!cache.has(url)){
      let blob=await (await fetch(url)).blob();
      if(blob.size>8*1024*1024)throw Error('An embedded image exceeds 8 MB. Export smaller artwork and try again.');
      if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(blob.type))throw Error('An embedded image has an unsupported format.');
      // HA image storage accepts PNG/JPEG, but not SVG or WebP.
      if(!['image/png','image/jpeg'].includes(blob.type))blob=await asPNG(blob);
      const body=new FormData();body.append('file',blob,blob.type==='image/jpeg'?'floorplan.jpg':'floorplan.png');
      const response=await hass.fetchWithAuth('/api/image/upload',{method:'POST',body});
      if(!response.ok)throw Error('Home Assistant could not store imported artwork. Check your connection and image-upload permissions, then retry.');
      const image=await response.json();if(!image.id||typeof image.id!=='string')throw Error('Home Assistant did not return an image ID.');
      cache.set(url,`/api/image/serve/${encodeURIComponent(image.id)}/original`);
    }
    container[key]=cache.get(url);
  }
  // Leave space for the surrounding dashboard and websocket message.
  if(new Blob([JSON.stringify(result)]).size>1024*1024)throw Error('The layout is still too large to save safely in a dashboard after storing its images. Reduce its complexity before importing.');
  return result;
}

async function asPNG(blob){
  const url=URL.createObjectURL(blob);
  try{
    const image=new Image();
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Imported artwork could not be decoded.'));image.src=url;});
    const width=image.naturalWidth,height=image.naturalHeight;
    if(!width||!height||width*height>32*1024*1024)throw Error('Imported artwork has unsupported dimensions. Use an image below 32 megapixels.');
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    canvas.getContext('2d').drawImage(image,0,0);
    const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!png||png.size>8*1024*1024)throw Error('Converted artwork exceeds 8 MB. Use a smaller image.');
    return png;
  }finally{URL.revokeObjectURL(url);}
}

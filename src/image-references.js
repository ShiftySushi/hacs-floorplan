// Keep portable export and HA image storage in step as new display types are added.
export function imageReferences(config){
  return config.floors.flatMap(floor=>[
    [floor,'image'],
    ...[floor,...(floor.objects || [])].flatMap(item=>Object.keys(item.style_images || {}).map(key=>[item.style_images,key])),
    ...(floor.objects || []).flatMap(item=>[[item,'artwork_image'],...(item.tv_scenes || []).map(scene=>[scene,'image'])])
  ]);
}

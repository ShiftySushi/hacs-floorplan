const u3='https://www.sonos.com/';
const u2='https://www.fractal-design.com/';
const u1='https://www.ikea.com/gb/en/p/';
const u0='https://www.oakfurnitureland.co.uk/furniture/';
// Assembled outside dimensions in metres, checked against the linked sources.
// Colour swatches are screen approximations of named finishes, not manufacturer colour codes.
const white=['White','#f1f0eb'],black=['Black','#262727'],oak=['Oak effect','#c6aa7b'];
const kallax=[white,['Black-brown','#39312b'],['White stained oak effect','#d5c5a5'],['High-gloss white','#fafafa']];
const piano=[['Premium satin black','#292826'],['Premium satin white','#ecebe5'],['Premium rosewood','#533b32'],['Ebony polish','#141516'],['Natural walnut','#865e40']];
const selby=[['Plush charcoal','#555454'],['Plush silver','#aba9a5'],['Plush beige','#c7baaa'],['Miller earth brown','#786356'],['Miller taupe','#9e9283'],['Miller grey','#858581']];
const mango=[['Natural mango wood','#ae784b']];
const products=[
  {id:'fractal-north',name:'Fractal Design North',type:'computer',width:.215,depth:.447,height:.469,colours:[black],variant:'north',source:u2+'products/cases/north-series/north/north-charcoal-black/'},
  {id:'sonos-arc',name:'Sonos Arc',type:'speaker',width:1.1417,depth:.1157,height:.087,colours:[black,white],source:u3+'en-us/guides/arc'},
  {id:'sonos-sub-3',name:'Sonos Sub Gen 3',type:'speaker',width:.402,depth:.158,height:.389,colours:[black,white],variant:'sub',source:'https://assets.sonos.com/media-kits/hardware/sub/Sub_Gen3_FactSheet.pdf'},
  {id:'dunelm-fulton-extra-wide-pine',name:'Dunelm Fulton Extra Wide TV Unit',type:'tv_bench',width:1.8,depth:.38,height:.42,colours:[['Pine effect / gunmetal','#9b7959'],['Black / gunmetal','#252626']],source:'https://www.dunelm.com/product/fulton-extra-wide-pine-tv-unit-1000190703',note:'12 cm legs; gunmetal handles. For TVs up to 80 inches.'},
  {id:'kawai-ca901',name:'Kawai CA901',type:'piano',width:1.455,depth:.475,height:1.01,colours:piano,source:'https://www.kawai-global.com/product/ca901/',note:'Excludes piano bench.'},
  {id:'selby-3-power',name:'Selby 3-seater power recliner with power headrest',type:'sofa',width:2.08,depth:.96,height:1.02,colours:selby,source:u0+'selby-3-seater-power-recliner-sofa-with-power-headrest-in-plush-charcoal-fabric/51628.html',note:'Upright; allow 160 cm depth reclined.'},
  {id:'lg-g4-65-wall',name:'LG G4 65 inch — wall mount',type:'tv',width:1.441,depth:.0243,height:.826,colours:[['Silver / black','#444748']],source:'https://www.lg.com/uk/tvs-soundbars/oled-evo/oled65g46ls/',note:'Set wall mounting height.',variant:'wall'},
  {id:'lg-g4-65-stand',name:'LG G4 65 inch — with stand',type:'tv',width:1.441,depth:.263,height:.91,colours:[['Silver / black','#444748']],source:'https://www.lg.com/uk/tvs-soundbars/oled-evo/oled65g46ls/',note:'Place at bench height.',variant:'stand'},
  ...[['upright',.765,1.465,2,4],['sideways',1.465,.765,4,2]].map(([orientation,width,height,columns,rows])=>({id:`kallax-2x4-${orientation}`,name:`IKEA KALLAX 2×4 — ${orientation}`,type:'bookshelf',width,depth:.39,height,colours:kallax,variant:'cubes',columns,rows,source:u1+'kallax-shelving-unit-white-80275887/',note:'Excludes optional underframe.'})),
  ...[['upright',.41,.765,1,2],['sideways',.765,.41,2,1]].map(([orientation,width,height,columns,rows])=>({id:`kallax-1x2-${orientation}`,name:`IKEA KALLAX 1×2 — ${orientation}`,type:'bookshelf',width,depth:.39,height,colours:kallax,variant:'cubes',columns,rows,source:u1+'kallax-shelving-unit-white-90301555/',note:'Excludes optional underframe.'})),
  {id:'billy-extension-80',name:'IKEA BILLY 80 cm with top extension',type:'bookshelf',width:.8,depth:.28,height:2.37,colours:[white,oak,['Black oak effect','#39352e'],['Walnut effect','#826344']],source:u1+'billy-bookcase-white-s59182201/',note:'Top extension; no doors.'},
  {id:'bror-workbench',name:'IKEA BROR work bench',type:'desk',width:1.1,depth:.55,height:.88,colours:[['Pine plywood / black','#c8ae7d']],variant:'plain',source:u1+'bror-work-bench-black-pine-plywood-30333286/'},
  {id:'bekant-140',name:'IKEA BEKANT 140 × 60 cm',type:'desk',width:1.4,depth:.6,height:.75,colours:[white,black,oak],variant:'plain',source:'https://www.ikea.com.tr/urun/bekant-beyaz-140x60-cm-calisma-masasi-39006355',note:'Height 65–85 cm; preset 75 cm.'},
  {id:'bekant-160',name:'IKEA BEKANT 160 × 80 cm',type:'desk',width:1.6,depth:.8,height:.75,colours:[white,black,oak],variant:'plain',source:'https://www.ikea.com/ie/en/p/bekant-desk-white-s19022808/',note:'Height 65–85 cm; preset 75 cm.'},
  {id:'magnus-pro-xl',name:'Secretlab MAGNUS Pro XL',type:'desk',width:1.77,depth:.8,height:.75,colours:[black,['Pure white','#f5f5f2']],variant:'plain',source:'https://secretlab.co.uk/pages/magnus-pro',note:'Cable tray included; height 65–125 cm, preset 75.'},
  {id:'vasagle-let326',name:'VASAGLE LET326B22 slim side table',type:'side_table',width:.35,depth:.6,height:.61,colours:[['Charcoal grey / classic black','#535558'],['Rustic brown / black','#8b6044']],source:'https://www.diy.com/departments/vasagle-slim-side-table-with-charging-station-narrow-end-table-with-2-drawers-bedside-table-with-storage/0194343270586_BQ.prd',note:'Amazon B0C5M8M9XY; two drawers and charging station.'},
  {id:'lyla-sideboard',name:'Oak Furnitureland Lyla / Noah large sideboard',type:'tv_bench',width:1.4,depth:.43,height:.78,colours:mango,variant:'sideboard',source:u0+'noah-solid-mango-large-sideboard/10001232.html',note:'SH-LLA001 / NOA001; gunmetal handles.'},
  {id:'lyla-tv-bench',name:'Oak Furnitureland Lyla / Noah large TV bench',type:'tv_bench',width:1.4,depth:.43,height:.6,colours:mango,source:u0+'noah-solid-mango-large-tv-unit/10001234.html',note:'Noah NOA005.'},
  {id:'lyla-bookcase',name:'Oak Furnitureland Lyla / Noah bookcase',type:'bookshelf',width:.9,depth:.32,height:1.9,colours:mango,columns:1,rows:5,source:u0+'noah-solid-mango-bookcase/10001240.html',note:'SH-LLA012 / NOA012.'},
  {id:'lyla-display',name:'Oak Furnitureland Lyla / Noah display cabinet',type:'display_cabinet',width:.68,depth:.43,height:1.9,colours:mango,source:u0+'noah-solid-mango-display-cabinet/10001241.html',note:'SH-LLA014 / NOA014; glass doors.'},
  {id:'govee-h7075',name:'Govee H7075 outdoor wall light',type:'wall_light',width:.131,depth:.062,height:.263,colours:[black],source:'https://uk.govee.com/products/govee-outdoor-wall-light',note:'Wall mounted.'},
  {id:'hue-impress',name:'Philips Hue Impress outdoor wall light',type:'wall_light',width:.12,depth:.141,height:.24,colours:[black],source:'https://www.philips-hue.com/en-gb/p/1742930P7',note:'17429/30/P7.'},
];
export const PRODUCT_PRESETS=products.map(p=>({...p,category:'Products'}));
export const productPreset=item=>PRODUCT_PRESETS.find(p=>p.id===item.product_id);
export function applyProductPreset(item,preset){
  return {...item,type:preset.type,product_id:preset.id,name:preset.name,width:preset.width,depth:preset.depth,height:preset.height,variant:preset.variant || '',colour:preset.colours[0][1]};
}
export const productDimensions=p=>`${[p.width,p.depth,p.height].map(v=>Number((v*100).toFixed(2))).join(' × ')} cm · W × D × H`;

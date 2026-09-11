const underframe='Excludes optional underframe.',deskHeight='Height 65–85 cm; preset 75 cm.';
const noah='Oak Furnitureland Lyla / Noah ';
const lg='https://www.lg.com/uk/tvs-soundbars/oled-evo/oled65g46ls/';
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
  ...[['vinyl','Vinyl','#202022','astro-vinyl-lava-lamp'],['platinum-vinyl','Platinum Vinyl','#bfc3c5','astro-platinum-vinyl-lava-lamp'],['copper','Copper','#b67547','astro-the-original-lava-lamp-copper'],['black','Black','#262727','astro-the-original-lava-lamp-black']].map(([variant,name,colour,url])=>({id:'mathmos-'+variant,name:'Mathmos Astro '+name,type:'lamp',variant,width:.14,depth:.14,height:.43,colours:[[name,colour]],source:'https://mathmos.com/product/'+url+'/'})),
  ...[['g55c-27','G55C 27 inch',.6166,.2726,.4774,'#262727','odyssey-g5-g55c-27-inch-165hz-curved-qhd-ls27cg552euxxu'],['g93sc-49','OLED G9 49 inch',1.1947,.2841,.5293,'#bfc3c5','odyssey-oled-g9-g93sc-49-inch-240hz-curved-dual-qhd-ls49cg934suxxu']].map(([id,name,width,depth,height,colour,url])=>({id:'samsung-'+id,name:'Samsung Odyssey '+name,type:'ultrawide_monitor',width,depth,height,colours:[['Factory finish',colour]],source:'https://www.samsung.com/uk/monitors/gaming/'+url+'/'})),
  {id:'jonsbo-n5',name:'JONSBO N5 NAS case',type:'computer',width:.355,depth:.403,height:.35,variant:'n5',colours:[['Black / walnut','#292b2c']],source:'https://www.jonsbo.com/en/products/N5Black.html'},
  ...['left','right'].map(side=>({id:`edifier-s1000db-${side}`,name:`Edifier S1000DB — ${side} speaker`,type:'speaker',width:.2032,depth:.2667,height:.3429,colours:[['Wood / black','#a76934']],source:'https://edifier-online.com/products/edifier-s1000',note:`Individual ${side==='right'?'active':'passive'} speaker; grille removed.`})),
  ...[
    ['snapmaker-u1','Snapmaker U1',.584,.499,.73,'toolchanger','#e4e5e3','https://www.snapmaker.com/en-US/snapmaker-u1/specs'],
    ['bambu-p1s','Bambu Lab P1S',.389,.389,.458,'enclosed','#353a3d','https://us.store.bambulab.com/products/p1s'],
    ['bambu-x1c','Bambu Lab X1 Carbon',.389,.389,.457,'enclosed','#a2a6a8','https://jp.store.bambulab.com/products/x1-carbon-3d-printer'],
    ['bambu-a1','Bambu Lab A1',.385,.410,.430,'bedslinger','#c7cecf','https://us.store.bambulab.com/products/a1'],
    ['bambu-a1-mini','Bambu Lab A1 mini',.347,.315,.365,'cantilever','#c7cecf','https://us.store.bambulab.com/products/a1-mini'],
    ['prusa-mk4s','Prusa MK4S',.5,.55,.4,'bedslinger','#303537','https://www.prusa3d.com/product/original-prusa-mk4s-3d-printer-7/'],
    ['prusa-mini','Prusa MINI+',.38,.33,.38,'cantilever','#303537','https://www.prusa3d.com/en/product/original-prusa-mini-kit-6/'],
    ['prusa-core-one','Prusa CORE One+',.415,.444,.555,'enclosed','#303537','https://www.prusa3d.com/en/product/core-one-ultimate-edition-assembled/'],
  ].map(([id,name,width,depth,height,variant,colour,source])=>({id,name,type:'printer_3d',width,depth,height,variant,colours:[['Factory finish',colour]],source,note:id==='snapmaker-u1'?'Includes side spools and tube height.':'Printer only; allow extra room for spools, accessories and moving parts.'})),
  {id:'malm-6-glass',name:'IKEA MALM 6 drawers + white glass top',type:'side_table',width:1.6,depth:.48,height:.786,colours:[['Black-brown','#302723']],variant:'malm',source:'https://www.ikea.com/es/en/files/pdf/5e/bd/5ebd5053/malm21hfb04eng_r1_004.pdf',note:'Chest height 78 cm; glass top adds approximately 6 mm.'},
  {id:'malm-2',name:'IKEA MALM 2 drawers',type:'side_table',width:.4,depth:.48,height:.55,colours:[['Black-brown','#302723']],variant:'malm',source:'https://www.ikea.com/ch/en/p/malm-chest-of-2-drawers-black-brown-00103343/'},
  ...[['sutton-king','Sutton king',1.54,2.14,'sutton','251-00980'],['ealing-double','Ealing double',1.38,2.04,'ealing','251-00315']].map(([id,name,width,depth,variant,code])=>({id:'dreams-'+id,name:'Dreams '+name+' ottoman bed',type:'bed',width,depth,height:1.16,variant,colours:[['Grey','#676769'],['Silver','#aaa9ad']],source:`https://www.dreams.co.uk/${variant}-upholstered-ottoman-bed-frame/p/${code}-configurable`})),
  {id:'fractal-north',name:'Fractal Design North',type:'computer',width:.215,depth:.447,height:.469,colours:[black],variant:'north',source:'https://www.fractal-design.com/products/cases/north-series/north/north-charcoal-black/'},
  {id:'sonos-arc',name:'Sonos Arc',type:'speaker',width:1.1417,depth:.1157,height:.087,colours:[black,white],source:'https://www.sonos.com/en-us/guides/arc'},
  {id:'sonos-sub-3',name:'Sonos Sub Gen 3',type:'speaker',width:.402,depth:.158,height:.389,colours:[black,white],variant:'sub',source:'https://assets.sonos.com/media-kits/hardware/sub/Sub_Gen3_FactSheet.pdf'},
  {id:'dunelm-fulton-extra-wide-pine',name:'Dunelm Fulton Extra Wide TV Unit',type:'tv_bench',width:1.8,depth:.38,height:.42,colours:[['Pine effect / gunmetal','#9b7959'],['Black / gunmetal','#252626']],source:'https://www.dunelm.com/product/fulton-extra-wide-pine-tv-unit-1000190703',note:'12 cm legs; TVs up to 80 inches.'},
  {id:'kawai-ca901',name:'Kawai CA901',type:'piano',width:1.455,depth:.475,height:1.01,colours:piano,source:'https://www.kawai-global.com/product/ca901/',note:'Excludes piano bench.'},
  {id:'selby-3-power',name:'Selby 3-seater power recliner with power headrest',type:'sofa',width:2.08,depth:.96,height:1.02,colours:selby,source:u0+'selby-3-seater-power-recliner-sofa-with-power-headrest-in-plush-charcoal-fabric/51628.html',note:'Upright; allow 160 cm depth reclined.'},
  {id:'lg-g4-65-wall',name:'LG G4 65 inch — wall mount',type:'tv',width:1.441,depth:.0243,height:.826,colours:[['Silver / black','#444748']],source:lg,variant:'wall'},
  {id:'lg-g4-65-stand',name:'LG G4 65 inch — with stand',type:'tv',width:1.441,depth:.263,height:.91,colours:[['Silver / black','#444748']],source:lg,variant:'stand'},
  ...[['2x4-upright',.765,1.465,2,4,'80275887'],['2x4-sideways',1.465,.765,4,2,'80275887'],['1x2-upright',.41,.765,1,2,'90301555'],['1x2-sideways',.765,.41,2,1,'90301555'],['2x2',.765,.765,2,2,'20275814']].map(([id,width,height,columns,rows,code])=>({id:`kallax-${id}`,name:`IKEA KALLAX ${id.replace('x','×').replace('-',' — ')}`,type:'bookshelf',width,depth:.39,height,colours:kallax,variant:'cubes',columns,rows,source:u1+`kallax-shelving-unit-white-${code}/`,note:underframe})),
  {id:'aeron-b',name:'Herman Miller Aeron — Size B',type:'office_chair',width:.658,depth:.598,height:1.09,colours:[['Graphite','#383a39']],source:'https://eustore.hermanmiller.com/pages/product-details-product',note:'Adjustable height; curved mesh seat and back.'},
  ...[[40,'50263838','s49217734'],[80,'00263850','s59182201']].flatMap(([width,base,extension])=>[false,true].map(tall=>({id:`billy-${tall?'extension-':''}${width}`,name:`IKEA BILLY ${width} cm ${tall?'with':'without'} top extension`,type:'bookshelf',width:width/100,depth:.28,height:tall?2.37:2.02,colours:[white,oak,['Black oak effect','#39352e'],['Walnut effect','#826344']],source:u1+`billy-bookcase-white-${tall?extension:base}/`}))),
  {id:'bror-workbench',name:'IKEA BROR work bench',type:'desk',width:1.1,depth:.55,height:.88,colours:[['Pine plywood / black','#c8ae7d']],variant:'plain',source:u1+'bror-work-bench-black-pine-plywood-30333286/'},
  {id:'bekant-140',name:'IKEA BEKANT 140 × 60 cm',type:'desk',width:1.4,depth:.6,height:.75,colours:[white,black,oak],variant:'plain',source:'https://www.ikea.com.tr/urun/bekant-beyaz-140x60-cm-calisma-masasi-39006355',note:deskHeight},
  {id:'bekant-160',name:'IKEA BEKANT 160 × 80 cm',type:'desk',width:1.6,depth:.8,height:.75,colours:[white,black,oak],variant:'plain',source:'https://www.ikea.com/ie/en/p/bekant-desk-white-s19022808/',note:deskHeight},
  {id:'magnus-pro-xl',name:'Secretlab MAGNUS Pro XL',type:'desk',width:1.77,depth:.8,height:.75,colours:[black,['Pure white','#f5f5f2']],variant:'plain',source:'https://secretlab.co.uk/pages/magnus-pro',note:'Cable tray included; height 65–125 cm, preset 75.'},
  {id:'vasagle-let326',name:'VASAGLE LET326B22 slim side table',type:'side_table',width:.35,depth:.6,height:.61,colours:[['Charcoal grey / classic black','#535558'],['Rustic brown / black','#8b6044']],source:'https://www.diy.com/departments/vasagle-slim-side-table-with-charging-station-narrow-end-table-with-2-drawers-bedside-table-with-storage/0194343270586_BQ.prd',note:'B0C5M8M9XY; charging station.'},
  {id:'lyla-sideboard',name:noah+'large sideboard',type:'tv_bench',width:1.4,depth:.43,height:.78,colours:mango,variant:'sideboard',source:u0+'noah-solid-mango-large-sideboard/10001232.html',note:'SH-LLA001 / NOA001; gunmetal handles.'},
  {id:'lyla-tv-bench',name:noah+'large TV bench',type:'tv_bench',width:1.4,depth:.43,height:.6,colours:mango,source:u0+'noah-solid-mango-large-tv-unit/10001234.html',note:'NOA005'},
  {id:'lyla-bookcase',name:noah+'bookcase',type:'bookshelf',width:.9,depth:.32,height:1.9,colours:mango,columns:1,rows:5,source:u0+'noah-solid-mango-bookcase/10001240.html',note:'SH-LLA012 / NOA012.'},
  {id:'lyla-display',name:noah+'display cabinet',type:'display_cabinet',width:.68,depth:.43,height:1.9,colours:mango,source:u0+'noah-solid-mango-display-cabinet/10001241.html',note:'SH-LLA014 / NOA014; glass doors.'},
  {id:'govee-h7075',name:'Govee H7075 outdoor wall light',type:'wall_light',width:.131,depth:.062,height:.263,colours:[black],source:'https://uk.govee.com/products/govee-outdoor-wall-light'},
  {id:'hue-impress',name:'Philips Hue Impress outdoor wall light',type:'wall_light',width:.12,depth:.141,height:.24,colours:[black],source:'https://www.philips-hue.com/en-gb/p/1742930P7'},
];
export const PRODUCT_PRESETS=products.map(p=>({...p,category:'Products'}));
export const productPreset=item=>PRODUCT_PRESETS.find(p=>p.id===item.product_id);
export function applyProductPreset(item,preset){
  return {...item,type:preset.type,product_id:preset.id,name:preset.name,width:preset.width,depth:preset.depth,height:preset.height,variant:preset.variant || '',colour:preset.colours[0][1]};
}
export const productDimensions=p=>`${[p.width,p.depth,p.height].map(v=>Number((v*100).toFixed(2))).join(' × ')} cm · W × D × H`;

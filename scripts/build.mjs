import { readFile } from 'node:fs/promises';
import { build, transform } from 'esbuild';
import { styles } from '../src/styles.js';
import { furnitureStyles } from '../src/furniture-styles.js';
import {packShaderStrings,unpackShaderStrings} from './pack-shaders.mjs';
const css=(await transform(styles,{loader:'css',minify:true,target:'es2022'})).code;
const furnitureCss=(await transform(furnitureStyles,{loader:'css',minify:true,target:'es2022'})).code;
// Reuse the lossless string codec for static CSS to leave room for editor features.
// URI encoding keeps Unicode CSS intact through the codec's Latin-1 transport.
const packedCss=(name,value)=>`export const ${name}=decodeURIComponent((${unpackShaderStrings.toString()})(${JSON.stringify(packShaderStrings([encodeURIComponent(value)]))})[0]);`;
const panelCss={name:'panel-css',setup(build){build.onLoad({filter:/\/information-panel\.js$/},async({path})=>{
  const source=await readFile(path,'utf8'),match=source.match(/export const informationStyles=`([^`]*)`;/);
  if(!match)throw Error('Information panel styles not found');
  const css=(await transform(match[1],{loader:'css',minify:true,target:'es2022'})).code;
  return {contents:source.replace(match[0],()=>packedCss('informationStyles',css)),loader:'js'};
});}};
// Share repeated shader text without changing uniforms, chunks or GLSL source.
const shaderWhitespace={name:'shader-whitespace',setup(build){build.onLoad({filter:/three\.module\.js$/},async({path})=>{
  const source=await readFile(path,'utf8'),literals=/\b(?:var|const) [\w$]+ = ("(?:\\.|[^"\\])*");/g,shaders=[];
  const contents=source.replace(literals,(match,literal)=>{
    const original=JSON.parse(literal);if(!/#|uniform |varying |vec[234] |gl_/.test(original))return match;
    const value=original.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,'').split('\n').map(line=>line.trim()).map(line=>line.startsWith('#')?line:line.replace(/[\t ]*([!*=<>?:\[\]{}();,])[\t ]*/g,'$1')).filter(Boolean).join('\n');
    const index=shaders.push(value)-1;return match.replace(literal,`__fpShaders[${index}]`);
  });
  const packed=packShaderStrings(shaders);
  return {contents:`const __fpShaders=(${unpackShaderStrings.toString()})(${JSON.stringify(packed)});\n`+contents,loader:'js',resolveDir:new URL('.',`file://${path}`).pathname};
});}};

const licence = await readFile('LICENSE', 'utf8');
const threeLicence = await readFile('node_modules/three/LICENSE', 'utf8');
await build({entryPoints:['src/index.js'],outfile:'dist/hacs-floorplan.js',bundle:true,format:'iife',target:'es2022',charset:'utf8',minify:true,legalComments:'inline',plugins:[shaderWhitespace,panelCss,{name:'card-css',setup(build){build.onLoad({filter:/\/styles\.js$/},()=>({contents:packedCss('styles',css),loader:'js'}));build.onLoad({filter:/\/furniture-styles\.js$/},()=>({contents:packedCss('furnitureStyles',furnitureCss),loader:'js'}));}}],banner:{js:`/*!\n${licence}\nBundled Three.js:\n${threeLicence}*/`}});

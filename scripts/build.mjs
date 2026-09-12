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
// Losslessly pack the existing four-decimal model coordinates and triangle indices.
// This keeps detailed product models inside the single-file distribution budget.
const packedFurniture={name:'packed-furniture',setup(build){build.onLoad({filter:/kenney-furniture\.json$/},async({path})=>{
  const assets=JSON.parse(await readFile(path,'utf8'));
  const pack=(values,signed=false)=>{const bytes=Buffer.alloc(values.length*2);values.forEach((value,i)=>{
    const n=signed?Math.round(value*10000):value;
    if(!Number.isInteger(n)||n<(signed?-32768:0)||n>(signed?32767:65535)||(signed&&Math.abs(n/10000-value)>1e-9))throw Error('Furniture packing would lose precision');
    signed?bytes.writeInt16LE(n,i*2):bytes.writeUInt16LE(n,i*2);
  });if(!signed){const packed=[];let previous=0;for(const value of values){const delta=value-previous;previous=value;let n=(delta<<1)^(delta>>31);while(n>127){packed.push((n&127)|128);n>>>=7;}packed.push(n);}return Buffer.from(packed).toString('base64');}return bytes.toString('base64');};
  for(const asset of Object.values(assets)){asset.vertices=pack(asset.vertices,true);for(const part of asset.parts)part.indices=pack(part.indices);}
  return {loader:'js',contents:`const assets=${JSON.stringify(assets)};const decode=(s,signed=false)=>{const b=atob(s);if(!signed){const out=[];let value=0,n=0,shift=0;for(let i=0;i<b.length;i++){const byte=b.charCodeAt(i);n|=(byte&127)<<shift;if(byte&128)shift+=7;else{value+=(n>>>1)^-(n&1);out.push(value);n=shift=0;}}return out;}return Array.from({length:b.length/2},(_,i)=>{const n=b.charCodeAt(i*2)|(b.charCodeAt(i*2+1)<<8);return (n>32767?n-65536:n)/10000;});};for(const a of Object.values(assets)){a.vertices=decode(a.vertices,true);for(const p of a.parts)p.indices=decode(p.indices);}export default assets;`};
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
await build({entryPoints:['src/index.js'],outfile:'dist/hacs-floorplan.js',bundle:true,format:'iife',target:'es2022',charset:'utf8',minify:true,legalComments:'inline',plugins:[shaderWhitespace,packedFurniture,{name:'card-css',setup(build){build.onLoad({filter:/\/styles\.js$/},()=>({contents:packedCss('styles',css),loader:'js'}));build.onLoad({filter:/\/furniture-styles\.js$/},()=>({contents:packedCss('furnitureStyles',furnitureCss),loader:'js'}));}}],banner:{js:`/*!\n${licence}\nBundled Three.js:\n${threeLicence}*/`}});

import { readFile } from 'node:fs/promises';
import { build, transform } from 'esbuild';
import { styles } from '../src/styles.js';
import { furnitureStyles } from '../src/furniture-styles.js';
const css=(await transform(styles,{loader:'css',minify:true,target:'es2022'})).code;
const furnitureCss=(await transform(furnitureStyles,{loader:'css',minify:true,target:'es2022'})).code;
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
// Indentation inside bundled GLSL is not removed by JavaScript minification.
const shaderWhitespace={name:'shader-whitespace',setup(build){build.onLoad({filter:/three\.module\.js$/},async({path})=>{
  const source=await readFile(path,'utf8'),literals=/\b(?:var|const) [\w$]+ = ("(?:\\.|[^"\\])*");/g;
  const isShader=value=>/#|uniform |varying |vec[234] |gl_/.test(value);
  // Share repeated GLSL identifiers without renaming any runtime shader symbol.
  // Expansion is lossless: uniforms, chunk interfaces and driver source are unchanged.
  const counts=new Map();for(const match of source.matchAll(literals)){const value=JSON.parse(match[1]);if(isShader(value))for(const token of value.match(/[A-Za-z_]\w{5,}/g)||[])counts.set(token,(counts.get(token)||0)+1);}
  const dictionary=[...counts].filter(([token,count])=>count*(token.length-5)>token.length+20).sort((a,b)=>b[1]*(b[0].length-5)-a[1]*(a[0].length-5)).slice(0,500).map(([token])=>token);
  const ids=new Map(dictionary.map((token,i)=>[token,i]));
  const contents=source.replace(literals,(match,literal)=>{
    const original=JSON.parse(literal);if(!isShader(original))return match;
    const value=original.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,'').replace(/\n[\t ]+/g,'\n').split('\n').map(line=>line.trim()).map(line=>line.startsWith('#')?line:line.replace(/[\t ]*([!*=<>?:\[\]{}();,])[\t ]*/g,'$1')).join('\n');
    if(/[\u0100-\u02ff]/.test(value))throw Error('Reserved shader packing character');
    const packed=value.replace(/\b[A-Za-z_]\w*\b/g,token=>ids.has(token)?String.fromCharCode(256+ids.get(token)):token);
    if(packed.replace(/[\u0100-\u02ff]/g,char=>dictionary[char.charCodeAt(0)-256])!==value)throw Error('Shader packing would lose data');
    return match.replace(literal,`__fpShader(${JSON.stringify(packed)})`);
  });
  return {contents:`const __fpShaderWords=${JSON.stringify(dictionary)};const __fpShader=s=>s.replace(/[\\u0100-\\u02ff]/g,c=>__fpShaderWords[c.charCodeAt(0)-256]);\n`+contents,loader:'js',resolveDir:new URL('.',`file://${path}`).pathname};
});}};

const licence = await readFile('LICENSE', 'utf8');
const threeLicence = await readFile('node_modules/three/LICENSE', 'utf8');
await build({entryPoints:['src/index.js'],outfile:'dist/hacs-floorplan.js',bundle:true,format:'iife',target:'es2022',charset:'utf8',minify:true,legalComments:'inline',plugins:[shaderWhitespace,packedFurniture,{name:'card-css',setup(build){build.onLoad({filter:/\/styles\.js$/},()=>({contents:`export const styles=${JSON.stringify(css)}`,loader:'js'}));build.onLoad({filter:/\/furniture-styles\.js$/},()=>({contents:`export const furnitureStyles=${JSON.stringify(furnitureCss)}`,loader:'js'}));}}],banner:{js:`/*!\n${licence}\nBundled Three.js:\n${threeLicence}*/`}});

import { readFile } from 'node:fs/promises';
import { build, transform } from 'esbuild';
import { styles } from '../src/styles.js';
const css=(await transform(styles,{loader:'css',minify:true,target:'es2022'})).code;
// Indentation inside bundled GLSL is not removed by JavaScript minification.
const shaderWhitespace={name:'shader-whitespace',setup(build){build.onLoad({filter:/three\.module\.js$/},async({path})=>({contents:(await readFile(path,'utf8')).replace(/(var \w+ = )("(?:\\.|[^"\\])*");/g,(match,prefix,literal)=>{
  const value=JSON.parse(literal);
  return /#include|#define|uniform |varying |vec[234] /.test(value)?prefix+JSON.stringify(value.replace(/\n[\t ]+/g,'\n').split('\n').map(line=>line.startsWith('#')?line:line.replace(/[\t ]*([{}();,])[\t ]*/g,'$1')).join('\n'))+';':match;
}),loader:'js',resolveDir:new URL('.',`file://${path}`).pathname}));}};

const licence = await readFile('LICENSE', 'utf8');
const threeLicence = await readFile('node_modules/three/LICENSE', 'utf8');
await build({entryPoints:['src/index.js'],outfile:'dist/hacs-floorplan.js',bundle:true,format:'iife',target:'es2022',supported:{'template-literal':false},minify:true,legalComments:'inline',plugins:[shaderWhitespace,{name:'card-css',setup(build){build.onLoad({filter:/\/styles\.js$/},()=>({contents:`export const styles=${JSON.stringify(css)}`,loader:'js'}));}}],banner:{js:`/*!\n${licence}\nBundled Three.js:\n${threeLicence}*/`}});

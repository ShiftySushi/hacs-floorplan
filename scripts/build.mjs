import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
const licence = await readFile('LICENSE', 'utf8');
const threeLicence = await readFile('node_modules/three/LICENSE', 'utf8');
await build({entryPoints:['src/index.js'],outfile:'dist/hacs-floorplan.js',bundle:true,format:'iife',target:'es2022',supported:{'template-literal':false},minify:true,legalComments:'inline',banner:{js:`/*!\n${licence}\nBundled Three.js:\n${threeLicence}*/`}});

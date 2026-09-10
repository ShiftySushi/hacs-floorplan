import { readFile, writeFile, mkdir } from 'node:fs/promises';
const files = ['lights.js', 'rooms.js', 'styles.js', 'dom.js', 'plan.js', 'setup.js', 'editor.js', 'card.js'];
await mkdir('dist', { recursive: true });
const parts = await Promise.all(files.map(f => readFile(`src/${f}`, 'utf8')));
await writeFile('dist/hacs-floorplan.js', parts.map(s => s.replace(/^import .*;\n/gm, '').replace(/^export /gm, '')).join('\n'));

import { readFile, writeFile } from 'node:fs/promises';
const geometry = JSON.parse(await readFile('floorplans/models/geometry.json', 'utf8'));
for (const [name, paths] of Object.entries(geometry.floors)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="75 150 1100 1600"><title>${name} schematic outline</title><rect x="75" y="150" width="1100" height="1600" fill="white"/><g fill="none" stroke="#56626b" stroke-width="14" stroke-linejoin="miter" stroke-linecap="square">${paths.map(p => `<polyline points="${p.join(' ')}"/>`).join('')}</g></svg>`;
  await writeFile(`floorplans/outlines/${name}.svg`, svg);
  const vertices = [], faces = [];
  for (const path of paths) for (let i = 0; i < path.length - 2; i += 2) {
    const [x1,y1,x2,y2] = path.slice(i, i + 4).map(v => v * geometry.scale);
    const length = Math.hypot(x2-x1,y2-y1), dx = -(y2-y1)/length*.07, dy = (x2-x1)/length*.07;
    const base = [[x1+dx,-y1-dy],[x2+dx,-y2-dy],[x2-dx,-y2+dy],[x1-dx,-y1+dy]];
    const start = vertices.length + 1;
    for (const z of [0,geometry.height]) for (const [x,y] of base) vertices.push([x,y,z]);
    for (const face of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]) faces.push(face.map(v => start+v));
  }
  await writeFile(`floorplans/models/${name}.obj`, ['# Schematic only. Assumed scale; Z up; metres. Separate closed wall boxes.',`o ${name}`,...vertices.map(v => `v ${v.map(n=>n.toFixed(4)).join(' ')}`),...faces.map(f=>`f ${f.join(' ')}`)].join('\n')+'\n');
}

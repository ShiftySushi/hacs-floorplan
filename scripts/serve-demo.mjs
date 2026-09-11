import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const assets = new Map([
  ['/src/demo-preview.js', ['src/demo-preview.js', 'text/javascript']],
  ['/src/demo-boot.js', ['src/demo-boot.js', 'text/javascript']],
  ['/src/demo-boot.css', ['src/demo-boot.css', 'text/css']],
  ['/demo/', ['demo/index.html', 'text/html']],
  ['/demo/sample.svg', ['demo/sample.svg', 'image/svg+xml']],
  ['/dist/hacs-floorplan.js', ['dist/hacs-floorplan.js', 'text/javascript']],
  ['/src/demo-workspace.js', ['src/demo-workspace.js', 'text/javascript']],
  ['/src/icons.js', ['src/icons.js', 'text/javascript']],
  ['/src/dom.js', ['src/dom.js', 'text/javascript']],
]);
const server = createServer(async (request, response) => {
  const asset = assets.get(new URL(request.url, 'http://localhost').pathname);
  if (!asset) { response.writeHead(404); response.end(); return; }
  try { response.writeHead(200, { 'Content-Type': asset[1], 'Cache-Control': 'no-store' }); response.end(await readFile(asset[0])); }
  catch { response.writeHead(500); response.end(); }
});
server.listen(Number(process.env.PORT || 8125), '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));

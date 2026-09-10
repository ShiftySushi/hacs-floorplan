import { execFileSync } from 'node:child_process';

// Intentionally narrow: public assets must be reviewed before expanding this list.
const allowed = /^(?:README\.md|LICENSE|AGENTS\.md|package\.json|hacs\.json|\.gitignore|\.gitattributes|\.githooks\/(?:pre-commit|pre-push)|src\/[\w-]+\.js|scripts\/[\w-]+\.mjs|tests\/[\w-]+\.test\.mjs|dist\/hacs-floorplan\.js|demo\/(?:index\.html|sample\.svg))$/;
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const history = process.argv[2] === '--history';
const ref = process.argv[3];
if (history && !/^[0-9a-f]{40,64}$/.test(ref || '')) throw Error('Expected a full commit SHA');
const failures = new Set();
let files = [];
if (history) {
  // Inspect every historical path, including identical blobs copied to another path.
  // Deleting private files from the tip does not remove them from Git history.
  const seen = new Set();
  for (const commit of git('rev-list', ref).trim().split('\n')) {
    for (const entry of git('ls-tree', '-r', '-z', '--full-tree', commit).split('\0').filter(Boolean)) {
      const [metadata, path] = entry.split('\t');
      const [, type, object] = metadata.split(' ');
      if (type !== 'blob') { failures.add(`Unsupported historical entry: ${path}`); continue; }
      const key = `${object}:${path}`;
      if (!seen.has(key)) { seen.add(key); files.push({ path, object }); }
    }
  }
} else files = git('ls-files', '-z').split('\0').filter(Boolean).map(path => ({ path, object: `:${path}` }));
for (const { path, object } of files) {
  if (!allowed.test(path)) { failures.add(`Not approved for publication: ${path}`); continue; }
  const content = git('show', object);
  if (/data:image\/[\w+.-]+;base64,[A-Za-z0-9+/=]{32,}/.test(content)) failures.add(`Embedded image data: ${path}`);
  if (/floorplans\/(?:originals|outlines|models)\//.test(content) && (path.startsWith('demo/') || path.startsWith('dist/'))) failures.add(`Private asset reference: ${path}`);
}
if (!files.length) failures.add('No files to check; stage the intended public files first.');
if (failures.size) {
  console.error([...failures].join('\n'));
  console.error('Public safety check failed. Personal images, geometry, models and demo exports belong in ignored floorplans/.');
  process.exit(1);
}
console.log(`Public safety check passed (${files.length} ${history ? 'historical blobs' : 'indexed files'}).`);

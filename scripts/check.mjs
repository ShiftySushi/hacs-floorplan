import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Validate the approved MIT text at the checkout revision, independently of
// GitHub's default-branch licence detection (which cannot see a new PR licence).
assert.equal(createHash('sha256').update(readFileSync('LICENSE')).digest('hex'),
  'e793de777a818ef2b9054a5dd363c05d69253983ea66ebe3bfc7b315b60d65ff',
  'The approved MIT licence changed; review its full text before updating this digest');

for (const dir of ['src', 'scripts', 'tests']) for (const file of readdirSync(dir)) {
  if (/\.(?:js|mjs)$/.test(file)) execFileSync(process.execPath, ['--check', `${dir}/${file}`], { stdio: 'pipe' });
}
const script = readFileSync('demo/index.html', 'utf8').match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert(script, 'The public demo must load the built card');
execFileSync(process.execPath, ['--input-type=module', '--check'], { input: script, stdio: ['pipe', 'pipe', 'pipe'] });
const manifest = JSON.parse(readFileSync('hacs.json', 'utf8'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
assert.equal(manifest.filename, `${pkg.name}.js`, 'HACS asset must match the repository name');
assert.equal(manifest.name, 'Floorplan Card');
assert.equal(manifest.render_readme, true);
const path = `dist/${manifest.filename}`;
const committed = readFileSync(path);
execFileSync(process.execPath, ['scripts/build.mjs']);
assert.deepEqual(readFileSync(path), committed, 'Distribution is stale: run npm run build and commit the result');
execFileSync(process.execPath, ['--check', path]);
assert(!/^import /m.test(committed.toString()), 'Distribution must be self-contained');
assert(committed.length < 250000, 'Unexpectedly large distribution; check for embedded assets');
assert.deepEqual(readdirSync('dist'), [manifest.filename], 'Only the distributable JS belongs in dist');
console.log('Syntax, public demo, HACS package contract and reproducible distribution passed.');

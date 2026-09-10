import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const checker = resolve('scripts/check-public.mjs');
test('publication gate rejects forced private files, image payloads and deleted historical assets', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'floorplan-public-test-'));
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
  };
  const check = (...args) => spawnSync(process.execPath, [checker, ...args], { cwd, encoding: 'utf8' });
  const commit = () => git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgSign=false', 'commit', '-m', 'fixture');
  try {
    git('init', '-b', 'main');
    writeFileSync(join(cwd, '.gitignore'), 'floorplans/\n');
    writeFileSync(join(cwd, 'README.md'), 'Public fixture\n');
    git('add', '.gitignore', 'README.md'); assert.equal(check().status, 0);
    mkdirSync(join(cwd, 'floorplans'));
    writeFileSync(join(cwd, 'floorplans', 'private.svg'), '<svg/>');
    git('add', '-f', 'floorplans/private.svg'); assert.equal(check().status, 1);
    commit();
    git('rm', 'floorplans/private.svg'); commit();
    assert.equal(check().status, 0);
    const history = check('--history', git('rev-parse', 'HEAD'));
    assert.equal(history.status, 1); assert.match(history.stderr, /Not approved for publication/);
    writeFileSync(join(cwd, 'README.md'), 'data:image/png;base64,' + 'A'.repeat(64));
    git('add', 'README.md'); assert.equal(check().status, 1);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

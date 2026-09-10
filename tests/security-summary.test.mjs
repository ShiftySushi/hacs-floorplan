import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function summarise(report) {
  const dir = mkdtempSync(join(tmpdir(), 'floorplan-scan-'));
  try {
    const input = join(dir, 'raw.json');
    const output = join(dir, 'summary.json');
    writeFileSync(input, JSON.stringify(report));
    const result = spawnSync(process.execPath, ['scripts/security-summary.mjs', input, output], { encoding: 'utf8' });
    return { status: result.status, stdout: result.stdout, output: existsSync(output) ? readFileSync(output, 'utf8') : undefined };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('valid clean Trivy reports may omit Results', () => {
  const result = summarise({ SchemaVersion: 2 });
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.output).vulnerabilities, {});
  assert.deepEqual(JSON.parse(result.output).secrets, {});
});

test('malformed scanner reports fail without publishing a summary', () => {
  for (const report of [{}, { SchemaVersion: 1 }, { SchemaVersion: 2, Results: null }, { SchemaVersion: 2, Results: {} }]) {
    const result = summarise(report);
    assert.notEqual(result.status, 0);
    assert.equal(result.output, undefined);
  }
});

test('scanner summary retains counts but excludes match, path and source data', () => {
  const result = summarise({ SchemaVersion: 2, Results: [{
    Target: 'private-fixture-path',
    Vulnerabilities: [{ Severity: 'HIGH', FixedVersion: '2' }, { Severity: 'LOW' }],
    Secrets: [{ Severity: 'CRITICAL', Match: 'fake-fixture-match', Code: { Lines: ['fake-source-context'] } }],
  }] });
  assert.equal(result.status, 0);
  const summary = JSON.parse(result.output);
  assert.deepEqual(summary.vulnerabilities, { HIGH: 1, LOW: 1 });
  assert.deepEqual(summary.secrets, { CRITICAL: 1 });
  assert.equal(summary.fixAvailable, 1);
  assert.equal(summary.noFixAvailable, 1);
  assert.equal(result.stdout, result.output + '\n');
  assert.doesNotMatch(result.output, /private-fixture|fake-fixture|fake-source/);
});

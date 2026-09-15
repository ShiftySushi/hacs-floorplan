import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('security consumer rejects incomplete evidence and isolates secret context', () => {
  const result = spawnSync('python3', ['scripts/test_security_evidence.py'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

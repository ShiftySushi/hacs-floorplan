import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
assert.equal(report.SchemaVersion, 2, 'Unexpected scanner report format');
// Trivy omits Results when a valid scan has no findings or applicable packages.
assert(report.Results === undefined || Array.isArray(report.Results), 'Invalid scanner results list');
const summary = { mode: 'REPORT-ONLY', scanner: 'Trivy 0.74.0', vulnerabilities: {}, fixAvailable: 0, noFixAvailable: 0, secrets: {} };
for (const result of report.Results || []) {
  for (const finding of result.Vulnerabilities || []) {
    const severity = ['UNKNOWN','LOW','MEDIUM','HIGH','CRITICAL'].includes(finding.Severity) ? finding.Severity : 'UNKNOWN';
    summary.vulnerabilities[severity] = (summary.vulnerabilities[severity] || 0) + 1;
    if (finding.FixedVersion) summary.fixAvailable++; else summary.noFixAvailable++;
  }
  for (const finding of result.Secrets || []) {
    const severity = ['UNKNOWN','LOW','MEDIUM','HIGH','CRITICAL'].includes(finding.Severity) ? finding.Severity : 'UNKNOWN';
    summary.secrets[severity] = (summary.secrets[severity] || 0) + 1;
  }
}
// Only counts leave the private temporary report. Never copy matches, source or context.
const text = JSON.stringify(summary, null, 2) + '\n';
writeFileSync(process.argv[3], text); console.log(text);

import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('evidence', Path(__file__).with_name('security_evidence.py'))
e = importlib.util.module_from_spec(spec)
spec.loader.exec_module(e)


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.report = {'SchemaVersion': 2, 'Results': [{'Target': 'package-lock.json', 'Type': 'npm', 'Class': 'lang-pkgs', 'Vulnerabilities': [{'VulnerabilityID': 'CVE-TEST', 'PkgName': 'example', 'InstalledVersion': '1.0', 'FixedVersion': '1.1', 'Severity': 'HIGH'}]}]}
        self.adapter = {'repository': 'owner/repo', 'owner': 'owner', 'required_targets': ['package-lock.json']}
        self.provenance = {'kind': 'source', 'scanned_at': '2026-09-15T00:00:00+00:00'}

    def test_consumer_preserves_identity_fix_candidate_and_review(self):
        state = e.consume(self.report, self.adapter, self.provenance, [], [])
        row = state['findings'][0]
        self.assertEqual(row['version'], '1.0')
        self.assertEqual(row['fixed_version'], '1.1')
        self.assertEqual(row['review_date'], '2026-09-29')
        self.assertEqual(row['applicability'], 'unknown')
        self.assertEqual(state['remediation']['root_causes'], ['dependency:example'])

    def test_missing_target_is_not_clean(self):
        self.report['Results'] = []
        with self.assertRaises(ValueError):
            e.consume(self.report, self.adapter, self.provenance, [], [])

    def test_image_requires_os_target(self):
        self.provenance['kind'] = 'image'
        with self.assertRaises(ValueError):
            e.consume(self.report, self.adapter, self.provenance, [], [])

    def test_secret_and_configuration_context_never_retained(self):
        raw = {'Results': [{'Secrets': [{'RuleID': 'key', 'Severity': 'HIGH', 'Match': 'SENSITIVE', 'Code': 'SENSITIVE'}], 'Misconfigurations': [{'ID': 'CFG', 'Severity': 'HIGH', 'CauseMetadata': {'Code': 'SENSITIVE'}, 'Message': 'SENSITIVE'}]}]}
        for kind in ['Secrets', 'Misconfigurations']:
            self.assertNotIn('SENSITIVE', json.dumps(e.safe_auxiliary(raw, kind)))

    def test_vulnerability_report_rejects_secrets(self):
        self.report['Results'][0]['Secrets'] = [{'Match': 'SENSITIVE'}]
        with self.assertRaises(ValueError):
            e.consume(self.report, self.adapter, self.provenance, [], [])

    def test_no_fix_is_not_upstream_unfixed(self):
        self.report['Results'][0]['Vulnerabilities'][0].pop('FixedVersion')
        state = e.consume(self.report, self.adapter, self.provenance, [], [])
        self.assertEqual(state['counts']['HIGH']['no_recorded_fix'], 1)
        self.assertEqual(state['findings'][0]['disposition'], 'unresolved-evidence')

    def test_duplicates_and_truncation_fail(self):
        for raw in [b'{"SchemaVersion":2,"SchemaVersion":2}', b'{"SchemaVersion":']:
            with self.assertRaises(ValueError):
                e.parse(raw)

    def test_execution_errors_propagate_without_command_output(self):
        with self.assertRaisesRegex(ValueError, 'command failed'):
            e.command(['python3', '-c', 'import sys;print("SENSITIVE");sys.exit(1)'])


if __name__ == '__main__':
    unittest.main()

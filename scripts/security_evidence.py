#!/usr/bin/env python3
"""Run pinned Trivy and consume evidence without retaining secret/config context."""
import argparse
from collections import Counter
from datetime import datetime, timedelta, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

spec = importlib.util.spec_from_file_location('summary', Path(__file__).with_name('summarise-trivy.py'))
summary = importlib.util.module_from_spec(spec)
spec.loader.exec_module(summary)


def command(argv, **kwargs):
    result = subprocess.run(argv, stdout=subprocess.PIPE, stderr=subprocess.PIPE, **kwargs)
    if result.returncode:
        # Scanner diagnostics can contain source/configuration context.
        raise ValueError('command failed; inspect privately, no raw scanner output published')
    return result.stdout


def parse(raw):
    if len(raw) > summary.MAX_BYTES:
        raise ValueError('oversized report')
    data = json.loads(raw, object_pairs_hook=summary.unique_object)
    if not isinstance(data, dict) or data.get('SchemaVersion') != 2:
        raise ValueError('invalid Trivy schema')
    if data.get('Results') is not None and not isinstance(data['Results'], list):
        raise ValueError('invalid results')
    return data


def safe_auxiliary(report, kind):
    """Allowlist only identifiers/severity/status, never messages, lines or matches."""
    rows = []
    for result in report.get('Results') or []:
        for finding in result.get(kind) or []:
            rows.append({key: summary.string(str(finding.get(field, '')))
                         for key, field in [('id', 'RuleID' if kind == 'Secrets' else 'ID'),
                                            ('severity', 'Severity'), ('status', 'Status')]})
    return rows


def consume(report, adapter, provenance, secrets, configs):
    state = summary.summarise(report)
    targets = [r.get('Target', '') for r in report.get('Results') or []]
    expected = adapter.get('required_targets', []) if provenance['kind'] == 'source' else []
    if any(not any(t.endswith(e) for t in targets) for e in expected):
        raise ValueError('expected dependency target was not analysed')
    if provenance['kind'] == 'image' and not any(r.get('Class') == 'os-pkgs' for r in report.get('Results') or []):
        raise ValueError('expected image OS packages were not analysed')
    review = (datetime.fromisoformat(provenance['scanned_at']) + timedelta(days=14)).date().isoformat()
    for row in state['findings']:
        row.update(disposition='unresolved-evidence', applicability='unknown', owner=adapter['owner'],
                   next_action='Trace parent/base and match existing Renovate PR; validate candidate and re-scan',
                   review_date=review)
    state.update(provenance=provenance, repository=adapter['repository'], mode='REPORT-ONLY',
                 coverage={'analysed_targets': targets, 'gaps': adapter.get('coverage_gaps', [])},
                 secrets={'count': len(secrets), 'counts': dict(Counter(r['severity'] for r in secrets))},
                 configurations=configs)
    # This is a real local result consumer. Central ingestion is separately activated.
    state['remediation'] = {'owner': adapter['owner'], 'review_date': review,
                           'root_causes': sorted(set(('base-image:' if r['class'] == 'os-pkgs' else 'dependency:') + r['package'] for r in state['findings'])),
                           'next_action': 'Review unresolved findings and coverage gaps; no risk acceptance implied',
                           'central_delivery': 'not-activated'}
    return state


def write_json(path, value):
    with path.open('x') as handle:
        json.dump(value, handle, indent=2, sort_keys=True)
        handle.write('\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('kind', choices=['source', 'image'])
    parser.add_argument('image', nargs='?')
    parser.add_argument('--trivy', required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    os.chdir(root)
    adapter = json.loads((root / 'scripts/security-adapter.json').read_text())
    sha = command(['git', 'rev-parse', 'HEAD']).decode().strip()
    if not re.fullmatch('[0-9a-f]{40}', sha):
        raise ValueError('missing source identity')
    identity = sha
    platform = 'source'
    if args.kind == 'image':
        if not args.image:
            raise ValueError('image required')
        info = json.loads(command(['docker', 'image', 'inspect', args.image]))[0]
        identity = info['Id']
        platform = info['Os'] + '/' + info['Architecture']
        if not re.fullmatch('sha256:[0-9a-f]{64}', identity):
            raise ValueError('invalid image identity')
    dest = root / '.trivy-reports' / args.kind
    dest.mkdir(parents=True, exist_ok=False)
    with tempfile.TemporaryDirectory(prefix='security-') as private:
        cache = str(Path(private) / 'cache')
        common = ['--quiet', '--cache-dir', cache, '--cache-backend', 'memory', '--format', 'json', '--exit-code', '0']
        scan = 'fs' if args.kind == 'source' else 'image'
        scope = []
        target = '.' if args.kind == 'source' else identity
        if args.kind == 'source':
            for path in adapter['skip_dirs']:
                scope += ['--skip-dirs', path]
        else:
            scope += ['--image-src', 'docker']
        options = common + scope
        vuln = parse(command([args.trivy, scan, *options, '--scanners', 'vuln', '--include-dev-deps', target]))
        # Full vulnerability records and package graph, with image environment/history omitted.
        summary.reject_secrets(vuln)
        retained = {k: v for k, v in vuln.items() if k in ['SchemaVersion', 'CreatedAt', 'ArtifactName', 'ArtifactType', 'Results']}
        secrets = safe_auxiliary(parse(command([args.trivy, scan, *options, '--scanners', 'secret', target])), 'Secrets')
        configs = safe_auxiliary(parse(command([args.trivy, scan, *options, '--scanners', 'misconfig', target])), 'Misconfigurations')
        version = json.loads(command([args.trivy, '--cache-dir', cache, '--version', '--format', 'json']))
        if version.get('Version') != '0.74.0':
            raise ValueError('unexpected scanner version')
        fingerprints = {str(p): hashlib.sha256(p.read_bytes()).hexdigest()
                        for name in ['.trivyignore', '.trivyignore.yaml', 'trivy.yaml', 'trivy-secret.yaml']
                        if (p := Path(name)).is_file()}
        provenance = dict(source_sha=sha, identity=identity, platform=platform, kind=args.kind,
                          scanned_at=datetime.now(timezone.utc).isoformat(), scanner=version,
                          options=options, policy_fingerprints=fingerprints,
                          adapter_sha256=hashlib.sha256((root / 'scripts/security-adapter.json').read_bytes()).hexdigest())
        state = consume(retained, adapter, provenance, secrets, configs)
        write_json(dest / 'vulnerabilities.json', retained)
        write_json(dest / 'state.json', state)
        text = summary.human_summary(state) + '\n'
        text += f"Secrets: {len(secrets)}; configuration findings: {len(configs)}. Raw contexts are never retained.\n"
        text += 'Coverage gaps: ' + '; '.join(adapter.get('coverage_gaps', [])) + '\n'
        text += 'Consumer: state.json records owner, root causes, next action and review date. Central delivery is not activated.\n'
        (dest / 'summary.txt').write_text(text)
        print(text)
        if os.environ.get('GITHUB_STEP_SUMMARY'):
            with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as handle:
                handle.write(text)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError, RecursionError):
        print('Security evidence incomplete: execution, identity, coverage or report failure.', file=sys.stderr)
        sys.exit(2)

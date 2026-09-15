#!/usr/bin/env python3
"""Summarise vulnerability-only Trivy v2 JSON; never infer coverage or policy."""
import argparse
import json
from pathlib import Path
import sys

SEVERITIES = ("CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN")
MAX_BYTES = 32 * 1024 * 1024


def string(value, required=False):
    if not isinstance(value, str) or len(value) > 4096:
        raise ValueError("invalid string field")
    if required and not value.strip():
        raise ValueError("missing identity field")
    if any(ord(char) < 32 or ord(char) == 127 for char in value):
        raise ValueError("control character in field")
    return value


def reject_secrets(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if key == "Secrets" and item:
                raise ValueError("secret-bearing report; scan secrets separately")
            reject_secrets(item)
    elif isinstance(value, list):
        for item in value:
            reject_secrets(item)


def summarise(report):
    if not isinstance(report, dict) or report.get("SchemaVersion") != 2:
        raise ValueError("expected Trivy schema version 2")
    reject_secrets(report)
    results = report.get("Results")
    if results is None:
        # Trivy may omit results when nothing applicable was detected.
        results = []
    if not isinstance(results, list):
        raise ValueError("invalid Results")
    findings = {}
    targets = set()
    for result in results:
        if not isinstance(result, dict):
            raise ValueError("invalid result")
        if result.get("Misconfigurations") or result.get("Licenses") or result.get("CustomResources"):
            raise ValueError("non-vulnerability results require a separate consumer")
        target = string(result.get("Target"), required=True)
        kind = string(result.get("Type", ""))
        origin = string(result.get("Class", ""))
        targets.add((target, kind, origin))
        vulnerabilities = result.get("Vulnerabilities")
        if vulnerabilities is None:
            vulnerabilities = []
        if not isinstance(vulnerabilities, list):
            raise ValueError("invalid Vulnerabilities")
        for vuln in vulnerabilities:
            if not isinstance(vuln, dict):
                raise ValueError("invalid vulnerability")
            row = {
                "target": target, "type": kind, "class": origin,
                "id": string(vuln.get("VulnerabilityID"), required=True),
                "package": string(vuln.get("PkgName"), required=True),
                "version": string(vuln.get("InstalledVersion"), required=True),
                "package_path": string(vuln.get("PkgPath", "")),
                "severity": string(vuln.get("Severity", "UNKNOWN")).upper(),
                "fixed_version": string(vuln.get("FixedVersion", "")).strip(),
                "status": string(vuln.get("Status", "")),
            }
            if row["severity"] not in SEVERITIES:
                raise ValueError("invalid severity")
            key = tuple(row[name] for name in ("target", "type", "class", "id", "package", "version", "package_path"))
            if key in findings and findings[key] != row:
                raise ValueError("conflicting duplicate vulnerability")
            findings[key] = row
    rows = [findings[key] for key in sorted(findings)]
    counts = {}
    for severity in SEVERITIES:
        selected = [row for row in rows if row["severity"] == severity]
        fixed = sum(bool(row["fixed_version"]) for row in selected)
        counts[severity] = {"total": len(selected), "fix_candidates": fixed,
                            "no_recorded_fix": len(selected) - fixed}
    return {"schema_version": 1, "coverage": "requires-caller-verification",
            "result_targets": len(targets), "occurrences": len(rows),
            "unique_ids": len({row["id"] for row in rows}),
            "counts": counts, "findings": rows}


def human_summary(state):
    lines = ["Trivy vulnerability occurrences (coverage requires verification):"]
    for severity, counts in state["counts"].items():
        lines.append(f"{severity}: {counts['total']} / fix candidates: {counts['fix_candidates']} / no recorded fix: {counts['no_recorded_fix']}")
    lines.append(f"Targets: {state['result_targets']}; unique identifiers: {state['unique_ids']}")
    lines.append("Fixed versions are candidates, not verified remediations. Policy and applicability are not evaluated.")
    return "\n".join(lines)


def load_report(path):
    with path.open("rb") as handle:
        raw = handle.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError("report exceeds size limit")
    return json.loads(raw, object_pairs_hook=unique_object)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    parser.add_argument("--json-output", type=Path)
    args = parser.parse_args()
    try:
        state = summarise(load_report(args.report))
        if args.json_output:
            if args.json_output.resolve() == args.report.resolve():
                raise ValueError("output would overwrite input")
            # Exclusive creation prevents stale or concurrent report replacement.
            with args.json_output.open("x", encoding="utf-8") as handle:
                json.dump(state, handle, indent=2, sort_keys=True)
                handle.write("\n")
        print(human_summary(state))
    except (OSError, ValueError, RecursionError):
        # Never echo parser snippets or input paths from possibly sensitive reports.
        print("ERROR: invalid/unsupported report or unavailable output; security evidence incomplete", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())

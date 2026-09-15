#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Pinned upstream Linux binary; no job-workspace bind into a sibling container.
trivy_version=0.74.0
trivy_sha256=2ae6fe3ee734b7fdf11335663e18c75ea12dccc76062f09f164a3b0f8be4371a
scan_tmp=$(mktemp -d)
trap 'rm -rf "$scan_tmp"' EXIT
chmod 700 "$scan_tmp"
curl --fail --silent --show-error --location --retry 3 \
  "https://github.com/aquasecurity/trivy/releases/download/v${trivy_version}/trivy_${trivy_version}_Linux-64bit.tar.gz" \
  --output "$scan_tmp/trivy.tar.gz"
printf '%s  %s\n' "$trivy_sha256" "$scan_tmp/trivy.tar.gz" | sha256sum --check --status
tar -xzf "$scan_tmp/trivy.tar.gz" -C "$scan_tmp" trivy
if [ "$#" -eq 0 ]; then set -- source; fi
python3 scripts/security_evidence.py "$@" --trivy "$scan_tmp/trivy"

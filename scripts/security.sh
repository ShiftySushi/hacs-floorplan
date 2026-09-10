#!/usr/bin/env bash
set -euo pipefail
# REPORT-ONLY: findings do not fail; download, checksum, scanner and report errors do.
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
"$scan_tmp/trivy" fs --scanners vuln,secret --format json --exit-code 0 \
  --cache-dir "$scan_tmp/cache" --cache-backend memory \
  --skip-dirs .git --skip-dirs node_modules --skip-dirs floorplans \
  --skip-dirs ci-reports --skip-dirs test-results --skip-dirs playwright-report \
  --output "$scan_tmp/raw.json" .
mkdir -p ci-reports
node scripts/security-summary.mjs "$scan_tmp/raw.json" ci-reports/trivy-summary.json

# Security state

Both CI hosts retain `.trivy-reports/source/` for 30 days: full vulnerability records for all severities/fix states, consumed `state.json`, provenance and a human summary. The consumer requires the npm lockfile target; scanner/report/consumer failures block the existing security job and pr-gate. Findings remain REPORT-ONLY with no new suppressions, risk acceptance or severity enforcement.

The scanned public repository includes the committed distribution. Private `floorplans/`, dependencies installed in `node_modules/` and generated test/report directories remain excluded as before. This is a HACS JavaScript package, so no container is invented. Live Home Assistant and private asset security remain unverified.

Initial exact-head findings and baseline triage are pending this migration's first scan. Findings retain their identifier, version, target, candidate fixed version or no recorded fix, unknown applicability, owner `shiftysushi`, next action and a 14-day review date. No open Forgejo Renovate PR existed at the initial inspection.

The local consumer is tested for coverage failure, malformed input, conflicting data, secret isolation and failure propagation. Central daily ingestion/routing is not activated; uploads are not proof of an operational remediation service. Any enforcement ratchet needs separate approval and trusted comparable baseline evidence.

The existing PR/main quality, reproducible distribution, browser and security checks remain. GitHub HACS validation and publication/privacy boundaries remain unchanged. No release or deployment is added.

The vulnerability parser is copied from the shared `summarise-trivy.py` helper, reviewed 15 September 2026, without a personal-checkout runtime dependency.

# Project commands and CI

- Node.js 22; `npm ci --ignore-scripts` installs locked development tooling only.
- `npm run check` checks syntax, HACS packaging and the committed build's reproducibility.
- `npm test` runs unit and publication-boundary regression tests.
- `npm run test:browser` runs desktop/mobile Chromium tests against the committed distribution and fictional demo. Install Chromium with `npx playwright install --with-deps chromium` in CI.
- `npm run build` generates `dist/hacs-floorplan.js`; never edit this file directly.
- `npm run check:public` validates indexed files; `node scripts/check-public.mjs --history <full-sha>` validates the complete reachable history.
- Enable `.githooks` on each checkout with `git config core.hooksPath .githooks`. Never bypass the private-asset guard to publish personal plans.
- Everything under `floorplans/` is private and ignored, including derived geometry, models, screenshots and the personal demo. Public fixtures must be fictional and independent of personal geometry.
- `.forgejo/workflows/ci.yml` runs official self-hosted validation on `build-server`. `.github/workflows/ci.yml` validates the public HACS repository using hosted runners and the official HACS validator.
- `CI / pr-gate (pull_request)` on Forgejo requires quality, browser and security success. GitHub also requires HACS repository validation.
- Trivy is REPORT-ONLY. Scanner/download/report failures fail CI; findings do not. Raw secret reports stay in a temporary private directory and are deleted; only counts are logged or uploaded. The scanner uses a job-local cache; no shared runner configuration is required.
- CI tests never contact live Home Assistant or use personal plans. No release, mirror push or deployment occurs in CI. Publish only the checked public commit explicitly to each remote.

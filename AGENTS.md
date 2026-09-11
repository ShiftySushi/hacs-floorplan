# Project commands and CI

- Node.js 22; `npm ci --ignore-scripts` installs locked Three.js and development tooling (esbuild and Playwright).
- `npm run check` checks syntax, HACS packaging and the committed build's reproducibility.
- `npm test` runs unit and publication-boundary regression tests.
- `npm run test:browser` runs desktop/mobile Chromium tests against the committed distribution and fictional demo. Install Chromium with `npx playwright install --with-deps chromium` in CI.
- `npm run build` uses esbuild to generate the single self-contained `dist/hacs-floorplan.js`, including Three.js and licence notices; never edit this file directly. `npm run check` enforces a reproducible distribution below 900,000 bytes. Do not introduce CDN imports or unbundled runtime assets.
- `npm run check:public` validates indexed files; `node scripts/check-public.mjs --history <full-sha>` validates the complete reachable history.
- Enable `.githooks` on each checkout with `git config core.hooksPath .githooks`. Never bypass the private-asset guard to publish personal plans.
- Everything under `floorplans/` is private and ignored, including derived geometry, models, screenshots and the personal demo. Public fixtures must be fictional and independent of personal geometry.
- The public `/demo/` uses temporary fictional configuration. The private `/floorplans/demo.html` shares edits through the LAN dev server (`node floorplans/serve-app.mjs`, port 8124). Its authoritative scene is `floorplans/standalone-current.json`; browser storage is recovery-only. Read `/floorplans/api/scene` and update with PUT using its ETag in `If-Match`, JSON content type and same-origin Origin header so concurrent edits are rejected rather than overwritten. Preserve private server backups and browser recovery copies. Portable scene exports contain images and entity IDs and must remain private.
- Scene positions use floor-local percentages; furniture sizes, wall dimensions and openings use metres. Preserve `scene_version` migration, calibration and rotation behaviour when changing renderers or the editor.
- `.forgejo/workflows/ci.yml` runs official self-hosted validation on `build-server`. `.github/workflows/ci.yml` validates the public HACS repository using hosted runners and the official HACS validator.
- `CI / pr-gate (pull_request)` on Forgejo requires quality, browser and security success. GitHub also requires HACS repository validation.
- `npm run check` validates the full approved MIT licence by digest at the exact checkout revision. This replaces only the HACS validator's default-branch licence metadata check; all other HACS checks remain enabled. Review the complete licence before changing its expected digest.
- Trivy is REPORT-ONLY. Scanner/download/report failures fail CI; findings do not. Raw secret reports stay in a temporary private directory and are deleted; only counts are logged or uploaded. The scanner uses a job-local cache; no shared runner configuration is required.
- CI tests never contact live Home Assistant or use personal plans. No release, mirror push or deployment occurs in CI. Publish only the checked public commit explicitly to each remote.

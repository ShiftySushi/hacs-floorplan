# Floorplan Card: project notes

Technical notes for working on the card. Installation and usage are in [README.md](README.md); exact commands, validation boundaries and the delivery workflow are in [AGENTS.md](AGENTS.md).

## Development and preview

Requires Node.js 22+. Three.js is bundled into the card; the installed card does not fetch a renderer or artwork from a CDN. esbuild and Playwright are locked development dependencies.

```sh
npm ci --ignore-scripts
npm run build
npm run check
npm test
node scripts/models.mjs  # regenerate SVG outlines and OBJ models
npm run demo
```

Open `http://127.0.0.1:8125/demo/` for the fictional demo. `npm run demo` starts `scripts/serve-demo.mjs`, the same allow-listed server the browser tests use: it binds to localhost and serves only the public demo, its helper modules and the built card, never `floorplans/`. Set `PORT` to use another port.

**Live view** fits the floorplan into the available screen, with compatible lighting controls beside it on wider screens. **Edit layout** opens the layout studio. Simulated presence and service failures are available in the demo toolbar. The public demo never connects to a live Home Assistant server and resets on reload.

The optional model command requires private `floorplans/models/geometry.json` and is not part of the plugin build. The optional private editor uses a shared scene file through its own development server; browser storage is a recovery copy. See [AGENTS.md](AGENTS.md) for the private editor's persistence contract. Export a portable scene for a separate backup or transfer to Home Assistant.

## Build and bundle budget

The `src/` modules separate light service rules, scene geometry, 2D/3D rendering and guided setup. `scripts/build.mjs` uses esbuild to bundle a single self-contained `dist/hacs-floorplan.js`, including licence notices. Run the build after changing source; do not edit the distribution directly.

`npm run check` requires a reproducible build below 1,000,000 bytes. The budget is a growth alarm, not a platform limit: the file is served compressed (about 330 KB with gzip) and loaded once per dashboard session. Bundled Three.js accounts for roughly 600 KB before packing, and shaders, CSS and furniture models are already packed losslessly, so the remaining headroom is for the card's own code. Before raising the budget again, check what the growth is and whether it belongs in the card.

## Diorama renderer (not yet selectable)

The `src/diorama-*.js` modules are a fixed-angle illustrated renderer being developed alongside the existing views. Nothing in `src/index.js` imports it yet, so it is not in `dist/`, adds nothing to the bundle and cannot be chosen in the card or editor.

- `diorama-renderer.js` builds one storey or the whole house from the same scene the card uses. The whole house rests as a true stack; hover, click, Enter or Space slides the storeys sideways into a stepped row, and Escape stacks them again.
- `diorama-cutaway.js` decides every wall height for the viewing direction. It is pure geometry with no Three.js dependency and is covered by `tests/diorama-cutaway.test.mjs`.
- `diorama-lightmap.js` paints lamp light into one small texture instead of adding a light per fitting; `diorama-ink.js` draws outlines from depth and normals; `diorama-merge.js` collapses static meshes per material.
- `diorama-assets*.js` and `diorama-stairs.js` hold the furniture and stair models. Types without a diorama model fall back to `furniture3d.js`.

Before it can become a view it still needs wiring into the card (markers, light picking, the layout editor), a decision on the bundle budget, browser tests and a check on tablet hardware.

## Private assets

Keep personal images, outlines, traced geometry, models and exported dashboard configurations under `floorplans/`. This entire directory is ignored by Git and excluded from exports. These assets are not bundled in `dist/` and are not required to build or install the card.

On a personal checkout, the original images and derived assets can remain under `floorplans/`; the private demo is at `/floorplans/demo.html` and model previews at `/floorplans/models/`. Those local files are intentionally absent from a fresh clone. Back them up separately through your normal private backup process.

## Git remotes and publication checks

`origin` is the primary Forgejo repository and `github` is the public HACS repository. Pushes are explicit to each remote; there is no automatic mirror of working-directory files.

```sh
git config core.hooksPath .githooks
git config remote.pushDefault origin
npm run check:public
```

The pre-commit hook checks indexed files, including files force-added past `.gitignore`. The pre-push hook checks every reachable historical blob, so deleting a private file from the latest commit does not make a leaking history acceptable. Only approved source, distribution, documentation, tests and fictional demo paths pass; embedded image payloads are also rejected. These local hooks must be enabled on each clone and can be bypassed, so they complement careful review rather than provide a server-side guarantee.

Delivery to both hosts, including stopping points and authorisation boundaries, is defined in [Delivery to both hosts](AGENTS.md#delivery-to-both-hosts).

## Integration references

Integration follows Home Assistant's [custom card contract](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/), [light capabilities](https://developers.home-assistant.io/docs/core/entity/light/) and [image upload API](https://github.com/home-assistant/frontend/blob/dev/src/data/image_upload.ts).

# Floorplan Card

A Home Assistant dashboard card for placing lights and sensors on your floorplan, selecting lights individually or as a group, and seeing room lighting and presence at a glance.

![Fictional floorplan used by the interactive demo](demo/sample.svg)

The example above is fictional. Personal floorplans remain in your own Home Assistant configuration.

## Install locally

1. Copy `dist/hacs-floorplan.js` to Home Assistant's `/config/www/hacs-floorplan.js`.
2. In **Settings → Dashboards → Resources**, add `/local/hacs-floorplan.js` as a **JavaScript module**. Advanced mode may be needed to show Resources.
3. Reload the browser, edit your dashboard, select **Add card**, and search for **Floorplan Card**.
4. Follow the visual editor and press Home Assistant's **Save** button when finished. No YAML configuration is required.

## Install through HACS

Add `https://github.com/ShiftySushi/hacs-floorplan` to HACS **Custom repositories** with type **Dashboard**. Install **Floorplan Card** and reload the browser. If HACS does not register the resource automatically, add `/hacsfiles/hacs-floorplan/hacs-floorplan.js` as a JavaScript module in Dashboard Resources.

The distribution filename matches the repository name. [HACS supports installation from the default branch without a versioned release](https://www.hacs.xyz/docs/publish/plugin/). The GitHub distribution contains only plugin code and the fictional demo; personal floorplans are supplied locally through the editor.

## Guided setup

1. **Floors:** add storeys and choose your floorplan images. PNG, JPEG and WebP use Home Assistant's authenticated image upload. Small SVG files are embedded in the dashboard configuration. An existing `/local/` or HTTPS image URL is also supported. Rotate by 90° buttons or any angle from 0–359°. Room boundaries and entities rotate together, with labels remaining upright.
2. **Rooms:** click the inside corners of a room in order and finish its polygon. Undo, cancel and redraw controls are provided; coordinate inputs are available for keyboard placement. Assign the room's lights and optional motion/occupancy/presence binary sensors.
3. **Entities:** select a light, sensor or binary sensor and click its position. Select a marker to reposition it, or adjust its coordinates. The editor can place assigned room lights automatically for you to fine-tune.
4. **Groups:** create named selections spanning any rooms or floors. Choose the floor for new members; any unpositioned lights receive individual markers that you can fine-tune in step 3.
5. **Review:** check the summary and save the dashboard. Reopen the card editor whenever you want to change the layout.

Room overlays show **Lit** when any assigned light is on and **Dark** when all assigned lights are known to be off. Missing or unavailable lights produce **Lighting unknown** when none is known to be on. Presence is independent of lighting: any assigned binary sensor being `on` shows presence. Missing sensors produce **Presence unknown**, rather than a false empty-room indication. Room status is available as text as well as colour.

Tap lights to add/remove them from a selection; use room/group buttons for a named selection. Selections persist across floor changes, and the control panel states the total selection. Clear resets it. Sensor markers open Home Assistant's normal entity detail dialog.

Power works for all available selected lights. Brightness, RGB colour and white temperature appear only for compatible selections, with an eligible count shown. Colour is available for RGB, RGBW, RGBWW, HS and XY colour-capable lights, not plain dimmers or tunable-white-only lights. Temperature is clamped to each light's supported range. Mixed selections apply each setting only to compatible lights. Initial control values represent the first compatible light, not a group average. Commands use individual member entities, not Zigbee hardware groupcast.

## Floorplan assets

Keep personal images, outlines, traced geometry, models and exported dashboard configurations under `floorplans/`. This entire directory is ignored by Git and excluded from exports. These assets are not bundled in `dist/` and are not required to build or install the card.

In the card editor, choose **Floors → Choose floorplan image**, then select a local outline. The image is uploaded to your Home Assistant instance or, for a small SVG, stored directly in your dashboard configuration. There is no need to upload it to GitHub, put it in the plugin directory, or edit YAML. Plugin updates leave those personal assets separate from the installed code.

On a personal checkout, the original images and derived assets can remain under `floorplans/`; the private demo is at `/floorplans/demo.html` and model previews at `/floorplans/models/`. Those local files are intentionally absent from a fresh clone. Back them up separately through your normal private backup process.

The public demo uses a fictional layout and contains no traced personal room boundaries or dimensions.

## Git remotes and publication checks

`origin` is the primary Gitea repository and `github` is the public HACS repository. Pushes are explicit to each remote; there is no automatic mirror of working-directory files.

```sh
git config core.hooksPath .githooks
git config remote.pushDefault origin
npm run check:public
```

The pre-commit hook checks indexed files, including files force-added past `.gitignore`. The pre-push hook checks every reachable historical blob, so deleting a private file from the latest commit does not make a leaking history acceptable. Only approved source, distribution, documentation, tests and fictional demo paths pass; embedded image payloads are also rejected. These local hooks must be enabled on each clone and can be bypassed, so they complement careful review rather than provide a server-side guarantee.

## Development and preview

Requires Node.js 22+. The card has no runtime dependencies; Playwright is a locked development dependency for browser validation. Python 3 serves the interactive local demo.

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build
node scripts/models.mjs  # regenerate SVG outlines and OBJ models
npm run demo
```

Open `http://127.0.0.1:8124/demo/` for the fictional demo with simulated lights, setup, presence and service failures. The optional model command requires private `floorplans/models/geometry.json` and is not part of the plugin build. The demos never connect to a live Home Assistant server. Their configurations are temporary and reset on reload.

The `src/` modules separate light service rules, room geometry/state, rendering and setup. `scripts/build.mjs` assembles the browser module into `dist/hacs-floorplan.js`. Run the build after changing source; do not edit the distribution directly.

## References

The [Spatial Lights Card](https://github.com/Mihonarium/hass-spatial-lights-card) is the interaction reference supplied for this project. This implementation is independent and does not import its source. Integration follows Home Assistant's [custom card contract](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/), [light capabilities](https://developers.home-assistant.io/docs/core/entity/light/) and [image upload API](https://github.com/home-assistant/frontend/blob/dev/src/data/image_upload.ts).

Live Home Assistant installation, authenticated image upload, HACS delivery and physical-device behaviour still require integration verification.

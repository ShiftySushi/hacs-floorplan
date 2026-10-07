# Changelog

Notable changes to Floorplan Card. Versions follow [Semantic Versioning](https://semver.org/); while the card is below 1.0, a minor version may change or remove behaviour.

## 0.2.0 - 2026-10-07

The card's interior is now one illustrated, fixed-angle view. This replaces every earlier live style, so it changes how an existing dashboard looks.

### Changed

- **Breaking:** the 2D, orbiting 3D, Pokémon, Zelda and Sims-like live styles are retired. A scene saved with any of them loads in the illustrated view; no configuration needs editing and nothing is removed from it.
- The whole house rests as a stack and spreads into a stepped row when the pointer rests on it, on a click, or with Enter. A Display setting puts the ground floor on the left.
- The **External** tab keeps the orbiting 3D view. The 2D plan remains as the layout editor's drawing surface and as the fallback where WebGL is unavailable.
- The **Slow idle rotation** display setting now says that it applies to the External view only.

### Added

- Lights fade between states, wall panels play their Breathe, Wave or Rainbow effect, and addressable strips show how much of their length is lit.
- Radiators glow while heating, doors with a contact sensor stand open or shut, printers and presence sensors show their status, and TVs with `tv_scenes` show those stills.
- Framed pictures follow their media player, and turn between landscape and portrait on a click.
- The view follows the time of day: rooms brighten as the sun rises and daylight falls through outside windows and rooflights. Click a blind to draw or open it.
- Sloping ceilings and fitted wardrobe fronts are drawn. A slope that would cover the room is drawn see-through.
- Things hung on a wall that the view cuts away are drawn as a faint ghost instead of disappearing.

### Not yet in the illustrated view

- Follow mode and single-room isolation.
- Uploaded Pokémon or Zelda backgrounds and furniture sprites (`style_images`). They stay in your configuration but are not drawn.
- Weather effects, which appear only in the External view.

### Upgrading

Update through HACS and reload the browser. Your configuration is not changed by this release. This is the first versioned release, so HACS has no earlier version to return to; later releases can be rolled back to this one from HACS.

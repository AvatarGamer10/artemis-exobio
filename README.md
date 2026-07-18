# ARTEMIS — Exobiology Companion for Elite Dangerous

Desktop app (Electron + React) that reads the Elite Dangerous: Odyssey journal in
real time and assists you through the entire exobiology loop, with an in-game
overlay for playing and a full window for planning.

![version](https://img.shields.io/badge/version-0.11.0-orange) ![platform](https://img.shields.io/badge/platform-Windows-blue)

🇪🇸 [Léeme en español](README.es.md)

## Features

- **System**: linear map of scanned bodies (bio in green), biological signals per
  body, genus checklist with clonal colony distances.
- **Species prediction**: when you scan a body, Artemis crosses its atmosphere,
  temperature, gravity, class and volcanism against the known conditions of ~90
  species and tells you what can live there and what it pays — before you land.
  Automatically narrowed down after the DSS scan.
- **Online context**: EDSM (virgin system? → possible first discovery) and Canonn
  (bio already reported by the community) on every jump.
- **Targets**: Spansh body search for premium species (≥9M cr) near your position,
  with one-click system copy for plotting.
- **Route**: plot with Spansh from your current system using your ship's real jump
  range (read from the journal), copy your build as SLEF for the Galaxy Plotter,
  import JSON routes, and track progress live (window + overlay) on every jump.
- **Sampling assistant**: Genetic Sampler-style radial dial with live colony
  distance from Status.json, plus visual and audio cues when you clear the radius.
- **Surface mini-map**: breadcrumb trail of your walk, sample positions ①②,
  to-scale colony radius circle and your heading — overlay and window.
- **Discord feed**: paste your squadron's webhook and Artemis posts your new
  variants, legendary samples and each session summary.
- **Discord Rich Presence**: your profile shows live what you are exploring and
  sampling (requires creating a free app on the Discord developer portal and
  pasting its ID).
- **Wallet**: unsold value, death-loss warning, first logged (x5) estimation.
- **Collection**: flora Pokédex — the full species catalog with rarity (common →
  legendary glow), every color variant you collect with date and place, and a HUD
  effect + sound when you scan a variant you don't own yet.
- **Library**: permanent, searchable record of everything you have sampled, with
  CSV export and first logged confirmed on sale (✪).
- **Statistics**: credits per day (30 days), collection completion by genus,
  records (best day, top species, confirmed first logged, lifetime total).
- **System tray**: minimizing hides to the tray; quick menu with overlay and quit.
- **Backup**: export/import your entire collection (imports merge without losing
  anything).
- **Windows notifications**: jackpot detected, legendary sample, new variant and
  session summary (can be disabled).
- **Sound alerts**: sample completed, jackpot fanfare (≥15M), colony radius
  cleared, low fuel. Synthesized — no audio files.
- **Inara**: CMDR profile with ranks and progress (personal API key).
- **Overlay** always on top (`Ctrl+Alt+O` show/hide, `Ctrl+Alt+M` click-through)
  plus a full window. Customizable theme (accent color, opacity), ES/EN language,
  welcome tour.

## Installation

Download `Artemis-Setup-<version>.exe` from
[Releases](https://github.com/AvatarGamer10/artemis-exobio/releases) and run it.
One-click install; no Node required.

On startup the app checks Releases for a newer version and offers to download and
install it automatically.

> Windows SmartScreen may warn because the installer is unsigned: choose
> "More info → Run anyway".

## Development

```
npm install
npm run dev        # start the app
npm run simulate   # generate a fake journal in sim-journal/ to test without the game
```

With `npm run dev` running, `http://localhost:5173/index.html` renders the UI with
demo data in a regular browser (add `?tour=1` to preview the welcome tour).

## Installer

```
npm run dist
```

Produces `dist/Artemis-Setup-<version>.exe` (NSIS, unsigned).

## Notes

- The overlay requires the game in **Borderless** mode, not exclusive fullscreen.
- Species values and prediction rules come from community data
  (Canonn/Bioforge/Spansh) and are estimates.
- Real "first footfall" is not available from any public API; the proxy used is
  "system not present on EDSM".

## Acknowledgements

Artemis stands on the shoulders of the Elite Dangerous community:
[EDSM](https://www.edsm.net), [Canonn Research](https://canonn.science),
[Spansh](https://spansh.co.uk) and [Inara](https://inara.cz). Thank you for
keeping the galaxy mapped. o7

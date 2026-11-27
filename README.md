# Gobble Run — Great Turkey Escape

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/cryoras/makefun-turkey-game/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/cryoras/makefun-turkey-game/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

![License: MIT](https://img.shields.io/badge/license-MIT-536d53)
![Node 22](https://img.shields.io/badge/node-22-bd4e21)

A little bird. A big getaway. An original 3D turkey runner through an autumn farmyard,
a cluttered barn yard and a very hazardous kitchen. Dodge the dinner preparations,
gather corn and reach the forest at 1,500 meters before three stumbles end your escape.

Built for [the make.fun turkey-run-game-01 bounty](https://make.fun/bounty/turkey-run-game-01).

## Play locally

Use Node 22.18+ (or Node 24) and run:

```sh
node serve.ts
```

Open **http://localhost:8080**. No install, build step, account or internet connection is needed.

| Control | Action |
| --- | --- |
| Enter / Start button | Begin the escape |
| ← → / A D | Steer freely across the three lanes |
| Space / W / ↑ | Jump |
| Shift | Dash: +60% speed for 1 second, 3-second cooldown, push farmer back 4 m |
| P / Escape | Pause or resume |
| R | Start again |
| M | Mute / unmute |
| Drag across the world | Steer with mouse or touch |
| Click the world / Jump button | Jump |

Jump fences, bales and carts; avoid hot ovens and crossing knives. Mud slows you unless
you jump over it. Each hit costs a heart and brings the farmer 6 meters closer. Corn
adds 50 points and a little breathing room, rare golden feathers add 150, and very rare
hearts restore one life (up to three). The speeds rise from 8 to 11 to 14 m/s at 500 and
1,000 m. Each new zone gives a 250-point bonus. Your score is distance plus collection
points and zone bonuses. Best score stays on this browser in localStorage.

## Technology

- Vendored **three.js**, loaded through a local import map. All characters, scenery,
  obstacles and collectibles are original meshes built from geometric primitives.
- Vendored **anime.js** for a small HUD entrance animation.
- WebAudio synthesis for gobbles, collisions, collectibles and slow pentatonic music.
- Seeded world generation; the screenshot autopilot uses the actual world simulation.
- A perspective Canvas 2D renderer uses the same game rules if WebGL is unavailable.
- SwiftShader / llvmpipe detection disables antialiasing and shadows and uses pixel ratio 1.
- No external runtime requests, image assets, fonts or audio files.

`?shot=start&seed=1`, `?shot=play&seed=1`, `?shot=chase&seed=1` and
`?shot=end&seed=1` expose repeatable, frozen frames after a simulated run. Readiness is
available as `window.__shotReady`. `window.__renderer3d` identifies the active renderer.
For local testing, `window.__game` exposes `snapshot`, `start`, `jump`, `dash`, `step` and
`forceEnd(won)` alongside the current world. Debug hooks make no requests.

## Local export

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies the complete game and screenshots and writes `out/dossier.json` with the
unchanged vendored make.fun library. No submission or upload is performed.

MIT licensed; see LICENSE. Vendored library license notices remain in their source files.

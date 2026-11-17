[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/0xdirosa/best-game/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/0xdirosa/best-game/reward.svg)](https://make.fun/bounty/best-game-01)

# STARFALL

A neon space arcade game for [make.fun's best-game-01 bounty](https://make.fun/bounty/best-game-01): pilot a collector drone, catch falling star shards, dodge meteors, and chain combos under a rising meteor storm.

Catch Star Shards — each one is worth 10 × your combo. Dodge the Meteors — 3 hits and the run ends. Grab SHIELD to block one hit and SLOW-MO to bend time. Combo climbs ×1 to ×5 as you catch stars in a row; a hit resets it. Levels rise every 12 seconds up to level 12, each with its own name, faster falls and denser storms.

## Play

Serve the game (static files, no network, no build step):

```sh
node serve.ts
```

Then open http://localhost:8080 — move with ← → or A D, or drag with mouse / touch. Space or click to start, P to pause.

Or open `game/index.html` directly from any static server.

## How it is built

Plain HTML + canvas + ES modules, standard library only — no engine, no assets, no network. Sound is synthesized with WebAudio (`game/src/audio.js`). The source is split by job: `config.js` (tuning), `world.js` (rules: paddle, falling things, combo, power-ups, levels), `render.js` (drawing, particles, screen shake), `audio.js` (synth), `input.js`, `random.js`, `shots.js` (deterministic screenshot staging), `main.js` (loop + screens).

`main.ts` (Node 22) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` — the program the bounty grades. It is deterministic: two runs write byte-identical output.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The four screenshots in `screenshots/` are real renders of the game itself (title, play, power-up moment, game over), staged deterministically with `?shot=...&seed=7` — see `shots.json`.

Referral code: `e1r32wxx`

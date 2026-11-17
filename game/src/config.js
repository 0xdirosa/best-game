// STARFALL tuning: every number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below
// depends on the screen size.
export const FIELD = { width: 1280, height: 720, groundY: 664 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  width: 84,
  height: 30,
  speed: 620,
  invulnerable: 1.5,
};

export const LIVES = 3;

/** Falling meteors: the hazard. Speed and spawn rate grow with the level. */
export const METEOR = {
  minWidth: 42,
  maxWidth: 104,
  height: 40,
  speed: 250,
  speedPerLevel: 32,
  speedJitter: 100,
  interval: 0.55,
  intervalScale: 0.88,
  minInterval: 0.13,
  dodgePoints: 1,
};

/** Star shards: the catch. Each catch is worth 10 points times the combo multiplier. */
export const STAR = {
  size: 26,
  speed: 200,
  speedPerLevel: 15,
  interval: 1.15,
  intervalJitter: 0.7,
  points: 10,
};

/** Power-ups: a shield that eats one hit, and slow-mo that halves fall speed for 5 s. */
export const POWERUP = {
  size: 30,
  speed: 170,
  interval: 13,
  slowSeconds: 5,
};

/** Combo: every 3rd star in a row raises the multiplier, up to x5. A hit resets it. */
export const COMBO = { perStep: 3, max: 5 };

/** Seconds of play per level, and the last level: speeds and spawn rates stop growing there. */
export const LEVEL = { seconds: 12, max: 12 };

/** Names the level banner shows as the fall gets fiercer. */
export const LEVEL_NAMES = [
  'FIRST LIGHT', 'METEOR SHOWER', 'STAR STORM', 'COMET RAIN', 'NEBULA RUSH',
  'VOID SURGE', 'SOLAR FLARE', 'DARK MATTER', 'SUPERNOVA', 'EVENT HORIZON',
  'GALAXY CORE', 'STARFALL PRIME',
];

/** How many falling things can exist at once; the pool is allocated once, at boot. */
export const POOL_SIZE = 72;

export const PALETTE = {
  backdrop: '#05010f',
  skyTop: '#0b0630',
  skyMid: '#1a0b4a',
  skyBottom: '#2a1048',
  nebulaPink: '#ff4fd8',
  nebulaCyan: '#22d3ee',
  nebulaViolet: '#7c3aed',
  ground: '#12082e',
  player: '#4de8ff',
  playerCore: '#e8fbff',
  meteor: '#ff5a4e',
  meteorDark: '#7a1f1a',
  star: '#ffd94d',
  starCore: '#fff7cc',
  shield: '#4dff9d',
  slow: '#c084fc',
  panel: '#140a2e',
  panelEdge: '#4de8ff',
  text: '#f2f0ff',
  muted: '#a89fd0',
  combo: '#ffd94d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'starfall.best';

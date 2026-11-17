// The screenshot scenes behind ?shot=start|play|power|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot (look ahead each way the drone could move, keep clear of meteors, chase
// the lowest star shard when that is safe), so the frame is what a real game looks
// like and the same seed always gives the same frame. The power scene then stages
// the wow moment on top of a real run: shield up, slow-mo running, a hot combo and
// a cluster of stars diving at the drone.
import { FIELD, PLAYER, POWERUP, STAR, STEP } from './config.js';
import { EVENT_OVER, KIND_METEOR, KIND_SHIELD, KIND_SLOW, KIND_STAR } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const POWER_SECONDS = 20;
const END_LIMIT_SECONDS = 600;
/**
 * How far ahead, in seconds, the autopilot checks each way it could move: the play
 * scene's pilot looks well ahead and keeps all its lives; the end scene's looks only
 * a moment ahead, so it is caught out once the meteors speed up, as a hurried player is.
 */
const HORIZON_PLAY = 0.7;
const HORIZON_END = 0.25;
const SAMPLE = 1 / 30;
const DIRECTIONS = [0, -1, 1];
/** Extra room, each side, it keeps between the drone and a meteor. */
const MARGIN = 10;

/** Seconds until moving in `direction` (-1, 0, 1) runs the drone into a meteor; Infinity when it never does. */
function timeToHit(state, direction, horizon) {
  const player = state.player;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const x = Math.min(FIELD.width - player.width, Math.max(0, player.x + direction * PLAYER.speed * t));
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (!item.active || item.kind !== KIND_METEOR) continue;
      const y = item.y + item.speed * t;
      if (y + item.height > player.y && y < player.y + player.height && item.x < x + player.width + MARGIN && item.x + item.width > x - MARGIN) return t;
    }
  }
  return Infinity;
}

/** Of the safe ways to move, the one toward the lowest star (or power-up); else the one hit last. */
function autopilot(state, horizon) {
  const player = state.player;
  let target = null;
  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (item.active && item.kind !== KIND_METEOR && (target === null || item.y > target.y)) target = item;
  }
  const goal = target === null ? FIELD.width / 2 : target.x + target.width / 2;
  const centre = player.x + player.width / 2;
  const wanted = goal > centre + 8 ? 1 : goal < centre - 8 ? -1 : 0;
  let best = wanted;
  let bestTime = timeToHit(state, wanted, horizon);
  for (let index = 0; index < DIRECTIONS.length && bestTime !== Infinity; index += 1) {
    const time = timeToHit(state, DIRECTIONS[index], horizon);
    if (time > bestTime) {
      bestTime = time;
      best = DIRECTIONS[index];
    }
  }
  return best;
}

/** Drop a staged item into a free pool slot, at a fixed spot above the drone. */
function stageItem(state, kind, x, y, speed) {
  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (item.active) continue;
    item.active = true;
    item.kind = kind;
    item.width = kind === KIND_METEOR ? 64 : kind === KIND_STAR ? STAR.size : 30;
    item.height = kind === KIND_METEOR ? 40 : item.width;
    item.x = x;
    item.y = y;
    item.speed = speed;
    item.spin = kind === KIND_METEOR ? 1.5 : 0;
    item.angle = 0.6;
    return;
  }
}

/**
 * Set `world` to the named scene (start, play, power or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'power' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, true, null);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'power') {
    for (let index = 0; index < POWER_SECONDS / STEP; index += 1) {
      if (world.step(STEP, autopilot(world.state, HORIZON_PLAY), false, null) & EVENT_OVER) break;
    }
    const state = world.state;
    // The wow moment, staged on the real run: shield up, slow-mo running, a hot
    // combo, and a cluster of star shards diving at the drone.
    state.shield = true;
    state.slowTimer = POWERUP.slowSeconds - 1.5;
    state.combo = 8;
    state.maxCombo = Math.max(state.maxCombo, 8);
    state.bannerTimer = 0;
    const cx = state.player.x + state.player.width / 2;
    stageItem(state, KIND_STAR, cx - 120, 180, 220);
    stageItem(state, KIND_STAR, cx - 30, 120, 220);
    stageItem(state, KIND_STAR, cx + 60, 200, 220);
    stageItem(state, KIND_STAR, cx + 140, 90, 220);
    stageItem(state, KIND_SHIELD, cx + 220, 260, 170);
    stageItem(state, KIND_SLOW, cx - 220, 300, 170);
    stageItem(state, KIND_METEOR, cx - 320, 140, 300);
    stageItem(state, KIND_METEOR, cx + 300, 60, 300);
    world.burst(cx, 420, '#ffd94d', 12, 220);
    world.floatText(cx, 380, '+50');
    return { screen: SCREEN_PLAY, best: state.score };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const horizon = name === 'end' ? HORIZON_END : HORIZON_PLAY;
  for (let index = 0; index < limit / STEP; index += 1) {
    if (world.step(STEP, autopilot(world.state, horizon), false, null) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}

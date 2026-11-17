// STARFALL rules and state, with no drawing and no browser in it: the collector drone,
// the pool of falling meteors, star shards and power-ups, spawning, collisions, the
// combo multiplier, shield and slow-mo, score, lives and levels. step() advances one
// fixed step and returns what happened as bit flags, so the caller can react without
// the world knowing about screens or sound. Particles and floating score text live
// here too, so a staged screenshot scene shows the same burst a real catch makes.
// Nothing here allocates after createWorld returns.
import { COMBO, FIELD, LEVEL, LEVEL_NAMES, LIVES, METEOR, PLAYER, POOL_SIZE, POWERUP, STAR } from './config.js';

export const KIND_METEOR = 0;
export const KIND_STAR = 1;
export const KIND_SHIELD = 2;
export const KIND_SLOW = 3;

export const EVENT_HIT = 1;
export const EVENT_STAR = 2;
export const EVENT_OVER = 4;
export const EVENT_LEVEL = 8;
export const EVENT_POWER = 16;
export const EVENT_SHIELD_BLOCK = 32;

const PARTICLE_COUNT = 48;
const FLOATER_COUNT = 12;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** The multiplier for the current catch streak: x1, then +1 every 3 stars, capped at x5. */
export function comboMultiplier(streak) {
  return Math.min(COMBO.max, 1 + Math.floor(streak / COMBO.perStep));
}

export function levelName(level) {
  return LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length) - 1];
}

export function createWorld(random) {
  const player = { x: 0, y: FIELD.groundY - PLAYER.height, width: PLAYER.width, height: PLAYER.height, invulnerable: 0 };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_METEOR, x: 0, y: 0, width: 0, height: 0, speed: 0, spin: 0, angle: 0, points: 0 });
  }
  const particles = [];
  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: '#ffd94d' });
  }
  const floaters = [];
  for (let index = 0; index < FLOATER_COUNT; index += 1) {
    floaters.push({ active: false, x: 0, y: 0, life: 0, text: '' });
  }
  const state = {
    player, items, particles, floaters,
    score: 0, lives: LIVES, level: 1, elapsed: 0,
    meteorTimer: 0, starTimer: 0, powerTimer: 0,
    combo: 0, maxCombo: 0, starsCaught: 0, meteorsDodged: 0,
    shield: false, slowTimer: 0, bannerTimer: 0, shake: 0, time: 0,
  };

  function reset() {
    player.x = (FIELD.width - player.width) / 2;
    player.invulnerable = 0;
    for (const item of items) item.active = false;
    for (const p of particles) p.active = false;
    for (const f of floaters) f.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.meteorTimer = METEOR.interval;
    state.starTimer = STAR.interval * 0.6;
    state.powerTimer = POWERUP.interval;
    state.combo = 0;
    state.maxCombo = 0;
    state.starsCaught = 0;
    state.meteorsDodged = 0;
    state.shield = false;
    state.slowTimer = 0;
    state.bannerTimer = 0;
    state.shake = 0;
    state.time = 0;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function burst(x, y, color, count, speed) {
    let made = 0;
    for (let index = 0; index < particles.length && made < count; index += 1) {
      const p = particles[index];
      if (p.active) continue;
      const angle = random() * Math.PI * 2;
      const v = speed * (0.4 + random() * 0.8);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v - speed * 0.3;
      p.maxLife = 0.5 + random() * 0.4;
      p.life = p.maxLife;
      p.size = 2 + random() * 4;
      p.color = color;
      made += 1;
    }
  }

  function floatText(x, y, text) {
    for (let index = 0; index < floaters.length; index += 1) {
      const f = floaters[index];
      if (f.active) continue;
      f.active = true;
      f.x = x;
      f.y = y;
      f.life = 1;
      f.text = text;
      return;
    }
  }

  function spawnMeteor() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_METEOR;
    item.width = METEOR.minWidth + random() * (METEOR.maxWidth - METEOR.minWidth);
    item.height = METEOR.height;
    item.x = random() * (FIELD.width - item.width);
    item.y = -item.height;
    item.speed = METEOR.speed + METEOR.speedPerLevel * (state.level - 1) + random() * METEOR.speedJitter;
    item.spin = (random() - 0.5) * 4;
    item.angle = random() * Math.PI * 2;
    item.points = 5 + Math.floor(random() * 6);
  }

  function spawnStar() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_STAR;
    item.width = STAR.size;
    item.height = STAR.size;
    item.x = random() * (FIELD.width - item.width);
    item.y = -item.height;
    item.speed = STAR.speed + STAR.speedPerLevel * (state.level - 1);
    item.spin = (random() - 0.5) * 2;
    item.angle = 0;
    item.points = 0;
  }

  function spawnPowerup(kind) {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = kind;
    item.width = POWERUP.size;
    item.height = POWERUP.size;
    item.x = random() * (FIELD.width - item.width);
    item.y = -item.height;
    item.speed = POWERUP.speed;
    item.spin = 0;
    item.angle = 0;
    item.points = 0;
  }

  function meteorInterval() {
    return Math.max(METEOR.minInterval, METEOR.interval * METEOR.intervalScale ** (state.level - 1));
  }

  /**
   * One fixed step. `direction` is -1, 0 or 1; `targetX` (mouse/touch drag, in field
   * coordinates, or null) steers the drone toward a point instead. With `harmless` set
   * (the title screen's backdrop) things fall but nothing touches the player and
   * nothing scores.
   */
  function step(dt, direction, harmless, targetX) {
    let events = 0;
    state.time += dt;
    state.elapsed += dt;
    const nextLevel = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));
    if (nextLevel !== state.level) {
      state.level = nextLevel;
      state.bannerTimer = 2.2;
      if (!harmless) events |= EVENT_LEVEL;
    }
    if (state.bannerTimer > 0) state.bannerTimer = Math.max(0, state.bannerTimer - dt);
    if (state.slowTimer > 0) state.slowTimer = Math.max(0, state.slowTimer - dt);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);

    if (targetX !== null && targetX !== undefined) {
      const centre = player.x + player.width / 2;
      const diff = targetX - centre;
      const move = Math.max(-PLAYER.speed * 1.4 * dt, Math.min(PLAYER.speed * 1.4 * dt, diff));
      player.x = Math.min(FIELD.width - player.width, Math.max(0, player.x + move));
    } else {
      player.x = Math.min(FIELD.width - player.width, Math.max(0, player.x + direction * PLAYER.speed * dt));
    }
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);

    const fall = state.slowTimer > 0 ? 0.5 : 1;
    state.meteorTimer -= dt;
    if (state.meteorTimer <= 0) {
      spawnMeteor();
      state.meteorTimer += meteorInterval();
    }
    state.starTimer -= dt;
    if (state.starTimer <= 0) {
      spawnStar();
      state.starTimer += STAR.interval + random() * STAR.intervalJitter;
    }
    state.powerTimer -= dt;
    if (state.powerTimer <= 0) {
      spawnPowerup(state.shield ? KIND_SLOW : KIND_SHIELD);
      state.powerTimer += POWERUP.interval;
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.y += item.speed * fall * dt;
      item.angle += item.spin * dt;
      if (item.y > FIELD.groundY) {
        item.active = false;
        if (item.kind === KIND_METEOR && !harmless) {
          state.score += METEOR.dodgePoints;
          state.meteorsDodged += 1;
        }
        continue;
      }
      if (harmless || !overlaps(item, player)) continue;
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2;
      if (item.kind === KIND_STAR) {
        item.active = false;
        state.combo += 1;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        state.starsCaught += 1;
        const gained = STAR.points * comboMultiplier(state.combo);
        state.score += gained;
        burst(cx, cy, '#ffd94d', 10, 220);
        floatText(cx, item.y, `+${gained}`);
        events |= EVENT_STAR;
      } else if (item.kind === KIND_SHIELD) {
        item.active = false;
        state.shield = true;
        burst(cx, cy, '#4dff9d', 12, 200);
        floatText(cx, item.y, 'SHIELD!');
        events |= EVENT_POWER;
      } else if (item.kind === KIND_SLOW) {
        item.active = false;
        state.slowTimer = POWERUP.slowSeconds;
        burst(cx, cy, '#c084fc', 12, 200);
        floatText(cx, item.y, 'SLOW-MO!');
        events |= EVENT_POWER;
      } else if (player.invulnerable === 0) {
        item.active = false;
        burst(cx, cy, '#ff5a4e', 16, 320);
        state.shake = 0.45;
        if (state.shield) {
          state.shield = false;
          player.invulnerable = PLAYER.invulnerable;
          state.combo = 0;
          floatText(cx, item.y, 'SHIELD DOWN');
          events |= EVENT_SHIELD_BLOCK;
        } else {
          state.lives -= 1;
          player.invulnerable = PLAYER.invulnerable;
          state.combo = 0;
          floatText(cx, item.y, 'HIT!');
          events |= EVENT_HIT;
          if (state.lives === 0) {
            events |= EVENT_OVER;
            break;
          }
        }
      }
    }

    for (let index = 0; index < particles.length; index += 1) {
      const p = particles[index];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * dt;
    }
    for (let index = 0; index < floaters.length; index += 1) {
      const f = floaters[index];
      if (!f.active) continue;
      f.life -= dt * 0.9;
      f.y -= 42 * dt;
      if (f.life <= 0) f.active = false;
    }
    return events;
  }

  reset();
  return { state, reset, step, burst, floatText };
}

// STARFALL drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. A neon space scene: gradient sky, nebula blobs, a
// parallax starfield, a glowing collector drone, rocky spinning meteors, four-point
// sparkle star shards, burst particles, floating score text, screen shake on a hit,
// and a HUD with score, a big combo, level plus progress bar, hearts and power-up
// timers. Text that holds a number is rebuilt only when the number changes.
import { FIELD, FONT, LEVEL, LIVES, PALETTE } from './config.js';
import { KIND_SHIELD, KIND_SLOW, KIND_STAR, comboMultiplier, levelName } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The panel's width; its height grows with its lines. */
const PANEL = { width: 780, top: 150, line: 34, bottom: 76 };
const HEART_SIZE = 22;
const HEART_GAP = 8;

/** Deterministic background stars: fixed positions, so every frame paints the same sky. */
const BG_STARS = [];
{
  let a = 1234567;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let index = 0; index < 130; index += 1) {
    BG_STARS.push({ x: next() * FIELD.width, y: next() * FIELD.height, r: 0.6 + next() * 1.7, tw: next() * Math.PI * 2, depth: 0.25 + next() * 0.75 });
  }
}

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('');
  const comboLabel = cachedLabel('x');
  const levelLabel = cachedLabel('LEVEL ');
  const finalLabel = cachedLabel('SCORE ');
  const bestLabel = cachedLabel('BEST ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function glow(color, blur) {
    context.shadowColor = color;
    context.shadowBlur = blur;
  }

  function drawSky(state) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(0.55, PALETTE.skyMid);
    gradient.addColorStop(1, PALETTE.skyBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Nebula blobs, drifting very slowly with play time.
    const drift = (state.time * 6) % 140;
    context.globalAlpha = 0.1;
    glow(PALETTE.nebulaPink, 60);
    context.fillStyle = PALETTE.nebulaPink;
    context.beginPath();
    context.arc(220 + drift, 150, 100, 0, Math.PI * 2);
    context.fill();
    glow(PALETTE.nebulaCyan, 60);
    context.fillStyle = PALETTE.nebulaCyan;
    context.beginPath();
    context.arc(1080 - drift, 320, 85, 0, Math.PI * 2);
    context.fill();
    glow(PALETTE.nebulaViolet, 60);
    context.fillStyle = PALETTE.nebulaViolet;
    context.beginPath();
    context.arc(640, 90, 70, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    context.shadowBlur = 0;
    // Parallax starfield: deeper stars drift slower.
    for (let index = 0; index < BG_STARS.length; index += 1) {
      const s = BG_STARS[index];
      const y = (s.y + state.time * 14 * s.depth) % FIELD.height;
      const alpha = 0.35 + 0.65 * Math.abs(Math.sin(state.time * 1.4 + s.tw));
      context.globalAlpha = alpha;
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(s.x, y, s.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    // Ground: a dark ridge the drone hovers over.
    context.fillStyle = PALETTE.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = '#1d0f45';
    context.fillRect(0, FIELD.groundY, FIELD.width, 3);
  }

  /** A four-point sparkle: a diamond with concave sides, glowing gold. */
  function drawStarShard(item) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const r = item.width / 2;
    const pulse = 1 + 0.14 * Math.sin(stateTime * 6 + item.x);
    context.save();
    context.translate(cx, cy);
    context.scale(pulse, pulse);
    glow(PALETTE.star, 18);
    context.fillStyle = PALETTE.star;
    context.beginPath();
    context.moveTo(0, -r);
    context.quadraticCurveTo(0, 0, r, 0);
    context.quadraticCurveTo(0, 0, 0, r);
    context.quadraticCurveTo(0, 0, -r, 0);
    context.quadraticCurveTo(0, 0, 0, -r);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = PALETTE.starCore;
    context.beginPath();
    context.arc(0, 0, r * 0.32, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  let stateTime = 0;

  /** A rocky meteor: a jagged spinning polygon with a red glow and a dark crater. */
  function drawMeteor(item) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const rx = item.width / 2;
    const ry = item.height / 2;
    context.save();
    context.translate(cx, cy);
    context.rotate(item.angle);
    glow(PALETTE.meteor, 16);
    context.fillStyle = PALETTE.meteor;
    context.beginPath();
    const points = 9;
    for (let index = 0; index < points; index += 1) {
      const angle = (index / points) * Math.PI * 2;
      const wobble = 0.78 + 0.22 * Math.sin(index * 2.7 + item.width);
      const px = Math.cos(angle) * rx * wobble;
      const py = Math.sin(angle) * ry * wobble;
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = PALETTE.meteorDark;
    context.beginPath();
    context.arc(-rx * 0.25, -ry * 0.2, rx * 0.22, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(rx * 0.3, ry * 0.25, rx * 0.16, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawPowerup(item) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const isShield = item.kind === KIND_SHIELD;
    const color = isShield ? PALETTE.shield : PALETTE.slow;
    const bob = Math.sin(stateTime * 4 + item.x) * 3;
    context.save();
    context.translate(cx, cy + bob);
    glow(color, 18);
    context.fillStyle = color;
    context.beginPath();
    context.arc(0, 0, item.width / 2, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = '#0b0630';
    context.font = `bold 20px ${FONT}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(isShield ? 'S' : 'Z', 0, 1);
    context.restore();
    context.textBaseline = 'alphabetic';
  }

  /** The collector drone: a sleek hull with twin wings, a glowing core and a thruster flame. */
  function drawDrone(state) {
    const player = state.player;
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    const blink = player.invulnerable === 0 || Math.floor(player.invulnerable * 10) % 2 === 1;
    if (!blink) return;
    const flame = 10 + Math.sin(stateTime * 30) * 4;
    context.save();
    context.translate(cx, cy);
    // Thruster flame.
    glow('#ff9d4d', 14);
    context.fillStyle = '#ff9d4d';
    context.beginPath();
    context.moveTo(-8, player.height / 2);
    context.lineTo(0, player.height / 2 + flame + 8);
    context.lineTo(8, player.height / 2);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    // Wings.
    glow(PALETTE.player, 16);
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.moveTo(-player.width / 2, 6);
    context.lineTo(-player.width / 2 - 14, 14);
    context.lineTo(-player.width / 2 + 6, 12);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(player.width / 2, 6);
    context.lineTo(player.width / 2 + 14, 14);
    context.lineTo(player.width / 2 - 6, 12);
    context.closePath();
    context.fill();
    // Hull.
    context.beginPath();
    context.moveTo(0, -player.height / 2);
    context.quadraticCurveTo(player.width / 2, -4, player.width / 2 - 6, player.height / 2 - 4);
    context.lineTo(-player.width / 2 + 6, player.height / 2 - 4);
    context.quadraticCurveTo(-player.width / 2, -4, 0, -player.height / 2);
    context.fill();
    context.shadowBlur = 0;
    // Glowing core.
    context.fillStyle = PALETTE.playerCore;
    context.beginPath();
    context.arc(0, -2, 7, 0, Math.PI * 2);
    context.fill();
    context.restore();
    // Shield ring while a shield is held.
    if (state.shield) {
      context.save();
      context.translate(cx, cy);
      context.strokeStyle = PALETTE.shield;
      context.globalAlpha = 0.75 + 0.25 * Math.sin(stateTime * 5);
      context.lineWidth = 3;
      glow(PALETTE.shield, 14);
      context.beginPath();
      context.arc(0, 0, player.width / 2 + 14, 0, Math.PI * 2);
      context.stroke();
      context.restore();
      context.globalAlpha = 1;
      context.shadowBlur = 0;
    }
  }

  function drawHeart(x, y, filled) {
    context.save();
    context.translate(x, y);
    context.scale(HEART_SIZE / 20, HEART_SIZE / 20);
    context.fillStyle = filled ? '#ff4d6d' : '#3a2a5e';
    glow(filled ? '#ff4d6d' : '#00000000', filled ? 10 : 0);
    context.beginPath();
    context.moveTo(0, 6);
    context.bezierCurveTo(-11, -4, -6, -12, 0, -6);
    context.bezierCurveTo(6, -12, 11, -4, 0, 6);
    context.fill();
    context.restore();
    context.shadowBlur = 0;
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text('SCORE', 24, 16, 16, PALETTE.muted, 'left');
    text(scoreLabel(state.score), 24, 34, 34, PALETTE.text, 'left');
    // Combo, big and centred, only while a streak is alive.
    const mult = comboMultiplier(state.combo);
    if (state.combo >= 2) {
      const scale = mult >= 4 ? 1.25 : 1;
      context.save();
      context.translate(FIELD.width / 2, 18);
      context.scale(scale, scale);
      text(`COMBO ${comboLabel(mult)}`, 0, 0, 30, PALETTE.combo, 'center');
      context.restore();
      text(`${state.combo} IN A ROW`, FIELD.width / 2, 56, 15, PALETTE.muted, 'center');
    }
    text(levelLabel(state.level), FIELD.width - 24, 16, 16, PALETTE.muted, 'right');
    text(levelName(state.level), FIELD.width - 24, 34, 22, PALETTE.text, 'right');
    // Progress bar to the next level.
    const progress = state.level >= LEVEL.max ? 1 : (state.elapsed % LEVEL.seconds) / LEVEL.seconds;
    const barX = FIELD.width - 224;
    const barY = 62;
    context.fillStyle = '#241a4d';
    context.fillRect(barX, barY, 200, 8);
    context.fillStyle = PALETTE.player;
    context.fillRect(barX, barY, 200 * progress, 8);
    // Hearts, bottom-left above the ground line, plus power-up timers.
    for (let life = 0; life < LIVES; life += 1) drawHeart(40 + life * (HEART_SIZE + HEART_GAP), FIELD.height - 34, life < state.lives);
    let badgeX = 150;
    if (state.shield) {
      text('🛡 SHIELD', badgeX, FIELD.height - 44, 20, PALETTE.shield, 'left');
      badgeX += 130;
    }
    if (state.slowTimer > 0) {
      text(`⏱ SLOW-MO ${state.slowTimer.toFixed(0)}s`, badgeX, FIELD.height - 44, 20, PALETTE.slow, 'left');
    }
    // Level banner, fading in and out after each level-up.
    if (state.bannerTimer > 0) {
      const alpha = Math.min(1, state.bannerTimer / 0.6, (2.2 - state.bannerTimer) / 0.4 + 0.4);
      context.globalAlpha = Math.max(0, Math.min(1, alpha));
      text(`LEVEL ${state.level}`, FIELD.width / 2, 150, 54, PALETTE.combo, 'center');
      text(levelName(state.level), FIELD.width / 2, 210, 30, PALETTE.text, 'center');
      context.globalAlpha = 1;
    }
  }

  function drawField(state) {
    stateTime = state.time;
    drawSky(state);
    // Screen shake: offset everything after the sky by a decaying random jolt.
    context.save();
    if (state.shake > 0) {
      const mag = state.shake * 18;
      context.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }
    const items = state.items;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      if (item.kind === KIND_STAR) drawStarShard(item);
      else if (item.kind === KIND_SHIELD || item.kind === KIND_SLOW) drawPowerup(item);
      else drawMeteor(item);
    }
    drawDrone(state);
    // Burst particles.
    for (let index = 0; index < state.particles.length; index += 1) {
      const p = state.particles[index];
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    // Floating score text.
    for (let index = 0; index < state.floaters.length; index += 1) {
      const f = state.floaters[index];
      if (!f.active) continue;
      context.globalAlpha = Math.max(0, f.life);
      text(f.text, f.x, f.y, 24, PALETTE.combo, 'center');
    }
    context.globalAlpha = 1;
    context.restore();
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.save();
    context.fillStyle = 'rgba(5, 1, 15, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.strokeStyle = accent || PALETTE.panelEdge;
    context.lineWidth = 2;
    glow(accent || PALETTE.panelEdge, 22);
    context.beginPath();
    context.rect(x, y, PANEL.width, height);
    context.fill();
    context.stroke();
    context.restore();
    context.shadowBlur = 0;
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 52, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 24, PALETTE.combo, 'center');
  }

  const TITLE_LINES = [
    'Catch STAR SHARDS — each one is worth 10 × your combo.',
    'Dodge the METEORS. 3 hits and the run ends.',
    'Grab SHIELD (S) to block one hit, SLOW-MO (Z) to bend time.',
    'Move with ← → or A D — or drag with mouse / touch. Pause with P.',
    '',
  ];
  const PAUSED_LINES = ['The starfall waits for you.'];
  const OVER_LINES = ['', '', '', '', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = best > 0 ? bestLabel(best) : 'No runs yet — be the first to catch the fall.';
      drawPanel('★ STARFALL ★', TITLE_LINES, 'Press SPACE or click to start', PALETTE.player);
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('PAUSED', PAUSED_LINES, 'Press P or click to resume', PALETTE.player);
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      OVER_LINES[2] = `Stars caught ${state.starsCaught}   •   Best combo x${comboMultiplier(state.maxCombo)} (${state.maxCombo} in a row)`;
      OVER_LINES[3] = `Reached LEVEL ${state.level} — ${levelName(state.level)}   •   Meteors dodged ${state.meteorsDodged}`;
      OVER_LINES[4] = state.score >= best && state.score > 0 ? '★ NEW BEST SCORE ★' : '';
      drawPanel('GAME OVER', OVER_LINES, 'Press SPACE or click to fly again', PALETTE.meteor);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}

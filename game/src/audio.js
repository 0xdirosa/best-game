// STARFALL sound: pure WebAudio synthesis, no audio files. Every effect is a small
// oscillator envelope built on the fly, so the game ships zero sound assets and
// never touches the network. The context is created on the first user gesture
// (browsers block audio before one) and every call before that is a safe no-op.
export function createAudio() {
  let context = null;
  let master = null;

  /** Call from any user gesture (start, click, key press) so sound is allowed. */
  function unlock() {
    if (context !== null) {
      if (context.state === 'suspended') context.resume();
      return;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
    } catch {
      context = null;
    }
  }

  function tone(freqFrom, freqTo, duration, type, volume, delay) {
    if (context === null || master === null) return;
    const start = context.currentTime + (delay || 0);
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, start);
    if (freqTo !== freqFrom) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  /** A star catch: the blip climbs with the combo, so a streak sounds like a streak. */
  function star(combo) {
    const base = 520 + Math.min(combo, 15) * 36;
    tone(base, base * 1.6, 0.16, 'sine', 0.5, 0);
    tone(base * 2, base * 2.4, 0.1, 'triangle', 0.18, 0.02);
  }

  /** A meteor hit: a low thud plus a noise-free downward sweep. */
  function hit() {
    tone(180, 42, 0.28, 'sawtooth', 0.5, 0);
    tone(90, 30, 0.32, 'square', 0.3, 0);
  }

  /** The shield eating a hit: a bright metallic ping instead of the thud. */
  function shieldBlock() {
    tone(880, 1320, 0.2, 'triangle', 0.45, 0);
    tone(1320, 1760, 0.18, 'sine', 0.3, 0.05);
  }

  /** A power-up pickup: two-note chime, high for shield, low for slow-mo. */
  function powerup(kind) {
    if (kind === 'slow') {
      tone(392, 392, 0.14, 'sine', 0.4, 0);
      tone(311, 311, 0.2, 'sine', 0.4, 0.1);
    } else {
      tone(659, 659, 0.14, 'sine', 0.4, 0);
      tone(988, 988, 0.22, 'sine', 0.4, 0.1);
    }
  }

  /** A new level: a rising four-note arpeggio. */
  function levelUp() {
    const notes = [523, 659, 784, 1047];
    for (let index = 0; index < notes.length; index += 1) {
      tone(notes[index], notes[index], 0.16, 'triangle', 0.35, index * 0.07);
    }
  }

  /** Game start: a quick rising whoosh. */
  function start() {
    tone(220, 880, 0.25, 'sine', 0.4, 0);
  }

  /** Game over: a slow descending line. */
  function gameOver() {
    const notes = [392, 330, 262, 196];
    for (let index = 0; index < notes.length; index += 1) {
      tone(notes[index], notes[index] * 0.94, 0.3, 'triangle', 0.35, index * 0.16);
    }
  }

  return { unlock, star, hit, shieldBlock, powerup, levelUp, start, gameOver };
}

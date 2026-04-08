/**
 * engine/sounds.js
 * Web Audio API sound synthesizer — no external files required.
 * All sounds are generated programmatically.
 */

let ctx = null;

const SOUNDS_KEY = 'itcertif_sounds';

export function isSoundEnabled() {
  const stored = localStorage.getItem(SOUNDS_KEY);
  return stored === null ? true : stored === 'true';
}

export function toggleSound() {
  const next = !isSoundEnabled();
  localStorage.setItem(SOUNDS_KEY, String(next));
  return next;
}

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function shouldPlay() {
  return isSoundEnabled() && (window.AudioContext || window.webkitAudioContext);
}

// ─── Low-level synth helpers ──────────────────────────────────────────────────

function tone(freq, startTime, duration, type = 'sine', gainVal = 0.18) {
  const c   = getCtx();
  const osc = c.createOscillator();
  const g   = c.createGain();

  osc.connect(g);
  g.connect(c.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(gainVal, startTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function sweep(fromFreq, toFreq, startTime, duration, type = 'sine', gainVal = 0.18) {
  const c   = getCtx();
  const osc = c.createOscillator();
  const g   = c.createGain();

  osc.connect(g);
  g.connect(c.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(fromFreq, startTime);
  osc.frequency.linearRampToValueAtTime(toFreq, startTime + duration);

  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(gainVal, startTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

// ─── Sound effects ────────────────────────────────────────────────────────────

/** Bright ascending chime — correct answer */
export function playCorrect() {
  if (!shouldPlay()) return;
  const t = getCtx().currentTime;
  tone(523, t,        0.12, 'sine',     0.16);  // C5
  tone(659, t + 0.08, 0.12, 'sine',     0.14);  // E5
  tone(784, t + 0.16, 0.18, 'sine',     0.18);  // G5
  tone(784, t + 0.16, 0.18, 'triangle', 0.06);  // shimmer
}

/** Low dull thud — wrong answer */
export function playWrong() {
  if (!shouldPlay()) return;
  const t = getCtx().currentTime;
  sweep(220, 150, t,        0.18, 'sawtooth', 0.12);
  tone( 110, t + 0.05, 0.22, 'sine',     0.10);
}

/** Short click — timer tick (last 5s) */
export function playTick() {
  if (!shouldPlay()) return;
  const c   = getCtx();
  const t   = c.currentTime;
  const buf = c.createBuffer(1, c.sampleRate * 0.04, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 20);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(0.35, t);
  src.connect(g);
  g.connect(c.destination);
  src.start(t);
}

/** Timeout — deep buzzer */
export function playTimeout() {
  if (!shouldPlay()) return;
  const t = getCtx().currentTime;
  sweep(180, 90, t, 0.4, 'square', 0.10);
  sweep(180, 90, t + 0.1, 0.4, 'sawtooth', 0.06);
}

/** Combo streak — ascending arpeggio */
export function playCombo(comboCount) {
  if (!shouldPlay()) return;
  const t     = getCtx().currentTime;
  const notes = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
  const n     = Math.min(comboCount - 1, notes.length - 1);
  for (let i = 0; i <= n; i++) {
    tone(notes[i], t + i * 0.07, 0.15, 'sine', 0.14 + i * 0.01);
  }
}

/** Quiz complete — triumphant fanfare */
export function playComplete(percentage) {
  if (!shouldPlay()) return;
  const t = getCtx().currentTime;

  if (percentage >= 80) {
    // Victory fanfare
    const melody = [523, 523, 523, 415, 523, 0, 659, 0, 523];
    const timing = [0, 0.15, 0.3, 0.38, 0.45, 0, 0.6, 0, 0.75];
    melody.forEach((freq, i) => {
      if (freq > 0) tone(freq, t + timing[i], 0.18, 'sine', 0.16);
    });
    // Harmony
    tone(659, t + 0.75, 0.35, 'sine', 0.12);
    tone(784, t + 0.75, 0.35, 'sine', 0.10);
    tone(1047, t + 0.75, 0.35, 'sine', 0.08);
  } else if (percentage >= 50) {
    // Mild success
    tone(392, t,        0.15, 'sine', 0.14);
    tone(523, t + 0.15, 0.15, 'sine', 0.14);
    tone(659, t + 0.3,  0.25, 'sine', 0.16);
  } else {
    // Try again
    sweep(440, 330, t,       0.2, 'sine', 0.12);
    sweep(330, 250, t + 0.2, 0.3, 'sine', 0.10);
  }
}

/** Level up — special effect */
export function playLevelUp() {
  if (!shouldPlay()) return;
  const t = getCtx().currentTime;
  [262, 330, 392, 523, 659, 784, 1047].forEach((freq, i) => {
    tone(freq, t + i * 0.06, 0.2, 'sine', 0.15);
  });
}

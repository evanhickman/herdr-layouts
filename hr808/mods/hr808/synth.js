// 808-style drum voices made from oscillators and noise, as the TR-808 made
// them, so the layout ships no samples. seq.js writes each voice to a WAV once,
// for engine.jxa to play. Herdr's script engine is slow and interrupts long
// calls, so the square waves use running phases, decays use per-sample
// multipliers rather than Math.exp, and the work is split across `await`
// points, one per voice.

const RATE = 22050;
export const VOICES = ["bd", "sd", "cp", "ch", "oh", "cb"];

// The 808's six hi-hat oscillators (square waves, inharmonic on purpose).
const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];

function noise(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2147483648) - 1;
}

// Per-sample multiplier for an exponential decay with time constant `tau` seconds.
const decay = (tau) => Math.exp(-1 / (tau * RATE));

function highpass(x, cutoff) {
  const rc = 1 / (2 * Math.PI * cutoff), a = rc / (rc + 1 / RATE);
  let y = 0, prev = 0;
  for (let i = 0; i < x.length; i++) { const v = x[i]; y = a * (y + v - prev); prev = v; x[i] = y; }
  return x;
}

function lowpass(x, cutoff) {
  const b = 1 - Math.exp(-2 * Math.PI * cutoff / RATE);
  let y = 0;
  for (let i = 0; i < x.length; i++) { y += (x[i] - y) * b; x[i] = y; }
  return x;
}

// Square waves from running phases: `freqs` summed, each ±1, divided by count.
function squares(x, freqs) {
  const step = freqs.map((f) => f / RATE), phase = freqs.map(() => 0);
  for (let i = 0; i < x.length; i++) {
    let sum = 0;
    for (let k = 0; k < step.length; k++) { phase[k] += step[k]; if (phase[k] >= 1) phase[k] -= 1; sum += phase[k] < 0.5 ? 1 : -1; }
    x[i] = sum / step.length;
  }
  return x;
}

const buffer = (seconds) => new Float32Array(Math.round(seconds * RATE));

function kick() {
  const x = buffer(0.6), n = noise(1), amp = decay(0.22), sweep = decay(0.03);
  let phase = 0, a = 1, s = 1;
  for (let i = 0; i < x.length; i++) {
    phase += 2 * Math.PI * (48 + 72 * s) / RATE;
    x[i] = Math.sin(phase) * a + (i < 44 ? n() * 0.3 : 0);
    a *= amp; s *= sweep;
  }
  return x;
}

function snare() {
  const x = buffer(0.3), hiss = buffer(0.3), n = noise(2), td = decay(0.05), nd = decay(0.08);
  const w1 = 2 * Math.PI * 180 / RATE, w2 = 2 * Math.PI * 330 / RATE;
  let a = 1, b = 1;
  for (let i = 0; i < x.length; i++) { x[i] = 0.5 * (Math.sin(w1 * i) + Math.sin(w2 * i)) * a; hiss[i] = n() * b; a *= td; b *= nd; }
  highpass(hiss, 1800);
  for (let i = 0; i < x.length; i++) x[i] = 0.45 * x[i] + 0.6 * hiss[i];
  return x;
}

function clap() {
  const x = buffer(0.4), n = noise(3), burst = decay(0.004), tail = decay(0.11), gap = Math.round(0.011 * RATE);
  let a = 0;
  for (let i = 0; i < x.length; i++) {
    if (i % gap === 0 && i <= gap * 3) a = 1;
    x[i] = n() * a;
    a *= i < gap * 3 ? burst : tail;
  }
  lowpass(highpass(x, 900), 5000);
  for (let i = 0; i < x.length; i++) x[i] *= 1.6;
  return x;
}

function hat(seconds, tau) {
  const x = squares(buffer(seconds), METAL.map((f) => f * 2));
  highpass(highpass(x, 7000), 7000);
  const d = decay(tau);
  let a = 1.4;
  for (let i = 0; i < x.length; i++) { x[i] *= a; a *= d; }
  return x;
}

function cowbell() {
  const x = squares(buffer(0.5), [540, 800]), fast = decay(0.02), slow = decay(0.25);
  let f = 0.65, s = 0.35;
  for (let i = 0; i < x.length; i++) { x[i] *= f + s; f *= fast; s *= slow; }
  lowpass(highpass(x, 600), 3500);
  for (let i = 0; i < x.length; i++) x[i] *= 0.6;
  return x;
}

const MAKERS = { bd: kick, sd: snare, cp: clap, ch: () => hat(0.12, 0.035), oh: () => hat(0.6, 0.25), cb: cowbell };

// The six voices; `pause()` is awaited between them. seq.js calls this only
// when the voice files are missing, so nothing is kept in memory.
export async function voices(pause) {
  const made = {};
  for (const name of VOICES) { made[name] = MAKERS[name](); await pause(); }
  return made;
}

// Bump when a voice changes, so seq.js writes the voice files again.
export const VERSION = 1;

// One voice as a 16-bit mono WAV: gain and a soft clip, and a 5 ms fade at the
// end so the sample never stops on a non-zero value (a click).
export function wav(x) {
  const n = x.length, fade = Math.round(0.005 * RATE);
  const bytes = new Uint8Array(44 + n * 2);
  const view = new DataView(bytes.buffer);
  const text = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  text(0, "RIFF"); view.setUint32(4, 36 + n * 2, true); text(8, "WAVEfmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, RATE, true); view.setUint32(28, RATE * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, "data"); view.setUint32(40, n * 2, true);
  const pcm = new Int16Array(bytes.buffer, 44, n);
  for (let i = 0; i < n; i++) {
    const s = x[i] * 0.9 * Math.min(1, (n - 1 - i) / fade);
    pcm[i] = (s / (1 + Math.abs(s))) * 32000;
  }
  return bytes;
}

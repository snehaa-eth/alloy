// Original sound design, synthesised from scratch (no samples, no music).
// Reads cues.json written by render.mjs and writes a 48 kHz stereo 16-bit WAV.
// Usage: node audio.mjs <cues.json> <out.wav>
import fs from 'node:fs';

const [, , cuesPath, outPath] = process.argv;
const {DURATION, CUES} = JSON.parse(fs.readFileSync(cuesPath, 'utf8'));
const SR = 48000;
const N = Math.ceil(DURATION * SR);
const L = new Float32Array(N), R = new Float32Array(N);

// deterministic noise
let seed = 1337;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

function add(i, l, r = l) { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } }

// Sub kick: pitch-swept sine 120 -> 42 Hz, plus a short click.
function kick(t, g = 1) {
  const s = Math.round(t * SR), len = Math.round(0.45 * SR);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const x = k / SR;
    const f = 42 + 78 * Math.exp(-x * 28);
    ph += (2 * Math.PI * f) / SR;
    const env = Math.exp(-x * 7.5) * Math.min(1, k / 24);
    const click = k < 240 ? rnd() * Math.exp(-k / 40) * 0.25 : 0;
    const v = (Math.sin(ph) * env + click) * 0.85 * g;
    add(s + k, v);
  }
}
// Hard "cut" hit: kick + a filtered noise slap + low tone tail.
function hit(t, g = 1) {
  kick(t, g);
  const s = Math.round(t * SR), len = Math.round(0.22 * SR);
  let lp = 0;
  for (let k = 0; k < len; k++) {
    const x = k / SR;
    lp += 0.25 * (rnd() - lp);
    const v = lp * Math.exp(-x * 22) * 0.55 * g;
    add(s + k, v * 0.9, v);
  }
}
// Keyboard tick: very short band-limited click, alternating stereo.
let tickSide = 0;
function tick(t, g = 1) {
  const s = Math.round(t * SR), len = Math.round(0.03 * SR);
  let a = 0, b = 0; tickSide ^= 1;
  const f = 2600 + (rnd() * 400);
  for (let k = 0; k < len; k++) {
    const x = k / SR;
    a += 0.6 * (rnd() - a); b = a - b * 0.2;
    const v = (b * 0.5 + Math.sin(2 * Math.PI * f * x) * 0.4) * Math.exp(-x * 260) * 0.16 * g;
    add(s + k, tickSide ? v : v * 0.7, tickSide ? v * 0.7 : v);
  }
}
// Error buzz: short detuned square-ish low tone.
function glitch(t, g = 1) {
  const s = Math.round(t * SR), len = Math.round(0.09 * SR);
  for (let k = 0; k < len; k++) {
    const x = k / SR;
    const v = (Math.sign(Math.sin(2 * Math.PI * 110 * x)) * 0.5 + Math.sign(Math.sin(2 * Math.PI * 117 * x)) * 0.5)
      * Math.exp(-x * 30) * 0.07 * g;
    add(s + k, v, -v * 0.9);
  }
}
// Riser: noise + rising sine over `dur` seconds, ending at t + dur.
function riser(t, g = 1, dur = 1.0) {
  const s = Math.round(t * SR), len = Math.round(dur * SR);
  let ph = 0, lp = 0;
  for (let k = 0; k < len; k++) {
    const p = k / len;
    const f = 180 + 900 * p * p;
    ph += (2 * Math.PI * f) / SR;
    lp += (0.02 + 0.3 * p) * (rnd() - lp);
    const env = p * p * 0.22 * g;
    add(s + k, (Math.sin(ph) * 0.4 + lp) * env, (Math.sin(ph * 1.003) * 0.4 + lp) * env);
  }
}
// Resolve chord: soft sine stack (A minor-ish -> major lift), long fade.
function chord(t, g = 1, freqs = [110, 164.81, 220, 277.18], dur = 3.5) {
  const s = Math.round(t * SR), len = Math.round(dur * SR);
  for (let k = 0; k < len; k++) {
    const x = k / SR;
    const env = Math.min(1, x / 0.02) * Math.exp(-x * 1.1) * 0.09 * g;
    let l = 0, r = 0;
    freqs.forEach((f, j) => { l += Math.sin(2 * Math.PI * f * x * (1 + j * 0.0007)); r += Math.sin(2 * Math.PI * f * x * (1 - j * 0.0007)); });
    add(s + k, l * env, r * env);
  }
}
// Low drone bed under everything (very quiet), with a slow pulse.
function drone(from, to, g = 1) {
  for (let k = Math.round(from * SR); k < Math.min(N, Math.round(to * SR)); k++) {
    const x = k / SR;
    const pulse = 0.6 + 0.4 * Math.sin(2 * Math.PI * x * 0.5);
    const v = (Math.sin(2 * Math.PI * 55 * x) + 0.3 * Math.sin(2 * Math.PI * 82.4 * x)) * 0.025 * pulse * g;
    add(k, v, v);
  }
}

const fx = {kick, hit, tick, glitch, riser, chord, drone};
for (const c of CUES) {
  const f = fx[c.type];
  if (!f) continue;
  if (c.type === 'drone') drone(c.t, c.to, c.gain ?? 1);
  else if (c.type === 'riser') riser(c.t, c.gain ?? 1, c.dur ?? 1);
  else if (c.type === 'chord') chord(c.t, c.gain ?? 1, c.freqs, c.dur);
  else f(c.t, c.gain ?? 1);
}

// Soft clip + fades at both ends (so the loop point is clean).
const fade = Math.round(0.03 * SR);
const buf = Buffer.alloc(44 + N * 4);
for (let i = 0; i < N; i++) {
  let g = 1; if (i < fade) g = i / fade; if (i > N - fade) g = (N - i) / fade;
  const l = Math.tanh(L[i] * 1.2) * g, r = Math.tanh(R[i] * 1.2) * g;
  buf.writeInt16LE(Math.round(l * 32000), 44 + i * 4);
  buf.writeInt16LE(Math.round(r * 32000), 46 + i * 4);
}
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
fs.writeFileSync(outPath, buf);
console.log('wrote', outPath, (N / SR).toFixed(2) + 's');

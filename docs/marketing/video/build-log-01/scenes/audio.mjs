// BUILD LOG 01: original sound design, synthesised sample by sample (no samples, no loops, no music library).
// Follows the cue sheet in ../DIRECTION.md §9. 90 BPM, E minor. Frame f -> sample f * 1600 (48 kHz / 30 fps).
// Usage: node audio.mjs <out.wav> [masterGainLinear]
import fs from 'node:fs';

const [, , outPath, gainArg] = process.argv;
const MASTER = parseFloat(gainArg || '1');
const SR = 48000, SPF = 1600, FRAMES = 960, N = FRAMES * SPF;
const L = new Float32Array(N), R = new Float32Array(N), SEND = new Float32Array(N); // SEND: reverb bus (mono)
const db = (d) => Math.pow(10, d / 20);
const at = (f) => Math.round(f * SPF);

// ---------------------------------------------------------------- deterministic noise
function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return (((t ^ t >>> 14) >>> 0) / 4294967296) * 2 - 1; }; }
let seedCounter = 1;
const noise = (n) => { const r = rng(1000 + seedCounter++), a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = r(); return a; };

// ---------------------------------------------------------------- RBJ biquad (static or swept)
function coeffs(type, f, Q) {
  const w = 2 * Math.PI * Math.min(f, SR * 0.45) / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * Q);
  let b0, b1, b2, a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  else { b0 = a; b1 = 0; b2 = -a; } // bp (0 dB peak)
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function filt(x, type, fOrFn, Q = 0.707) {
  const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let k = coeffs(type, typeof fOrFn === 'function' ? fOrFn(0) : fOrFn, Q);
  for (let i = 0; i < x.length; i++) {
    if (typeof fOrFn === 'function' && i % 32 === 0) k = coeffs(type, fOrFn(i / x.length), Q);
    const v = k[0] * x[i] + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
function crush(x, bits, div) {
  const q = Math.pow(2, bits - 1), y = new Float32Array(x.length); let hold = 0;
  for (let i = 0; i < x.length; i++) { if (i % div === 0) hold = Math.round(x[i] * q) / q; y[i] = hold; }
  return y;
}
// place a mono buffer: gain (linear), pan -1..1 (constant power), optional reverb send
function place(buf, start, gain = 1, pan = 0, send = 0) {
  const gl = Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2, gr = Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2;
  for (let i = 0; i < buf.length; i++) {
    const j = start + i; if (j < 0 || j >= N) continue;
    const v = buf[i] * gain; L[j] += v * gl; R[j] += v * gr; if (send) SEND[j] += v * send;
  }
}

// ---------------------------------------------------------------- instruments
const KICK_TIMES = []; // for the sub sidechain
function kickBuf(level = 1) {
  const n = Math.round(0.45 * SR), b = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = t < 0.08 ? 45 * Math.pow(150 / 45, 1 - t / 0.08) : 45;
    ph += 2 * Math.PI * f / SR;
    const env = Math.exp(-t / 0.095) * Math.min(1, i / 48);
    b[i] = (Math.sin(ph) + 0.38 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph)) * env; // 2nd/3rd harmonic so phones hear it
  }
  const click = filt(noise(Math.round(0.003 * SR)), 'hp', 3000);
  for (let i = 0; i < click.length; i++) b[i] += click[i] * 0.5 * (1 - i / click.length);
  for (let i = 0; i < n; i++) b[i] *= db(-3) * level;
  return b;
}
function KICK(f, d = 0) { KICK_TIMES.push(at(f)); place(kickBuf(db(d)), at(f)); }
function BOOM(f) {
  KICK(f);
  const n = Math.round(1.7 * SR), b = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, fr = t < 1.4 ? 60 * Math.pow(28 / 60, t / 1.4) : 28;
    ph += 2 * Math.PI * fr / SR;
    b[i] = (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * Math.exp(-t / 0.55) * Math.min(1, i / 96) * db(-4);
  }
  // brown noise, LP 200, -18 dB, 900 ms decay
  const w = noise(Math.round(0.9 * SR)); let acc = 0;
  for (let i = 0; i < w.length; i++) { acc = acc * 0.995 + w[i] * 0.05; w[i] = acc; }
  const br = filt(w, 'lp', 200);
  for (let i = 0; i < br.length; i++) b[i] += br[i] * db(-18) * 4 * Math.exp(-(i / SR) / 0.3);
  place(b, at(f));
}
let tickR = rng(42);
function TICK(f, d = 0) {
  const n = Math.round(0.03 * SR), x = filt(noise(n), 'bp', 4000, 2);
  for (let i = 0; i < n; i++) x[i] *= Math.exp(-(i / SR) / 0.008) * 2.2;
  place(x, at(f), db(-20 + tickR() * 2 + d), tickR() * 0.2);
}
function HAT(f, d = 0) {
  const n = Math.round(0.06 * SR), x = filt(noise(n), 'hp', 8000);
  for (let i = 0; i < n; i++) x[i] *= Math.exp(-(i / SR) / 0.025) * 2;
  place(x, at(f), db(-20 + d), 0.15);
}
function FAIL(f, d = 0) {
  const n = Math.round(0.045 * SR), x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const sq = Math.sign(Math.sin(2 * Math.PI * 55 * t)) * 0.5 + Math.sign(Math.sin(2 * Math.PI * 82 * t)) * 0.5;
    x[i] = sq * Math.min(1, i / 24) * (i > n - 48 ? (n - i) / 48 : 1);
  }
  place(crush(x, 6, 4), at(f), db(-12 + d));
}
function GLITCH(f, d = 0) {
  const seg = Math.round(0.01 * SR), n = Math.round(0.06 * SR), base = noise(n);
  for (let i = 0; i < n; i++) base[i] = base[i] * 0.5 + Math.sign(Math.sin(2 * Math.PI * 880 * i / SR)) * 0.5;
  const c = crush(base, 4, 8), out = new Float32Array(n + seg * 3);
  out.set(c, 0);
  for (let r = 0; r < 3; r++) out.set(c.subarray(seg, seg * 2), n + r * seg);   // stutter repeats
  for (let i = 0; i < 24; i++) { out[i] *= i / 24; out[out.length - 1 - i] *= i / 24; }
  place(out, at(f), db(-14 + d), 0.3);
}
function RISER(f0, f1) {
  const n = at(f1) - at(f0), nz = filt(noise(n), 'bp', (p) => 400 * Math.pow(9000 / 400, p), 1.2);
  const x = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n, fr = 220 * Math.pow(1320 / 220, p);
    ph += 2 * Math.PI * fr / SR;
    const amp = db(-30 + 22 * p * p);
    x[i] = (nz[i] * 2.5 + Math.sin(ph) * 0.6) * amp;
  }
  for (let i = 0; i < 48; i++) x[n - 1 - i] *= i / 48;  // 1 ms de-click; still a hard stop
  place(x, at(f0), 1);
}
function bellBuf(freq, dur = 0.9, glideTo = null) {
  const n = Math.round(dur * SR), x = new Float32Array(n); let pc = 0, pm = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, fc = glideTo ? freq * Math.pow(glideTo / freq, Math.min(1, t / dur)) : freq;
    const idx = 4 * Math.max(0, 1 - t / 0.3);
    pm += 2 * Math.PI * fc * 3.5 / SR; pc += 2 * Math.PI * fc / SR;
    x[i] = Math.sin(pc + idx * Math.sin(pm)) * Math.exp(-t / (0.7 / 3)) * Math.min(1, i / 24);
  }
  return x;
}
function BELL(f, freq, d = 0, pan = 0, glideTo = null, dur = 0.9) { place(bellBuf(freq, dur, glideTo), at(f), db(-12 + d), pan, 0.15); }
function HIT(f) {
  KICK(f);
  const n = Math.round(0.5 * SR), snap = filt(noise(Math.round(0.07 * SR)), 'bp', 1800, 1.4), x = new Float32Array(n);
  for (let i = 0; i < snap.length; i++) x[i] += snap[i] * 1.6 * Math.exp(-(i / SR) / 0.025);
  for (let i = 0; i < n; i++) { const t = i / SR; x[i] += (Math.sin(2 * Math.PI * 82.4 * t) + 0.4 * Math.sin(2 * Math.PI * 164.8 * t)) * 0.45 * Math.exp(-t / 0.16); }
  place(x, at(f), db(-4));
}
function WHOOSH(f0, f1) {
  const n = at(f1) - at(f0) + 2400, x = filt(noise(n), 'bp', (p) => 2000 * Math.pow(300 / 2000, p), 1.0);
  const half = n / 2;
  for (let i = 0; i < n; i++) x[i] *= Math.sin(Math.PI * i / n) * 1.8;
  // pan R -> L
  place(x.subarray(0, half), at(f0), db(-12), 0.7);
  place(x.subarray(half), at(f0) + half, db(-12), -0.7);
}
function LOCK(f) {
  const n = Math.round(0.03 * SR), x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = Math.sin(2 * Math.PI * 660 * i / SR) * Math.exp(-(i / SR) / 0.01) * Math.min(1, i / 24);
  place(x, at(f), db(-16));
}
function SHIMMER(f) {
  const n = Math.round(0.6 * SR), x = filt(noise(n), 'hp', 6000);
  for (let i = 0; i < n; i++) x[i] *= Math.sin(Math.PI * i / n) * 1.2;
  place(x, at(f), db(-22), 0, 0.3);
}
function BED(f0, f1, d) { // filtered noise bed
  const n = at(f1) - at(f0), x = filt(noise(n), 'lp', 900);
  for (let i = 0; i < n; i++) x[i] *= Math.min(1, i / 4800, (n - i) / 4800) * 3;
  place(x, at(f0), db(d));
}

// ---------------------------------------------------------------- SUB (E1) with level automation + kick sidechain
const SUB_LEVEL = [ // [frame, dB] breakpoints (linear interpolation); -120 = off
  [0, -120], [79, -18], [160, -12], [309, -12], [310, -120], [319, -120], [320, -14], [360, -14], [361, -20], [399, -20],
  [400, -8], [559, -8], [560, -11], [719, -11], [720, -14], [795, -14], [796, -120], [799, -120], [800, -11], [959, -11],
];
function subLevel(f) {
  for (let i = 0; i < SUB_LEVEL.length - 1; i++) {
    const [fa, da] = SUB_LEVEL[i], [fb, dbb] = SUB_LEVEL[i + 1];
    if (f >= fa && f <= fb) { const p = (f - fa) / Math.max(1e-9, fb - fa); const ga = da <= -100 ? 0 : db(da), gb = dbb <= -100 ? 0 : db(dbb); return ga + (gb - ga) * p; }
  }
  return 0;
}
function renderSub() {
  const duck = new Float32Array(N).fill(1);
  for (const k of KICK_TIMES) for (let i = 0; i < 0.4 * SR; i++) {
    const j = k + i; if (j >= N) break;
    const t = i / SR, env = t < 0.01 ? t / 0.01 : Math.exp(-(t - 0.01) / 0.16);
    duck[j] = Math.min(duck[j], 1 - (1 - db(-8)) * env);
  }
  let ph = 0;
  for (let j = 0; j < N; j++) {
    ph += 2 * Math.PI * 41.2 / SR;
    const v = (Math.sin(ph) + 0.35 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph)) * subLevel(j / SPF) * duck[j] * 0.8;
    L[j] += v; R[j] += v;
  }
}

// ---------------------------------------------------------------- the cue sheet (DIRECTION.md §9)
const NOTE = {E5: 659.26, G5: 783.99, A5: 880, B5: 987.77, D6: 1174.66, E6: 1318.51, G6: 1567.98, A6: 1760, B6: 1975.53, D7: 2349.32};

// B1 hook
BOOM(0); GLITCH(0, -2);
KICK(40);
// B2 proof
KICK(80); KICK(120);
for (let i = 0; i < 5; i++) { TICK(80 + i); TICK(120 + i); }
for (const f of [100, 140]) { HAT(f); HAT(f + 5); KICK(f, -9); }
// B3 groove + headline
KICK(160); KICK(200);
for (let f = 160; f < 240; f += 10) HAT(f, -2);
TICK(160, 4); TICK(170, 4); TICK(180, 4); TICK(200, 4); TICK(212, 2); LOCK(212);
// B4 the break
for (let i = 0; i < 12; i++) TICK(240 + i);
for (let i = 0; i < 8; i++) FAIL(260 + i * 5);
for (let f = 260; f < 300; f += 5) HAT(f, -3);
KICK(260); KICK(280);
KICK(300); FAIL(300, -6 + 6); FAIL(300.6, 0);
GLITCH(305); GLITCH(307);
// B5 the turn
KICK(320);
for (let i = 0; i < 17; i++) TICK(360 + i);
RISER(360, 400);
// B6 the drop
KICK(400); BELL(400, NOTE.E5, 0);
const climb = ['G5', 'A5', 'B5', 'D6', 'E6', 'G6', 'A6', 'B6', 'D7', 'E6', 'G6', 'A6', 'B6', 'D7', 'E6'];
climb.forEach((n, i) => BELL(405 + i * 5, NOTE[n], -2, (i % 2 ? 0.25 : -0.25)));
for (let f = 400; f < 480; f += 20) if (f !== 400) KICK(f);
for (let f = 400; f < 480; f += 10) HAT(f);
// B7 payoff
KICK(480); BELL(480, NOTE.E5, -3, 0, null, 1.4); BELL(480, NOTE.B5, -5, -0.2, null, 1.4); BELL(480, NOTE.E6, -6, 0.2, null, 1.4); SHIMMER(480);
HIT(520);
for (let f = 480; f < 560; f += 10) HAT(f, -4);
// B8–B9 basket
WHOOSH(560, 566);
KICK(560); KICK(600); KICK(640); KICK(680);
for (const f of [580, 590, 600]) { TICK(f, 4); LOCK(f); }
for (let f = 600; f < 720; f += 10) HAT(f, -6);
BELL(660, NOTE.E5, -6);
for (let i = 0; i < 5; i++) TICK(680 + i);
TICK(690, 3);
// B10 quiet: terminal proof that every component is 0xef (groove out, SUB + bed)
BED(720, 796, -24);
for (const fc of [720, 740, 760]) { for (let i = 0; i < 5; i++) TICK(fc + i); LOCK(fc + 10); }
// B11 tagline
HIT(800); HIT(820); HIT(840); GLITCH(840, -2);
KICK(860); BELL(860, NOTE.E5, -0);
// B12 outro -> loop
KICK(880, -3);
for (let f = 880; f < 900; f += 10) HAT(f, -5);
for (let i = 0; i < 23; i++) TICK(904 + i);
RISER(920, 960);

renderSub();

// ---------------------------------------------------------------- reverb (Schroeder: 4 combs + 2 allpasses, ~1.2 s)
(function reverb() {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({d: Math.round(d * SR / 44100), buf: null, i: 0}));
  const fb = 0.84, out = new Float32Array(N);
  for (const c of combs) { c.buf = new Float32Array(c.d); }
  for (let j = 0; j < N; j++) {
    let s = 0;
    for (const c of combs) { const y = c.buf[c.i]; c.buf[c.i] = SEND[j] + y * fb; c.i = (c.i + 1) % c.d; s += y; }
    out[j] = s * 0.25;
  }
  for (const d of [225, 556]) {
    const dd = Math.round(d * SR / 44100), b = new Float32Array(dd); let k = 0;
    for (let j = 0; j < N; j++) { const y = b[k]; const x = out[j]; b[k] = x + y * 0.5; out[j] = y - x * 0.5; k = (k + 1) % dd; }
  }
  for (let j = 0; j < N; j++) { L[j] += out[j] * 0.9; R[j] += out[j] * (j % 2 ? 0.85 : 0.95); }
})();

// ---------------------------------------------------------------- room tone in the pre-drop gap (−30 dB)
{ const a = at(796), b = at(800), x = noise(b - a); for (let i = 0; i < x.length; i++) { L[a + i] = x[i] * db(-30) * 0.5; R[a + i] = x[i] * db(-30) * 0.5; } }

// ---------------------------------------------------------------- master: gain, lookahead peak limiter, hard gate, seam fades
{ const l2 = filt(L, 'lp', 13000, 0.6), r2 = filt(R, 'lp', 13000, 0.6); // tame inter-sample overs from the crushed square waves
  for (let j = 0; j < N; j++) { L[j] = l2[j] * MASTER; R[j] = r2[j] * MASTER; } }
(function limiter() {
  const ceil = db(-2.0), look = 96, rel = Math.exp(-1 / (0.08 * SR));
  const need = new Float32Array(N);
  const tp = (X, j) => { // inter-sample peak estimate (Catmull-Rom at 1/4, 1/2, 3/4)
    const a = X[Math.max(0, j - 1)], b = X[j], c = X[Math.min(N - 1, j + 1)], d = X[Math.min(N - 1, j + 2)];
    let m = Math.abs(b);
    for (const t of [0.25, 0.5, 0.75]) { const v = 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t); m = Math.max(m, Math.abs(v)); }
    return m; };
  for (let j = 0; j < N; j++) { const pk = Math.max(tp(L, j), tp(R, j)); need[j] = pk > ceil ? ceil / pk : 1; }
  for (let j = 1; j < N; j++) need[j - 1] = Math.min(need[j - 1], need[j]);
  // min over lookahead window, then smooth release
  const g = new Float32Array(N); let cur = 1;
  for (let j = N - 1; j >= 0; j--) { /* backward pass spreads the attack */ cur = Math.min(need[j], cur + (1 - cur) * (1 / look)); g[j] = cur; }
  let s = 1;
  for (let j = 0; j < N; j++) { s = g[j] < s ? g[j] : g[j] + (s - g[j]) * rel; L[j] *= s; R[j] *= s; }
})();
// true digital silence f310–f319
for (let j = at(310); j < at(320); j++) { L[j] = 0; R[j] = 0; }
// gate edges: 1 ms fade into the gate so the cut doesn't click
for (let i = 0; i < 48; i++) { const g = i / 48; L[at(310) - 48 + i] *= 1 - g; R[at(310) - 48 + i] *= 1 - g; }
// loop seam: last 1 ms to zero (riser hard stop), first samples already ramp in
for (let i = 0; i < 48; i++) { const g = i / 48; L[N - 1 - i] *= g; R[N - 1 - i] *= g; L[i] *= g; R[i] *= g; }

const buf = Buffer.alloc(44 + N * 4);
for (let j = 0; j < N; j++) {
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[j] * 32767))), 44 + j * 4);
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[j] * 32767))), 46 + j * 4);
}
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
fs.writeFileSync(outPath, buf);
console.log('wrote', outPath, (N / SR).toFixed(3) + 's', 'master', MASTER.toFixed(3));

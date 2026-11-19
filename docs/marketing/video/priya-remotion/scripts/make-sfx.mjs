// Deterministic, restrained SFX kit synthesised as 48 kHz 16-bit WAVs into public/sfx/.
// No downloads. Seeded noise, so every run produces identical files.
import { writeFileSync, mkdirSync } from 'node:fs';
const SR = 48000;
mkdirSync('public/sfx', { recursive: true });
let seed = 1234567;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
function wav(name, L, R = L) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  writeFileSync(`public/sfx/${name}.wav`, buf);
}
const arr = (sec) => new Float32Array(Math.round(sec * SR));
// state-variable band/low pass, cutoff may vary per sample
function svf(x, fc, q = 0.7, mode = 'bp') {
  const y = new Float32Array(x.length); let lp = 0, bp = 0;
  for (let i = 0; i < x.length; i++) {
    const f = 2 * Math.sin(Math.PI * Math.min(0.45, (typeof fc === 'function' ? fc(i / SR) : fc) / SR));
    const hp = x[i] - lp - bp / q; bp += f * hp; lp += f * bp;
    y[i] = mode === 'bp' ? bp : mode === 'lp' ? lp : hp;
  }
  return y;
}
const norm = (x, peak) => { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); return x.map((v) => (v / (m || 1)) * peak); };
const db = (d) => Math.pow(10, d / 20);
const env = (t, a, d, curve = 3) => (t < a ? Math.pow(t / a, 2) : Math.exp(-(t - a) / d * curve / 3));

// decode: a short train of tiny, soft ticks (type settling), fading
{
  const x = arr(0.42);
  for (let k = 0; k < 7; k++) {
    const t0 = k * 0.05 + (k % 2) * 0.008, amp = 0.9 * Math.pow(0.8, k);
    const f = 2600 + (k % 3) * 420;
    for (let i = 0; i < 0.02 * SR; i++) { const t = i / SR; x[Math.round(t0 * SR) + i] += amp * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.0035) + amp * 0.25 * rnd() * Math.exp(-t / 0.0012); }
  }
  wav('decode', norm(svf(x, 3400, 0.9, 'bp'), db(-14)));
}
// whoosh: filtered-noise swell for the alloy-bar sweep (≈0.6 s), stereo spread by direction
{
  const d = 0.75, x = arr(d), y = arr(d);
  for (let i = 0; i < x.length; i++) { x[i] = rnd(); y[i] = rnd(); }
  const fc = (t) => 350 + 2600 * Math.sin(Math.PI * Math.min(1, t / 0.55)) ** 1.5;
  const e = (t) => Math.sin(Math.PI * Math.min(1, t / 0.6)) ** 2 * (t < 0.6 ? 1 : Math.exp(-(t - 0.6) / 0.05));
  const L = svf(x, fc, 1.6), R = svf(y, (t) => fc(t) * 1.07, 1.6);
  for (let i = 0; i < L.length; i++) { const t = i / SR; const p = Math.min(1, t / 0.6); L[i] *= e(t) * (1.15 - 0.5 * p); R[i] *= e(t) * (0.65 + 0.5 * p); }
  const m = Math.max(...norm(L, 1).map(Math.abs));
  wav('whoosh', norm(L, db(-13)), norm(R, db(-13)));
}
// impact: soft low thump + faint metallic ting (the fold, the wordmark)
{
  const d = 1.4, x = arr(d);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR; const f = 42 + 38 * Math.exp(-t / 0.05); ph += 2 * Math.PI * f / SR;
    x[i] = Math.sin(ph) * env(t, 0.004, 0.32) * 0.9;
    x[i] += rnd() * Math.exp(-t / 0.012) * 0.25;
    // metal partials (inharmonic), quiet
    x[i] += 0.05 * Math.exp(-t / 0.5) * (Math.sin(2 * Math.PI * 1870 * t) + 0.6 * Math.sin(2 * Math.PI * 2930 * t + 1) + 0.4 * Math.sin(2 * Math.PI * 4410 * t + 2)) * Math.min(1, t / 0.003);
  }
  wav('impact', norm(svf(x, 5200, 0.7, 'lp'), db(-10)));
}
// sheen: airy shimmer for light passes across metal
{
  const d = 1.1, L = arr(d), R = arr(d);
  for (let i = 0; i < L.length; i++) { L[i] = rnd(); R[i] = rnd(); }
  const a = svf(L, (t) => 6000 + 3000 * t, 2.5), b = svf(R, (t) => 6500 + 2800 * t, 2.5);
  for (let i = 0; i < a.length; i++) {
    const t = i / SR, e = Math.sin(Math.PI * Math.min(1, t / d)) ** 2;
    const ring = 0.12 * (Math.sin(2 * Math.PI * 2093 * t) + 0.7 * Math.sin(2 * Math.PI * 3136 * t + 0.5)) * e;
    a[i] = a[i] * e + ring; b[i] = b[i] * e + ring * 0.9;
  }
  wav('sheen', norm(a, db(-20)), norm(b, db(-20)));
}
// click: UI tap
{
  const x = arr(0.08);
  for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = Math.sin(2 * Math.PI * 1750 * t) * Math.exp(-t / 0.009) + 0.5 * Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t / 0.015) + 0.3 * rnd() * Math.exp(-t / 0.0015); }
  wav('click', norm(x, db(-12)));
}
// hold: a soft rising tone while the buy button is held (0.7 s)
{
  const d = 0.8, x = arr(d); let ph = 0;
  for (let i = 0; i < x.length; i++) { const t = i / SR; const f = 520 + 260 * (t / d) ** 1.4; ph += 2 * Math.PI * f / SR; x[i] = (Math.sin(ph) + 0.25 * Math.sin(2 * ph)) * Math.min(1, t / 0.08) * (t > d - 0.06 ? (d - t) / 0.06 : 1); }
  wav('hold', norm(svf(x, 2200, 0.7, 'lp'), db(-24)));
}
// check: soft two-note chime (E6, B6)
{
  const d = 1.6, x = arr(d);
  const note = (f, t0, a) => { for (let i = Math.round(t0 * SR); i < x.length; i++) { const t = i / SR - t0; x[i] += a * (Math.sin(2 * Math.PI * f * t) + 0.18 * Math.sin(2 * Math.PI * f * 2.01 * t)) * Math.min(1, t / 0.006) * Math.exp(-t / 0.45); } };
  note(1318.5, 0, 0.6); note(1975.5, 0.09, 0.5);
  wav('check', norm(x, db(-15)));
}
// flip: two soft paper/metal flicks (calendar flip)
{
  const x = arr(0.35);
  for (const t0 of [0, 0.11]) for (let i = 0; i < 0.06 * SR; i++) { const t = i / SR; x[Math.round(t0 * SR) + i] += rnd() * Math.exp(-t / 0.012) * (t0 ? 0.7 : 1); }
  wav('flip', norm(svf(x, 2400, 0.8), db(-16)));
}
// slide: slider friction (1.1 s), a filtered noise glide that rises with the thumb
{
  const d = 1.1, x = arr(d);
  for (let i = 0; i < x.length; i++) x[i] = rnd();
  const y = svf(x, (t) => 700 + 1500 * (t / d), 3);
  for (let i = 0; i < y.length; i++) { const t = i / SR; y[i] *= Math.min(1, t / 0.12) * (t > d - 0.15 ? (d - t) / 0.15 : 1); }
  wav('slide', norm(y, db(-24)));
}
// flake: a tiny glassy scatter (trimmed sliver peeling off)
{
  const x = arr(0.9);
  for (let k = 0; k < 9; k++) { const t0 = 0.03 + k * 0.07 + (k % 3) * 0.013; const f = 3200 + ((k * 733) % 1900); for (let i = 0; i < 0.12 * SR && t0 * SR + i < x.length; i++) { const t = i / SR; x[Math.round(t0 * SR) + i] += Math.pow(0.82, k) * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.03); } }
  wav('flake', norm(x, db(-22)));
}
console.log('sfx written');

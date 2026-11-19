// Refine BPM/phase for one track, then find the music start offset (trimBefore) that puts
// the most locked script cuts on beats. usage: node scripts/beatgrid.mjs file.mp3 bpmGuess
import { execFileSync } from 'node:child_process';
const [f, g] = [process.argv[2], +process.argv[3]];
const SR = 11025, HOP = 64;
const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const x = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
const n = Math.floor(x.length / HOP); const env = new Float32Array(n); let prev = 0;
for (let i = 0; i < n; i++) { let e = 0; for (let j = 0; j < HOP; j++) { const v = x[i * HOP + j]; e += v * v; } e = Math.log(1e-9 + e); env[i] = Math.max(0, e - prev); prev = e; }
const fr = SR / HOP;
let best = [0, 0, 0];
for (let bpm = g - 1.5; bpm <= g + 1.5; bpm += 0.01) {
  const P = fr * 60 / bpm;
  for (let ph = 0; ph < P; ph += 0.5) { let s = 0; for (let k = ph; k < n; k += P) s += env[Math.round(k)]; if (s > best[0]) best = [s, bpm, ph / fr]; }
}
const [, bpm, phase] = best; const P = 60 / bpm;
const cuts = [3.5, 7.5, 8.5, 12.5, 16.5, 23.5, 26.5, 30.5, 34.5, 37.5, 41.0];
const res = [];
for (let t0 = 0; t0 < 40; t0 += 1 / 30) {
  let s = 0; const errs = [];
  for (const c of cuts) { const tt = c + t0 - phase; const e = tt / P - Math.round(tt / P); const ef = Math.abs(e * P * 30); errs.push(+ef.toFixed(1)); s += ef <= 2 ? 1 : 0; }
  res.push({ t0: +t0.toFixed(3), s, errs });
}
res.sort((a, b) => b.s - a.s);
console.log(JSON.stringify({ bpm: +bpm.toFixed(2), phase: +phase.toFixed(3), barSec: +(4 * P).toFixed(3) }));
res.slice(0, 6).forEach((r) => console.log(JSON.stringify(r)));

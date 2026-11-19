// For a 120 BPM file: beat phase + which beat of 4 is the downbeat (strongest low-band onset).
import { execFileSync } from 'node:child_process';
const f = process.argv[2]; const bpm = 120; const SR = 11025, HOP = 32;
const dec = (af) => { const b = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-af', af, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 }); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const onset = (x) => { const n = Math.floor(x.length / HOP); const env = new Float32Array(n); let p = 0; for (let i = 0; i < n; i++) { let e = 0; for (let j = 0; j < HOP; j++) { const v = x[i * HOP + j]; e += v * v; } e = Math.log(1e-9 + e); env[i] = Math.max(0, e - p); p = e; } return env; };
const full = onset(dec('anull')), low = onset(dec('lowpass=f=120'));
const fr = SR / HOP, P = fr * 60 / bpm;
let bs = -1, bp = 0; for (let ph = 0; ph < P; ph += 0.25) { let s = 0; for (let k = ph; k < full.length; k += P) s += full[Math.round(k)]; if (s > bs) { bs = s; bp = ph; } }
const acc = [0, 0, 0, 0]; let i = 0; for (let k = bp; k < low.length; k += P, i++) acc[i % 4] += low[Math.round(k)] + low[Math.round(k) + 1];
const db = acc.indexOf(Math.max(...acc));
const firstDown = (bp + db * P) / fr;
// rms per bar to see sections
const x = dec('anull'); const bars = []; for (let t = firstDown; t < x.length / SR; t += 2) { let e = 0, c = 0; for (let j = Math.floor(t * SR); j < Math.min(x.length, (t + 2) * SR); j++) { e += x[j] * x[j]; c++; } bars.push(Math.round(10 * Math.log10(e / c + 1e-12))); }
console.log(JSON.stringify({ f, beatPhase: +(bp / fr).toFixed(3), lowAcc: acc.map((a) => +a.toFixed(0)), firstDownbeat: +firstDown.toFixed(3), barRmsDb: bars.join(' ') }));

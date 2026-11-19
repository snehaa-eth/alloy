// Estimate BPM + downbeat phase + integrated loudness of each music file.
// usage: node scripts/analyze-music.mjs public/music/*.mp3
import { execFileSync } from 'node:child_process';
const SR = 11025, HOP = 128;
for (const f of process.argv.slice(2)) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  const x = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
  const n = Math.floor(x.length / HOP);
  const env = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) { let e = 0; for (let j = 0; j < HOP; j++) { const v = x[i * HOP + j]; e += v * v; } e = Math.log(1e-9 + e); env[i] = Math.max(0, e - prev); prev = e; }
  const fr = SR / HOP;
  // autocorrelation over 70..170 BPM
  let best = 0, bestBpm = 0; const scores = [];
  for (let bpm = 70; bpm <= 170; bpm += 0.25) {
    const lag = fr * 60 / bpm; let s = 0;
    for (let i = 0; i + lag * 4 < n; i += 1) { s += env[i] * (env[Math.round(i + lag)] + 0.5 * env[Math.round(i + 2 * lag)] + 0.5 * env[Math.round(i + 4 * lag)]); }
    scores.push([bpm, s]); if (s > best) { best = s; bestBpm = bpm; }
  }
  // phase
  const period = fr * 60 / bestBpm; let bp = 0, bs = -1;
  for (let ph = 0; ph < period; ph += 0.25) { let s = 0; for (let k = ph; k < n; k += period) s += env[Math.round(k)]; if (s > bs) { bs = s; bp = ph; } }
  // per-second rms profile (for picking a section)
  const sec = []; for (let t = 0; t < x.length / SR; t += 2) { let e = 0, c = 0; for (let i = t * SR; i < Math.min(x.length, (t + 2) * SR); i++) { e += x[i] * x[i]; c++; } sec.push((10 * Math.log10(e / c + 1e-12)).toFixed(0)); }
  const lufs = execFileSync('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  let integrated = '';
  try { execFileSync('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] }); } catch {}
  const r = (await import('node:child_process')).spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = r.stderr.match(/I:\s+(-?[\d.]+) LUFS/g); integrated = m ? m[m.length - 1] : '?';
  const top = scores.sort((a, b) => b[1] - a[1]).slice(0, 5).map(([b]) => b);
  console.log(JSON.stringify({ file: f, bpm: bestBpm, top, beatPhaseSec: +(bp / fr).toFixed(3), integrated, rms2s: sec.join(' ') }));
}

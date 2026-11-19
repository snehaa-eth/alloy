// Deterministic frame-by-frame render of index.html → PNG frames → MP4.
// usage: node render.mjs                 (full 300 frames + encode)
//        node render.mjs --stills 0.3,2,4.3   (just these times, to ./stills-qa)
// needs playwright-core (resolved from NODE_PATH or a local node_modules) and ffmpeg.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(process.env.PW_FROM || import.meta.url);
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FFMPEG = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg';
const WORK = process.env.WORK || path.join(HERE, '.frames');
const FPS = 30, DUR = 10, N = FPS * DUR;
const MUSIC = path.resolve(HERE, '../alloy-idea-01/audio/pixabay-minimal-electronica.mp3');

const args = process.argv.slice(2);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(HERE, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(HERE) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url);
await page.evaluate(() => window.ready);
console.log('GL:', await page.evaluate(() => { const g = document.getElementById('gl').getContext('webgl2'); const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; }));
const stage = await page.$('#stage');

async function shot(t, file) {
  await page.evaluate((tt) => window.renderFrame(tt), t);
  await stage.screenshot({ path: file, type: 'png' });
}

if (stillsArg) {
  const out = process.env.STILLS || path.join(HERE, 'stills-qa');
  fs.mkdirSync(out, { recursive: true });
  for (const s of stillsArg.split(',')) { const t = parseFloat(s); await shot(t, path.join(out, `t${t.toFixed(2)}.png`)); console.log('still', t); }
} else {
  fs.mkdirSync(WORK, { recursive: true });
  const t0 = Date.now();
  for (let f = 0; f < N; f++) {
    await shot(f / FPS, path.join(WORK, `f${String(f).padStart(4, '0')}.png`));
    if (f % 30 === 0) console.log(`frame ${f}/${N}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}
await browser.close();
server.close();

if (!stillsArg) {
  const silent = path.join(WORK, 'video.mp4');
  execFileSync(FFMPEG, ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(WORK, 'f%04d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent], { stdio: 'inherit' });
  const out = path.join(HERE, 'style-test-3d.mp4');
  if (fs.existsSync(MUSIC) && !args.includes('--silent')) {
    // quiet bed: trim 10s, fade in 0.6s / out 1.6s, two-pass-free loudnorm to about -18 LUFS
    execFileSync(FFMPEG, ['-y', '-v', 'error', '-i', silent, '-ss', '0', '-t', String(DUR), '-i', MUSIC,
      '-filter_complex', `[1:a]atrim=0:${DUR},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.6,afade=t=out:st=${DUR - 1.6}:d=1.6,loudnorm=I=-18:TP=-2:LRA=7,aresample=48000[a]`,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
  } else fs.copyFileSync(silent, out);
  console.log('wrote', out);
}

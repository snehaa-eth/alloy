// Deterministic frame renderer (shared with build-log-01).
// The page (index.html) exposes:
//   window.DURATION            seconds
//   window.FPS                 frames per second
//   window.renderAt(t)         draws the frame for time t (seconds); must be synchronous
//   window.CUES                [{t, type: 'hit'|'kick'|'tick'|'riser'|'sub'|'glitch', gain?}] for the audio
// Usage:
//   NODE_PATH=<dir with playwright-core> node render.mjs --out <dir> [--from s] [--to s] [--stills 1.0,3.5,...]
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), [])
);
const OUT = path.resolve(args.out || path.join(here, '..', 'out'));
const FFMPEG = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
fs.mkdirSync(OUT, {recursive: true});

const browser = await chromium.launch({executablePath: CHROME, headless: true, args: ['--force-color-profile=srgb', '--hide-scrollbars']});
const page = await browser.newPage({viewport: {width: 1080, height: 1920}, deviceScaleFactor: 1});
await page.goto('file://' + path.join(here, 'index.html'));
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => typeof window.renderAt === 'function');
const {DURATION, FPS, CUES} = await page.evaluate(() => ({DURATION: window.DURATION, FPS: window.FPS, CUES: window.CUES || []}));
fs.writeFileSync(path.join(OUT, 'cues.json'), JSON.stringify({DURATION, FPS, CUES}, null, 1));

const WORDS = {};
async function shot(t) {
  await page.evaluate((t) => window.renderAt(t), t);
  // covers are <img> elements re-created each frame: wait until every image is decoded before capturing
  const w = await page.evaluate(async () => { await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); return [window.__frame, window.__words]; });
  WORDS[w[0]] = w[1];
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  return page.screenshot({type: 'png', clip: {x: 0, y: 0, width: 1080, height: 1920}});
}

if (args.stills) {
  for (const s of args.stills.split(',')) {
    const t = parseFloat(s);
    fs.writeFileSync(path.join(OUT, `still_${t.toFixed(2)}.png`), await shot(t));
  }
  await browser.close();
  process.exit(0);
}

const from = parseFloat(args.from || 0);
const to = parseFloat(args.to || DURATION);
const n0 = Math.round(from * FPS), n1 = Math.round(to * FPS);
const video = path.join(OUT, 'video-only.mp4');
const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-r', String(FPS), video], {stdio: ['pipe', 'inherit', 'inherit']});
const t0 = Date.now();
for (let n = n0; n < n1; n++) {
  const buf = await shot(n / FPS);
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (n % 60 === 0) process.stdout.write(`frame ${n}/${n1} ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
}
ff.stdin.end();
fs.writeFileSync(path.join(OUT, 'words.json'), JSON.stringify(WORDS));
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log('wrote', video);

// Colour-budget + safe-area audit. Reads raw rgb24 1080x1920 frames (every 5th frame) on stdin, writes CSV.
// burgundy family: hue 330–360 or 0–8°, sat > 0.5, value > 0.25 (dark glow tints don't count, TOKENS §8/§10.5)
// gold: hue 30–48°, sat 0.3–0.7, value ≥ 0.45
// unsafe_text_px: bright (luma > 60), non-burgundy pixels in the unsafe margins (bottom 280, right 120, top 140, left 60)
const W = 1080, H = 1920, FS = W * H * 3, STEP = 5;
let buf = Buffer.alloc(0), k = 0;
console.log('frame,burgundy_pct,gold_pct,unsafe_text_px');
function analyse(fr, n) {
  let burg = 0, gold = 0, unsafe = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3, r = fr[i] / 255, g = fr[i + 1] / 255, b = fr[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, v = mx, s = mx ? d / mx : 0;
    let h = 0;
    if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); if (h < 0) h += 360; }
    const isB = s > 0.5 && v > 0.25 && (h >= 330 || h <= 8);
    if (isB) burg++;
    if (h >= 30 && h <= 48 && s >= 0.3 && s <= 0.7 && v >= 0.45) gold++;
    if (!isB && (y >= 1640 || x >= 960 || y < 140 || x < 60)) {
      const l = 0.2126 * fr[i] + 0.7152 * fr[i + 1] + 0.0722 * fr[i + 2];
      if (l > 60) unsafe++;
    }
  }
  const tot = W * H;
  console.log(`${n},${(100 * burg / tot).toFixed(3)},${(100 * gold / tot).toFixed(3)},${unsafe}`);
}
process.stdin.on('data', (c) => {
  buf = Buffer.concat([buf, c]);
  while (buf.length >= FS) { analyse(buf.subarray(0, FS), k * STEP); buf = buf.subarray(FS); k++; }
});

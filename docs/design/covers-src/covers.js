// Alloy basket covers: procedural, deterministic, 1600x900.
// Every scene is painted in luminance (greyscale) on a canvas, then bloomed,
// grained, vignetted and mapped through a jewel-tone LUT (near-black -> deep -> mid -> paper tint).
// Usage: covers.html#capitol-tech | #big-tech | #picks-shovels | #space-race
'use strict';

const W = 1600, H = 900;
const TONES = {
  burgundy: { deep: '#3A0010', mid: '#B5304F' },
  emerald:  { deep: '#0F2E24', mid: '#2E8B6A' },
  sapphire: { deep: '#10223F', mid: '#3E6FB8' },
  amber:    { deep: '#3A2A08', mid: '#C98A2E' },
  plum:     { deep: '#2A1433', mid: '#8E5BA6' },
};
const PAPER = '#F2F0ED';

// ---------- utilities ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeNoise(seed) {
  const r = mulberry32(seed);
  const N = 256, P = new Float32Array(N * N);
  for (let i = 0; i < P.length; i++) P[i] = r();
  const s = t => t * t * (3 - 2 * t);
  const g = (x, y) => P[((y & 255) << 8) | (x & 255)];
  function n(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = s(x - xi), yf = s(y - yi);
    const a = g(xi, yi), b = g(xi + 1, yi), c = g(xi, yi + 1), d = g(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  }
  function fbm(x, y, oct = 5) {
    let v = 0, amp = 0.5, f = 1, tot = 0;
    for (let i = 0; i < oct; i++) { v += amp * n(x * f, y * f); tot += amp; amp *= 0.5; f *= 2.03; }
    return v / tot;
  }
  return { n, fbm };
}
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const L = (v, a = 1) => `rgba(${v | 0},${v | 0},${v | 0},${a})`;
function hex(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
function mix(a, b, t) { return a.map((v, i) => v + (b[i] - v) * t); }

function layer() { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }
function glow(ctx, x, y, r, v, a, op = 'lighter') {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, L(v, a)); g.addColorStop(0.35, L(v, a * 0.35)); g.addColorStop(1, L(v, 0));
  ctx.save(); ctx.globalCompositeOperation = op; ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
// Rim light: a stroke clipped inside the shape, coloured by a gradient (light position).
function rim(ctx, path, style, width) {
  ctx.save(); ctx.clip(path); ctx.strokeStyle = style; ctx.lineWidth = width * 2;
  ctx.lineJoin = 'round'; ctx.stroke(path); ctx.restore();
}
function radial(ctx, x, y, r, v, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, L(v, a)); g.addColorStop(1, L(v, 0)); return g;
}
function rectPath(x, y, w, h) { const p = new Path2D(); p.rect(x, y, w, h); return p; }

// ---------- scene 1: capitol-tech (burgundy) ----------
function capitol(ctx) {
  const rnd = mulberry32(1101), nz = makeNoise(11);
  // sky: dark, warm haze behind the dome
  ctx.fillStyle = L(10); ctx.fillRect(0, 0, W, H);
  const LX = 1150, LY = 300;
  glow(ctx, LX + 80, LY - 20, 1000, 60, 0.5);
  glow(ctx, LX + 60, LY + 10, 480, 140, 0.4);
  glow(ctx, LX + 20, LY + 120, 240, 200, 0.25);
  // soft haze texture
  const hz = ctx.createImageData(W, H);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const v = nz.fbm(x / 380, y / 220, 4);
    const i = (y * W + x) * 4; const k = 255 * Math.pow(v, 3) * smooth(300, 1100, x);
    hz.data[i] = hz.data[i + 1] = hz.data[i + 2] = k; hz.data[i + 3] = 255;
  }
  const hl = layer(); hl.getContext('2d').putImageData(hz, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18; ctx.drawImage(hl, 0, 0); ctx.restore();

  const cx = 1130;
  const bld = new Path2D();
  // steps + podium
  bld.rect(cx - 470, 650, 940, 16); bld.rect(cx - 450, 636, 900, 16); bld.rect(cx - 430, 622, 860, 16);
  // entablature + cornice + attic
  bld.rect(cx - 400, 418, 800, 34); bld.rect(cx - 412, 410, 824, 10); bld.rect(cx - 380, 392, 760, 20);
  // columns of the portico
  const cols = 10, x0 = cx - 375, x1 = cx + 375, cw = 30, colTop = 452, colBot = 622;
  const colX = [];
  for (let i = 0; i < cols; i++) {
    const x = x0 + (x1 - x0) * i / (cols - 1); colX.push(x);
    bld.rect(x - cw / 2, colTop + 12, cw, colBot - colTop - 22);
    bld.rect(x - cw / 2 - 6, colTop, cw + 12, 12);          // capital
    bld.rect(x - cw / 2 - 5, colBot - 10, cw + 10, 10);     // base
  }
  // drum: base band, colonnettes, cornice
  const dL = cx - 200, dR = cx + 200;
  bld.rect(dL - 20, 360, 440, 32); bld.rect(dL - 10, 352, 420, 10);
  bld.rect(dL, 262, 400, 14); bld.rect(dL - 8, 254, 416, 10);
  const dcols = 14, dColX = [];
  for (let i = 0; i < dcols; i++) {
    const x = dL + 8 + (400 - 16) * i / (dcols - 1); dColX.push(x);
    bld.rect(x - 7, 276, 14, 76);
  }
  // dome (half ellipse) + lantern + finial
  bld.ellipse(cx, 256, 186, 168, 0, Math.PI, 2 * Math.PI);
  bld.rect(cx - 26, 70, 52, 26); bld.rect(cx - 34, 92, 68, 8);
  bld.ellipse(cx, 70, 26, 22, 0, Math.PI, 2 * Math.PI);
  bld.rect(cx - 2, 30, 4, 22); bld.arc(cx, 32, 4, 0, Math.PI * 2);

  // light seen between columns (backlit interior / sky through the colonnade)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = radial(ctx, LX + 40, 600, 460, 255, 0.42);
  ctx.fillRect(x0, colTop, x1 - x0, colBot - colTop);
  const vg = ctx.createLinearGradient(0, colTop, 0, colBot);
  vg.addColorStop(0, L(0, 0)); vg.addColorStop(1, L(255, 0.10));
  ctx.fillStyle = vg; ctx.fillRect(x0, colTop, x1 - x0, colBot - colTop);
  ctx.fillStyle = radial(ctx, LX + 40, 320, 240, 255, 0.45);
  ctx.fillRect(dL, 276, 400, 76);
  ctx.restore();

  // silhouette body
  ctx.fillStyle = L(8); ctx.fill(bld);
  // dome ribs + shading (very subtle)
  ctx.save(); ctx.clip(bld);
  ctx.fillStyle = radial(ctx, cx + 170, 120, 260, 120, 0.35);
  ctx.fillRect(cx - 200, 60, 400, 200);
  // columns: cylindrical shading (light catches the right flank)
  for (const x of colX) {
    const cg = ctx.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0);
    cg.addColorStop(0, L(0, 0)); cg.addColorStop(0.75, L(90, 0.18)); cg.addColorStop(1, L(160, 0.35));
    ctx.fillStyle = cg; ctx.fillRect(x - cw / 2, colTop + 12, cw, colBot - colTop - 22);
    for (let fl = 1; fl < 5; fl++) { ctx.fillStyle = L(0, 0.25); ctx.fillRect(x - cw / 2 + fl * cw / 5, colTop + 12, 1, colBot - colTop - 22); }
  }
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath(); ctx.strokeStyle = L(60, 0.12); ctx.lineWidth = 1.2;
    ctx.ellipse(cx, 256, Math.abs(186 * i / 6.5) + 0.1, 168, 0, Math.PI, 2 * Math.PI); ctx.stroke();
  }
  ctx.restore();
  // rim from the light behind/above right
  rim(ctx, bld, radial(ctx, LX + 330, 140, 620, 255, 1), 2.0);
  rim(ctx, bld, radial(ctx, LX + 330, 140, 1000, 255, 0.35), 1.0);
  rim(ctx, bld, radial(ctx, LX + 60, 520, 360, 255, 0.5), 1.4);

  // ground plane + fog bank at the foot of the steps
  const gg = ctx.createLinearGradient(0, 666, 0, H);
  gg.addColorStop(0, L(13)); gg.addColorStop(1, L(4));
  ctx.fillStyle = gg; ctx.fillRect(0, 666, W, H - 666);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const fog = ctx.createLinearGradient(0, 600, 0, 760);
  fog.addColorStop(0, L(120, 0)); fog.addColorStop(0.5, L(120, 0.10)); fog.addColorStop(1, L(120, 0));
  ctx.restore();
  glow(ctx, LX, 670, 700, 120, 0.16);

  // volumetric beams spilling forward through the colonnade
  const beams = layer(), b = beams.getContext('2d');
  b.globalCompositeOperation = 'lighter';
  const SX = LX + 40, SY = -160;
  for (let i = 0; i < cols - 1; i++) {
    const gl = colX[i] + cw / 2 + 6, gr = colX[i + 1] - cw / 2 - 6;
    const k = (H + 40 - SY) / (colTop - SY);
    const ex = (x) => [SX + (x - SX) * k, H + 40];
    const e1 = ex(gl), e2 = ex(gr);
    const g = b.createLinearGradient(0, colTop, 0, H);
    const strength = 0.10 + 0.22 * Math.max(0, 1 - Math.abs((gl + gr) / 2 - SX) / 420);
    g.addColorStop(0, L(255, strength)); g.addColorStop(0.5, L(255, strength * 0.55)); g.addColorStop(1, L(255, 0));
    b.fillStyle = g; b.beginPath();
    b.moveTo(gl, colTop); b.lineTo(gr, colTop); b.lineTo(e2[0], e2[1]); b.lineTo(e1[0], e1[1]);
    b.closePath(); b.fill();
  }
  b.globalCompositeOperation = 'destination-out'; b.fillStyle = '#000';
  b.fillRect(0, 0, W, colTop + 10);
  for (const x of colX) b.fillRect(x - cw / 2 - 6, colTop, cw + 12, colBot - colTop);
  const bb = layer(), bbc = bb.getContext('2d'); bbc.filter = 'blur(10px)'; bbc.drawImage(beams, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(bb, 0, 0); ctx.restore();

  // foreground: stacks of paper filings, slightly defocused
  const fg = layer(), f = fg.getContext('2d');
  function stack(x, y, w, d, n, seed) {
    const r = mulberry32(seed);
    const dx = d * 0.62, dy = -d * 0.30, th = 3.2;
    for (let k = 0; k < n; k++) {
      const yy = y - k * th, jx = (r() - 0.5) * 6, jd = (r() - 0.5) * 4;
      const X = x + jx, A = [X, yy - th], B = [X + w, yy - th + jd * 0.2], C = [B[0] + dx, B[1] + dy], D = [X + dx, yy - th + dy];
      // front edge (sheet thickness) + right side
      f.fillStyle = L(30 + r() * 26);
      f.beginPath(); f.moveTo(...A); f.lineTo(...B); f.lineTo(B[0], B[1] + th); f.lineTo(A[0], A[1] + th); f.fill();
      f.fillStyle = L(60 + r() * 60);
      f.beginPath(); f.moveTo(...B); f.lineTo(...C); f.lineTo(C[0], C[1] + th); f.lineTo(B[0], B[1] + th); f.fill();
      if (k === n - 1) {
        const tp = new Path2D(); tp.moveTo(...A); tp.lineTo(...B); tp.lineTo(...C); tp.lineTo(...D); tp.closePath();
        const tg = f.createLinearGradient(A[0], A[1], C[0], C[1]);
        tg.addColorStop(0, L(44)); tg.addColorStop(1, L(92));
        f.fillStyle = tg; f.fill(tp);
        // illegible typeset lines, mapped onto the sheet
        f.save(); f.setTransform((B[0] - A[0]) / 100, (B[1] - A[1]) / 100, (D[0] - A[0]) / 100, (D[1] - A[1]) / 100, A[0], A[1]);
        f.fillStyle = L(0, 0.28);
        f.fillRect(10, 82, 36, 4);
        for (let li = 0; li < 11; li++) f.fillRect(10, 70 - li * 5.4, 40 + r() * 44, 1.7);
        f.restore();
        f.strokeStyle = L(230, 0.9); f.lineWidth = 1.6;
        f.beginPath(); f.moveTo(...D); f.lineTo(...C); f.lineTo(...B); f.stroke();
      }
    }
  }
  stack(940, 905, 240, 170, 12, 7);
  stack(1215, 890, 225, 165, 30, 8);
  stack(1470, 915, 250, 185, 11, 9);
  // a single loose sheet
  const fb = layer(), fbc = fb.getContext('2d'); fbc.filter = 'blur(1.2px)'; fbc.drawImage(fg, 0, 0);
  ctx.drawImage(fb, 0, 0);

  // floating dust in the beams
  for (let i = 0; i < 700; i++) {
    const x = 650 + rnd() * 950, y = 380 + rnd() * 420;
    const inL = smooth(600, 0, Math.hypot(x - LX, y - 560));
    const a = (0.15 + rnd() * 0.6) * inL; if (a < 0.03) continue;
    ctx.fillStyle = L(255, a); ctx.beginPath(); ctx.arc(x, y, 0.5 + rnd() * 1.3, 0, 7); ctx.fill();
  }
}

// ---------- scene 2: big-tech (emerald) ----------
function servers(ctx) {
  const rnd = mulberry32(2202);
  ctx.fillStyle = L(8); ctx.fillRect(0, 0, W, H);
  const VX = 1040, VY = 430, F = 780;
  const A = 1.7, FLOOR = -1.25, TOP = 1.05, CEIL = 1.9;
  const P = (X, Y, Z) => [VX + F * X / Z, VY - F * Y / Z];
  const fogK = z => 1 - Math.exp(-z / 16);
  // light at the end of the aisle
  glow(ctx, VX, VY + 10, 900, 60, 0.6);
  glow(ctx, VX, VY + 10, 260, 200, 0.45);
  glow(ctx, VX, VY + 10, 90, 255, 0.4);

  // floor
  const fl = new Path2D();
  { const a = P(-A, FLOOR, 0.6), b = P(A, FLOOR, 0.6), c = P(A, FLOOR, 80), d = P(-A, FLOOR, 80);
    fl.moveTo(...a); fl.lineTo(...b); fl.lineTo(...c); fl.lineTo(...d); fl.closePath(); }
  const fgd = ctx.createLinearGradient(0, H, 0, VY);
  fgd.addColorStop(0, L(10)); fgd.addColorStop(0.7, L(40)); fgd.addColorStop(1, L(120));
  ctx.fillStyle = fgd; ctx.fill(fl);
  // floor tiles
  ctx.save(); ctx.clip(fl);
  for (let z = 1.2; z < 70; z += 0.6) {
    const a = P(-A, FLOOR, z), b = P(A, FLOOR, z);
    ctx.strokeStyle = L(140, 0.10 * (1 - fogK(z) * 0.6)); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
  }
  for (const X of [-0.6, 0, 0.6]) {
    const a = P(X, FLOOR, 0.6), b = P(X, FLOOR, 80);
    ctx.strokeStyle = L(140, 0.09); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
  }
  // floor sheen streak toward the light
  ctx.globalCompositeOperation = 'lighter';
  const sh = ctx.createLinearGradient(0, VY, 0, H);
  sh.addColorStop(0, L(255, 0.22)); sh.addColorStop(0.35, L(255, 0.04)); sh.addColorStop(1, L(255, 0));
  ctx.fillStyle = sh; ctx.beginPath(); ctx.moveTo(VX - 6, VY); ctx.lineTo(VX + 6, VY); ctx.lineTo(VX + 180, H); ctx.lineTo(VX - 180, H); ctx.fill();
  ctx.restore();

  // ceiling
  const ce = new Path2D();
  { const a = P(-A, CEIL, 0.6), b = P(A, CEIL, 0.6), c = P(A, CEIL, 80), d = P(-A, CEIL, 80);
    ce.moveTo(...a); ce.lineTo(...b); ce.lineTo(...c); ce.lineTo(...d); ce.closePath(); }
  ctx.fillStyle = L(7); ctx.fill(ce);

  // racks on both walls, far to near
  const reflections = [];
  const leds = [];
  const RACK = 0.64;
  const racks = [];
  for (let z = 0.9; z < 70; z += RACK) racks.push(z);
  racks.reverse();
  for (const z0 of racks) {
    const z1 = z0 + RACK - 0.03;
    const fk = fogK(z0);
    for (const side of [-1, 1]) {
      const X = side * A;
      const q = [P(X, FLOOR, z0), P(X, TOP, z0), P(X, TOP, z1), P(X, FLOOR, z1)];
      const p = new Path2D(); p.moveTo(...q[0]); p.lineTo(...q[1]); p.lineTo(...q[2]); p.lineTo(...q[3]); p.closePath();
      const base = 9 + fk * 62 + (rnd() - 0.5) * 4;
      ctx.fillStyle = L(base); ctx.fill(p);
      // blanking panels / unit lines
      ctx.save(); ctx.clip(p);
      for (let u = 0; u < 14; u++) {
        const Y = FLOOR + 0.12 + u * 0.155;
        const a = P(X, Y, z0), b = P(X, Y, z1);
        ctx.strokeStyle = L(base + 22, 0.5); ctx.lineWidth = Math.max(0.6, F * 0.006 / z0);
        ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
      }
      ctx.restore();
      // vertical frame edge (rim from the aisle light)
      const e0 = P(X, FLOOR, z0), e1 = P(X, TOP, z0);
      ctx.strokeStyle = L(110 + fk * 110, 0.6 + 0.3 * (1 - fk)); ctx.lineWidth = Math.max(0.9, F * 0.012 / z0);
      ctx.beginPath(); ctx.moveTo(...e0); ctx.lineTo(...e1); ctx.stroke();
      // top edge
      const t0 = P(X, TOP, z0), t1 = P(X, TOP, z1);
      ctx.strokeStyle = L(120 + fk * 100, 0.5); ctx.lineWidth = Math.max(0.6, F * 0.01 / z0);
      ctx.beginPath(); ctx.moveTo(...t0); ctx.lineTo(...t1); ctx.stroke();
      // status LEDs
      for (let u = 0; u < 13; u++) for (const col of [0.12, 0.2, 0.5]) {
        if (rnd() > 0.32) continue;
        const Y = FLOOR + 0.2 + u * 0.155 + 0.04, Z = z0 + col * RACK;
        const [x, y] = P(X * 0.995, Y, Z);
        leds.push({ x, y, z: Z, b: 0.5 + rnd() * 0.5 });
        const [rx, ry] = P(X * 0.995, 2 * FLOOR - Y, Z);
        if (Z > 1.6) reflections.push({ x: rx, y: ry, z: Z, b: 0.5 + rnd() * 0.5 });
      }
    }
  }
  // the near walls and frame get a gentle top-down falloff to stay quiet
  // LEDs + bloom
  const ll = layer(), lc = ll.getContext('2d');
  lc.globalCompositeOperation = 'lighter';
  for (const d of leds) {
    const s = Math.max(1.1, F * 0.012 / d.z);
    const calm = smooth(260, 640, d.x); // keep the left third calm
    const a = Math.min(1, d.b * 1.15 * (1 - fogK(d.z) * 0.45)) * calm;
    if (a < 0.02) continue;
    lc.fillStyle = L(255, a); lc.fillRect(d.x - s / 2, d.y - s / 2, s, s);
    if (d.z < 8) { lc.fillStyle = radial(lc, d.x, d.y, s * 5, 255, a * 0.25); lc.fillRect(d.x - s * 5, d.y - s * 5, s * 10, s * 10); }
  }
  for (const d of reflections) {
    const s = Math.max(0.6, F * 0.01 / d.z);
    const calm = smooth(260, 640, d.x);
    const a = d.b * 0.16 * (1 - fogK(d.z) * 0.5) * calm;
    lc.fillStyle = L(255, a); lc.fillRect(d.x - s / 2, d.y - s * 2, s, s * 4);
  }
  ctx.drawImage(ll, 0, 0);
  const lb = layer(), lbc = lb.getContext('2d'); lbc.filter = 'blur(3px)'; lbc.drawImage(ll, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9; ctx.drawImage(lb, 0, 0); ctx.restore();

  // ceiling light strip segments (quiet)
  for (let z = 3; z < 70; z += 2.6) {
    const a = P(-0.09, CEIL - 0.02, z), b = P(0.09, CEIL - 0.02, z + 1.1);
    const fk = fogK(z);
    ctx.fillStyle = L(200, 0.35 * (1 - fk * 0.5)); ctx.fillRect(a[0], a[1], b[0] - a[0], Math.max(1, (b[1] - a[1]) * 0 + F * 0.03 / z));
  }
  for (const X of [-1.05, 1.05]) {
    ctx.strokeStyle = L(110, 0.25); ctx.lineWidth = 1.2;
    const a = P(X, CEIL - 0.25, 0.8), b = P(X, CEIL - 0.25, 70);
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
  }
  // depth haze along the aisle
  glow(ctx, VX, VY + 20, 520, 120, 0.22);
  glow(ctx, VX, VY + 10, 140, 255, 0.25);
  // darken the near-left wall so the left third is calm
  const dk = ctx.createLinearGradient(0, 0, 620, 0);
  dk.addColorStop(0, 'rgba(0,0,0,0.55)'); dk.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = dk; ctx.fillRect(0, 0, 620, H);
}

// ---------- scene 3: picks-shovels (amber) ----------
function tools(ctx) {
  const rnd = mulberry32(3303), nz = makeNoise(33);
  const SX = 1130, SY = 590; // low sun behind the ridge
  const sky = ctx.createLinearGradient(0, 0, 0, 640);
  sky.addColorStop(0, L(8)); sky.addColorStop(0.6, L(30)); sky.addColorStop(1, L(70));
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  glow(ctx, SX, SY, 1200, 90, 0.55);
  glow(ctx, SX, SY, 500, 200, 0.45);
  glow(ctx, SX, SY, 160, 255, 0.85);
  // soft crepuscular rays (blurred)
  const rl = layer(), rc = rl.getContext('2d'); rc.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI * 0.92 + (i / 13) * Math.PI * 0.84 + (rnd() - 0.5) * 0.12, w = 0.02 + rnd() * 0.05;
    const g = rc.createRadialGradient(SX, SY, 60, SX, SY, 1000);
    g.addColorStop(0, L(255, 0.07 + rnd() * 0.06)); g.addColorStop(1, L(255, 0));
    rc.fillStyle = g; rc.beginPath(); rc.moveTo(SX, SY);
    rc.lineTo(SX + Math.cos(a - w) * 1400, SY + Math.sin(a - w) * 1400);
    rc.lineTo(SX + Math.cos(a + w) * 1400, SY + Math.sin(a + w) * 1400); rc.fill();
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.filter = 'blur(18px)'; ctx.drawImage(rl, 0, 0); ctx.restore();

  function ridge(base, peakX, peakH, spread, rough, seed) {
    const p = new Path2D(); p.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) {
      const env = Math.pow(Math.max(0, 1 - Math.abs(x - peakX) / spread), 1.25);
      const y = base - peakH * env - (nz.fbm(x / 160 + seed, seed, 6) - 0.5) * rough - env * (nz.fbm(x / 50 + seed * 3, seed, 4) - 0.5) * rough * 0.6;
      p.lineTo(x, y);
    }
    p.lineTo(W, H); p.closePath(); return p;
  }
  const far = ridge(600, 1450, 140, 700, 90, 2);
  ctx.fillStyle = L(40); ctx.fill(far);
  rim(ctx, far, radial(ctx, SX, SY, 700, 255, 0.35), 1.2);
  // fog between layers
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const fg1 = ctx.createLinearGradient(0, 560, 0, 700); fg1.addColorStop(0, L(140, 0)); fg1.addColorStop(0.6, L(140, 0.16)); fg1.addColorStop(1, L(140, 0));
  ctx.fillStyle = fg1; ctx.fillRect(0, 560, W, 140); ctx.restore();
  const mid = ridge(650, 1060, 170, 620, 70, 7);
  ctx.fillStyle = L(18); ctx.fill(mid);
  rim(ctx, mid, radial(ctx, SX, SY, 620, 255, 0.9), 1.8);
  glow(ctx, SX, SY + 30, 300, 255, 0.28);
  const near = ridge(790, 1180, 40, 900, 40, 13);
  ctx.fillStyle = L(9); ctx.fill(near);
  rim(ctx, near, radial(ctx, SX, 760, 520, 255, 0.55), 1.4);

  // crossed tools
  const CX = 1135, CY = 552;
  const shovel = new Path2D();
  // blade (tip at top), socket, handle, grip
  shovel.moveTo(0, -372);
  shovel.bezierCurveTo(40, -368, 70, -330, 72, -270);
  shovel.lineTo(70, -205); shovel.lineTo(44, -200); shovel.lineTo(14, -176);
  shovel.lineTo(10, 250); shovel.lineTo(-10, 250); shovel.lineTo(-14, -176);
  shovel.lineTo(-44, -200); shovel.lineTo(-70, -205); shovel.lineTo(-72, -270);
  shovel.bezierCurveTo(-70, -330, -40, -368, 0, -372); shovel.closePath();
  // D grip
  shovel.moveTo(-10, 250); shovel.lineTo(-34, 282); shovel.lineTo(-34, 318); shovel.lineTo(34, 318); shovel.lineTo(34, 282); shovel.lineTo(10, 250); shovel.closePath();
  const grip = new Path2D(); grip.rect(-22, 288, 44, 20);

  const pick = new Path2D();
  pick.moveTo(-11, -300); pick.lineTo(11, -300); pick.lineTo(13, 320); pick.lineTo(-13, 320); pick.closePath();
  const head = new Path2D();
  head.moveTo(-215, -238);
  head.quadraticCurveTo(-120, -322, -24, -332);
  head.lineTo(-24, -346); head.lineTo(24, -346); head.lineTo(24, -332);
  head.quadraticCurveTo(140, -318, 228, -220);
  head.quadraticCurveTo(130, -282, 24, -290);
  head.lineTo(24, -276); head.lineTo(-24, -276); head.lineTo(-24, -290);
  head.quadraticCurveTo(-120, -286, -215, -238); head.closePath();

  function drawTool(paths, angle, holes = []) {
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(angle);
    const inv = ctx.getTransform().inverse();
    // light position in local coords
    const lp = inv.transformPoint(new DOMPoint(SX, SY));
    const lp2 = inv.transformPoint(new DOMPoint(SX + 120, SY - 300));
    for (const p of paths) {
      ctx.fillStyle = L(4); ctx.fill(p);
      // subtle metal sheen on the faces
      ctx.save(); ctx.clip(p); ctx.fillStyle = radial(ctx, lp2.x, lp2.y, 480, 90, 0.18); ctx.fillRect(-400, -500, 800, 1000); ctx.restore();
      rim(ctx, p, radial(ctx, lp.x, lp.y, 420, 255, 1), 3.2);
      rim(ctx, p, radial(ctx, lp2.x, lp2.y, 600, 255, 0.4), 1.0);
    }
    for (const h of holes) { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fill(h); ctx.restore(); }
    ctx.restore();
  }
  // draw onto a layer so the grip hole reveals the sky behind
  const tl = layer(), t = tl.getContext('2d');
  const keep = ctx; ctx = t;
  drawTool([pick, head], 0.52);
  drawTool([shovel], -0.52, [grip]);
  ctx = keep;
  ctx.drawImage(tl, 0, 0);

  // foreground ground mound
  const g = new Path2D(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) g.lineTo(x, 850 - 78 * Math.exp(-Math.pow((x - 1140) / 280, 2)) - 18 * Math.exp(-Math.pow((x - 1500) / 200, 2)) - (nz.fbm(x / 70, 50, 5) - 0.5) * 22);
  g.lineTo(W, H); g.closePath();
  ctx.fillStyle = L(6); ctx.fill(g);
  rim(ctx, g, radial(ctx, SX, 760, 500, 255, 0.5), 1.2);

  // dust in the air, dense in the light
  const dl = layer(), d = dl.getContext('2d'); d.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2200; i++) {
    const x = 560 + rnd() * 1040, y = 120 + rnd() * 760;
    const k = smooth(720, 60, Math.hypot(x - SX, (y - SY) * 1.3));
    if (rnd() > k + 0.05) continue;
    const r = 0.35 + Math.pow(rnd(), 5) * 1.8;
    d.fillStyle = L(255, (0.2 + rnd() * 0.6) * (0.15 + k));
    d.beginPath(); d.arc(x, y, r, 0, 7); d.fill();
  }
  // a few out-of-focus motes
  const bk = layer(), bkc = bk.getContext('2d'); bkc.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const x = 820 + rnd() * 780, y = 300 + rnd() * 480, r = 8 + rnd() * 18;
    bkc.fillStyle = L(255, 0.05 + rnd() * 0.08); bkc.beginPath(); bkc.arc(x, y, r, 0, 7); bkc.fill();
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(dl, 0, 0);
  ctx.filter = 'blur(7px)'; ctx.drawImage(bk, 0, 0); ctx.restore();
  // dusty haze low over the ground
  glow(ctx, SX, 820, 560, 160, 0.16);
}

// ---------- scene 4: space-race (plum) ----------
function space(ctx) {
  const rnd = mulberry32(4404), nz = makeNoise(44);
  ctx.fillStyle = L(7); ctx.fillRect(0, 0, W, H);
  // nebula: warped fbm at low res, masked to a diagonal band right of centre
  const nw = 400, nh = 225, nb = new ImageData(nw, nh);
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    const X = x * 4, Y = y * 4;
    const wx = nz.fbm(X / 300, Y / 300, 4) * 2, wy = nz.fbm(X / 300 + 9, Y / 300 + 4, 4) * 2;
    const v = nz.fbm(X / 260 + wx, Y / 260 + wy, 6);
    const band = Math.exp(-Math.pow(((Y - 80) - (X - 700) * 0.30) / 200, 2));
    const k = Math.pow(clamp(v - 0.32) * 1.7, 2.2) * band * smooth(420, 1000, X);
    const i = (y * nw + x) * 4; nb.data[i] = nb.data[i + 1] = nb.data[i + 2] = 255 * clamp(k); nb.data[i + 3] = 255;
  }
  const nl = document.createElement('canvas'); nl.width = nw; nl.height = nh; nl.getContext('2d').putImageData(nb, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.32; ctx.filter = 'blur(3px)';
  ctx.drawImage(nl, 0, 0, W, H); ctx.restore();

  // stars
  const sl = layer(), s = sl.getContext('2d'); s.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 1800; i++) {
    const x = rnd() * W, y = rnd() * H;
    const calm = 0.35 + 0.65 * smooth(250, 700, x);
    const m = Math.pow(rnd(), 6);
    const r = 0.3 + m * 1.2, a = (0.12 + rnd() * 0.5 + m) * calm;
    s.fillStyle = L(255, clamp(a)); s.beginPath(); s.arc(x, y, r, 0, 7); s.fill();
    if (m > 0.35) { s.fillStyle = radial(s, x, y, r * 7, 255, 0.2 * calm); s.fillRect(x - r * 7, y - r * 7, r * 14, r * 14); }
  }
  ctx.drawImage(sl, 0, 0);

  // planet + rings, shaded per pixel (lambert + fresnel rim + latitude bands)
  const PX = 1440, PY = 400, R = 300, TILT = -0.24, RIN = 1.32, ROUT = 2.15, FLAT = 0.27;
  const ld = (() => { const v = [-0.86, -0.40, 0.12]; const m = Math.hypot(...v); return v.map(x => x / m); })();
  const ringDens = (r) => {
    if (r < RIN || r > ROUT) return 0;
    const t = (r - RIN) / (ROUT - RIN);
    let d = 0.35 + 0.65 * nz.n(t * 46, 5.5);
    d *= 0.6 + 0.4 * nz.n(t * 160, 9.1);
    if (t > 0.56 && t < 0.61) d *= 0.06;          // main gap
    if (t > 0.83 && t < 0.845) d *= 0.3;
    return d * smooth(0, 0.06, t) * smooth(1, 0.9, t);
  };
  const ct = Math.cos(TILT), st = Math.sin(TILT);
  const pl = ctx.getImageData(0, 0, W, H), pd = pl.data;
  const x0 = Math.max(0, Math.floor(PX - R * ROUT - 4)), y0 = Math.max(0, Math.floor(PY - R * ROUT * 0.6)), y1 = Math.min(H, Math.ceil(PY + R * ROUT * 0.6));
  for (let y = y0; y < y1; y++) for (let x = x0; x < W; x++) {
    const i = (y * W + x) * 4; let v = pd[i] / 255;
    const dx = x - PX, dy = y - PY;
    // ring-plane coords
    const u = (dx * ct + dy * st), w = (-dx * st + dy * ct);
    const rr = Math.hypot(u, w / FLAT) / R;
    const dens = ringDens(rr);
    const ringLit = dens * (0.30 + 0.70 * smooth(R * 2.2, -R * 2.2, u)) * 0.85;
    const inDisk = dx * dx + dy * dy < R * R;
    // back half of the rings sits behind the planet
    if (!inDisk && w < 0 && dens > 0) v = 1 - (1 - v) * (1 - ringLit);
    if (inDisk) {
      const nx = dx / R, ny = dy / R, nzz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const lam = Math.max(0, nx * ld[0] + ny * ld[1] + nzz * ld[2]);
      const lat = (-dx * st + dy * ct) / R;
      const band = 0.72 + 0.4 * nz.fbm(lat * 7 + 3, 1.7 + nx * 0.6, 5);
      const fres = Math.pow(1 - nzz, 3) * smooth(-0.2, 0.6, -(nx * 0.85 + ny * 0.5));
      // shadow of the rings on the globe (a soft band just south of the equator)
      const sh = 1 - 0.65 * Math.exp(-Math.pow((lat - 0.24) / 0.07, 2)) * smooth(-0.2, 0.4, nzz);
      let pv = 0.012 + 0.80 * Math.pow(lam, 1.7) * band * sh + 0.45 * fres;
      v = clamp(pv);
    }
    if (w >= 0 && dens > 0) {
      // front half of the rings passes over the globe; darker where the planet shadows it
      const behind = inDisk ? 0.85 : 1;
      v = 1 - (1 - v) * (1 - ringLit * behind);
      if (inDisk) v = v * (1 - dens * 0.25) + ringLit * 0.1;
    }
    pd[i] = pd[i + 1] = pd[i + 2] = clamp(v) * 255;
  }
  ctx.putImageData(pl, 0, 0);
  // atmosphere halo on the lit limb
  const hl2 = layer(), hc = hl2.getContext('2d');
  const at = hc.createRadialGradient(PX, PY, R * 0.98, PX, PY, R * 1.12);
  at.addColorStop(0, L(255, 0.4)); at.addColorStop(1, L(255, 0));
  hc.fillStyle = at; hc.beginPath(); hc.arc(PX, PY, R * 1.14, 0, 7); hc.arc(PX, PY, R, 0, 7, true); hc.fill('evenodd');
  hc.globalCompositeOperation = 'destination-in';
  const am = hc.createLinearGradient(PX - R * 0.9, PY - R * 0.45, PX + R * 0.3, PY + R * 0.15);
  am.addColorStop(0, L(255, 1)); am.addColorStop(1, L(255, 0));
  hc.fillStyle = am; hc.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(hl2, 0, 0); ctx.restore();

  // rocket trail arcing up across the field
  const p0 = [640, 940], c1 = [700, 600], c2 = [800, 330], p1 = [985, 150];
  const bez = (t) => {
    const u = 1 - t;
    return [0, 1].map(k => u * u * u * p0[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * p1[k]);
  };
  const tl = layer(), tc = tl.getContext('2d'); tc.globalCompositeOperation = 'lighter'; tc.lineCap = 'round';
  const N = 400;
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N; const a = bez(t0), b = bez(t1);
    // smoke widens and fades toward the base
    const smokeW = 2 + Math.pow(1 - t0, 2.0) * 90 * (0.7 + 0.6 * nz.n(t0 * 30, 1));
    tc.strokeStyle = L(255, 0.004 + 0.007 * Math.pow(1 - t0, 1.5)); tc.lineWidth = smokeW;
    tc.beginPath(); tc.moveTo(...a); tc.lineTo(...b); tc.stroke();
  }
  const tb = layer(), tbc = tb.getContext('2d'); tbc.filter = 'blur(16px)'; tbc.drawImage(tl, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(tb, 0, 0); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N; const a = bez(t0), b = bez(t1);
    ctx.strokeStyle = L(255, 0.15 + 0.75 * Math.pow(t0, 1.5)); ctx.lineWidth = 0.8 + 1.6 * t0;
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
  }
  ctx.restore();
  // engine flare at the tip
  glow(ctx, p1[0], p1[1], 120, 255, 0.55);
  glow(ctx, p1[0], p1[1], 24, 255, 1);
  ctx.fillStyle = L(255); ctx.beginPath(); ctx.arc(p1[0], p1[1], 3, 0, 7); ctx.fill();
  // horizon haze at the very bottom where the trail starts
  glow(ctx, 640, 990, 380, 120, 0.18);
}

// ---------- post: bloom, duotone LUT, grain, vignette ----------
function finish(ctx, tone, seed, bloom = [0.45, 0.22]) {
  const src = ctx.canvas;
  const b1 = layer(), c1 = b1.getContext('2d');
  c1.filter = 'contrast(2.4) brightness(0.9) blur(14px)'; c1.drawImage(src, 0, 0);
  const b2 = layer(), c2 = b2.getContext('2d');
  c2.filter = 'contrast(2) blur(60px)'; c2.drawImage(src, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = bloom[0]; ctx.drawImage(b1, 0, 0);
  ctx.globalAlpha = bloom[1]; ctx.drawImage(b2, 0, 0);
  ctx.restore();

  const deep = hex(TONES[tone].deep), midc = hex(TONES[tone].mid), paper = hex(PAPER);
  const stops = [
    [0.00, [4, 4, 4]],
    [0.08, mix([10, 10, 10], deep, 0.55)],
    [0.22, deep],
    [0.58, midc],
    [0.84, mix(midc, paper, 0.42)],
    [1.00, mix(midc, paper, 0.86)],
  ];
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255; let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const [ta, ca] = stops[k], [tb, cb] = stops[k + 1];
    const c = mix(ca, cb, clamp((t - ta) / (tb - ta)));
    lut[i * 3] = c[0]; lut[i * 3 + 1] = c[1]; lut[i * 3 + 2] = c[2];
  }
  const img = ctx.getImageData(0, 0, W, H), d = img.data, r = mulberry32(seed);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    let v = d[i] / 255;
    // background gradient (160deg deep -> near-black) lifts the shadows a touch toward the top-left
    const dx = x / W - 0.5, dy = y / H - 0.5;
    const diag = clamp(0.5 - (x / W) * 0.34 - (y / H) * 0.94 * 0.5 + 0.3);
    v = v + 0.045 * diag * (1 - v);
    // vignette ~20% at the edges
    const vig = 1 - 0.22 * smooth(0.25, 0.75, Math.sqrt(dx * dx * 1.1 + dy * dy * 1.6));
    v *= vig;
    // grain ~7%
    v += (r() - 0.5) * 0.07 * (0.6 + 0.4 * v);
    const q = clamp(Math.round(v * 255), 0, 255) * 3;
    d[i] = lut[q]; d[i + 1] = lut[q + 1]; d[i + 2] = lut[q + 2]; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

const SCENES = {
  'capitol-tech':  { fn: capitol, tone: 'burgundy', seed: 1 },
  'big-tech':      { fn: servers, tone: 'emerald', seed: 2 },
  'picks-shovels': { fn: tools,   tone: 'amber',   seed: 3 },
  'space-race':    { fn: space,   tone: 'plum',    seed: 4, bloom: [0.3, 0.18] },
};
const slug = (location.hash || '#capitol-tech').slice(1);
const sc = SCENES[slug];
const ctx = document.getElementById('c').getContext('2d', { willReadFrequently: true });
sc.fn(ctx);
finish(ctx, sc.tone, sc.seed, sc.bloom);
document.title = 'done';

/**
 * Engraving atlas for separate drops (ported from the concept video's stamped-logo decal,
 * docs/marketing/video/alloy-concept-01/src/metal/renderer.ts `logoTexture`).
 *
 * One 1024² RGBA texture, 4×4 cells of 256 px, filled on demand (canvas → texSubImage2D):
 *   R = sharp mask (the recess), G = wide blur (bevel normals), B = light blur (used instead of R when the decal is
 *   minified, so small drops don't shimmer).
 * Keys: "USDC" (the white glyphs of Circle's official USDC mark: the drop itself is the coin), a ticker with a company
 * mark from brand/stockMarks (NVDA eye only, MSFT four rounded squares, GOOGL "G", AMZN "a" + smile, AAPL, TSLA, META…),
 * or any other ticker, engraved as
 * letter-spaced caps in the UI face (Manrope 700).
 * LRU eviction when all 16 cells are used. Built lazily: pages without engravings pay nothing.
 */
import { STOCK_MARKS, canonTicker, hasMark } from "../brand/stockMarks";

export const ATLAS = 1024;
export const CELL = 256;
const PER = ATLAS / CELL;

/** Circle's official USDC mark (2000×2000 viewBox), the white parts only: "$" and the two arcs. */
const USDC_GLYPHS = [
  "M1275 1158.33c0-145.83-87.5-195.83-262.5-216.66-125-16.67-150-50-150-108.34s41.67-95.83 125-95.83c75 0 116.67 25 137.5 87.5 4.17 12.5 16.67 20.83 29.17 20.83h66.66c16.67 0 29.17-12.5 29.17-29.16v-4.17c-16.67-91.67-91.67-162.5-187.5-170.83v-100c0-16.67-12.5-29.17-33.33-33.34h-62.5c-16.67 0-29.17 12.5-33.34 33.34v95.83c-125 16.67-204.16 100-204.16 204.17 0 137.5 83.33 191.66 258.33 212.5 116.67 20.83 154.17 45.83 154.17 112.5s-58.34 112.5-137.5 112.5c-108.34 0-145.84-45.84-158.34-108.34-4.16-16.66-16.66-25-29.16-25h-70.84c-16.66 0-29.16 12.5-29.16 29.17v4.17c16.66 104.16 83.33 179.16 220.83 200v100c0 16.66 12.5 29.16 33.33 33.33h62.5c16.67 0 29.17-12.5 33.34-33.33v-100c125-20.84 208.33-108.34 208.33-220.84z",
  "M787.5 1595.83c-325-116.66-491.67-479.16-370.83-800 62.5-175 200-308.33 370.83-370.83 16.67-8.33 25-20.83 25-41.67V325c0-16.67-8.33-29.17-25-33.33-4.17 0-12.5 0-16.67 4.16-395.83 125-612.5 545.84-487.5 941.67 75 233.33 254.17 412.5 487.5 487.5 16.67 8.33 33.34 0 37.5-16.67 4.17-4.16 4.17-8.33 4.17-16.66v-58.34c0-12.5-12.5-29.16-25-37.5zM1229.17 295.83c-16.67-8.33-33.34 0-37.5 16.67-4.17 4.17-4.17 8.33-4.17 16.67v58.33c0 16.67 12.5 33.33 25 41.67 325 116.66 491.67 479.16 370.83 800-62.5 175-200 308.33-370.83 370.83-16.67 8.33-25 20.83-25 41.67V1700c0 16.67 8.33 29.17 25 33.33 4.17 0 12.5 0 16.67-4.16 395.83-125 612.5-545.84 487.5-941.67-75-237.5-258.34-416.67-487.5-491.67z",
];

export const hasLogo = (key: string) => hasMark(key);

/** Decal span in drop radii (the cell covers q ∈ [-s/2, s/2], so a bigger span = a bigger mark). Video: 1.18. */
export const spanFor = (key: string) => (key === "USDC" ? 1.4 : hasLogo(key) ? 1.18 : 1.5);

/** Canonical engraving key: testnet symbols carry a "c" suffix (NVDAc → NVDA); "+3"-style merged drops get none. */
export function engraveKey(t: string | undefined | null): string | null {
  if (!t) return null;
  const T = t.trim();
  if (!T || T.startsWith("+")) return null;
  if (T.toUpperCase() === "USDC") return "USDC";
  return canonTicker(T).slice(0, 6);
}

function uiFont(): string {
  try {
    const v = getComputedStyle(document.body).getPropertyValue("--font-ui").trim();
    return v || "Manrope, system-ui, sans-serif";
  } catch {
    return "system-ui, sans-serif";
  }
}

let fontReady = false;
let fontAsked = false;
/** true once the UI face can be rasterized (falls back to the system face after 1.5s). */
function ensureFont(): boolean {
  if (fontReady) return true;
  if (!fontAsked && typeof document !== "undefined") {
    fontAsked = true;
    const done = () => (fontReady = true);
    const f = uiFont();
    window.setTimeout(done, 1500);
    document.fonts?.load(`700 100px ${f}`, "NVDAMSFTGOOGL").then(done, done);
    if (!document.fonts) done();
  }
  return fontReady;
}

/** Draw one cell's mask (white on black) into a CELL² canvas context. */
function drawMask(ctx: CanvasRenderingContext2D, key: string) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, CELL, CELL);
  ctx.fillStyle = "#fff";
  if (key === "USDC") {
    const pad = CELL * 0.08;
    ctx.save();
    ctx.translate(pad, pad);
    ctx.scale((CELL - 2 * pad) / 2000, (CELL - 2 * pad) / 2000);
    for (const d of USDC_GLYPHS) ctx.fill(new Path2D(d));
    ctx.restore();
    return;
  }
  if (hasLogo(key)) {
    // 24-unit artwork centred in the cell at 80% (video: S*.1 padding)
    ctx.save();
    ctx.translate(CELL * 0.1, CELL * 0.1);
    ctx.scale((CELL * 0.8) / 24, (CELL * 0.8) / 24);
    if (key === "NVDA") {
      // NVIDIA eye only: clip away the square frame of the full mark, then centre the eye
      ctx.translate(12, 12);
      ctx.scale(1.25, 1.25);
      ctx.translate(-12 + 4.2, -12);
      ctx.beginPath();
      ctx.moveTo(-0.6, 10.6);
      ctx.quadraticCurveTo(7.6, 1.6, 16.3, 10.7);
      ctx.quadraticCurveTo(7.6, 25.6, -0.6, 10.6);
      ctx.clip();
      ctx.fill(new Path2D(STOCK_MARKS.NVDA.d));
    } else if (key === "MSFT") {
      const q = 11.1, g = 1.8, rr = 0.9; // four squares, 2×2
      for (const [x, y] of [[0, 0], [q + g, 0], [0, q + g], [q + g, q + g]]) {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x - 0.6, y - 0.6, q, q, rr);
        else ctx.rect(x - 0.6, y - 0.6, q, q);
        ctx.fill();
      }
    } else ctx.fill(new Path2D(STOCK_MARKS[key].d));
    ctx.restore();
    return;
  }
  // ticker (no mark available): letter-spaced caps, fitted to ~84% of the cell width
  const font = uiFont();
  const sp = 0.12; // tracking in em
  let px = 120;
  const fit = () => {
    ctx.font = `700 ${px}px ${font}`;
    let w = 0;
    for (const ch of key) w += ctx.measureText(ch).width;
    return w + sp * px * (key.length - 1);
  };
  let w = fit();
  const max = CELL * 0.84;
  if (w > max) {
    px = Math.floor((px * max) / w);
    w = fit();
  }
  px = Math.min(px, 92);
  w = fit();
  ctx.textBaseline = "alphabetic";
  const m = ctx.measureText("H");
  const capH = m.actualBoundingBoxAscent || px * 0.72;
  let x = (CELL - w) / 2;
  const y = CELL / 2 + capH / 2;
  for (const ch of key) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + sp * px;
  }
}

/** Separable box blur (radius r, `passes` times) on a CELL² float buffer. */
function blur(src: Float32Array, r: number, passes: number): Float32Array {
  let a = src.slice();
  const b = new Float32Array(a.length);
  const n = CELL, k = 1 / (2 * r + 1);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < n; y++) {
      const o = y * n;
      for (let x = 0; x < n; x++) {
        let s = 0;
        for (let d = -r; d <= r; d++) s += a[o + Math.min(n - 1, Math.max(0, x + d))];
        b[o + x] = s * k;
      }
    }
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        let s = 0;
        for (let d = -r; d <= r; d++) s += b[Math.min(n - 1, Math.max(0, y + d)) * n + x];
        a[y * n + x] = s * k;
      }
    }
  }
  return a;
}

export class EngraveAtlas {
  private gl: WebGLRenderingContext;
  tex: WebGLTexture | null = null;
  private size = 0;
  private cells = new Map<string, { i: number; used: number }>();
  private frame = 0;
  private cv: HTMLCanvasElement | null = null;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
  }

  /** Bind a texture to unit 0 (1×1 placeholder until the first engraving is requested). */
  bind() {
    const gl = this.gl;
    if (!this.tex || !gl.isTexture(this.tex)) {
      this.tex = gl.createTexture();
      this.size = 0;
      this.cells.clear();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      this.params();
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
  }

  private params() {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  tick() {
    this.frame++;
  }

  /** Cell [col, row] for a key, rasterizing it on first use. null while the font is still loading. */
  cell(key: string): [number, number] | null {
    const hit = this.cells.get(key);
    if (hit) {
      hit.used = this.frame;
      return [hit.i % PER, Math.floor(hit.i / PER)];
    }
    if (key !== "USDC" && !hasLogo(key) && !ensureFont()) return null;
    const gl = this.gl;
    this.bind();
    if (this.size !== ATLAS) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ATLAS, ATLAS, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      this.size = ATLAS;
    }
    let i = this.cells.size;
    if (i >= PER * PER) {
      let lk = "", lu = Infinity;
      this.cells.forEach((v, k) => {
        if (v.used < lu) {
          lu = v.used;
          lk = k;
        }
      });
      i = this.cells.get(lk)!.i;
      this.cells.delete(lk);
    }
    const cv = this.cv ?? (this.cv = document.createElement("canvas"));
    cv.width = CELL;
    cv.height = CELL;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    drawMask(ctx, key);
    const img = ctx.getImageData(0, 0, CELL, CELL).data;
    const m = new Float32Array(CELL * CELL);
    for (let j = 0; j < m.length; j++) m[j] = img[j * 4] / 255;
    const g = blur(m, 3, 2);
    const b = blur(m, 1, 1);
    const px = new Uint8Array(CELL * CELL * 4);
    for (let j = 0; j < m.length; j++) {
      px[j * 4] = img[j * 4];
      px[j * 4 + 1] = Math.round(g[j] * 255);
      px[j * 4 + 2] = Math.round(b[j] * 255);
      px[j * 4 + 3] = 255;
    }
    gl.texSubImage2D(gl.TEXTURE_2D, 0, (i % PER) * CELL, Math.floor(i / PER) * CELL, CELL, CELL, gl.RGBA, gl.UNSIGNED_BYTE, px);
    this.cells.set(key, { i, used: this.frame });
    return [i % PER, Math.floor(i / PER)];
  }
}

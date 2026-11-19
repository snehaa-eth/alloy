/**
 * Guilloche engraving generator, ported 1:1 from docs/design/cards-data/system_v4.py (`seed_of`, `guilloche`).
 *
 * Inputs are REAL data: the basket's value series (centre line of the wave lattice, amplitude from daily
 * volatility) and its recipe weights (rosette loop count = 5 + 2 × stocks, inner harmonic from the top weight).
 * A seed string (basket address) makes the phase and serial unique and reproducible per basket.
 *
 * Pure + deterministic (no Math.random), so server and client render identical SVG.
 */

export type GuillocheInput = {
  /** Value series, oldest first. Any unit; only the shape matters. */
  series: readonly number[];
  /** Recipe weights in bps (e.g. 3500 = 35%). */
  weightsBps: readonly number[];
  /** Any stable string (basket address). */
  seed: string;
};

export type GuillocheParams = {
  petals: number;
  k2: number;
  vol: number;
  lines: number;
  freq: number;
  phase: number;
  serial: number;
};

export type GuillochePath = { d: string; strokeWidth: number; opacity: number; kind: "path" };
export type GuillocheShape =
  | GuillochePath
  | { kind: "rect"; x: number; y: number; w: number; h: number; strokeWidth: number; opacity: number }
  | { kind: "circle"; cx: number; cy: number; r: number; strokeWidth: number; opacity: number };

/** FNV-1a 32-bit. Stands in for the Python sha256 (only needs to be stable + well mixed). */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function normalize(vals: readonly number[], n: number): number[] {
  if (vals.length === 0) return new Array(n).fill(0.5);
  if (vals.length === 1) return new Array(n).fill(0.5);
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of vals) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const sp = hi - lo || 1;
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    const t = (k / (n - 1)) * (vals.length - 1);
    const i = Math.floor(t);
    const f = t - i;
    const v = i + 1 >= vals.length ? vals[i] : vals[i] * (1 - f) + vals[i + 1] * f;
    out.push((v - lo) / sp);
  }
  return out;
}

export function seedOf({ series = [], weightsBps = [], seed = "" }: GuillocheInput): GuillocheParams {
  const rets: number[] = [];
  for (let i = 1; i < series.length; i++) if (series[i - 1] > 0) rets.push(series[i] / series[i - 1] - 1);
  const vol = rets.length ? Math.sqrt(rets.reduce((a, r) => a + r * r, 0) / rets.length) : 0.01;
  const w = [...weightsBps].map((b) => b / 100).sort((a, b) => b - a);
  const top = w[0] ?? 20;
  const key = `${seed}|${weightsBps.join(",")}|${series.map((v) => v.toFixed(3)).join(",")}`;
  const h = hash32(key);
  return {
    petals: 5 + 2 * w.length,
    k2: Math.max(2, Math.round(top / 6)),
    vol,
    lines: 9 + w.length * 2,
    freq: 2 + top / 18,
    phase: (h % 360) / 57.3,
    serial: hash32(seed) % 10000,
  };
}

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

export type GuillocheOptions = {
  width?: number;
  height?: number;
  rosette?: boolean;
  frame?: boolean;
  /** Point density multiplier (1 = design resolution; minis use less). */
  detail?: number;
};

export function guillocheShapes(input: GuillocheInput, opts: GuillocheOptions = {}): GuillocheShape[] {
  const w = opts.width ?? 358;
  const h = opts.height ?? 104;
  const rosette = opts.rosette ?? true;
  const frame = opts.frame ?? true;
  const detail = opts.detail ?? 1;
  const s = seedOf(input);
  const N = Math.max(24, Math.round(120 * Math.min(1, detail)));
  const env = normalize(input.series ?? [], N + 1);
  const out: GuillocheShape[] = [];

  // 1. wave lattice: two crossing families whose centre line follows the real value path
  const amp = 3 + Math.min(6, s.vol * 400);
  const top = 14;
  const bot = h - 14;
  for (const fam of [1, -1]) {
    for (let i = 0; i < s.lines; i++) {
      const ph = s.phase + (i * Math.PI) / s.lines;
      const pts: string[] = [];
      for (let k = 0; k <= N; k++) {
        const x = 10 + (k / N) * (w - 20);
        let y =
          bot - 10 - env[k] * (bot - top - 20) + fam * amp * Math.sin((2 * Math.PI * s.freq * x) / w + ph) + (i - s.lines / 2) * 0.8;
        y = Math.min(bot, Math.max(top, y));
        pts.push(`${f1(x)},${f1(y)}`);
      }
      out.push({ kind: "path", d: `M${pts.join(" L")}`, strokeWidth: 0.5, opacity: 0.42 });
    }
  }

  // 2. rosette: epitrochoid family (petals from stock count) + inner rings (harmonic from top weight)
  if (rosette) {
    const [cx, cy, R] = w > 120 ? [w - 50, h / 2, 34] : [w / 2, h / 2, w * 0.62];
    const p = s.petals;
    const steps = Math.max(120, Math.round(720 * detail));
    for (let j = 0; j < 5; j++) {
      const d = (p + 1) * (0.16 + 0.07 * j);
      const rot = (j * Math.PI) / p / 2.5;
      const k = p + 1;
      const scale = R / (p + 1 + d);
      const pts: string[] = [];
      for (let q = 0; q <= steps; q++) {
        const t = (q / steps) * 2 * Math.PI;
        const x = (p + 1) * Math.cos(t) - d * Math.cos(k * t);
        const y = (p + 1) * Math.sin(t) - d * Math.sin(k * t);
        const xr = x * Math.cos(rot) - y * Math.sin(rot);
        const yr = x * Math.sin(rot) + y * Math.cos(rot);
        pts.push(`${f1(cx + xr * scale)},${f1(cy + yr * scale)}`);
      }
      out.push({ kind: "path", d: `M${pts.join(" L")}Z`, strokeWidth: 0.5, opacity: Number((0.3 + 0.12 * (j % 3)).toFixed(2)) });
    }
    const ringSteps = Math.max(90, Math.round(360 * detail));
    for (let j = 0; j < 3; j++) {
      const m = s.k2 + 3;
      const rr = R * (0.28 + 0.08 * j);
      const pts: string[] = [];
      for (let q = 0; q <= ringSteps; q++) {
        const t = (q / ringSteps) * 2 * Math.PI;
        const r = rr * (1 + 0.18 * Math.cos(m * t + j));
        pts.push(`${f1(cx + r * Math.cos(t))},${f1(cy + r * Math.sin(t))}`);
      }
      out.push({ kind: "path", d: `M${pts.join(" L")}Z`, strokeWidth: 0.5, opacity: 0.45 });
    }
  }

  // 3. engraved frame: double hairline with corner rings
  if (frame) {
    out.push({ kind: "rect", x: 5, y: 5, w: w - 10, h: h - 10, strokeWidth: 0.6, opacity: 0.55 });
    out.push({ kind: "rect", x: 9, y: 9, w: w - 18, h: h - 18, strokeWidth: 0.4, opacity: 0.35 });
    for (const [x, y] of [
      [5, 5],
      [w - 5, 5],
      [5, h - 5],
      [w - 5, h - 5],
    ]) {
      out.push({ kind: "circle", cx: x, cy: y, r: 2.5, strokeWidth: 0.6, opacity: 0.6 });
    }
  }
  return out;
}

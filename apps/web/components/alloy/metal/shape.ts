/**
 * Recipe → liquid-metal form. PURE (no DOM, no GL). Faithful port of the designer's generative system
 * (docs/design/artdir/wow/app/_src/core.js `shapeFromRecipe` + `drops`, contact sheet app/shots/shapes-sheet.png).
 * Swap this file to update the generator; the renderer only consumes `MetalShape` / `posedDrops`.
 *
 * HARD RULE: a resting basket is ONE smooth single form (pebble / droplet / teardrop). Stocks are tint ZONES
 * (a weighted partition of the surface with thin dark seams), never bulges or round lobes.
 *   concentration (HHI)  → elongation (stretch)
 *   1 / HHI (eff. count) → finer surface ripple (wob, fq)
 *   style                → posture: Let winners run = rising teardrop, Ride the trend = forward lean with a
 *                          trailing shoulder, Keep the mix = calm symmetric oblate pebble
 *   seed (address)       → small twist + side + ripple phase
 *   guardrails           → ≤ 3 lobes, all within 0.75 of the core and never below it, strong smooth-min (k = .8),
 *                          bounded aspect, ≤ 10 zones
 * Separate drops only in action states (pour / sell / split use slots 4–5 or `sep`).
 */
import { clamp, norm, type V3 } from "./math";
import { tintFor, type RGB } from "./palette";

export type BasketStyle = "let-winners-run" | "trend-aware" | "balanced" | "run" | "trend" | "mix";
export type RecipeWeight = { ticker: string; w: number };
export type Recipe = { weights: RecipeWeight[]; style?: BasketStyle; seed?: string | number };

export type Lobe = { p: V3; r: number };
export type Zone = { t: string; w: number; dir: V3; b: number; c: RGB; lab: V3; area: number };
export type MetalShape = {
  lobes: Lobe[];
  zones: Zone[];
  conc: number;
  neff: number;
  wob: number;
  fq: number;
  ph: number;
  twist: number;
  style: "run" | "trend" | "mix";
};
export type Drop = { p: V3; r: number; c: RGB };
/** Zone uniforms for the shader (≤ 10 zones). */
export type ZoneSet = { Z: Float32Array; ZC: Float32Array; n: number; zo: V3; wob: number; fq: number; ph: number };
export type Anchor = { p: V3; r: number; t: string; w: number; front: number };
export type Posed = { drops: Drop[]; zone: ZoneSet; anchors: Anchor[]; ctr: V3; shape: MetalShape };

/** Smooth-min for the basket's own lobes (large = one form). */
export const K_REST = 0.8;
/** Slots 0–3 are the form; 4–5 are free for action drops (pour, sell). */
export const FORM_SLOTS = 4;

// --- designer's hash + xorshift rng (exact, so a seed gives the same shape as the mockups) ---
const hash = (str: string) => {
  let h = 2166136261;
  for (const ch of String(str)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const rngOf = (seed: string) => {
  let x = hash(seed) || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
};

export const normStyle = (s?: BasketStyle): "run" | "trend" | "mix" =>
  s === "let-winners-run" || s === "run" ? "run" : s === "trend-aware" || s === "trend" ? "trend" : "mix";

/** Fibonacci samples on the front hemisphere (label anchors = centroid of the area each zone covers). */
const SAMPLES: V3[] = [];
for (let i = 0; i < 260; i++) {
  const y = 1 - ((i + 0.5) / 260) * 2;
  const r = Math.sqrt(1 - y * y);
  const th = i * 2.39996;
  const v: V3 = [Math.cos(th) * r, y, Math.sin(th) * r];
  if (v[2] > 0.05) SAMPLES.push(v);
}

export function shapeFromRecipe({ weights, style: st, seed }: Recipe): MetalShape {
  const style = normStyle(st);
  const ws = weights.length ? weights : [{ ticker: "ALLOY", w: 1 }];
  const W = ws.map((x) => Math.max(0, x.w));
  const sum = W.reduce((a, b) => a + b, 0) || 1;
  const w = W.map((x) => x / sum);
  const n = w.length;
  const hhi = w.reduce((a, x) => a + x * x, 0);
  const neff = 1 / hhi;
  const conc = n > 1 ? clamp((hhi - 1 / n) / (1 - 1 / n)) : 1;
  const R = rngOf(String(seed ?? "x"));
  const r1 = R(), r2 = R(), r3 = R(), r4 = R(), r5 = R();
  const side = r1 < 0.5 ? -1 : 1;
  const e = clamp(0.12 + 0.62 * Math.sqrt(conc), 0, 0.7);
  const lobes: Lobe[] = [{ p: [0, 0, 0], r: 0.76 }];
  if (style === "run") {
    // rising teardrop: a smaller lobe above, leaning a little to one side
    const lean = side * (0.06 + 0.32 * conc + 0.08 * r2);
    const up: V3 = [Math.sin(lean), Math.cos(lean), 0.12 * (r3 - 0.5)];
    const d = 0.5 + 0.42 * e;
    lobes[0].r = 0.76 - 0.04 * e;
    lobes.push({ p: up.map((v) => v * d) as V3, r: 0.4 - 0.1 * e });
    lobes.push({ p: up.map((v) => v * d * 0.5) as V3, r: 0.6 - 0.06 * e });
  } else if (style === "trend") {
    // flowing forward lean, a soft trailing shoulder the other way
    const dir = norm([side * 0.9, 0.42 + 0.12 * r2, 0.3]);
    const d = 0.42 + 0.4 * e;
    lobes.push({ p: dir.map((v) => v * d) as V3, r: 0.5 - 0.1 * e });
    lobes.push({ p: [-side * (0.34 + 0.08 * r3), -0.04, -0.12], r: 0.54 - 0.04 * e });
  } else {
    // keep the mix: calm, symmetric, slightly oblate pebble
    const d = 0.3 + 0.26 * e + 0.04 * r3;
    lobes[0].r = 0.7;
    lobes.push({ p: [-d, -0.02, 0], r: 0.58 });
    lobes.push({ p: [d, -0.02, 0], r: 0.58 });
  }
  // tint zones: directions spread over the front of the form, area set by weight
  const zones: Zone[] = w.map((wi, i) => {
    const ga = 2.39996 * i + r4 * 6.283;
    const ph = n === 1 ? 0 : 0.52 + 0.92 * Math.sqrt((i + 0.5) / n);
    const dir = norm([Math.sin(ph) * Math.cos(ga), Math.sin(ph) * Math.sin(ga) * 0.85 + 0.08, Math.cos(ph)]);
    return { t: ws[i].ticker, w: wi, dir, b: 0.34 * Math.log(Math.max(wi, 1e-4) * n), c: tintFor(ws[i].ticker), lab: dir, area: 0 };
  });
  // label anchor = centroid of the front area each zone actually covers
  const acc = zones.map(() => [0, 0, 0, 0]);
  for (const v of SAMPLES) {
    let bi = 0, bs = -1e9;
    zones.forEach((z, i) => {
      const sc = v[0] * z.dir[0] + v[1] * z.dir[1] + v[2] * z.dir[2] + z.b;
      if (sc > bs) {
        bs = sc;
        bi = i;
      }
    });
    const q = acc[bi];
    q[0] += v[0];
    q[1] += v[1];
    q[2] += v[2];
    q[3]++;
  }
  zones.forEach((z, i) => {
    const q = acc[i];
    z.lab = q[3] > 2 ? norm([q[0], q[1], q[2]]) : z.dir;
    z.area = q[3] / SAMPLES.length;
  });
  return { lobes, zones, conc, neff, wob: 0.5 + 0.1 * Math.min(neff, 10), fq: 0.65 + 0.16 * Math.min(neff, 10), ph: r5 * 20, twist: (r2 - 0.5) * 0.5, style };
}

const rotY = (v: V3, a: number): V3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0] * c - v[2] * s, v[1], v[0] * s + v[2] * c];
};

/**
 * Pose a shape for one frame (port of the designer's `A.drops`): always 4 form slots, so action drops use 4–5.
 * o: ang (turn), sep (hover stretch / split), rs (scale), t (time), off (offset), bob.
 */
export function posedDrops(sh: MetalShape, o: { ang?: number; sep?: number; rs?: number; t?: number; off?: V3; bob?: number } = {}): Posed {
  const ang = (o.ang ?? 0) + sh.twist;
  const rs = o.rs ?? 1;
  const k = 1 + (o.sep ?? 0);
  const off = o.off ?? [0, 0, 0];
  const T = o.t ?? 0;
  const bob = Math.sin(T * 0.8 + sh.ph) * (o.bob ?? 0.025);
  const drops: Drop[] = [];
  for (let i = 0; i < FORM_SLOTS; i++) {
    const L = sh.lobes[i];
    if (!L) {
      drops.push({ p: [0, 60, 0], r: 0, c: [1, 1, 1] });
      continue;
    }
    const p = rotY(L.p, ang);
    drops.push({ p: [off[0] + p[0] * k * rs, off[1] + p[1] * k * rs + bob, off[2] + p[2] * k * rs], r: L.r * rs, c: [0.9, 0.92, 0.95] });
  }
  const Z = new Float32Array(40), ZC = new Float32Array(30);
  const ctr: V3 = [off[0], off[1] + bob + 0.12 * rs * (sh.style === "run" ? 1 : 0), off[2]];
  const anchors = sh.zones.map((z, i) => {
    const d = rotY(z.dir, ang);
    if (i < 10) {
      Z.set([d[0], d[1], d[2], z.b], i * 4);
      ZC.set(z.c, i * 3);
    }
    const l = rotY(z.lab, ang);
    return { p: [ctr[0] + l[0] * 0.5 * rs, ctr[1] + l[1] * 0.5 * rs, ctr[2] + l[2] * 0.5 * rs] as V3, r: 0.45 * rs, t: z.t, w: z.w, front: z.area > 0.004 ? 1 : -1 };
  });
  return { drops, zone: { Z, ZC, n: Math.min(10, sh.zones.length), zo: ctr, wob: sh.wob, fq: sh.fq, ph: sh.ph }, anchors, ctr, shape: sh };
}

/** Convenience: recipe from parallel arrays. */
export const recipeOf = (tickers: string[], weights: number[], style?: BasketStyle, seed?: string): Recipe => ({
  weights: tickers.map((t, i) => ({ ticker: t, w: weights[i] ?? 0 })),
  style,
  seed,
});

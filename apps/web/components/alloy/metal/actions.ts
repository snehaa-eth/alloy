/**
 * Action-state motion (pure), ported from the designer's core.js.
 * pourAt: one continuous function of u in 0..1 for a drop falling into a form (gravity fall, then a damped
 *   settle into the surface; the drop is absorbed by volume (cube root) while the form swells).
 * neckK: the action drop's blend radius from the REAL gap to the form's top, so the liquid bridge (neck)
 *   only forms when the drop is actually close.
 */
import { lerp, ss } from "./math";
import type { Drop } from "./shape";

export type PourOpts = { y0: number; ya: number; yc: number; r: number; swell?: number };

export function pourAt(u: number, o: PourOpts) {
  const a = 0.5, { y0, ya, yc } = o;
  let y: number;
  if (u < a) {
    const q = u / a;
    y = lerp(y0, ya, q * q);
  } else {
    const q = (u - a) / (1 - a);
    const v0 = (((2 * (ya - y0)) / a) * (1 - a)) / (yc - ya);
    y = lerp(ya, yc, v0 * q + (3 - 2 * v0) * q * q + (v0 - 2) * q * q * q);
  }
  const absorb = ss(0.3, 0.95, u);
  return { y, r: o.r * Math.cbrt(Math.max(0, 1 - absorb)), swell: (o.swell ?? 0) * absorb, rip: ss(0.6, 1, u), k2: lerp(0.3, 0.95, ss(0.5, 0.85, u)), absorb };
}

export function neckK(drop: Drop, base: Drop[], o: { min?: number; max?: number; far?: number; near?: number } = {}) {
  let top = -1e3;
  for (const d of base) if (d.r > 0.01) top = Math.max(top, d.p[1] + d.r);
  const gap = drop.p[1] - drop.r - top;
  return lerp(o.min ?? 0.3, o.max ?? 1.6, Math.pow(ss(o.far ?? 0.7, o.near ?? 0.05, gap), 1.4));
}

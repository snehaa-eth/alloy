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

/** Highest point of a set of drops (the form's top). */
export function topOf(base: Drop[]): number {
  let top = -1e3;
  for (const d of base) if (d.r > 0.01) top = Math.max(top, d.p[1] + d.r);
  return top;
}

export type Tail = { p: [number, number, number]; r: number };

/**
 * Teardrop pour (no knob): one continuous function of u in 0..1, the mirror of the sell pinch-off.
 * - The head falls under gravity (pourAt's curve, contact at u ≈ .5).
 * - While it falls, its underside stretches into a tail that reaches toward the surface (round cone, see renderer `tail`),
 *   so the first contact is a thin tip touching the surface, never a round head sitting on a narrow neck.
 * - After contact the bridge widens past the head's own size (a funnel) while the head sinks in and is absorbed by volume.
 * `hold` (0..1, optional) freezes the head above the surface with the tail half reaching: used while waiting for a receipt.
 */
export function pourFrame(u: number, o: { x?: number; z?: number; y0: number; top: number; yc: number; r: number; swell?: number }) {
  const r0 = o.r, x = o.x ?? 0.04, z = o.z ?? 0.12, top = o.top;
  // gravity fall to contact by u = A, then a monotone (Hermite, velocity-matched) slide into the core
  const A = 0.36, ya = top + r0;
  let y: number;
  if (u < A) {
    const q = u / A;
    y = lerp(o.y0, ya, q * q);
  } else {
    const q = (u - A) / (1 - A);
    const d = o.yc - ya;
    const m0 = Math.max(3 * d, ((2 * (ya - o.y0)) / A) * (1 - A)); // keep it monotone (no overshoot)
    y = (2 * q ** 3 - 3 * q * q + 1) * ya + (q ** 3 - 2 * q * q + q) * m0 + (-2 * q ** 3 + 3 * q * q) * o.yc;
  }
  const gap = y - r0 - top; // head bottom → surface
  const absorb = Math.max(ss(0.34, 0.95, u), 0.3 * ss(0.22 * r0, -0.3 * r0, gap));
  const rh = r0 * Math.cbrt(Math.max(0, 1 - absorb));
  const s = ss(1.8 * r0, 0.12 * r0, gap); // stretch toward the surface (tip lands only when the head is ~.1r away)
  // bridge: starts as the tip arrives and is past the head's own size within a couple of frames (a funnel, never a stem)
  // coalescence is near-instant: the bridge opens past the head's own size within ~one frame of the tip landing
  const wet = ss(0.22 * r0, -0.3 * r0, gap);
  const fade = Math.cbrt(Math.max(0, 1 - ss(0.72, 1, u)));
  const r2 = lerp(lerp(0.55, 0.4, s), 1.3, wet) * r0 * fade;
  // tip bottom slides from the head's underside down to the surface; after contact the tip sinks inside the form
  const tipBottom = lerp(y - r0, top - 0.03, s);
  const tipY = lerp(tipBottom + r2, top - r2, wet);
  const tail: Tail | null = s > 0.001 && rh > 0.006 ? { p: [x, Math.min(tipY, y), z], r: r2 } : null;
  return {
    drop: { p: [x, y, z] as [number, number, number], r: rh },
    tail,
    // k2 stays tiny until the tail lands: a large smooth-min radius alone would pull a neck out of the gap
    k2: Math.max(lerp(0.025, 0.9, Math.sqrt(wet)), lerp(0.025, 0.95, ss(0.62, 0.9, u))),
    swell: (o.swell ?? 0) * absorb,
    rip: ss(0.55, 1, u),
    absorb,
    contact: wet,
  };
}

/**
 * Hovering drop that "leans in" while a transaction is pending: the head hangs at `y`, its tail reaches part of the way
 * (reach 0..1) but never touches. Continuous with pourFrame (same tail model).
 */
export function hoverTail(y: number, r0: number, top: number, reach: number, x = 0.04, z = 0.12): Tail | null {
  if (reach <= 0.001) return null;
  const gap = Math.max(0, y - r0 - top);
  const r2 = lerp(0.5, 0.26, reach) * r0;
  const tipBottom = y - r0 - gap * 0.55 * reach;
  return { p: [x, Math.min(tipBottom + r2, y), z], r: r2 };
}

/**
 * Sell pinch-off: a thread from the bud back to the form's edge that thins and lets go, then snaps back into the bud.
 * q 0..1 over the pinch; edgeX = the form's right edge; bud at bx with radius br.
 */
export function pinchTail(q: number, bud: { p: [number, number, number]; r: number }, edgeX: number): Tail | null {
  if (bud.r < 0.01) return null;
  const thin = ss(0.05, 0.82, q);
  const back = ss(0.8, 1, q);
  const r2 = lerp(0.62 * bud.r, 0.035, thin) * (1 - back);
  if (r2 < 0.004) return null;
  const tx = lerp(edgeX - 0.06, bud.p[0] - bud.r * 0.6, back);
  if (tx >= bud.p[0]) return null;
  return { p: [tx, bud.p[1] - 0.02, bud.p[2] * 0.5], r: r2 };
}

/**
 * The form's REAL surface height above (x, z): the shader blends the lobes with a smooth-min (k = K_REST .8), which
 * lifts the surface well above the highest sphere. Same SDF as the shader minus the tiny wobble (+ margin).
 * Contact timing for the pour must use this, or the tail "touches" thin air / a neck forms early.
 */
export function surfaceTop(base: Drop[], x = 0.04, z = 0.12, k = 0.8): number {
  const smin = (a: number, b: number) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  };
  const sdf = (y: number) => {
    let d = 1e3;
    for (const b of base) if (b.r > 0.005) d = smin(d, Math.hypot(x - b.p[0], y - b.p[1], z - b.p[2]) - b.r);
    return d;
  };
  let lo = topOf(base) - 0.3, hi = lo + 1.5;
  if (sdf(lo) > 0) return topOf(base);
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2;
    if (sdf(m) > 0) hi = m;
    else lo = m;
  }
  return lo + 0.02;
}

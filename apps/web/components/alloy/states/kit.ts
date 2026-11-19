/**
 * Small helpers for custom metal regions on app pages (shelf, money pool, activity tiles, stage, loader).
 * Pure: builds RenderSpecs from the shared metal API (shapeFromRecipe / posedDrops); never touches the renderer.
 */
import type { Cam, V3 } from "../metal/math";
import type { RenderSpec } from "../metal/MetalCanvas";
import { posedDrops, type Drop, type MetalShape, type Posed } from "../metal/shape";
import type { RGB } from "../metal/palette";

/** Warm cream for money (test dollars, own money): never copper. */
export const CREAM: RGB = [1, 0.95, 0.88];
export const SILVER: RGB = [0.9, 0.92, 0.95];

export const cam = (z = 4.1, y = 0.3, ty = 0, x = 0): Cam => ({ ro: [x, y, z], ta: [0, ty, 0], tan: 0.42 });

/** A single plain drop (no stock zones). */
export const drop = (p: V3, r: number, c: RGB = CREAM): Drop => ({ p, r, c });

/** Spec for loose drops (no zones): each drop shows its own colour. */
export function looseSpec(c: Cam, drops: (Drop | null)[], o: { t: number; k?: number; tint?: number; wob?: number; rip?: number; shim?: number; shimPos?: number; alpha?: number; glow?: number }): RenderSpec {
  return { cam: c, drops, o: { k: o.k ?? 0.3, n: 6, tint: o.tint ?? 0.12, wob: o.wob ?? 1, t: o.t, rip: o.rip, shim: o.shim, shimPos: o.shimPos, alpha: o.alpha, glow: o.glow } };
}

/** Spec for a basket form (zones on), with optional extra drops in slots 4–5. */
export function formSpec(c: Cam, posed: Posed, extra: (Drop | null)[], o: { t: number; k2?: number; rip?: number; shim?: number; shimPos?: number; alpha?: number; zt?: number; glow?: number; zl?: number }): RenderSpec {
  const ds: (Drop | null)[] = [...posed.drops, ...extra.slice(0, 2)];
  return { cam: c, drops: ds, o: { t: o.t, zone: posed.zone, zt: o.zt ?? 0.5, k: 0.8, k2: o.k2 ?? 0.32, rip: o.rip, shim: o.shim, shimPos: o.shimPos, alpha: o.alpha, glow: o.glow, zl: o.zl } };
}

/** Pose a shape so its lowest point rests on `floor` at x = cx (one smooth form, gentle sway). */
export function restOn(sh: MetalShape, o: { cx: number; floor: number; rs: number; ang: number; t: number; lift?: number }): Posed {
  const probe = posedDrops(sh, { ang: o.ang, rs: o.rs, t: o.t, bob: 0 });
  let minY = 1e3;
  for (const d of probe.drops) if (d.r > 0.01) minY = Math.min(minY, d.p[1] - d.r);
  return posedDrops(sh, { ang: o.ang, rs: o.rs, t: o.t, bob: 0, off: [o.cx, o.floor - minY - 0.015 + (o.lift ?? 0), 0] });
}

/** Mirror a posed form in the floor plane y = floor (reflection pass). */
export function mirror(p: Posed, floor: number): Posed {
  const drops = p.drops.map((d) => ({ ...d, p: [d.p[0], 2 * floor - d.p[1], d.p[2]] as V3 }));
  const Z = new Float32Array(p.zone.Z);
  for (let i = 0; i < 10; i++) Z[i * 4 + 1] = -Z[i * 4 + 1];
  const zo: V3 = [p.zone.zo[0], 2 * floor - p.zone.zo[1], p.zone.zo[2]];
  return { ...p, drops, zone: { ...p.zone, Z, zo } };
}

/** Lowest point of a set of drops. */
export const bottomOf = (ds: Drop[]) => ds.reduce((m, d) => (d.r > 0.01 ? Math.min(m, d.p[1] - d.r) : m), 1e3);

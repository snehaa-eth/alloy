"use client";

/**
 * Tiny looping metal tile for one activity event (3.6s loop, designer activity.html):
 *   pour     a cream drop falls into the basket form (buys, launches, own money in)
 *   reshape  the form drifts out of its plan and smooths back (rebalances; "run" style keeps the new shape)
 *   morph    the form moves from the old recipe to the new one (creator recipe changes)
 */
import { useMemo, useRef } from "react";
import { useMetalRegion } from "../metal/MetalCanvas";
import { bump, clamp, easeInOut, lerp, ss } from "../metal/math";
import { posedDrops, shapeFromRecipe, type Posed, type Recipe } from "../metal/shape";
import { cam, CREAM, drop, formSpec } from "../states/kit";

export type MicroKind = "pour" | "reshape" | "morph";

const CAM = cam(3.5, 0.35, 0.08);
const L = 3.6;

/** Blend two posed forms of the same recipe (same tickers, seed and style; only weights differ). */
function blend(a: Posed, b: Posed, k: number): Posed {
  const drops = a.drops.map((d, i) => {
    const e = b.drops[i];
    return { ...d, p: [lerp(d.p[0], e.p[0], k), lerp(d.p[1], e.p[1], k), lerp(d.p[2], e.p[2], k)] as [number, number, number], r: lerp(d.r, e.r, k) };
  });
  const Z = new Float32Array(a.zone.Z.length);
  for (let i = 0; i < Z.length; i++) Z[i] = lerp(a.zone.Z[i], b.zone.Z[i], k);
  return { ...b, drops, zone: { ...b.zone, Z } };
}

export function MicroTile({ kind, recipe, from, keepNew, phase = 0 }: { kind: MicroKind; recipe: Recipe; from?: Recipe; keepNew?: boolean; phase?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const k1 = JSON.stringify(recipe), k2 = JSON.stringify(from ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shape = useMemo(() => shapeFromRecipe(recipe), [k1]);
  // "before": the real old recipe, or (rebalance without per-stock detail) the plan with its biggest stock drifted up
  const before = useMemo(() => {
    if (from) return shapeFromRecipe(from);
    if (kind !== "reshape") return null;
    const top = recipe.weights.reduce((m, x, i) => (x.w > recipe.weights[m].w ? i : m), 0);
    return shapeFromRecipe({ ...recipe, weights: recipe.weights.map((x, i) => ({ ...x, w: i === top ? x.w * 1.45 : x.w })) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k1, k2, kind]);
  const t0 = useRef(phase * 0.9);

  useMetalRegion(ref, ({ T, dt, reduced }) => {
    if (!reduced) t0.current += dt;
    const t = reduced ? 0.99 : (t0.current % L) / L;
    const ang = Math.sin(T * 0.3 + phase) * 0.5;
    const o = { ang, rs: 0.8, t: T + phase * 2, bob: 0.015 };
    if (kind === "pour") {
      const f = clamp(t / 0.32);
      const land = bump(0.3, 0.75, t);
      const posed = posedDrops(shape, { ...o, rs: 0.78 * (1 + 0.05 * ss(0.3, 0.5, t) * (1 - ss(0.9, 1, t))) });
      const d = drop([0, lerp(1.6, 0.15, f * f), 0.15], 0.18 * (1 - ss(0.28, 0.36, t)), CREAM);
      return formSpec(CAM, posed, [d], { t: T, k2: lerp(0.3, 0.9, ss(0.2, 0.34, t)), rip: land * 0.9, shim: land * 0.55, shimPos: lerp(2.4, -2.4, clamp((t - 0.3) / 0.45)) });
    }
    const a = posedDrops(before ?? shape, o);
    const b = posedDrops(shape, o);
    if (kind === "reshape") {
      // drift out (toward "before"), then back to the plan; Let winners run keeps the drift
      const out = ss(0.08, 0.38, t) * (keepNew ? 1 - ss(0.9, 1, t) : 1 - ss(0.55, 0.8, t));
      const back = keepNew ? 0 : bump(0.55, 0.95, t);
      return formSpec(CAM, blend(b, a, easeInOut(out)), [], { t: T, shim: back * 0.6, shimPos: lerp(-2.4, 2.4, clamp((t - 0.55) / 0.4)), rip: back * 0.5 });
    }
    // morph: old recipe → new recipe, hold, then fade back to start the loop
    const k = easeInOut(ss(0.15, 0.55, t) * (1 - ss(0.9, 1, t)));
    const flash = bump(0.5, 0.85, t);
    return formSpec(CAM, blend(a, b, k), [], { t: T, shim: flash * 0.6, shimPos: lerp(-2.4, 2.4, clamp((t - 0.5) / 0.35)), rip: flash * 0.5 });
  });
  return <div ref={ref} className="ac-tile" aria-hidden />;
}

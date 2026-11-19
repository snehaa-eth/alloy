"use client";

/**
 * <MetalBasket recipe state /> — one basket as liquid metal on the shared page canvas.
 * Resting states (idle, breathe) are ONE smooth form with stock tint zones; action states may show separate drops.
 *   idle     slow sway, gentle bob
 *   breathe  idle + hover stretch, stronger tint, shimmer sweep (hover / focus)
 *   pour     a drop falls in and merges (ripple + shimmer), repeating while the state holds
 *   reshape  zones re-partition to `weights` (live weights) with a soft ripple
 *   split    the form's lobes pull apart into separate drops
 * `glow` (0..1): a warm inner light at the core (success / "your share"), breathing slowly.
 * `assemble`: the form gathers as the box scrolls into view (designer "rise").
 */
import { useMemo, useRef, type CSSProperties } from "react";
import { clamp, damp, easeOut, lerp, ss } from "./math";
import { pourFrame, surfaceTop } from "./actions";
import { useMetalRegion } from "./MetalCanvas";
import { posedDrops, shapeFromRecipe, type Drop, type Recipe } from "./shape";

export type MetalState = "idle" | "pour" | "breathe" | "reshape" | "split";

type Props = {
  recipe: Recipe;
  state?: MetalState;
  /** live weights (same order as recipe.weights), used by "reshape" */
  weights?: number[];
  /** camera distance (bigger = smaller metal) */
  zoom?: number;
  /** gather the form as it scrolls into view */
  assemble?: boolean;
  /** follow the pointer a little */
  lean?: boolean;
  /** phase offset so neighbours don't move in sync */
  phase?: number;
  /** inner glow 0..1 (success / your share) */
  glow?: number;
  /** engrave the pour drop (e.g. "USDC" for money pouring in); dissolves as it's absorbed. Default: none. */
  pourLogo?: string | null;
  /** engrave each stock's mark inside its tint zone (fused form). Default on. */
  logos?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function MetalBasket({ recipe, state = "idle", weights, zoom, assemble, lean, phase = 0, glow = 0, pourLogo = null, logos = true, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(recipe);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shape = useMemo(() => shapeFromRecipe(recipe), [key]);
  const reshaped = useMemo(
    () => (weights ? shapeFromRecipe({ ...recipe, weights: recipe.weights.map((x, i) => ({ ticker: x.ticker, w: weights[i] ?? x.w })) }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, weights?.join(",")],
  );
  const a = useRef({ h: 0, split: 0, rise: assemble ? 0 : 1, ph: phase * 1.7, rip: 0 });
  const pour = useRef<Drop>({ p: [0, 3, 0.2], r: 0, c: [1, 0.86, 0.74] });

  const supported = useMetalRegion(ref, ({ rect, T, dt, H, mouse, reduced, phone }) => {
    const s = a.current;
    const d = (x: number, y: number, k: number) => (reduced ? y : damp(x, y, k, dt));
    s.h = d(s.h, state === "breathe" ? 1 : 0, 0.015);
    s.split = d(s.split, state === "split" ? 1 : 0, 0.03);
    s.rip = d(s.rip, state === "reshape" ? 1 : 0, 0.05);
    if (assemble) s.rise = reduced ? 1 : Math.max(s.rise, easeOut(clamp((H - rect.top) / (H * 0.6))));
    s.ph += dt * (0.35 - s.h * 0.25);
    const ang = Math.sin(s.ph) * 0.32; // gentle sway around the facing pose (biggest stock toward you)
    const t = T + phase * 3;
    const sep = lerp(0.35, 0, s.rise) + s.h * 0.28 + s.split * 0.9;
    const sh = state === "reshape" && reshaped ? reshaped : shape;
    const posed = posedDrops(sh, { ang, sep, rs: (1 + s.h * 0.03) * lerp(0.85, 1, s.rise), t });
    let rip = s.rip * 0.35, shim = s.h * 0.6;
    let shimPos = lerp(-2.4, 2.4, (T * 0.25 + phase * 0.3) % 1);
    const P = pour.current;
    let k2 = 0.32;
    let tail: { i: number; p: [number, number, number]; r: number } | null = null;
    if (state === "pour" && !reduced) {
      // teardrop pour (pourFrame): the tail reaches the surface first, the bridge widens, the head is absorbed. No knob frame.
      const u = (t % 3.4) / 3.4;
      const top = surfaceTop(posed.drops);
      const pr = pourFrame(Math.min(1, u / 0.85), { y0: 2.8, top, yc: top - 0.4, r: 0.22 });
      P.p = pr.drop.p;
      P.r = u < 0.85 ? pr.drop.r : 0;
      P.logo = pourLogo;
      P.lw = 1 - ss(0.2, 0.6, pr.absorb);
      if (pr.tail && P.r > 0) tail = { i: 4, ...pr.tail };
      k2 = pr.k2;
      rip = Math.max(rip, pr.rip * (1 - pr.absorb * 0.4) * 0.7);
      shim = Math.max(shim, pr.absorb * (1 - pr.absorb) * 2.4);
      shimPos = lerp(-2.6, 2.6, pr.absorb);
    } else P.r = 0;
    const z = zoom ?? (phone ? 4.5 : 4.3);
    const m = lean ? 1 : s.h;
    return {
      cam: { ro: [mouse[0] * 0.25 * m, 0.3 + mouse[1] * 0.15 * m, z], ta: [0, 0.1, 0], tan: 0.42 },
      drops: [...posed.drops, P],
      o: {
        t, zone: posed.zone, zl: logos ? 1 - s.split : 0, zt: 0.5 + s.h * 0.14, k: lerp(0.8, 0.34, s.split), k2, rip, shim, shimPos, tail,
        light: glow > 0 ? [0, posed.ctr[1] - 0.05, 0.35, glow * (0.18 + 0.08 * Math.sin(T * 2.2))] : undefined,
      },
    };
  });

  return (
    <div ref={ref} className={className} style={{ position: "relative", ...style }} aria-hidden>
      {supported === false && <span className="a-metal-fallback" />}
    </div>
  );
}

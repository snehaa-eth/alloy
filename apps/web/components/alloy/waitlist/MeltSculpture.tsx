"use client";

/**
 * Waitlist hero sculpture: four logo-engraved stock drops (apart: floating, or orbiting the centre), slowly melt into
 * ONE basket (tint zones + zone logos, biggest stock facing forward), a USDC drop pours in, then the basket parts
 * again. One loop on the shared metal canvas. Reduced motion: the fused basket, still.
 */
import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { useMetalRegion } from "../metal/MetalCanvas";
import { bump, clamp, easeInOut, lerp, ss, type V3 } from "../metal/math";
import { tintFor } from "../metal/palette";
import { posedDrops, shapeFromRecipe, type Drop } from "../metal/shape";
import { pourFrame, surfaceTop } from "../metal/actions";

export const MELT_STOCKS = [
  { t: "NVDA", w: 0.34 },
  { t: "AAPL", w: 0.26 },
  { t: "MSFT", w: 0.22 },
  { t: "AMZN", w: 0.18 },
];
/** Floating apart positions (world units). */
const FLOAT: V3[] = [[-1.55, 0.95, 0.2], [1.5, 0.55, -0.3], [-1.0, -1.25, 0.45], [1.3, -1.2, -0.35]];
const rad = (w: number) => 0.95 * Math.sqrt(w) + 0.05;
/** Seconds per loop. Phases (fraction of the loop): apart 0–.2, melt .2–.4, hold + pour .5–.72, part .86–1. */
export const MELT_LOOP = 18;
export const meltFuse = (u: number) => easeInOut(ss(0.2, 0.4, u)) * (1 - easeInOut(ss(0.86, 1, u)));

type Props = {
  className?: string;
  /** "float": drops drift in place; "orbit": drops circle the centre before they fuse */
  mode?: "float" | "orbit";
  /** horizontal spread of the apart drops (wide stages) */
  spread?: number;
  /** camera distance apart / fused (bigger = smaller) */
  zoom?: [number, number];
  /** called with the fuse amount (0 apart … 1 one basket) when it changes */
  onPhase?: (fuse: number) => void;
};

export function MeltSculpture({ className, mode = "float", spread = 1, zoom, onPhase }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const shape = useMemo(() => shapeFromRecipe({ weights: MELT_STOCKS.map((s) => ({ ticker: s.t, w: s.w })), style: "balanced", seed: "alloy-waitlist" }), []);
  const st = useRef({
    cur: MELT_STOCKS.map((s, i) => ({ p: [FLOAT[i][0] * spread, FLOAT[i][1], FLOAT[i][2]] as V3, r: rad(s.w), c: tintFor(s.t), logo: s.t, lw: 1 })) as Drop[],
    pour: { p: [0, 5, 0], r: 0, c: [1, 0.86, 0.74] } as Drop,
    lastFuse: -1,
  });
  const phase = useRef(onPhase);
  phase.current = onPhase;

  const supported = useMetalRegion(ref, ({ rect, T, dt, mouse, reduced, phone }) => {
    const s = st.current;
    const u = reduced ? 0.6 : (T % MELT_LOOP) / MELT_LOOP;
    const fuse = reduced ? 1 : meltFuse(u);
    // fused: gentle sway around the pose that faces the biggest stock (NVDA) toward the viewer
    const posed = posedDrops(shape, { ang: Math.sin(T * 0.28) * 0.3 + mouse[0] * 0.2 * fuse, t: T, rs: 1.05, bob: 0.03 });
    const heroK = 1 - fuse;

    s.cur.forEach((d, i) => {
      const lobe = posed.drops[i < shape.lobes.length ? i : 0];
      const tgtR = i < shape.lobes.length ? lobe.r : lobe.r * 0.85;
      let ap: V3;
      if (mode === "orbit") {
        const a = T * 0.32 + (i * Math.PI) / 2;
        const R = 1.75 + 0.12 * Math.sin(T * 0.4 + i);
        ap = [Math.cos(a) * R * spread, Math.sin(a * 1 + i) * 0.35 + (i % 2 ? -0.25 : 0.3), Math.sin(a) * R * 0.75];
      } else ap = [FLOAT[i][0] * spread, FLOAT[i][1], FLOAT[i][2]];
      const tp: V3 = [lerp(ap[0], lobe.p[0], fuse), lerp(ap[1], lobe.p[1], fuse), lerp(ap[2], lobe.p[2], fuse)];
      tp[1] += Math.sin(T * 0.7 + i * 1.9) * 0.1 * heroK;
      tp[0] += Math.cos(T * 0.5 + i * 2.4) * 0.06 * heroK + mouse[0] * (0.08 + 0.04 * i) * heroK;
      tp[1] += mouse[1] * (0.06 + 0.03 * i) * heroK;
      // mercury lag: each drop follows at its own pace; once fused the form holds
      const kS = reduced ? 1 : 1 - Math.pow(lerp(mode === "orbit" ? 0.0004 : 0.002 + 0.006 * i, 0.00001, fuse), dt);
      for (let a = 0; a < 3; a++) d.p[a] = lerp(d.p[a], tp[a], kS);
      const tr = lerp(rad(MELT_STOCKS[i].w), tgtR, fuse);
      d.r = reduced ? tr : lerp(d.r, tr, 1 - Math.pow(0.0005, dt));
      d.logo = MELT_STOCKS[i].t;
      d.lw = 1 - ss(0.02, 0.4, fuse);
    });

    // USDC pours into the fused basket
    const P = s.pour;
    let k2 = 0.32;
    let tail: { i: number; p: [number, number, number]; r: number } | null = null;
    const pu = (u - 0.5) / 0.22;
    let pourShim = 0;
    if (!reduced && pu > 0 && pu < 1) {
      const top = surfaceTop(s.cur, 0.05, 0.25, lerp(0.3, 0.8, fuse));
      const pr = pourFrame(pu, { x: 0.05, z: 0.25, y0: 3.4, top, yc: top - 0.35, r: 0.22 });
      P.p = pr.drop.p;
      P.r = pr.drop.r * ss(0, 0.05, pu);
      P.logo = "USDC";
      P.lw = 1 - ss(0.15, 0.55, pr.absorb);
      k2 = pr.k2;
      pourShim = bump(0.45, 0.8, pu);
      if (pr.tail && P.r > 0.005) tail = { i: 4, p: pr.tail.p, r: pr.tail.r * ss(0, 0.05, pu) };
    } else P.r = 0;

    if (phase.current && Math.abs(fuse - s.lastFuse) > 0.002) {
      s.lastFuse = fuse;
      phase.current(fuse);
    }

    const aspect = rect.width / Math.max(rect.height, 1);
    const fit = 1 / Math.min(1, aspect / Math.max(1, spread * 0.9));
    const [za, zf] = zoom ?? [phone ? 7.4 : 6.9, phone ? 5.2 : 4.7];
    const cz = lerp(za, zf, fuse) * fit;
    return {
      cam: { ro: [mouse[0] * 0.35, 0.25 + mouse[1] * 0.2, cz], ta: [0, 0, 0], tan: 0.42 },
      drops: [...s.cur, P],
      o: {
        t: T,
        n: 4,
        k: lerp(0.3, 0.8, fuse),
        k2,
        tail,
        shim: bump(0.28, 0.44, u) * 1.1 + pourShim * 0.8,
        shimPos: pourShim > 0 ? lerp(-2.6, 2.6, clamp(pu)) : lerp(-2.6, 2.6, ss(0.28, 0.44, u)),
        rip: bump(0.3, 0.42, u) * 0.8 + (pu > 0.4 && pu < 1 ? bump(0.4, 0.9, pu) * 0.5 : 0),
        wob: 1,
        zm: ss(0.35, 0.95, fuse),
        zt: lerp(0.13, 0.5, ss(0.3, 1, fuse)),
        zone: posed.zone,
        zl: ss(0.92, 1, fuse),
      },
    };
  });

  return (
    <div ref={ref} className={cn("relative", className)} aria-hidden>
      {supported === false && <span className="a-metal-fallback" />}
    </div>
  );
}

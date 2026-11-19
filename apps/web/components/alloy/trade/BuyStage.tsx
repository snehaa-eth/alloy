"use client";

/**
 * Buy stage: the basket as liquid metal with a drop of money above it (designer buy.html), driven by the visual phase
 * the sheet derives from the REAL tx step (journey.ts). The drop size follows the amount; it only falls in on "pour"
 * (receipt confirmed). Pour = teardrop (metal/actions pourFrame): its tail reaches the surface first, so there is
 * never a round head on a narrow neck.
 */
import { useMemo, useRef } from "react";
import { damp, lerp, project, ss, bump, clamp, type V3 } from "../metal/math";
import { pourFrame, surfaceTop, type Tail } from "../metal/actions";
import { useMetalRegion, useMetalFrame } from "../metal/MetalCanvas";
import { posedDrops, shapeFromRecipe, type Drop, type Recipe } from "../metal/shape";
import { placeTag, resolveTags, type TagEl } from "../metal/tags";
import { DUR, type BuyVisual } from "./journey";

const BASE_Y = -0.5;
/** hover: drop centre above the surface (r + gap). Gap in radii, capped in world units so big drops stay in frame. */
export const hoverY = (top: number, r: number, k: "rest" | "sign" | "wait") =>
  top + r + (k === "rest" ? Math.min(2.8 * r, 0.7) : k === "sign" ? Math.min(2.4 * r, 0.6) : Math.min(2.0 * r, 0.5));
/** drop radius by dollars (designer dropR) */
export const dropR = (a: number) => (a < 5 ? 0.08 + (0.03 * Math.max(0, a)) / 5 : 0.15 + 0.3 * Math.sqrt(Math.min(a, 250) / 250));
const swellFor = (a: number) => 0.05 + 0.1 * Math.sqrt(Math.min(a, 250) / 250);

type S = {
  ph: BuyVisual;
  t: number;
  dy: number;
  dr: number;
  swell: number;
  rip: number;
  shim: number;
  shimPos: number;
  glow: number;
  k2: number;
  y0: number;
  bY: number;
  tail: Tail | null;
  tagOn: number;
  top: number;
};

export function BuyStage({
  recipe,
  amount,
  visual,
  label,
  splitLabel,
  className,
}: {
  recipe: Recipe;
  /** dollars (display only; the drop size) */
  amount: number;
  visual: BuyVisual;
  /** text beside the drop, e.g. "+ $25.00" */
  label: string;
  /** settle labels per ticker, e.g. "+$10.00" */
  splitLabel: (ticker: string) => string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const dtag = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(recipe);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shape = useMemo(() => shapeFromRecipe(recipe), [key]);
  const st = useRef<S>({ ph: visual, t: 0, dy: 1.6, dr: 0, swell: 0, rip: 0, shim: 0, shimPos: -3, glow: 0, k2: 0.3, y0: 1.2, bY: 1.2, tail: null, tagOn: 0, top: 0.4 });
  const props = useRef({ amount, visual, label, splitLabel });
  props.current = { amount, visual, label, splitLabel };

  // state machine on every metal frame (keeps running even while the stage is scrolled out of view)
  useMetalFrame(({ dt, T, reduced }) => {
    const s = st.current;
    const p = props.current;
    if (p.visual !== s.ph) {
      // continuity: pour starts where the drop hangs, bounce starts where it stopped
      if (p.visual === "pour") s.y0 = s.dy;
      if (p.visual === "bounce") s.bY = s.dy;
      s.ph = p.visual;
      s.t = 0;
    }
    s.t += dt;
    const t = s.t;
    const D = (a: number, b: number, k: number) => (reduced ? b : damp(a, b, k, dt));
    const tr = dropR(p.amount);
    const top = s.top;
    const rest = hoverY(top, tr, "rest");
    s.tail = null;
    switch (s.ph) {
      case "amount":
        s.dr = D(s.dr, tr, 0.01);
        s.dy = D(s.dy, rest, 0.02);
        s.k2 = 0.3;
        s.glow = D(s.glow, 0, 0.1);
        break;
      case "approve": {
        // trembling, a slow shimmer sweeping the basket while the allowance clears
        const c = (t % 1.5) / 1.5;
        s.dr = tr * (1 + 0.06 * Math.sin(t * 9));
        s.dy = D(s.dy, rest + 0.1, 0.05);
        s.shim = bump(0.1, 0.9, c) * 0.7;
        s.shimPos = lerp(-1, 3, c);
        s.k2 = 0.3;
        break;
      }
      case "sign":
      case "wait": {
        // lowers toward the surface and waits; on "wait" (tx sent) its tail reaches part of the way, never touching
        const hover = hoverY(top, tr, s.ph === "sign" ? "sign" : "wait");
        s.dr = D(s.dr, tr, 0.05);
        s.dy = D(s.dy, hover + Math.sin(T * 1.6) * 0.012, 0.04);
        s.shim = D(s.shim, 0, 0.1);
        const f = pourFrame(0, { y0: s.dy, top, yc: top - 0.5, r: s.dr });
        s.tail = f.tail;
        s.k2 = f.k2;
        break;
      }
      case "pour": {
        const u = clamp(t / DUR.pour);
        const f = pourFrame(u, { y0: s.y0, top, yc: top - 0.5, r: tr, swell: swellFor(p.amount) });
        s.dy = f.drop.p[1];
        s.dr = f.drop.r;
        s.tail = f.tail;
        s.k2 = f.k2;
        s.swell = f.swell;
        s.rip = f.rip * 0.8;
        s.shim = f.absorb * (1 - f.absorb) * 2;
        s.shimPos = lerp(-2.6, 2.6, f.absorb);
        break;
      }
      case "settle": {
        const q = clamp(t / DUR.settle);
        s.dr = 0;
        s.swell = swellFor(p.amount) * (1 + 0.3 * Math.sin(q * Math.PI * 3) * Math.exp(-q * 3.2));
        s.rip = Math.exp(-q * 3) * (1 - ss(0.7, 1, q));
        s.k2 = 0.95;
        s.shim = bump(0, 0.55, q) * 0.16;
        s.shimPos = lerp(-2.6, 2.6, q / 0.55);
        s.glow = ss(0.5, 1, q) * 0.3;
        break;
      }
      case "done":
        s.dr = 0;
        s.glow = 0.22 + 0.1 * Math.sin(t * 2.2);
        s.rip = D(s.rip, 0, 0.1);
        s.shim = D(s.shim, 0, 0.1);
        s.swell = D(s.swell, swellFor(p.amount), 0.05);
        break;
      case "bounce": {
        const q = clamp(t / DUR.bounce);
        s.dy = lerp(s.bY, rest, 1 - Math.pow(1 - q, 3)) + Math.sin(q * Math.PI * 3) * 0.12 * (1 - q);
        s.dr = tr * (1 + 0.18 * Math.sin(q * 20) * Math.exp(-q * 5));
        s.k2 = 0.3;
        s.rip = bump(0, 0.5, q) * 0.6;
        break;
      }
      case "err":
        s.dr = D(s.dr, tr, 0.05);
        s.dy = rest + Math.sin(t * 1.3) * 0.04;
        s.rip = D(s.rip, 0, 0.1);
        break;
    }
    if (s.ph !== "pour" && s.ph !== "settle" && s.ph !== "done") s.swell = D(s.swell, 0, 0.05);
    s.tagOn = s.ph === "settle" ? ss(0.2, 0.8, t / DUR.settle) : s.ph === "done" ? 1 : D(s.tagOn, 0, 0.001);
  });

  useMetalRegion(ref, ({ rect, T, mouse, phone }) => {
    const s = st.current;
    const p = props.current;
    const cam = { ro: [mouse[0] * 0.2, 0.35 + mouse[1] * 0.1, phone ? 5.4 : 4.9] as V3, ta: [0, -0.12, 0] as V3, tan: 0.42 };
    const posed = posedDrops(shape, { ang: Math.sin(T * 0.2) * 0.25, t: T, rs: 1 + s.swell, off: [0, BASE_Y, 0] });
    s.top = surfaceTop(posed.drops);
    const bob = s.ph === "amount" ? Math.sin(T * 1.4) * 0.04 : 0;
    // the money drop carries the USDC mark; it dissolves as the drop is absorbed
    const lw = s.ph === "pour" ? 1 - ss(0.3, 0.62, clamp(s.t / DUR.pour)) : 1;
    const drop: Drop = { p: [0.04, s.dy + bob, 0.12], r: s.dr, c: [0.92, 0.9, 0.88], logo: "USDC", lw };
    const tail = s.tail ? { i: 4, p: [s.tail.p[0], s.tail.p[1] + bob, s.tail.p[2]] as [number, number, number], r: s.tail.r } : null;
    const wob = 1 + (s.ph === "settle" ? 0.8 * Math.exp(-s.t * 2) : 0);

    // lobe labels: "+$10.00" while settling / done
    const host = tagsRef.current;
    if (host) {
      const tags = [...host.children] as TagEl[];
      posed.anchors.forEach((a, i) => {
        const tag = tags[i];
        if (!tag) return;
        const b = tag.children[0] as HTMLElement, v = tag.children[1] as HTMLElement;
        const val = p.splitLabel(a.t);
        if (b.textContent !== a.t) { b.textContent = a.t; tag._w = 0; }
        if (v.textContent !== val) { v.textContent = val; tag._w = 0; }
        placeTag(tag, cam, a, posed.ctr, rect.width, rect.height, a.front > 0 ? s.tagOn : 0, 1.5);
        tag._wt = a.w;
      });
      resolveTags(tags, rect.width, rect.height, { top: 10, bottom: 24 });
    }
    // drop label
    const dt = dtag.current;
    if (dt) {
      const pr = project(cam, [drop.p[0] + drop.r + 0.05, drop.p[1], drop.p[2]], rect.width, rect.height);
      if (dt.textContent !== p.label) dt.textContent = p.label;
      const show = (s.ph === "amount" || s.ph === "approve" || s.ph === "err") && p.amount > 0;
      dt.style.opacity = show ? "0.9" : "0";
      dt.style.color = p.amount >= 5 ? "var(--ink)" : "var(--dim)";
      dt.style.transform = `translate3d(${pr[0] + 6}px,${pr[1] - 9}px,0)`;
    }
    return {
      cam,
      drops: [...posed.drops, drop],
      o: { t: T, zone: posed.zone, k2: s.k2, wob, shim: s.shim, shimPos: s.shimPos, rip: s.rip, tail, light: [0, BASE_Y + 0.05, 0.35, s.glow] },
    };
  });

  return (
    <div ref={ref} className={className ?? "tr-stage"} aria-hidden>
      <div ref={tagsRef} className="absolute inset-0">
        {recipe.weights.map((w) => (
          <div key={w.ticker} className="a-tag">
            <b />
            <span className="v num" />
          </div>
        ))}
      </div>
      <div ref={dtag} className="tr-dtag tick" />
    </div>
  );
}

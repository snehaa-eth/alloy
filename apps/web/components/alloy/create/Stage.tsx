"use client";

/**
 * Creator studio stage (docs/design/artdir/wow/app/create.html): picked stocks drop in as separate liquid drops
 * (an action state, so loose drops are allowed), packed by a tiny soft-body sim; sizes follow the weights.
 * - drag a drop up/down to change its weight
 * - step 4: a 6s loop previews what the chosen style does when the first stock jumps
 * - own money: a cream drop falls in when the amount changes
 * - cast: "running" (real tx in flight) gathers the drops; "fused" (tx confirmed) flashes and fuses them into
 *   the basket's one smooth form, then calls onFused.
 */
import { useEffect, useMemo, useRef } from "react";
import type { StrategyMode } from "@/lib/types";
import { useMetalRegion } from "../metal/MetalCanvas";
import { bump, clamp, damp, easeInOut, easeOut, lerp, project, ss, type Cam, type V3 } from "../metal/math";
import { tintFor } from "../metal/palette";
import { posedDrops, shapeFromRecipe, type Drop } from "../metal/shape";
import { CREAM, drop, formSpec, looseSpec } from "../states/kit";

export type StagePick = { t: string; w: number };
export type CastPhase = "edit" | "running" | "fused";

type D = { t: string; p: V3; v: V3; r: number; die: boolean; landed: boolean };

const baseR = (w: number) => Math.max(0.2, (0.95 * Math.sqrt(Math.max(0, w) / 100) + 0.05) * 0.95);

/** first pick jumps; the style decides what happens next (radius multipliers, phase 0..1 of a 6s loop) */
function styleMul(isJump: boolean, ph: number, style: StrategyMode) {
  const jump = ss(0.12, 0.3, ph) * (1 - ss(0.86, 0.98, ph));
  const resp = ss(0.45, 0.62, ph) * (1 - ss(0.86, 0.98, ph));
  const turn = ss(0.66, 0.8, ph) * (1 - ss(0.86, 0.98, ph));
  if (isJump) {
    let m = 1 + 0.3 * jump;
    if (style === "balanced") m -= 0.3 * resp * 0.97;
    if (style === "trend-aware") m -= 0.14 * turn;
    return m;
  }
  let m = 1 - 0.04 * jump;
  if (style === "balanced") m += 0.04 * resp;
  if (style === "trend-aware") m += 0.02 * turn;
  return m;
}

export function previewLine(style: StrategyMode, j: string, w: number, ph: number) {
  if (ph < 0.45) return `${j} jumps 30%`;
  if (style === "balanced") return `${j} moved back to ${w}%.`;
  if (style === "trend-aware") return ph < 0.66 ? `${j} keeps riding while it rises.` : `It turns, so some profit is taken.`;
  return `${j} keeps its bigger share.`;
}

export function Stage({
  picks,
  style,
  previewOn,
  previewStyle,
  seedKey,
  seedUsd,
  phase,
  hidden,
  recipeSeed,
  onWeight,
  onFused,
  onPreview,
  children,
}: {
  picks: StagePick[];
  style: StrategyMode | null;
  previewOn: boolean;
  previewStyle: StrategyMode;
  seedKey: number;
  seedUsd: number;
  phase: CastPhase;
  /** stop drawing (the live card covers the page) */
  hidden?: boolean;
  recipeSeed: string;
  onWeight: (t: string, w: number) => void;
  onFused: () => void;
  onPreview?: (s: { style: StrategyMode; line: string } | null) => void;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const grabRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const live = useRef({ picks, style, previewOn, previewStyle, phase, seedUsd, hidden });
  live.current = { picks, style, previewOn, previewStyle, phase, seedUsd, hidden };
  const sim = useRef({
    drops: new Map<string, D>(),
    camZ: 5.8,
    arcW: 0,
    cam: null as Cam | null,
    rip: 0,
    shim: 0,
    glow: 0,
    pv: 0,
    pvStyle: previewStyle,
    own: null as null | { t: number; r: number },
    cast: null as null | { t: number; flashed: boolean; done: boolean },
    empty: 1,
    grab: null as null | { t: string; y: number; w0: number },
    lastPv: "",
  });
  const cb = useRef({ onWeight, onFused, onPreview });
  cb.current = { onWeight, onFused, onPreview };

  // spawn / retire drops as picks change
  const key = picks.map((p) => p.t).join(",");
  useEffect(() => {
    const s = sim.current;
    picks.forEach((p, n) => {
      if (!s.drops.has(p.t) || s.drops.get(p.t)!.die) {
        const side = n % 2 ? 1 : -1;
        s.drops.set(p.t, { t: p.t, p: [side * 0.3, 3.2, ((n % 3) - 1) * 0.18], v: [0, -3, 0], r: 0.05, die: false, landed: false });
      }
    });
    s.drops.forEach((d) => {
      if (!picks.some((p) => p.t === d.t) && !d.die) {
        d.die = true;
        d.v = [(d.p[0] >= 0 ? 1 : -1) * 5, 1.2, 0];
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // own money: a cream drop falls in when the amount settles
  useEffect(() => {
    if (seedKey === 0 || seedUsd < 1) return;
    const id = window.setTimeout(() => (sim.current.own = { t: 0, r: clamp(0.14 + Math.sqrt(seedUsd) / 80, 0.16, 0.36) }), 350);
    return () => window.clearTimeout(id);
  }, [seedKey, seedUsd]);

  // cast: start the fuse when the tx confirms
  useEffect(() => {
    const s = sim.current;
    if (phase === "fused" && !s.cast) s.cast = { t: 0, flashed: false, done: false };
    if (phase === "edit") s.cast = null;
  }, [phase]);

  const finalRecipe = useMemo(
    () => ({ weights: picks.map((p) => ({ ticker: p.t, w: Math.max(0.0001, p.w / 100) })), style: style ?? "balanced", seed: recipeSeed }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, picks.map((p) => p.w).join(","), style, recipeSeed],
  );
  const finalShape = useMemo(() => shapeFromRecipe(finalRecipe), [finalRecipe]);

  useMetalRegion(ref, ({ rect, T, dt, phone, mouse, reduced }) => {
    const s = sim.current;
    const L = live.current;
    if (L.hidden) return null;
    const tags = tagsRef.current;
    // camera distance follows total size
    const asp = rect.width / rect.height;
    s.camZ = damp(s.camZ, Math.max(phone ? 6.2 : 5.4, (s.arcW / 2 + (phone ? 0.75 : 1.1)) / (0.42 * asp)), 0.2, dt);
    const cam: Cam = { ro: [mouse[0] * 0.25, 0.35 + mouse[1] * 0.15, s.camZ], ta: [0, phone ? 0.55 : -0.1, 0], tan: 0.42 };
    s.cam = cam;

    // style preview loop
    const show = L.previewOn && L.picks.length >= 1 && !s.cast && L.phase === "edit";
    if (show && !reduced) {
      s.pv += dt / 6;
      if (s.pv >= 1) s.pv = 0;
    } else s.pv = 0;
    const sty = L.style ?? L.previewStyle;
    const j = L.picks[0]?.t;
    const line = show && s.pv > 0.1 && s.pv < 0.95 ? previewLine(sty, j!, L.picks[0].w, s.pv) : "";
    if (line !== s.lastPv) {
      s.lastPv = line;
      cb.current.onPreview?.(line ? { style: sty, line } : null);
    }

    // radii follow the weights (the style preview grows the jumping stock)
    const list = [...s.drops.values()];
    for (const d of list) {
      const p = L.picks.find((x) => x.t === d.t);
      let tr = d.die || !p ? 0 : baseR(p.w);
      if (show && p) tr *= styleMul(p.t === j, s.pv, sty);
      d.r = damp(d.r, tr, d.die ? 0.004 : 0.006, dt);
      if (d.die && d.r < 0.02) s.drops.delete(d.t);
    }
    const alive = L.picks.map((p) => s.drops.get(p.t)).filter((d): d is D => !!d && !d.die);
    // At rest the drops never touch: one gentle arc across the stage, clear gaps sized by weight.
    // Only while the cast is running do they rush to the centre (and fuse once it confirms).
    const gather = L.phase === "running" ? 1 : 0;
    const GAP = phone ? 0.42 : 0.5;
    const W = alive.reduce((a, d) => a + 2 * Math.max(d.r, 0.2), 0) + GAP * Math.max(0, alive.length - 1);
    s.arcW = W;
    let x = -W / 2;
    alive.forEach((d, i) => {
      const r = Math.max(d.r, 0.2);
      const cx = x + r;
      x += 2 * r + GAP;
      const u = W > 0 ? cx / (W / 2 + 1e-3) : 0;
      const bob = reduced ? 0 : Math.sin(T * 1.1 + i * 1.7) * 0.05;
      const rest: V3 = [cx, (phone ? 0.3 : -0.05) + 0.28 * (1 - u * u) + bob, -0.2 * u * u];
      const k = gather ? 0 : 1;
      const tgt: V3 = [rest[0] * k, gather ? (phone ? 0.3 : -0.05) : rest[1], rest[2] * k];
      for (let c = 0; c < 3; c++) {
        d.v[c] += (tgt[c] - d.p[c]) * (gather ? 26 : 18) * dt;
        d.v[c] *= Math.pow(0.004, dt);
        d.p[c] += d.v[c] * dt;
      }
      if (!d.landed && Math.abs(d.p[1] - rest[1]) < 0.15) {
        d.landed = true;
        s.rip = 1;
        s.shim = Math.max(s.shim, 0.6);
      }
    });
    for (const d of list.filter((q) => q.die)) {
      d.v[1] -= 9 * dt;
      for (let c = 0; c < 3; c++) d.p[c] += d.v[c] * dt;
    }
    s.rip = damp(s.rip, 0, 0.25, dt);
    s.shim = damp(s.shim, 0, 0.3, dt);

    // own money drop
    const extra: Drop[] = [];
    if (s.own) {
      s.own.t += dt;
      const f = clamp(s.own.t / 0.8);
      extra.push(drop([0.1, lerp(3, 0, f * f), 0.3], s.own.r * (1 - ss(0.8, 1, f)), CREAM));
      if (f >= 1 && s.own.t < 0.85) {
        s.rip = 1;
        s.shim = 1;
      }
      if (s.own.t > 1.2) s.own = null;
    }

    // tags (ticker + live weight) and the drag hint
    if (tags) {
      const W = rect.width, H = rect.height;
      for (const el of Array.from(tags.children) as HTMLElement[]) {
        const t = el.dataset.t!;
        const d = s.drops.get(t);
        if (!d) {
          el.style.opacity = "0";
          continue;
        }
        const idx = L.picks.findIndex((x) => x.t === t);
        const above = !phone && L.picks.length >= 4 && idx % 2 === 1;
        const pr = project(cam, [d.p[0], d.p[1] + (above ? d.r : -d.r), d.p[2]], W, H);
        const tw = el.offsetWidth;
        const x = clamp(pr[0] - tw / 2, 6, W - tw - 6);
        const y = clamp(pr[1] + (above ? -26 : 10), phone ? 84 : 96, H - (phone ? 58 : 84));
        el.style.transform = `translate3d(${x}px,${y}px,0)`;
        el.style.opacity = String(d.die || s.cast || L.phase === "running" ? 0 : ss(0.2, 0.4, d.r));
        const p = L.picks.find((x) => x.t === t);
        let wv = p?.w ?? 0;
        if (show && p) {
          const sum = L.picks.reduce((a, u) => a + u.w * styleMul(u.t === j, s.pv, sty) ** 2, 0) || 1;
          wv = Math.round(((p.w * styleMul(p.t === j, s.pv, sty) ** 2) / sum) * 100);
        }
        const v = el.querySelector<HTMLElement>(".v");
        if (v && v.textContent !== `${wv}%`) v.textContent = `${wv}%`;
      }
    }
    const g = grabRef.current;
    if (g) {
      const d = s.grab ? s.drops.get(s.grab.t) : null;
      if (d && s.grab) {
        const pr = project(cam, [d.p[0], d.p[1] + d.r, d.p[2]], rect.width, rect.height);
        g.style.left = `${pr[0]}px`;
        g.style.top = `${pr[1] - 10}px`;
        g.textContent = `↕ ${s.grab.t} ${L.picks.find((x) => x.t === s.grab!.t)?.w ?? 0}%`;
        g.style.opacity = "1";
      } else g.style.opacity = "0";
    }

    // empty mould ghost
    s.empty = damp(s.empty, L.picks.length || s.cast ? 0 : 1, L.picks.length ? 0.02 : 0.1, dt);

    // cast
    let sep = 0;
    s.glow = damp(s.glow, 0, 0.2, dt);
    if (L.phase === "running" && !reduced) sep = -0.08 + Math.sin(T * 3) * 0.04;
    if (s.cast) {
      const c = s.cast;
      c.t += dt;
      sep = 0.55 * easeOut(ss(0, 0.5, c.t)) * (1 - easeInOut(ss(0.5, 0.78, c.t)));
      if (c.t > 0.78 && !c.flashed) {
        c.flashed = true;
        flashRef.current?.animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.18 }, { opacity: 0 }], { duration: 1300, easing: "cubic-bezier(.16,1,.3,1)" });
        ringRef.current?.animate([{ opacity: 0.9, transform: "scale(1)" }, { opacity: 0, transform: "scale(22)" }], { duration: 1600, easing: "cubic-bezier(.16,1,.3,1)" });
        s.rip = 1.4;
        s.shim = 1.2;
      }
      if (c.t > 2.3 && !c.done) {
        c.done = true;
        cb.current.onFused();
      }
      if (c.t > 0.8) {
        // fused: the one smooth form, growing out of the flash
        const grow = easeOut(ss(0.8, 1.6, c.t));
        const R = 1.25 * Math.cbrt(alive.reduce((a, d) => a + d.r ** 3, 0) || 0.2);
        const posed = posedDrops(finalShape, { ang: Math.sin(c.t * 0.4) * 0.5, rs: R * lerp(0.85, 1, grow), t: T });
        return formSpec(cam, posed, [], { t: T, rip: s.rip, shim: s.shim, shimPos: lerp(2.6, -2.6, 1 - Math.min(1, s.shim)), glow: bump(0.7, 1.6, c.t) * 1.2 });
      }
    }
    const ds: (Drop | null)[] = [...alive]
      .sort((a, b) => b.r - a.r)
      .slice(0, 6 - extra.length)
      .map((d) => drop([d.p[0] * (1 + sep), d.p[1] * (1 + sep), d.p[2]], d.r, tintFor(d.t)));
    for (const d of list.filter((x) => x.die && s.drops.has(x.t)).slice(0, Math.max(0, 6 - extra.length - ds.length))) ds.push(drop(d.p, d.r, tintFor(d.t)));
    ds.push(...extra);
    if (s.empty > 0.02 && !ds.length)
      return looseSpec(cam, [drop([0, (phone ? 1.2 : 0.25) + Math.sin(T * 1.2) * 0.08, 0], 0.42 * s.empty, CREAM)], { t: T, k: 0.3, tint: 0.1, wob: 2, alpha: 0.55 * s.empty });
    return looseSpec(cam, ds, { t: T, k: L.phase === "running" ? 0.4 : 0.26, tint: 0.28, rip: s.rip, shim: s.shim, shimPos: lerp(2.6, -2.6, 1 - Math.min(1, s.shim)), wob: 1 + s.rip * 0.8, glow: s.glow + (L.phase === "running" ? 0.3 + Math.sin(T * 3) * 0.15 : 0) });
  });

  // drag a drop up/down to resize it
  const pickAt = (x: number, y: number) => {
    const s = sim.current;
    const el = ref.current;
    if (!el || !s.cam) return null;
    const r = el.getBoundingClientRect();
    let best: string | null = null, bd = 1e9;
    s.drops.forEach((d) => {
      if (d.die) return;
      const c = project(s.cam!, d.p, r.width, r.height);
      const e = project(s.cam!, [d.p[0] + d.r, d.p[1], d.p[2]], r.width, r.height);
      const rr = Math.abs(e[0] - c[0]);
      const dist = Math.hypot(x - r.left - c[0], y - r.top - c[1]);
      if (dist < rr * 1.05 && dist < bd) {
        bd = dist;
        best = d.t;
      }
    });
    return best;
  };

  return (
    <div
      className="cs-stage"
      onPointerDown={(e) => {
        if (live.current.phase !== "edit") return;
        const t = pickAt(e.clientX, e.clientY);
        if (!t) return;
        sim.current.grab = { t, y: e.clientY, w0: live.current.picks.find((p) => p.t === t)?.w ?? 0 };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        (e.currentTarget as HTMLElement).style.cursor = "ns-resize";
      }}
      onPointerMove={(e) => {
        const g = sim.current.grab;
        const el = e.currentTarget as HTMLElement;
        if (!g) {
          el.style.cursor = pickAt(e.clientX, e.clientY) ? "grab" : "default";
          return;
        }
        const nw = clamp(Math.round(g.w0 + (g.y - e.clientY) / 2.2), 0, 100);
        cb.current.onWeight(g.t, nw);
      }}
      onPointerUp={(e) => {
        sim.current.grab = null;
        (e.currentTarget as HTMLElement).style.cursor = "default";
      }}
      onPointerCancel={() => (sim.current.grab = null)}
    >
      <div ref={ref} className="absolute inset-0" aria-hidden />
      {children}
      <div ref={tagsRef} aria-hidden>
        {picks.map((p) => (
          <div key={p.t} data-t={p.t} className="cs-tg" style={{ opacity: 0 }}>
            <b>{p.t}</b>
            <span className="v num">{p.w}%</span>
          </div>
        ))}
      </div>
      <div ref={grabRef} className="cs-grab num" aria-hidden />
      <div ref={ringRef} className="cs-ring" aria-hidden />
      <div ref={flashRef} className="cs-flash" aria-hidden />
    </div>
  );
}

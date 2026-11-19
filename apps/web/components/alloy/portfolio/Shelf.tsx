"use client";

/**
 * "Your shelf": every holding as one smooth metal pebble, sized by value, resting on a reflective floor
 * (docs/design/artdir/wow/app/portfolio.html).
 *
 * The shared renderer draws each region into its own scissor rect with no blending, so regions must not
 * overlap. Each pebble therefore owns a slot: the form above the floor line, and a faint mirrored pass in
 * the rect below it (faded by a DOM gradient). Each camera is solved so the floor lands exactly on the
 * slot edge; all slots share one zoom so sizes compare honestly. Contact shadows and labels are DOM.
 */
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useMetalRegion, type FrameInfo } from "../metal/MetalCanvas";
import { clamp, damp, easeOut, lerp, project, type Cam, type V3 } from "../metal/math";
import { shapeFromRecipe, type Recipe } from "../metal/shape";
import { CREAM, drop, formSpec, looseSpec, mirror, restOn, SILVER } from "../states/kit";
import { pctText, signCls } from "../states/recipe";

export type ShelfItem = { key: string; recipe: Recipe; value: number; name: string; valueText: string; dayBps: number | null };

const FLOOR = -1.05;
const TAN = 0.42;
/** pebble footprint (world units) per unit of scale, and the gap between pebbles */
const FOOT = 2.2;
const GAP = 1.0;

/** Camera at distance z, `rise` above its target, aimed so world point [0, FLOOR, 0] lands at screen y = edgeY (px). */
function solveCam(z: number, w: number, h: number, edgeY: number, tan: number, mx: number, rise = 0.8): Cam {
  let lo = FLOOR - 8, hi = FLOOR + 12;
  let c: Cam = { ro: [mx, 0, z], ta: [0, 0, 0], tan };
  for (let k = 0; k < 28; k++) {
    const ty = (lo + hi) / 2;
    c = { ro: [mx, ty + rise, z], ta: [0, ty, 0], tan };
    const y = project(c, [0, FLOOR, 0], w, h)[1];
    // raising the target moves the floor point down the screen
    if (y < edgeY) lo = ty;
    else hi = ty;
  }
  return c;
}

type Geo = { ppu: number; z: number; up: number; down: number };

/** Shared zoom from the shelf size: biggest pebble ≈ 30% of the upper height, everything fits the width. */
function useGeo(ref: React.RefObject<HTMLElement | null>, scales: number[]) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const key = scales.map((s) => s.toFixed(3)).join(",");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => {
      const W = el.clientWidth, H = el.clientHeight;
      const phone = window.innerWidth < 760;
      const up = Math.round(H * (phone ? 0.7 : 0.68));
      const total = scales.reduce((a, s) => a + FOOT * s, 0) + GAP * Math.max(0, scales.length - 1) * (phone ? 0.35 : 1);
      const ppu = Math.min(up * (phone ? 0.36 : 0.3), (W * (phone ? 0.94 : 0.86)) / Math.max(total, 1e-3));
      setGeo({ ppu, z: up / (2 * TAN * ppu), up, down: H - up });
    };
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, key]);
  return geo;
}

function Pebble({ it, i, scale, geo, onPick }: { it: ShelfItem; i: number; scale: number; geo: Geo; onPick?: (key: string) => void }) {
  const up = useRef<HTMLDivElement>(null);
  const down = useRef<HTMLDivElement>(null);
  const sh = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(it.recipe);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shape = useMemo(() => shapeFromRecipe(it.recipe), [key]);
  const s = useRef({ ang: i * 1.4, lift: 0, hov: 0, enter: -1, grow: 0, posed: null as ReturnType<typeof restOn> | null });
  const geoRef = useRef(geo);
  geoRef.current = geo;

  useMetalRegion(up, (f: FrameInfo) => {
    const st = s.current;
    const g = geoRef.current;
    if (st.enter < 0) st.enter = f.T;
    st.lift = damp(st.lift, st.hov, 0.02, f.dt);
    if (!f.reduced) st.ang += f.dt * (0.22 + st.lift * 0.6);
    st.grow = f.reduced ? 1 : easeOut(clamp((f.T - st.enter) * 1.2 - i * 0.12));
    const rs = scale * Math.max(0.02, st.grow);
    const c = solveCam(g.z, f.rect.width, f.rect.height, f.rect.height, TAN, f.mouse[0] * 0.3);
    st.posed = restOn(shape, { cx: 0, floor: FLOOR, rs, ang: Math.sin(st.ang) * 0.55, t: f.T + i * 3, lift: st.lift * 0.22 });
    if (sh.current) {
      const half = Math.abs(project(c, [1.0 * rs, FLOOR, 0], f.rect.width, f.rect.height)[0] - f.rect.width / 2);
      const w = half * 2 * (1 - st.lift * 0.25);
      sh.current.style.cssText = `width:${w}px;height:${w * 0.14}px;margin-left:${-w / 2}px;margin-top:${-w * 0.07}px;opacity:${st.grow * (1 - st.lift * 0.5)}`;
    }
    return formSpec(c, st.posed, [], { t: f.T + i * 3, shim: st.lift * 0.5, shimPos: lerp(-2.4, 2.4, (f.T * 0.25 + i * 0.3) % 1), zt: 0.5 + st.lift * 0.12 });
  });
  useMetalRegion(down, (f: FrameInfo) => {
    const st = s.current;
    const g = geoRef.current;
    if (!st.posed) return null;
    // same pixel scale as the upper slot: the field of view shrinks with the rect height
    const c = solveCam(g.z, f.rect.width, f.rect.height, 0, (TAN * f.rect.height) / g.up, f.mouse[0] * 0.3);
    return formSpec(c, mirror(st.posed, FLOOR), [], { t: f.T + i * 3, alpha: 0.22, zt: 0.45 });
  });

  const w = Math.ceil(FOOT * scale * geo.ppu * 1.12);
  return (
    <div className="pf-slot" style={{ width: w } as CSSProperties}>
      <button
        type="button"
        className="pf-slot__up"
        style={{ height: geo.up }}
        aria-label={`${it.name}, ${it.valueText}`}
        onPointerEnter={() => (s.current.hov = 1)}
        onPointerLeave={() => (s.current.hov = 0)}
        onFocus={() => (s.current.hov = 1)}
        onBlur={() => (s.current.hov = 0)}
        onClick={() => onPick?.(it.key)}
      >
        <div ref={up} className="pf-layer" />
        <div ref={sh} className="pf-cshadow" aria-hidden />
      </button>
      <div className="pf-slot__down" style={{ height: geo.down }}>
        <div ref={down} className="pf-layer" aria-hidden />
        <div className="pf-lab">
          <b>{it.name}</b>
          <span className="num">
            {it.valueText}
            {it.dayBps !== null && <span className={`ml-1.5 ${signCls(it.dayBps)}`}>{pctText(it.dayBps)}</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Shelf({ items, onPick }: { items: ShelfItem[]; onPick?: (key: string) => void }) {
  const ref = useRef<HTMLElement>(null);
  const max = Math.max(...items.map((x) => x.value), 1e-9);
  const scales = items.map((x) => Math.max(0.42, 1.18 * Math.pow(x.value / max, 0.42)));
  const geo = useGeo(ref, scales);
  return (
    <section ref={ref} className="pf-shelf" aria-label="Your baskets on the shelf">
      {geo && (
        <>
          <div className="pf-floor" style={{ top: geo.up }} aria-hidden />
          <div className="pf-row-slots" style={{ gap: Math.round(GAP * geo.ppu * (typeof window !== "undefined" && window.innerWidth < 760 ? 0.35 : 1) * 0.5) }}>
            {items.map((it, i) => (
              <Pebble key={it.key} it={it} i={i} scale={scales[i]} geo={geo} onPick={onPick} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/**
 * Empty shelf: one drop waiting above the floor (cream when signed in, silver when signed out).
 * `dip` pulls it down a little (hovering the CTA), like a drip about to fall.
 */
export function EmptyShelf({ dip, silver }: { dip: boolean; silver?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const up = useRef<HTMLDivElement>(null);
  const down = useRef<HTMLDivElement>(null);
  const geo = useGeo(ref, [1]);
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const s = useRef({ y: 0, v: 0, cy: 0 });
  const dipRef = useRef(dip);
  dipRef.current = dip;
  const col = silver ? SILVER : CREAM;
  const R = 0.78;
  useMetalRegion(up, (f) => {
    const g = geoRef.current;
    if (!g) return null;
    const st = s.current;
    st.v += ((dipRef.current ? -0.55 : 0) - st.y) * f.dt * 14;
    st.v *= Math.pow(0.02, f.dt);
    st.y += st.v * f.dt;
    st.cy = FLOOR + R + 0.35 + (f.reduced ? 0 : Math.sin(f.T * 1.1) * 0.12) + st.y;
    const c = solveCam(g.z * 0.9, f.rect.width, f.rect.height, f.rect.height, TAN, f.mouse[0] * 0.3);
    return looseSpec(c, [drop([0, st.cy, 0], R, col)], { t: f.T, k: 0.3, tint: 0.15, wob: 2.2 });
  });
  useMetalRegion(down, (f) => {
    const g = geoRef.current;
    if (!g) return null;
    const c = solveCam(g.z * 0.9, f.rect.width, f.rect.height, 0, (TAN * f.rect.height) / g.up, f.mouse[0] * 0.3);
    return looseSpec(c, [drop([0, 2 * FLOOR - s.current.cy, 0] as V3, R, col)], { t: f.T, k: 0.3, tint: 0.15, alpha: 0.22 });
  });
  return (
    <section ref={ref} className="pf-shelf pf-shelf--empty" aria-hidden>
      {/* the metal divs mount with the section (regions register on mount), sized once the geometry is known */}
      {geo && <div className="pf-floor" style={{ top: geo.up }} />}
      <div className="pf-row-slots">
        <div className="pf-slot" style={{ width: geo ? Math.min(420, Math.round(geo.up * 1.2)) : 0 }}>
          <div className="pf-slot__up" style={{ height: geo?.up ?? 0 }}>
            <div ref={up} className="pf-layer" />
          </div>
          <div className="pf-slot__down" style={{ height: geo?.down ?? 0 }}>
            <div ref={down} className="pf-layer" />
          </div>
        </div>
      </div>
    </section>
  );
}

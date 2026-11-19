"use client";

/**
 * <MetalCanvasProvider>: ONE fixed WebGL canvas per page, shared by every metal region.
 * - Regions register an element + a render fn; each frame they get a viewport + scissor on the shared canvas.
 * - Offscreen culling (getBoundingClientRect per region), DPR scaling (1x at DPR 1, 0.75x on high-DPI,
 *   0.7x on phones + 52 raymarch steps instead of 80), pauses when the tab is hidden.
 * - The GL context is created lazily, on the first region: pages without metal pay nothing.
 * - No WebGL → `supported === false`, regions render their static CSS fallback.
 * - prefers-reduced-motion: no continuous loop; frames render on scroll / resize / invalidate, time frozen.
 * - Modal layer (useMetalModal): while a sheet is open the canvas rises above it (z 60); regions inside the sheet
 *   (`modal: true`) draw normally, every other region is clipped to the area the sheet leaves visible and dimmed
 *   like the scrim (designer buy.html: #gl over the sheet, backdrop sculpture at alpha .3).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Cam } from "./math";
import { damp } from "./math";

import { MetalRenderer, type DrawOpts } from "./renderer";
import type { Drop } from "./shape";

export type FrameInfo = {
  /** region rect (CSS px, viewport space) */
  rect: DOMRect;
  /** seconds of animation time (frozen under reduced motion) */
  T: number;
  dt: number;
  W: number;
  H: number;
  /** pointer in [-1, 1], smoothed */
  mouse: [number, number];
  phone: boolean;
  reduced: boolean;
};
export type RenderSpec = { cam: Cam; drops: (Drop | null | undefined)[]; o: DrawOpts };
export type Region = {
  el: HTMLElement;
  render: (f: FrameInfo) => RenderSpec | null;
  /** optional clip rect [l, t, r, b] in CSS px */
  clip?: () => [number, number, number, number] | null;
  /** lives inside the open modal sheet (drawn normally while the modal layer is up) */
  modal?: boolean;
};
type Tick = (f: Omit<FrameInfo, "rect">) => void;

type Ctx = {
  register: (r: Region) => () => void;
  /** raise the canvas over a modal sheet element (null = back under the page) */
  setModal: (el: HTMLElement | null) => () => void;
  addTick: (t: Tick) => () => void;
  invalidate: () => void;
  supported: boolean | null;
};

const MetalCtx = createContext<Ctx | null>(null);
export const useMetal = () => useContext(MetalCtx);

const PHONE = () => window.innerWidth < 760;

export function MetalCanvasProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const regions = useRef<Set<Region>>(new Set());
  const ticks = useRef<Set<Tick>>(new Set());
  const modal = useRef<HTMLElement | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const engine = useRef<{
    r: MetalRenderer | null;
    raf: number;
    scale: number;
    T: number;
    last: number;
    mouse: [number, number];
    mouseS: [number, number];
    reduced: boolean;
    started: boolean;
    dirty: boolean;
  }>({ r: null, raf: 0, scale: 1, T: 0, last: 0, mouse: [0, 0], mouseS: [0, 0], reduced: false, started: false, dirty: true });

  const frame = useCallback((now: number) => {
    const e = engine.current;
    e.raf = 0;
    const dt = Math.min(0.05, Math.max(0, (now - e.last) / 1000));
    e.last = now;
    if (!e.reduced) e.T += dt;
    const W = window.innerWidth, H = window.innerHeight, phone = PHONE();
    e.mouseS = e.reduced ? [0, 0] : [damp(e.mouseS[0], e.mouse[0], 0.03, dt), damp(e.mouseS[1], e.mouse[1], 0.03, dt)];
    const base = { T: e.T, dt, W, H, mouse: e.mouseS, phone, reduced: e.reduced };
    ticks.current.forEach((t) => t(base));
    const r = e.r;
    const cv = canvasRef.current;
    if (r && cv) {
      r.clear(cv.width, cv.height);
      const s = e.scale;
      // Never draw under a solid (blurred) nav: clip every region to below it.
      const nav = document.querySelector<HTMLElement>('header.a-nav[data-solid="true"]');
      const navB = nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0;
      const m = modal.current && modal.current.isConnected ? modal.current : null;
      const mr = m ? m.getBoundingClientRect() : null;
      cv.style.zIndex = m ? "60" : "";
      regions.current.forEach((reg) => {
        if (!reg.el.isConnected) return;
        const rc = reg.el.getBoundingClientRect();
        if (rc.bottom < 0 || rc.top > H || rc.right < 0 || rc.left > W || rc.width < 2 || rc.height < 2) return; // culled
        const spec = reg.render({ ...base, rect: rc });
        if (!spec) return;
        const view = [Math.round(rc.left * s), Math.round((H - rc.bottom) * s), Math.round(rc.width * s), Math.round(rc.height * s)];
        let cl = [Math.max(rc.left, 0), Math.max(rc.top, reg.modal && m ? 0 : navB), Math.min(rc.right, W), Math.min(rc.bottom, H)];
        const clip = reg.clip?.();
        if (clip) cl = [Math.max(cl[0], clip[0]), Math.max(cl[1], clip[1]), Math.min(cl[2], clip[2]), Math.min(cl[3], clip[3])];
        if (mr && !reg.modal) {
          // behind the sheet: only the part the sheet leaves visible (left of a side sheet, above a bottom sheet), dimmed
          const side = mr.left > W * 0.3;
          cl = side ? [cl[0], cl[1], Math.min(cl[2], mr.left - 1), cl[3]] : [cl[0], cl[1], cl[2], Math.min(cl[3], mr.top - 1)];
          spec.o = { ...spec.o, alpha: (spec.o.alpha ?? 1) * 0.3 };
        }
        if (cl[2] <= cl[0] || cl[3] <= cl[1]) return;
        const sc = [Math.round(cl[0] * s), Math.round((H - cl[3]) * s), Math.round((cl[2] - cl[0]) * s), Math.round((cl[3] - cl[1]) * s)];
        r.draw(view, sc, spec.cam, spec.drops, spec.o);
      });
    }
    e.dirty = false;
    // Keep looping while anything is registered and the tab is visible (reduced motion: on demand only).
    if (!e.reduced && document.visibilityState === "visible" && (regions.current.size || ticks.current.size)) e.raf = requestAnimationFrame(frame);
  }, []);

  const kick = useCallback(() => {
    const e = engine.current;
    if (!e.raf && document.visibilityState === "visible") {
      e.last = performance.now();
      e.raf = requestAnimationFrame(frame);
    }
  }, [frame]);

  const resize = useCallback(() => {
    const e = engine.current;
    const cv = canvasRef.current;
    if (!cv || !e.r) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const phone = PHONE();
    e.scale = phone ? dpr * 0.7 : dpr * (dpr > 1.5 ? 0.75 : 1);
    cv.width = Math.round(window.innerWidth * e.scale);
    cv.height = Math.round(window.innerHeight * e.scale);
    if (!e.r.build(phone ? 52 : 80)) setSupported(false);
  }, []);

  /** Lazily create the GL context on first use. */
  const ensure = useCallback(() => {
    const e = engine.current;
    if (e.started) return;
    e.started = true;
    const cv = canvasRef.current;
    const r = cv ? MetalRenderer.create(cv) : null;
    if (!r) {
      setSupported(false);
      return;
    }
    e.r = r;
    resize();
    setSupported(e.r ? true : false);
  }, [resize]);

  const register = useCallback(
    (reg: Region) => {
      regions.current.add(reg);
      ensure();
      kick();
      return () => {
        regions.current.delete(reg);
        kick(); // one more frame clears the region
      };
    },
    [ensure, kick],
  );
  const setModal = useCallback(
    (el: HTMLElement | null) => {
      modal.current = el;
      kick();
      return () => {
        if (modal.current === el) modal.current = null;
        const cv = canvasRef.current;
        if (cv && !modal.current) cv.style.zIndex = "";
        kick();
      };
    },
    [kick],
  );
  const addTick = useCallback(
    (t: Tick) => {
      ticks.current.add(t);
      kick();
      return () => {
        ticks.current.delete(t);
      };
    },
    [kick],
  );

  useEffect(() => {
    const e = engine.current;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    e.reduced = mq.matches;
    const onMq = () => {
      e.reduced = mq.matches;
      kick();
    };
    const onMove = (ev: PointerEvent) => {
      e.mouse = [(ev.clientX / window.innerWidth) * 2 - 1, -((ev.clientY / window.innerHeight) * 2 - 1)];
    };
    let rt = 0;
    const onResize = () => {
      window.clearTimeout(rt);
      rt = window.setTimeout(() => {
        resize();
        kick();
      }, 120);
    };
    const onVis = () => {
      if (document.visibilityState === "visible") kick();
      else if (e.raf) {
        cancelAnimationFrame(e.raf);
        e.raf = 0;
      }
    };
    const onScroll = () => {
      if (e.reduced) kick();
    };
    const cv = canvasRef.current;
    const onLost = (ev: Event) => {
      ev.preventDefault();
      if (e.raf) cancelAnimationFrame(e.raf);
      e.raf = 0;
    };
    const onRestored = () => {
      if (e.r) {
        e.r.steps = 0;
        resize();
        kick();
      }
    };
    mq.addEventListener("change", onMq);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    cv?.addEventListener("webglcontextlost", onLost);
    cv?.addEventListener("webglcontextrestored", onRestored);
    return () => {
      mq.removeEventListener("change", onMq);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      cv?.removeEventListener("webglcontextlost", onLost);
      cv?.removeEventListener("webglcontextrestored", onRestored);
      if (e.raf) cancelAnimationFrame(e.raf);
      e.raf = 0;
    };
  }, [kick, resize]);

  const value = useMemo<Ctx>(() => ({ register, setModal, addTick, invalidate: kick, supported }), [register, setModal, addTick, kick, supported]);
  return (
    <MetalCtx.Provider value={value}>
      <canvas ref={canvasRef} className="a-gl" aria-hidden />
      {children}
    </MetalCtx.Provider>
  );
}

type Layer = { modal: boolean; clip?: () => [number, number, number, number] | null };
const LayerCtx = createContext<Layer>({ modal: false });

/**
 * Every metal region inside draws on the modal layer (over the sheet) and is clipped to `clip` (e.g. the sheet's
 * scroll area), so MetalBasket and custom regions work inside sheets without extra props.
 */
export function MetalLayer({ modal = false, clip, children }: { modal?: boolean; clip?: Layer["clip"]; children: ReactNode }) {
  const v = useMemo(() => ({ modal, clip }), [modal, clip]);
  return <LayerCtx.Provider value={v}>{children}</LayerCtx.Provider>;
}

/** Register a region for the lifetime of the component. `render` may change every render (kept in a ref). */
export function useMetalRegion(ref: RefObject<HTMLElement | null>, render: Region["render"], clip?: Region["clip"], opts?: { modal?: boolean }) {
  const ctx = useMetal();
  const layer = useContext(LayerCtx);
  const fn = useRef(render);
  fn.current = render;
  const clipRef = useRef<Region["clip"]>(undefined);
  clipRef.current = () => {
    const a = clip?.() ?? null, b = layer.clip?.() ?? null;
    if (!a || !b) return a ?? b;
    return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
  };
  const register = ctx?.register;
  const modal = opts?.modal ?? layer.modal;
  useEffect(() => {
    const el = ref.current;
    if (!el || !register) return;
    return register({ el, render: (f) => fn.current(f), clip: () => clipRef.current?.() ?? null, modal });
  }, [ref, register, modal]);
  return ctx?.supported ?? null;
}

/**
 * While `active`, lift the shared canvas over the modal element `ref` (a sheet). Regions registered with
 * `{ modal: true }` draw inside it; everything else is clipped beside it and dimmed.
 */
export function useMetalModal(ref: RefObject<HTMLElement | null>, active: boolean) {
  const setModal = useMetal()?.setModal;
  useEffect(() => {
    if (!active || !setModal) return;
    let off: (() => void) | null = null;
    let raf = 0;
    // the sheet mounts in a portal: wait a frame for the element
    const attach = () => {
      if (ref.current) off = setModal(ref.current);
      else raf = requestAnimationFrame(attach);
    };
    attach();
    return () => {
      cancelAnimationFrame(raf);
      off?.();
    };
  }, [ref, active, setModal]);
}

/** Run a callback on every metal frame (DOM work synced with the GL frame: tags, captions, totals). */
export function useMetalFrame(cb: Tick) {
  const ctx = useMetal();
  const fn = useRef(cb);
  fn.current = cb;
  const addTick = ctx?.addTick;
  useEffect(() => {
    if (!addTick) return;
    return addTick((f) => fn.current(f));
  }, [addTick]);
}

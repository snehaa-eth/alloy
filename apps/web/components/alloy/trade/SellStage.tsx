"use client";

/**
 * Sell stage (designer sell.html): your share is a bud on the side of the basket. Picking 25 / 50 / All sizes it.
 * While the real tx runs the bud strains outward, still attached ("hold"); on the receipt the thread thins and lets go
 * ("pinch", metal/actions pinchTail: mirror of the buy teardrop), turns USDC blue ("convert") and rolls into the
 * wallet chip ("send").
 */
import { useMemo, useRef, type ReactNode, type RefObject } from "react";
import { bump, clamp, cross, damp, easeInOut, lerp, norm, project, ss, sub, type Cam, type V3 } from "../metal/math";
import { pinchTail } from "../metal/actions";
import { useMetalFrame, useMetalRegion } from "../metal/MetalCanvas";
import { posedDrops, shapeFromRecipe, type Drop, type Recipe } from "../metal/shape";
import { DUR, type SellVisual } from "./journey";

const FORM_R = 0.95;

/** screen px (inside the region) → world point on the plane z = pz */
function unproject(cam: Cam, sx: number, sy: number, w: number, h: number, pz = 0): V3 {
  const f = norm(sub(cam.ta, cam.ro));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const nx = ((sx / w) * 2 - 1) * cam.tan * (w / h), ny = (1 - (sy / h) * 2) * cam.tan;
  const d = norm([f[0] + r[0] * nx + u[0] * ny, f[1] + r[1] * nx + u[1] * ny, f[2] + r[2] * nx + u[2] * ny]);
  const t = (pz - cam.ro[2]) / d[2];
  return [cam.ro[0] + d[0] * t, cam.ro[1] + d[1] * t, pz];
}

type S = { ph: SellVisual; t: number; pv: number; ox: number; k2: number; tint: number; roll: number; gone: number; q: number; q0: number; lr: number };

export function SellStage({
  recipe,
  p,
  visual,
  label,
  usdc,
  walletRef,
  children,
}: {
  recipe: Recipe;
  /** fraction of your basket being sold, 0..1 */
  p: number;
  visual: SellVisual;
  label: string;
  /** bud turns USDC blue (false: in-kind withdraw keeps it silver) */
  usdc: boolean;
  walletRef: RefObject<HTMLElement | null>;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dtag = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(recipe);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shape = useMemo(() => shapeFromRecipe(recipe), [key]);
  const st = useRef<S>({ ph: visual, t: 0, pv: p, ox: 0.78 + 0.22 * p, k2: 0.9, tint: 0, roll: 0, gone: 0, q: 0, q0: 0, lr: 1 });
  const props = useRef({ p, visual, label, usdc });
  props.current = { p, visual, label, usdc };

  useMetalFrame(({ dt, reduced }) => {
    const s = st.current, P = props.current;
    if (P.visual !== s.ph) {
      if (P.visual === "pinch") s.q0 = s.q;
      s.ph = P.visual;
      s.t = 0;
    }
    s.t += dt;
    const t = s.t;
    const D = (a: number, b: number, k: number) => (reduced ? b : damp(a, b, k, dt));
    s.pv = D(s.pv, P.p, 0.02);
    const rest = P.p > 0.99 ? 0 : Math.cbrt(1 - P.p * 0.7);
    const lr0 = lerp(1, rest, 0.35);
    if (s.ph === "pick" || s.ph === "err") {
      s.q = D(s.q, 0, 0.05);
      s.tint = D(s.tint, 0, 0.05);
      s.roll = 0;
      s.gone = 0;
    } else if (s.ph === "hold") {
      // straining outward while the chain works: approaches q = .32, never lets go
      s.q = 0.32 * (1 - Math.exp(-t * 0.9));
    } else if (s.ph === "pinch") {
      s.q = lerp(s.q0, 1, easeInOut(clamp(t / DUR.pinch)));
    } else if (s.ph === "convert") {
      s.q = 1;
      s.tint = ss(0, 1, t / DUR.convert);
    } else if (s.ph === "send") {
      const q = clamp(t / DUR.send);
      s.q = 1;
      s.tint = P.usdc ? 1 : 0;
      s.roll = easeInOut(q);
      s.gone = ss(0.62, 0.92, q);
    } else if (s.ph === "done") {
      s.gone = 1;
    }
    const pv = s.ph === "pick" ? s.pv : P.p;
    const e = easeInOut(s.q);
    s.ox = s.ph === "pick" || s.ph === "err" ? D(s.ox, 0.78 + 0.22 * pv, 0.03) : lerp(0.78 + 0.22 * P.p, 2.15, e);
    s.k2 = s.ph === "pick" || s.ph === "err" ? 0.9 : lerp(0.9, 0.26, ss(0.1, 0.85, s.q));
    s.lr = s.ph === "pick" || s.ph === "err" ? lerp(1, rest, 0.35 * 1) : lerp(lr0, rest, e);
    if (s.ph === "pick" && P.p <= 0.99) s.lr = lerp(1, Math.cbrt(1 - pv * 0.7), 0.35);
  });

  useMetalRegion(ref, ({ rect, T, phone }) => {
    const s = st.current, P = props.current;
    const cam: Cam = { ro: [0, 0.3, phone ? 6.4 : 5.6], ta: [0, 0, 0], tan: 0.42 };
    const cx = phone ? -1.7 : -1.55;
    const wr = walletRef.current?.getBoundingClientRect();
    const walX = wr ? unproject(cam, wr.left - rect.left + wr.width * 0.5, wr.top - rect.top + wr.height * 0.5, rect.width, rect.height)[0] : 3;
    const pv = s.ph === "pick" ? s.pv : P.p;
    const posed = posedDrops(shape, { ang: 0.3 + Math.sin(T * 0.2) * 0.2, t: T, rs: Math.max(s.lr, 0), off: [cx, 0, 0] });
    // selling everything: the form itself drains away as the bud leaves
    if (P.p > 0.99 && s.ph !== "pick" && s.ph !== "err") posed.drops.forEach((d) => (d.r *= 1 - ss(0, 0.6, s.q)));
    const br = FORM_R * (P.p > 0.99 ? 1 : 0.72 * Math.cbrt(Math.max(pv, 0.001))) * (s.ph === "pick" ? 0.95 : 1) * (1 - s.gone);
    const bx = lerp(cx + s.ox, walX - 0.1, s.roll);
    const bounce = s.roll > 0 ? Math.abs(Math.sin(s.roll * Math.PI * 3)) * 0.28 * (1 - s.roll) : 0;
    const silver: V3 = [0.9, 0.92, 0.95], blue: V3 = [0.36, 0.58, 1];
    const bud: Drop = { p: [bx, -0.1 + bounce - s.gone * 0.05, 0.15], r: br, c: silver.map((v, i) => lerp(v, blue[i], s.tint * 0.9)) as V3 };
    let edge = -1e3;
    for (const d of posed.drops) if (d.r > 0.01) edge = Math.max(edge, d.p[0] + d.r);
    const tl = s.roll === 0 && edge > -1e2 ? pinchTail(s.q, { p: bud.p, r: bud.r }, edge) : null;
    const tail = tl ? { i: 4, ...tl } : null;
    const dt = dtag.current;
    if (dt) {
      const pr = project(cam, [bud.p[0], bud.p[1] + bud.r + 0.12, bud.p[2]], rect.width, rect.height);
      if (dt.textContent !== P.label) dt.textContent = P.label;
      dt.style.opacity = String(s.ph === "done" ? 0 : (1 - s.gone) * 0.95);
      dt.style.transform = `translate3d(calc(${pr[0]}px - 50%),${pr[1] - 30}px,0)`;
    }
    return {
      cam,
      drops: [...posed.drops, bud],
      o: {
        t: T,
        zone: posed.zone,
        k2: s.k2,
        tail,
        shim: s.ph === "convert" ? bump(0, 1, s.t / DUR.convert) * 1.2 : 0,
        shimPos: lerp(-1, 4, clamp(s.t / DUR.convert)),
        rip: s.ph === "pinch" ? bump(0.6, 1, s.t / DUR.pinch) * 0.6 : 0,
      },
    };
  });

  return (
    <div ref={ref} className="tr-stage" aria-hidden>
      <div ref={dtag} className="tr-dtag" />
      {children}
    </div>
  );
}

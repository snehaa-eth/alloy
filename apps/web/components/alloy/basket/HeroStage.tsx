"use client";

/**
 * Basket hero: the basket as one big live metal form, made from its real recipe.
 * Weights: zones sized by today's real holdings (value split). Today: each zone swells / shrinks with its
 * stock's real price move over the last 24h of feed data (tags show the move). Drag to turn.
 */
import { useRef, useState } from "react";
import { useMetalRegion } from "../metal/MetalCanvas";
import { bump, clamp, damp, easeInOut, lerp, ss } from "../metal/math";
import type { BasketStyle } from "../metal/shape";
import { Chips } from "../explore/Chips";
import { camAt, formAt, pctTxt, syncTags } from "./kit";

export function HeroStage({
  tickers,
  now,
  moves,
  style,
  seed,
  hours = 24,
}: {
  /** window of the moves, hours */
  hours?: number;
  tickers: string[];
  /** current value split, fractions (same order as tickers) */
  now: number[];
  /** real 24h price move per stock (fraction) or null when unknown */
  moves: (number | null)[] | null;
  style: BasketStyle;
  seed: string;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const tagBox = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"w" | "t">("w");
  const s = useRef({ m: 0, pulse: 0, drag: 0, dv: 0, t0: -1, dragging: false, lx: 0 });
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const hasToday = !!moves && moves.some((x) => x !== null);
  // basket move today = value-weighted sum of the stocks' moves (only stocks with a known move)
  const day = hasToday ? moves!.reduce<number>((a, x, i) => a + (x ?? 0) * now[i], 0) : null;

  const supported = useMetalRegion(stage, ({ rect, T, dt, mouse, phone, reduced }) => {
    const st = s.current;
    const clock = performance.now();
    if (st.t0 < 0) st.t0 = clock;
    st.m = reduced ? (modeRef.current === "t" ? 1 : 0) : damp(st.m, modeRef.current === "t" ? 1 : 0, 0.02, dt);
    st.pulse = damp(st.pulse, 0, 0.2, dt);
    st.drag += st.dv;
    st.dv *= Math.pow(0.04, dt);
    // let go: ease back to the facing pose (biggest stock toward you), via the nearest full turn
    if (!st.dragging && Math.abs(st.dv) < 0.02) {
      const home = Math.round(st.drag / (Math.PI * 2)) * Math.PI * 2;
      st.drag = reduced ? home : damp(st.drag, home, 0.25, dt);
    }
    const intro = reduced ? 1 : easeInOut(clamp((clock - st.t0 - 200) / 1800));
    // Today: exaggerate each real move ×12 so a 1% day is visible as a zone swelling
    const w = now.map((v, i) => v * (1 + (moves?.[i] ?? 0) * 12 * st.m));
    const ang = Math.sin(T * 0.16) * 0.28 + st.drag + (1 - intro) * 1.2;
    const posed = formAt(tickers, w, style, seed, { ang, sep: lerp(0.4, 0, intro), t: T, bob: 0.035, rs: lerp(0.6, 1, intro) });
    const cam = camAt(phone ? 5.3 : 4.5, 0.25, phone ? -0.05 : -0.02, mouse[0] * 0.3, mouse[1] * 0.15);
    const op = ss(0.6, 1, intro);
    syncTags(
      tagBox.current,
      posed,
      cam,
      rect,
      (i) => {
        if (modeRef.current === "t") {
          const mv = moves?.[i];
          return mv == null ? { op, v: "–" } : { op, v: pctTxt(mv), color: Math.abs(mv) < 0.0005 ? undefined : mv >= 0 ? "var(--gain)" : "var(--loss)" };
        }
        return { op, v: `${Math.round(now[i] * 100)}%` };
      },
      { push: 1.6, top: 64, bottom: 44 },
    );
    return {
      cam,
      drops: posed.drops,
      o: { t: T, zone: posed.zone, zl: ss(0.5, 1, intro), zt: 0.5 + st.m * 0.2, shim: bump(0, 1, ss(0.45, 1, intro)) + st.pulse * 0.8, shimPos: lerp(-2.6, 2.6, ss(0.45, 1, intro)), rip: st.pulse * 0.6 },
    };
  });

  const pick = (v: "w" | "t") => {
    setMode(v);
    s.current.pulse = 1;
  };

  return (
    <div
      ref={stage}
      className="relative -mx-1 h-[400px] touch-pan-y select-none overflow-hidden rounded-[22px] border border-line bg-[radial-gradient(120%_90%_at_50%_40%,rgba(255,255,255,.035),rgba(255,255,255,0)_60%)] md:mx-0 md:h-[clamp(420px,58vh,560px)] md:rounded-[28px]"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        s.current.dragging = true;
        s.current.lx = e.clientX;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const st = s.current;
        if (!st.dragging) return;
        st.dv += (e.clientX - st.lx) * 0.004;
        st.lx = e.clientX;
      }}
      onPointerUp={() => (s.current.dragging = false)}
      onPointerCancel={() => (s.current.dragging = false)}
    >
      {supported === false && <span className="a-metal-fallback" />}
      <div ref={tagBox} className="absolute inset-0" aria-hidden>
        {tickers.map((t) => (
          <div key={t} className="a-tag">
            <b>{t}</b>
            <span className="v num" />
          </div>
        ))}
      </div>
      <div className="absolute inset-x-[18px] top-4 z-[3] flex items-center justify-between">
        <Chips
          label="Show"
          size="sm"
          value={mode}
          onChange={pick}
          options={[
            { v: "w", label: "Weights" },
            { v: "t", label: "Today", disabled: !hasToday, title: hasToday ? undefined : "No price history yet" },
          ]}
        />
        <span className="flex items-center gap-2 text-[12px] text-mute">
          <i className="a-live-dot" aria-hidden />
          Live prices
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-[22px] bottom-[18px] z-[3] flex items-end justify-between text-[12px] text-dim">
        <span className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" className="opacity-60" aria-hidden>
            <path d="M2 8h12M5 5 2 8l3 3M11 5l3 3-3 3" />
          </svg>
          Drag to turn
        </span>
        {day !== null && (
          <span className={`text-right transition-all duration-500 ease-alloy ${mode === "t" ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`} aria-hidden={mode !== "t"}>
            Basket, last {hours}h
            <b className={`num block font-display text-[26px] font-light tracking-[-0.02em] ${Math.abs(day) < 0.0005 ? "text-ink" : day >= 0 ? "gain" : "loss"}`}>{pctTxt(day)}</b>
          </span>
        )}
      </div>
    </div>
  );
}

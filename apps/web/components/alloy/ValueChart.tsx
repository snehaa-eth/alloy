"use client";

/**
 * Basket value chart (docs/design/artdir/wow/app/basket.html "Value"): what $100 became, line + soft area
 * coloured by direction over the selected range (gain / loss / muted), dashed start baseline, rebalance ticks,
 * crosshair + dot + tooltip on hover / touch, draws in once when scrolled into view.
 * kind "recipe": a young basket has no value history yet, so it shows how its stocks moved together (real feeds),
 * clearly labelled, with no dates.
 */
import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { shortDate } from "./basket-view";
import { Chips } from "./explore/Chips";
import { Odometer, useInView } from "./motion/alloy-motion";

/** Direction colours: gain when up over the range, loss when down, muted when flat. Never the brand colour. */
export const DIR_HEX = { up: "#3DBE8B", down: "#F0545C", flat: "#A39892" } as const;
export type Dir = keyof typeof DIR_HEX;
/** Anything that rounds to 0.0% is flat. */
export function dirOf(chgPct: number): Dir {
  return Math.abs(chgPct) < 0.05 ? "flat" : chgPct > 0 ? "up" : "down";
}

/** Smallest visible y-range: ±2% around the start value, so a +0.2% move looks small, not like a rocket. */
export const MIN_Y_SWING = 0.02;
/** Y domain covering the data and at least ±MIN_Y_SWING around `base` (the first point). */
export function yDomain(all: number[], base: number | undefined): [number, number] {
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (base && Number.isFinite(base)) {
    lo = Math.min(lo, base * (1 - MIN_Y_SWING));
    hi = Math.max(hi, base * (1 + MIN_Y_SWING));
  }
  return [lo, hi];
}

/** Same anatomy for every range toggle (kept for older callers). */
export const RANGE_BTN =
  "inline-flex h-9 min-w-[44px] items-center justify-center rounded-full px-3 font-sans text-[14px] font-semibold tabular-nums transition-colors";

type Range = "1M" | "6M" | "All";
const RANGE_DAYS: Record<Range, number> = { "1M": 30, "6M": 182, All: Infinity };
const VW = 1000, VH = 300;
const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Props = {
  /** oldest first */
  values: number[];
  /** unix seconds, aligned with values (empty for kind "recipe") */
  times: number[];
  /** rebalance markers (unix seconds) with a label */
  ticks?: { t: number; label: string }[];
  kind?: "value" | "recipe";
};

export function ValueChart({ values, times, ticks = [], kind = "value" }: Props) {
  const dated = kind === "value" && times.length === values.length && times.length > 1;
  const span = dated ? times[times.length - 1] - times[0] : 0;
  // only offer ranges the history actually covers
  const ranges = (Object.keys(RANGE_DAYS) as Range[]).filter((r) => r === "All" || (dated && span > RANGE_DAYS[r] * 86_400 * 1.15));
  const [range, setRange] = useState<Range>("All");
  const [hov, setHov] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const seen = useInView(box, "0px 0px -25% 0px");
  const gid = useId().replace(/:/g, "");

  const view = useMemo(() => {
    const end = times[times.length - 1] ?? 0;
    const from = dated && RANGE_DAYS[range] !== Infinity ? end - RANGE_DAYS[range] * 86_400 : -Infinity;
    const idx = values.map((_, i) => i).filter((i) => !dated || times[i] >= from);
    const v = idx.map((i) => values[i]);
    const t = idx.map((i) => times[i] ?? 0);
    const [lo0, hi0] = yDomain(v, v[0]);
    const pad = (hi0 - lo0) * 0.14 || 1;
    const lo = lo0 - pad, hi = hi0 + pad;
    const X = (i: number) => (v.length <= 1 ? 0 : (i / (v.length - 1)) * VW);
    const Y = (n: number) => VH - ((n - lo) / (hi - lo)) * VH;
    const line = v.map((n, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(n).toFixed(1)}`).join("");
    const area = `${line}L${VW} ${VH}L0 ${VH}Z`;
    const tx = dated
      ? ticks
          .filter((k) => k.t >= (t[0] ?? 0) && k.t <= (t[t.length - 1] ?? 0))
          .map((k) => {
            let j = 0;
            for (let i = 0; i < t.length; i++) if (Math.abs(t[i] - k.t) < Math.abs(t[j] - k.t)) j = i;
            return { ...k, x: X(j) / VW };
          })
      : [];
    return { v, t, X, Y, line, area, tx };
  }, [values, times, ticks, range, dated]);

  const first = view.v[0] ?? 1;
  const last = view.v[view.v.length - 1] ?? first;
  const chg = first ? (last / first - 1) * 100 : 0;
  const dir = dirOf(chg);
  const hex = DIR_HEX[dir];
  const grown = 100 * (last / (first || 1));
  const at = hov ?? view.v.length - 1;

  const move = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || view.v.length < 2) return;
    setHov(Math.round(Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * (view.v.length - 1)));
  };
  const hx = view.X(at) / VW;
  const hy = view.Y(view.v[at] ?? first) / VH;
  const sub =
    kind === "recipe"
      ? "How this recipe's stocks moved together, before the basket's own history."
      : range === "All"
        ? "What $100 became, since start"
        : `What $100 became, last ${range === "1M" ? "month" : "6 months"}`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="a-eyebrow">{kind === "recipe" ? "The stocks inside" : "Value"}</div>
          <div className="mt-1.5 flex items-baseline gap-3.5">
            <span className="flex font-display text-[36px] font-extralight tracking-[-0.03em] md:text-[44px]">
              <Odometer value={money(grown)} />
            </span>
            <span className={cn("num text-[14px]", dir === "up" ? "gain" : dir === "down" ? "loss" : "text-mute")}>
              {dir === "flat" ? "0.0%" : `${chg > 0 ? "+" : "−"}${Math.abs(chg).toFixed(1)}%`}
            </span>
          </div>
          <div className="text-[13px] text-mute">{sub}</div>
        </div>
        {ranges.length > 1 && <Chips label="Range" size="sm" value={range} onChange={(r) => (setRange(r), setHov(null))} options={ranges.map((r) => ({ v: r, label: r }))} />}
      </div>

      <div
        ref={box}
        className="relative mt-[34px] h-[220px] touch-pan-y md:h-[300px]"
        style={{ color: hex }}
        onPointerMove={(e) => move(e.clientX)}
        onPointerDown={(e) => move(e.clientX)}
        onPointerLeave={() => setHov(null)}
        role="img"
        aria-label={`${kind === "recipe" ? "The stocks inside" : "Value"}: ${dir === "flat" ? "flat" : `${dir} ${Math.abs(chg).toFixed(1)}%`}`}
      >
        <div className={cn("a-vchart-draw absolute inset-0", seen && "in")}>
          <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            <defs>
              <linearGradient id={`cg-${gid}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity={dir === "flat" ? 0.08 : 0.16} />
                <stop offset="1" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" x2={VW} y1={view.Y(first)} y2={view.Y(first)} stroke="var(--line)" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
            <path d={view.area} fill={`url(#cg-${gid})`} />
            <path d={view.line} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
        {view.tx.map((k) => (
          <span key={k.t} title={k.label} className="absolute bottom-0 top-0 w-px bg-line2" style={{ left: `${k.x * 100}%` }} />
        ))}
        <span className={cn("pointer-events-none absolute bottom-0 top-0 w-px bg-line2 transition-opacity duration-200", hov === null && "opacity-0")} style={{ left: `${hx * 100}%` }} />
        <span
          className={cn("pointer-events-none absolute -ml-[5.5px] -mt-[5.5px] h-[11px] w-[11px] rounded-full border-2 border-current bg-black transition-opacity duration-200", hov === null && "opacity-0")}
          style={{ left: `${hx * 100}%`, top: `${hy * 100}%` }}
        />
        <span
          className={cn("num pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl border border-line bg-[#0e0e0e] px-3 py-2 text-[12px] text-ink transition-opacity duration-200", hov === null && "opacity-0")}
          style={{ left: `clamp(70px, ${hx * 100}%, calc(100% - 70px))`, top: `calc(${hy * 100}% - 14px)` }}
        >
          <b className="block font-display text-[17px] font-light">{money(100 * ((view.v[at] ?? first) / (first || 1)))}</b>
          {dated && <span className="text-dim">{shortDate(view.t[at])}</span>}
        </span>
        {dated &&
          [0, 0.5, 1].map((f) => (
            <span key={f} className="absolute -bottom-[26px] whitespace-nowrap text-[11px] tracking-[0.06em] text-dim" style={{ left: `${f * 100}%`, transform: `translateX(${-f * 100}%)` }}>
              {shortDate(view.t[Math.round(f * (view.t.length - 1))])}
            </span>
          ))}
      </div>
      <p className={cn("text-[12px] text-dim", dated ? "mt-10" : "mt-4")}>
        {view.tx.length > 0 && "Lines mark changes. "}Past returns don&apos;t predict future ones.
      </p>
    </div>
  );
}

"use client";

import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { shortDate } from "./basket-view";
import type { Tone } from "./identity";

type Range = "1W" | "1M" | "ALL";
const RANGE_DAYS: Record<Range, number> = { "1W": 7, "1M": 30, ALL: Infinity };

/** Direction colours: gain when up over the range, loss when down, muted when flat. Never the brand colour. */
export const DIR_HEX = { up: "#3DBE8B", down: "#F0545C", flat: "#A39892" } as const;
export type Dir = keyof typeof DIR_HEX;
/** Anything that rounds to 0.0% is flat. */
export function dirOf(chgPct: number): Dir {
  return Math.abs(chgPct) < 0.05 ? "flat" : chgPct > 0 ? "up" : "down";
}

/** Same anatomy for every range toggle: Inter, tabular figures, 36px tall pill. */
export const RANGE_BTN =
  "inline-flex h-9 min-w-[44px] items-center justify-center rounded-full px-3 font-sans text-[14px] font-semibold tabular-nums transition-colors";

type Props = {
  /** Value per token, oldest first (display numbers). */
  values: number[];
  times: number[];
  tone: Tone;
  /** Rebalance markers (unix seconds) with a reason for the tooltip. */
  ticks?: { t: number; label: string }[];
  /** Optional creator line (same length as values). */
  creator?: number[];
  height?: number;
  /** Mark the series after market close as flat-dashed. */
  stale?: boolean;
};

/**
 * NAV line + area fill built from the same points, edge to edge, coloured by direction over the
 * selected range (gain / loss / muted). Rebalance ticks, pointer scrub.
 */
export function ValueChart({ values, times, tone, ticks = [], creator, height = 140, stale }: Props) {
  void tone;
  const [range, setRange] = useState<Range>("1M");
  const [scrub, setScrub] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const gid = useId().replace(/:/g, "");
  const W = 360;
  const H = height;

  const view = useMemo(() => {
    const end = times[times.length - 1] ?? 0;
    const from = RANGE_DAYS[range] === Infinity ? -Infinity : end - RANGE_DAYS[range] * 86_400;
    const idx = times.map((t, i) => (t >= from ? i : -1)).filter((i) => i >= 0);
    const v = idx.map((i) => values[i]);
    const c = creator ? idx.map((i) => creator[i]) : undefined;
    const t = idx.map((i) => times[i]);
    const all = [...v, ...(c ?? [])];
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const pad = (hi - lo) * 0.12 || 1;
    const y = (n: number) => H - 8 - ((n - (lo - pad)) / (hi - lo + 2 * pad)) * (H - 16);
    // Spread points by index so the line always spans the full width (no flat-then-stop look).
    const x = (i: number) => (v.length <= 1 ? 0 : (i / (v.length - 1)) * W);
    const pts = v.length === 1 ? [[0, y(v[0])], [W, y(v[0])]] : v.map((n, i) => [x(i), y(n)]);
    const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join("");
    const lastX = pts[pts.length - 1]?.[0] ?? W;
    const area = `${line}L${lastX.toFixed(1)},${H}L0,${H}Z`;
    const cline = c?.map((n, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(n).toFixed(1)}`).join("");
    const span = (t[t.length - 1] ?? 0) - (t[0] ?? 0);
    const tx = ticks
      .filter((k) => k.t >= (t[0] ?? 0) && k.t <= (t[t.length - 1] ?? 0))
      .map((k) => {
        // Place by nearest point index so ticks line up with the index-spaced line.
        let j = 0;
        for (let i = 0; i < t.length; i++) if (Math.abs(t[i] - k.t) < Math.abs(t[j] - k.t)) j = i;
        return { ...k, x: span > 0 ? x(j) : 0 };
      });
    return { v, t, x, y, line, area, cline, tx };
  }, [values, times, creator, ticks, range, H]);

  const first = view.v[0] ?? 0;
  const last = view.v[view.v.length - 1] ?? 0;
  const at = scrub ?? view.v.length - 1;
  const cur = view.v[at] ?? 0;
  const chg = first ? ((cur - first) / first) * 100 : 0;
  const dir = dirOf(first ? ((last - first) / first) * 100 : 0);
  const hex = DIR_HEX[dir];
  const chgDir = dirOf(chg);

  function onMove(clientX: number) {
    const el = ref.current;
    if (!el || view.v.length < 2) return;
    const r = el.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setScrub(Math.round(f * (view.v.length - 1)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium tabular-nums text-tx2" aria-live="polite">
          {scrub !== null ? `${shortDate(view.t[at])} · $${cur.toFixed(2)} ` : ""}
          <span className={chgDir === "up" ? "up" : chgDir === "down" ? "down" : "c2"}>
            {chgDir === "up" ? "▲ +" : chgDir === "down" ? "▼ −" : ""}
            {Math.abs(chg).toFixed(1)}%
          </span>
        </span>
        <div className="flex gap-1" role="group" aria-label="Range">
          {(Object.keys(RANGE_DAYS) as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => {
                setRange(r);
                setScrub(null);
              }}
              className={cn(RANGE_BTN, range === r ? "bg-s2 text-tx" : "text-tx2 hover:text-tx")}
            >
              {r === "ALL" ? "All" : r}
            </button>
          ))}
        </div>
      </div>
      <svg
        ref={ref}
        className="c-chart"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ height: H }}
        role="img"
        aria-label={`Value per token, ${range === "ALL" ? "all time" : range}: ${dir === "flat" ? "flat" : `${dir} ${Math.abs(chg).toFixed(1)}%`}`}
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerDown={(e) => onMove(e.clientX)}
        onPointerLeave={() => setScrub(null)}
      >
        <defs>
          <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hex} stopOpacity={dir === "flat" ? 0.1 : 0.22} />
            <stop offset="100%" stopColor={hex} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} className="c-chart__grid" x1="0" x2={W} y1={H * g} y2={H * g} strokeWidth="1" opacity="0.6" />
        ))}
        {/* Fill and line share the same points. No dash draw-in: with non-scaling strokes it cut the line off mid-width. */}
        <path d={view.area} fill={`url(#fill-${gid})`} />
        {view.cline && <path className="c-chart__creator" d={view.cline} />}
        <path className="c-chart__line" d={view.line} style={{ stroke: hex }} strokeLinejoin="round" strokeDasharray={stale ? "5 4" : undefined} />
        {view.tx.map((k) => (
          <line key={k.t} className="c-chart__tick" x1={k.x} x2={k.x} y1="0" y2={H} strokeWidth="1">
            <title>{k.label}</title>
          </line>
        ))}
        {scrub !== null && (
          <>
            <rect x={view.x(at)} y="0" width={W - view.x(at)} height={H} fill="var(--bg)" fillOpacity="0.6" />
            <line className="c-chart__scrub" x1={view.x(at)} x2={view.x(at)} y1="0" y2={H} strokeWidth="1" />
            <circle cx={view.x(at)} cy={view.y(cur)} r="4" fill="var(--tx)" stroke={hex} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      <div className="flex items-center justify-between gap-2">
        <div className="c-legend">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-0.5 w-3 rounded-full" style={{ background: hex }} aria-hidden /> value
          </span>
          {creator && <span>- - creator</span>}
          {view.tx.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <i className="inline-block h-3 w-px" style={{ background: "var(--acc)" }} /> rebalance
            </span>
          )}
        </div>
        <span className="text-[13px] text-tx2">Past performance isn&apos;t a promise.</span>
      </div>
    </div>
  );
}

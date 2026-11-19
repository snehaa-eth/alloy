"use client";

import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { shortDate } from "./basket-view";
import { TONE_HEX, type Tone } from "./identity";

type Range = "1W" | "1M" | "ALL";
const RANGE_DAYS: Record<Range, number> = { "1W": 7, "1M": 30, ALL: Infinity };

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

/** NAV line in paper (never red/green), jewel-tone area fill 18% → 0, accent rebalance ticks, scrub. */
export function ValueChart({ values, times, tone, ticks = [], creator, height = 140, stale }: Props) {
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
    const x = (i: number) => (v.length <= 1 ? 0 : (i / (v.length - 1)) * W);
    const line = v.map((n, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(n).toFixed(1)}`).join("");
    const area = `${line}L${W},${H}L0,${H}Z`;
    const cline = c?.map((n, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(n).toFixed(1)}`).join("");
    const tx = ticks
      .filter((k) => k.t >= (t[0] ?? 0) && k.t <= (t[t.length - 1] ?? 0))
      .map((k) => ({ ...k, x: t.length > 1 ? ((k.t - t[0]) / (t[t.length - 1] - t[0])) * W : 0 }));
    return { v, t, x, y, line, area, cline, tx };
  }, [values, times, creator, ticks, range, H]);

  const first = view.v[0] ?? 0;
  const at = scrub ?? view.v.length - 1;
  const cur = view.v[at] ?? 0;
  const chg = first ? ((cur - first) / first) * 100 : 0;

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
        <span className="t-mono c2" aria-live="polite">
          {scrub !== null ? `${shortDate(view.t[at])} · $${cur.toFixed(2)} ` : ""}
          <span className={chg >= 0 ? "up" : "down"}>
            {chg >= 0 ? "▲ +" : "▼ −"}
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
              className={cn("c-preset !h-7 !min-w-0 !px-2", range !== r && "!border-transparent c2")}
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
        aria-label={`Value per token, ${range === "ALL" ? "all time" : range}: ${chg >= 0 ? "up" : "down"} ${Math.abs(chg).toFixed(1)}%`}
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerDown={(e) => onMove(e.clientX)}
        onPointerLeave={() => setScrub(null)}
      >
        <defs>
          <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TONE_HEX[tone].mid} stopOpacity="0.18" />
            <stop offset="100%" stopColor={TONE_HEX[tone].mid} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} className="c-chart__grid" x1="0" x2={W} y1={H * g} y2={H * g} strokeWidth="1" opacity="0.6" />
        ))}
        <path d={view.area} fill={`url(#fill-${gid})`} />
        {view.cline && <path className="c-chart__creator" d={view.cline} />}
        <path className="c-chart__line" d={view.line} strokeDasharray={stale ? "5 4" : undefined} />
        {view.tx.map((k) => (
          <line key={k.t} className="c-chart__tick" x1={k.x} x2={k.x} y1="0" y2={H} strokeWidth="1">
            <title>{k.label}</title>
          </line>
        ))}
        {scrub !== null && (
          <>
            <rect x={view.x(at)} y="0" width={W - view.x(at)} height={H} fill="var(--bg)" fillOpacity="0.6" />
            <line className="c-chart__scrub" x1={view.x(at)} x2={view.x(at)} y1="0" y2={H} strokeWidth="1" />
          </>
        )}
      </svg>
      <div className="flex items-center justify-between gap-2">
        <div className="c-legend">
          <span>— value</span>
          {creator && <span>- - creator</span>}
          {view.tx.length > 0 && <span className="inline-flex items-center gap-1"><i className="inline-block h-3 w-px" style={{ background: "var(--acc)" }} /> rebalance</span>}
        </div>
        <span className="t-mono c2">Past performance isn&apos;t a promise.</span>
      </div>
    </div>
  );
}

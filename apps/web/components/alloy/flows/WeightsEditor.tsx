"use client";

import { Check } from "lucide-react";
import { equalWeightsBps, validateWeightsBps } from "@/lib/units";
import { AlloyBar, QuietLink, StockLogo, fmtPct } from "../primitives";
import type { Tone } from "../identity";

export type WeightRow = { ticker: string; bps: number };

/** Typed % per stock (stored as bps), live alloy bar, Split evenly, total must be 100, warn > 40%. */
export function WeightsEditor({ rows, onChange, tone }: { rows: WeightRow[]; onChange: (rows: WeightRow[]) => void; tone: Tone }) {
  const total = rows.reduce((a, r) => a + r.bps, 0);
  const valid = validateWeightsBps(rows.map((r) => r.bps)).ok;
  const heavy = rows.find((r) => r.bps > 4000);

  function set(i: number, raw: string) {
    const clean = raw.replace(/[^\d.]/g, "");
    const n = Math.round(Math.min(100, Number(clean || "0")) * 100);
    onChange(rows.map((r, j) => (j === i ? { ...r, bps: Number.isFinite(n) ? n : 0 } : r)));
  }

  return (
    <div className="flex flex-col gap-3">
      <AlloyBar parts={rows.map((r) => ({ ticker: r.ticker, bps: Math.max(r.bps, 1) }))} tone={tone} size="lg" />
      <div className="flex flex-col">
        {rows.map((r, i) => (
          <div key={r.ticker} className="c-row">
            <StockLogo ticker={r.ticker} size="lg" />
            <span className="c-row__title flex-1">{r.ticker}</span>
            <label className="sr-only" htmlFor={`w-${r.ticker}`}>
              {r.ticker} weight in percent
            </label>
            <div className="relative w-[96px]">
              <input
                id={`w-${r.ticker}`}
                inputMode="decimal"
                className="c-field__box !pr-8 text-right t-mono"
                value={fmtPct(r.bps)}
                onChange={(e) => set(i, e.target.value)}
              />
              <span className="t-mono c2 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">%</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={valid ? "t-mono up inline-flex items-center gap-1" : "t-mono down"}>
          {fmtPct(total)}% {valid ? <Check size={12} aria-hidden /> : "· must be 100"}
        </span>
        <QuietLink onClick={() => onChange(rows.map((r, i) => ({ ...r, bps: equalWeightsBps(rows.length)[i] })))}>Split evenly</QuietLink>
      </div>
      {heavy && <span className="t-mono warn">{heavy.ticker} is over 40%. That&apos;s a lot in one stock.</span>}
    </div>
  );
}

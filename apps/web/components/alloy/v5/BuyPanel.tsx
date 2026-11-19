"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usMarketStatus } from "@/lib/market";
import { cn } from "@/lib/utils";
import { DIR_HEX, dirOf, yDomain } from "../ValueChart";
import type { Tone } from "../identity";
import type { BasketView } from "../basket-view";
import { TradePanel } from "../trade/ui";
import { BuyFlow } from "../trade/BuyFlow";
import { useRealBuyTx } from "../trade/tx";
import { Pct } from "./parts";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-[20px] border border-white/[0.07] bg-s1 p-5 md:p-6", className)}>{children}</section>;
}

/**
 * Desktop buy panel = the whole liquid-metal buy flow inline (no modal on desktop), sticky beside the basket page:
 * metal + drop, amount, You get, costs, Buy → Approving / Pouring / Settling → "You're in." (trade/BuyFlow).
 * Phones use the BuySheet. Props unchanged for BasketScreen (`heldUsd6` / `positionBps` are now read live inside).
 */
export function BuyPanel({
  v,
  amount,
  setAmount,
  holding,
  heldUsd6,
  positionBps,
  onExit,
  onAddMoney,
}: {
  v: BasketView;
  amount: string;
  setAmount: (a: string) => void;
  holding: boolean;
  heldUsd6: bigint;
  positionBps: number | null;
  onExit: () => void;
  onAddMoney: () => void;
}) {
  void holding;
  void heldUsd6;
  void positionBps;
  void onAddMoney;
  const tx = useRealBuyTx(v.basket.address);
  const [market, setMarket] = useState<boolean | null>(null);
  const [pane, setPane] = useState("compose");
  useEffect(() => setMarket(usMarketStatus().open), []);
  return (
    <TradePanel id="buy-panel" eyebrow="Buy" title={v.basket.name} scrollKey={pane} className="scroll-mt-24">
      <BuyFlow v={v} tx={tx} amount={amount} setAmount={setAmount} onDone={() => undefined} marketOpen={market} panel onSell={onExit} onStage={setPane} />
    </TradePanel>
  );
}

/** Young basket: show how its stocks moved (weighted feed index), clearly labelled. Wipes in; pointer/touch scrub with readout. */
export function NewChart({ series, tone }: { series: number[]; tone: Tone }) {
  void tone;
  const [scrub, setScrub] = useState<number | null>(null);
  const W = 600;
  const H = 150;
  if (series.length < 2 || series.every((n) => n === series[0]))
    return <p className="rounded-[14px] bg-s2 px-4 py-6 text-center text-[14px] text-tx2">New basket. Value history starts after its first day.</p>;
  const [lo, hi] = yDomain(series, series[0]);
  const pad = (hi - lo) * 0.15 || 1;
  const y = (n: number) => H - ((n - (lo - pad)) / (hi - lo + 2 * pad)) * H;
  const x = (i: number) => (i / (series.length - 1)) * W;
  const line = series.map((n, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(n).toFixed(1)}`).join("");
  const dir = dirOf(((series[series.length - 1] - series[0]) / series[0]) * 100);
  const c = DIR_HEX[dir];
  const at = scrub ?? series.length - 1;
  const chg = Math.round(((series[at] - series[0]) / series[0]) * 10_000);
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setScrub(Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * (series.length - 1)));
  };
  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="v-wipe h-[150px] w-full touch-pan-y"
        role="img"
        aria-label="How this basket's stocks moved recently"
        onPointerMove={move}
        onPointerDown={move}
        onPointerLeave={() => setScrub(null)}
      >
        <defs>
          <linearGradient id="nc-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={c} stopOpacity={dir === "flat" ? 0.1 : 0.22} />
            <stop offset="1" stopColor={c} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line}L${W},${H}L0,${H}Z`} fill="url(#nc-fill)" />
        <path d={line} fill="none" stroke={c} strokeWidth="2" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
        {scrub !== null && (
          <>
            <rect x={x(at)} y="0" width={W - x(at)} height={H} fill="var(--s1)" fillOpacity="0.6" />
            <line x1={x(at)} x2={x(at)} y1="0" y2={H} stroke="var(--tx)" strokeOpacity="0.5" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      <p className="text-[13px] text-tx2" aria-live="polite">
        {scrub !== null ? (
          <>
            Point {at + 1} of {series.length}: <Pct bps={chg} />
          </>
        ) : (
          <>
            New basket. Dashed line: how its stocks moved recently, <Pct bps={chg} />. Not this basket&apos;s return.
          </>
        )}
      </p>
    </div>
  );
}

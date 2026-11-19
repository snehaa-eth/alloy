"use client";

import { useState, type ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { MIN_BUY_USDC } from "@/lib/strategy";
import { formatShares, formatUsd6, parseUsdc } from "@/lib/units";
import { cn } from "@/lib/utils";
import { useBuyBasket } from "@/lib/hooks/use-basket-tx";
import { DEFAULT_SLIPPAGE_BPS } from "@/lib/strategy";
import { describeTxError } from "@/lib/tx";
import { Button, ErrorState, QuietLink } from "../primitives";
import { useAccount, useAttestation, useQuoteView } from "../hooks";
import { AttestBlock, TxProgress } from "../flows/shared";
import { FoundingCertificate } from "../flows/BuySheet";
import type { Tone } from "../identity";
import type { BasketView } from "../basket-view";
import { Pct } from "./parts";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-[20px] border border-white/[0.07] bg-s1 p-5 md:p-6", className)}>{children}</section>;
}

/** UX_MAP §5.3: presets $10 · $25 · $100, no Max. */
const PRESETS = ["10", "25", "100"];

function safeParse(s: string): bigint {
  try {
    return parseUsdc(s || "0");
  } catch {
    return 0n;
  }
}

type Stage = "compose" | "attest" | "running" | "done" | "error";

/**
 * Desktop buy panel = the whole buy flow, inline (no modal on desktop):
 * amount → (sign in) → one-time non-US attestation → progress → success. Mobile uses the BuySheet instead.
 * Quote numbers swap instantly here — never a rolling ticker while deciding (MOTION.md principle 2).
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
  const b = v.basket;
  const acct = useAccount();
  const attest = useAttestation();
  const buy = useBuyBasket(b.address);
  const [stage, setStage] = useState<Stage>("compose");
  const [err, setErr] = useState("");
  const usdc = safeParse(amount);
  const quote = useQuoteView(b.address, "buy", usdc, v.nav, b.totalSupply);
  const tooSmall = usdc > 0n && usdc < MIN_BUY_USDC;
  const label = `Buy ${formatUsd6(usdc, usdc % 1_000_000n === 0n ? 0 : 2)}`;

  async function go() {
    if (!acct.signedIn) return acct.login();
    if (!attest.attested) return setStage("attest");
    setStage("running");
    try {
      await buy.mutateAsync({ usdcIn: usdc, slippageBps: DEFAULT_SLIPPAGE_BPS });
      setStage("done");
    } catch (e) {
      setErr(describeTxError(e));
      setStage("error");
    }
  }
  function reset() {
    buy.resetStep();
    setStage("compose");
  }

  return (
    <div id="buy-panel" className="scroll-mt-24 overflow-hidden rounded-[20px] border border-white/[0.1] bg-s1 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3" style={{ boxShadow: "inset 0 2px 0 var(--cta)" }}>
        <span className="inline-flex items-center gap-2 text-[15px] font-semibold">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--acc)" }} aria-hidden /> {stage === "done" ? "You're in" : `Buy ${b.name}`}
        </span>
        <span className="text-[12px] text-tx3">min $5</span>
      </div>
      <div className="flex flex-col gap-5 p-5">
        {stage === "attest" && (
          <AttestBlock
            onConfirm={() => {
              attest.confirm();
              setStage("compose");
            }}
            onCancel={() => setStage("compose")}
          />
        )}

        {stage === "error" && (
          <ErrorState
            line="Didn't go through. Your test dollars are still there."
            action={
              <div className="flex flex-col gap-2">
                <span className="t-mono c2 break-words">{err}</span>
                <Button onClick={reset}>Try again</Button>
              </div>
            }
          />
        )}

        {stage === "done" && (
          <>
            <FoundingCertificate v={v} paid={usdc} refund={buy.result?.quote.refundUsd6 ?? 0n} txHash={buy.txHash ?? undefined} />
            <Button variant="secondary" className="!rounded-full" onClick={reset}>
              Buy more
            </Button>
          </>
        )}

        {(stage === "compose" || stage === "running") && (
          <>
            {holding && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5 rounded-[14px] bg-s2 px-3 py-2.5">
                  <span className="text-[12px] text-tx2">Your value</span>
                  <span className="text-[16px] font-semibold tabular-nums">{formatUsd6(heldUsd6)}</span>
                </div>
                <div className="flex flex-col gap-0.5 rounded-[14px] bg-s2 px-3 py-2.5">
                  <span className="text-[12px] text-tx2">Since buy</span>
                  <span className="text-[16px] font-semibold">{positionBps === null ? "—" : <Pct bps={positionBps} />}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <span className="text-[13px] text-tx2">You pay</span>
              <label className="flex items-baseline gap-1 border-b border-white/[0.08] pb-3">
                <span className="font-display text-[44px] leading-none text-tx2">$</span>
                <input
                  inputMode="decimal"
                  aria-label="Amount in dollars"
                  value={amount}
                  disabled={stage === "running"}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, "").slice(0, 9))}
                  className="w-full bg-transparent font-display text-[44px] leading-none text-tx outline-none"
                />
              </label>
              <div className="flex gap-2">
                {PRESETS.map((p) => (
                  <button key={p} type="button" className="c-preset flex-1" aria-pressed={amount === p} onClick={() => setAmount(p)} disabled={stage === "running"}>
                    ${p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-s2 px-3 py-1 text-[12px] text-tx3">Fee {b.feeBps / 100}% a year</span>
              {quote.costUsd6 !== null && <span className="rounded-full bg-s2 px-3 py-1 text-[12px] text-tx3">Cost ≈ {formatUsd6(quote.costUsd6)}</span>}
              {quote.impactBps !== null && quote.impactBps > 50 && (
                <span className="rounded-full px-3 py-1 text-[12px]" style={{ background: "var(--warnbg)", color: "var(--warn)" }}>
                  Fills ~{(quote.impactBps / 100).toFixed(1)}% lower now
                </span>
              )}
            </div>

            <div className="-mt-2 flex items-center justify-between text-[14px]">
              <span className="text-tx2">≈ You get</span>
              <span className="font-medium tabular-nums">
                {tooSmall ? <span className="down">Minimum $5</span> : `${formatShares(quote.out, 2)} shares of this basket`}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {stage === "running" ? (
                <TxProgress step={buy.step} />
              ) : (
                <Button data-buy-primary className="!h-[52px] !rounded-full" onClick={go} disabled={usdc === 0n || tooSmall} loading={quote.loading}>
                  {acct.signedIn ? label : "Sign in with email to buy"}
                </Button>
              )}
              {holding && stage === "compose" && (
                <Button variant="secondary" className="!rounded-full" onClick={onExit}>
                  Exit
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[12px] text-tx2">
                <FlaskConical size={12} strokeWidth={1.75} aria-hidden /> Test dollars, not real money
              </span>
              <QuietLink onClick={onAddMoney} className="!min-h-0">
                Add test money
              </QuietLink>
            </div>
          </>
        )}
      </div>
    </div>
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
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const pad = (hi - lo) * 0.15 || 1;
  const y = (n: number) => H - ((n - (lo - pad)) / (hi - lo + 2 * pad)) * H;
  const x = (i: number) => (i / (series.length - 1)) * W;
  const line = series.map((n, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(n).toFixed(1)}`).join("");
  const c = "#A3163A";
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
            <stop offset="0" stopColor={c} stopOpacity="0.28" />
            <stop offset="1" stopColor={c} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line}L${W},${H}L0,${H}Z`} fill="url(#nc-fill)" />
        <path d={line} fill="none" stroke="var(--tx)" strokeWidth="2" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
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

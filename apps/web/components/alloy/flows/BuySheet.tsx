"use client";

import { useEffect, useState } from "react";
import { Award, FlaskConical } from "lucide-react";
import { formatUsd6 } from "@/lib/units";
import { DEFAULT_CHAIN_ID, explorerTxUrl } from "@/lib/chains";
import { Certificate } from "../Certificate";
import { AlloyBar, InlineToast, QuietLink, Stamp } from "../primitives";
import { longDate, type BasketView } from "../basket-view";
import { TradeSheet } from "../trade/ui";
import { BuyFlow } from "../trade/BuyFlow";
import { useRealBuyTx } from "../trade/tx";

/**
 * Buy sheet (phones; desktop uses the inline BuyPanel): the liquid-metal buy flow (trade/BuyFlow) in a bottom sheet.
 * Real tx via lib useBuyBasket; the drop falls in on the receipt. Props unchanged for BasketScreen.
 */
export function BuySheet({
  v,
  open,
  onOpenChange,
  initial = "25",
  changeAt,
  onSeeChange,
  onAddMoney,
  marketOpen,
}: {
  v: BasketView;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: string;
  /** executableAt of a pending recipe change, if any */
  changeAt?: number;
  onSeeChange?: () => void;
  /** kept for compatibility; the sheet now tops up test USDC inline (useFaucet) */
  onAddMoney?: () => void;
  marketOpen: boolean | null;
}) {
  void onAddMoney;
  const tx = useRealBuyTx(v.basket.address);
  const [amount, setAmount] = useState(initial);
  const [pane, setPane] = useState("compose");
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (open) {
      setAmount(initial);
      setRun((n) => n + 1);
      tx.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);
  return (
    <TradeSheet open={open} onOpenChange={onOpenChange} eyebrow="Buy" title={v.basket.name} scrollKey={pane}>
      <BuyFlow
        key={run}
        v={v}
        tx={tx}
        amount={amount}
        setAmount={setAmount}
        onDone={() => onOpenChange(false)}
        changeAt={changeAt}
        onSeeChange={onSeeChange}
        marketOpen={marketOpen}
        onStage={setPane}
      />
    </TradeSheet>
  );
}

/** I-08 Founding certificate (post-buy share moment). */
export function FoundingCertificate({ v, paid, refund = 0n, txHash }: { v: BasketView; paid: bigint; refund?: bigint; txHash?: string }) {
  const b = v.basket;
  // TODO(lib): founding number comes from the API (buy receipt → follower index). Estimated from followers for now.
  const n = b.followers + 1;
  const shareText = encodeURIComponent(`I'm Founding Follower #${n} of ${b.name} on Alloy (Base Sepolia test).`);
  return (
    <div className="flex flex-col gap-4">
      {/* Success moment: check draws in a soft oxblood ring; facts, no confetti (MOTION.md §5.5). */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "var(--s2)", boxShadow: "0 0 40px rgba(var(--brand-rgb),0.35)" }}>
          <span className="v-ring" aria-hidden />
          <svg className="v-check" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gain)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} />
          </svg>
        </span>
        <span className="text-[17px] font-semibold">You&apos;re in.</span>
      </div>
      <InlineToast>
        Bought {formatUsd6(paid)}
        {refund > 50_000n ? ` · Refunded ${formatUsd6(refund)}` : ""}
      </InlineToast>
      <div className="v-slide-up">
      <Certificate
        serial={v.id.serial}
        stamp={
          <Stamp icon={Award} intent="gold">
            Founding
          </Stamp>
        }
        art={{ series: v.artSeries, weightsBps: v.weightsBps, seed: b.address, tone: v.id.tone }}
        watermark={
          <Stamp icon={FlaskConical} intent="test">
            Test
          </Stamp>
        }
        title={b.name}
        label="Founding follower"
        figure={`#${n}`}
        bar={<AlloyBar parts={v.target} tone={v.id.tone} />}
        ledger={[
          { k: "Issued", v: longDate(Math.floor(Date.now() / 1000)) },
          { k: "Your slice", v: `${v.tickers.length} stocks` },
        ]}
        action={
          <a className="c-btn c-btn--primary" href={`https://x.com/intent/post?text=${shareText}`} target="_blank" rel="noreferrer">
            Share on X
          </a>
        }
        footLink={
          txHash ? (
            <QuietLink href={explorerTxUrl(DEFAULT_CHAIN_ID, txHash)} external>
              See the trade
            </QuietLink>
          ) : (
            <QuietLink href="/portfolio">See portfolio</QuietLink>
          )
        }
        footMeta="Base Sepolia"
      />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Award, FlaskConical, RefreshCw } from "lucide-react";
import { useBuyBasket } from "@/lib/hooks/use-basket-tx";
import { DEFAULT_SLIPPAGE_BPS, MIN_BUY_USDC } from "@/lib/strategy";
import { formatUsd6, parseUsdc } from "@/lib/units";
import { describeTxError } from "@/lib/tx";
import { DEFAULT_CHAIN_ID, explorerTxUrl } from "@/lib/chains";
import { Certificate } from "../Certificate";
import { Sheet } from "../Sheet";
import { AlloyBar, Banner, Button, ErrorState, InlineToast, QuietLink, Stamp } from "../primitives";
import { longDate, type BasketView } from "../basket-view";
import { useAccount, useAttestation, useQuoteView } from "../hooks";
import { AmountField, AttestBlock, BuyQuote, TxProgress } from "./shared";

type Stage = "compose" | "attest" | "running" | "done" | "error";

function safeParse(s: string): bigint {
  try {
    return parseUsdc(s || "0");
  } catch {
    return 0n;
  }
}

/**
 * Phone buy sheet. Order: amount (input + chips) → You get / Trading cost / Fee (+ market line) → CTA.
 * The quote refreshes silently in the background (useQuote refetches every 15s); no visible timer.
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
  onAddMoney: () => void;
  marketOpen: boolean | null;
}) {
  const b = v.basket;
  const acct = useAccount();
  const attest = useAttestation();
  const buy = useBuyBasket(b.address);
  const [amount, setAmount] = useState(initial);
  const [stage, setStage] = useState<Stage>("compose");
  const [err, setErr] = useState("");
  const usdc = safeParse(amount);
  const quote = useQuoteView(b.address, "buy", usdc, v.nav, b.totalSupply);
  const tooSmall = usdc > 0n && usdc < MIN_BUY_USDC;

  useEffect(() => {
    if (open) {
      setAmount(initial);
      setStage("compose");
      buy.resetStep();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

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

  const title = stage === "done" ? "You're in" : `Buy ${b.name}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} hideTitle={stage === "done"}>
      {stage === "attest" && (
        <AttestBlock
            buy
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
              <Button onClick={() => setStage("compose")}>Try again</Button>
            </div>
          }
        />
      )}

      {stage === "done" && <FoundingCertificate v={v} paid={usdc} refund={buy.result?.quote.refundUsd6 ?? 0n} txHash={buy.txHash ?? undefined} />}

      {(stage === "compose" || stage === "running") && (
        <>
          <AmountField value={amount} onChange={setAmount} disabled={stage === "running"} />

          <BuyQuote name={b.name} usdc={usdc} quote={quote} feeBps={b.feeBps} marketOpen={marketOpen} />

          {changeAt && (
            <Banner intent="notice" icon={RefreshCw} action={onSeeChange ? <QuietLink onClick={onSeeChange}>See</QuietLink> : undefined}>
              Recipe changes soon.
            </Banner>
          )}

          {stage === "running" ? (
            <TxProgress step={buy.step} />
          ) : (
            <Button variant="buy" className="!h-[52px] !rounded-full" onClick={go} disabled={usdc === 0n || tooSmall}>
              {tooSmall ? "Minimum is $5" : acct.signedIn ? label : "Sign in to buy"}
            </Button>
          )}

          {stage === "compose" && (
            <div className="-mt-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[13px] text-tx2">
                <FlaskConical size={12} strokeWidth={1.75} aria-hidden /> Test dollars
              </span>
              <QuietLink onClick={onAddMoney}>Add test money</QuietLink>
            </div>
          )}
        </>
      )}
    </Sheet>
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

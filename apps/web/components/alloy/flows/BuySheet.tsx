"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Award, Clock, FlaskConical, RefreshCw } from "lucide-react";
import { useBuyBasket } from "@/lib/hooks/use-basket-tx";
import { DEFAULT_SLIPPAGE_BPS, MIN_BUY_USDC } from "@/lib/strategy";
import { formatShares, formatUsd6, parseUsdc } from "@/lib/units";
import { describeTxError } from "@/lib/tx";
import { DEFAULT_CHAIN_ID, explorerTxUrl } from "@/lib/chains";
import { Certificate } from "../Certificate";
import { Sheet } from "../Sheet";
import { AlloyBar, Banner, Button, ErrorState, InlineToast, QuietLink, Stamp } from "../primitives";
import { clock, longDate, type BasketView } from "../basket-view";
import { useAccount, useAge, useAttestation, useQuoteView } from "../hooks";
import { AmountPad, AttestBlock, TxProgress } from "./shared";

type Stage = "compose" | "attest" | "running" | "done" | "error";

function safeParse(s: string): bigint {
  try {
    return parseUsdc(s || "0");
  } catch {
    return 0n;
  }
}

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
  const [keys, setKeys] = useState(false);
  const [stage, setStage] = useState<Stage>("compose");
  const [err, setErr] = useState("");
  const usdc = safeParse(amount);
  const quote = useQuoteView(b.address, "buy", usdc, v.nav, b.totalSupply);
  const age = useAge(quote.updatedAt);
  const tooSmall = usdc > 0n && usdc < MIN_BUY_USDC;

  useEffect(() => {
    if (open) {
      setAmount(initial);
      setStage("compose");
      buy.resetStep();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const costUsd6 = quote.costUsd6;
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

  const title = stage === "done" ? "You're in" : b.name;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} hideTitle>
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
              <Button onClick={() => setStage("compose")}>Try again</Button>
            </div>
          }
        />
      )}

      {stage === "done" && <FoundingCertificate v={v} paid={usdc} refund={buy.result?.quote.refundUsd6 ?? 0n} txHash={buy.txHash ?? undefined} />}

      {(stage === "compose" || stage === "running") && (
        <>
          <Certificate
            flat
            serial={v.id.serial}
            stamp={
              <Stamp icon={ArrowUpRight} intent="neutral">
                Buy
              </Stamp>
            }
            title={b.name}
            label="You pay"
            figure={formatUsd6(usdc)}
            unit="test"
            ledger={[
              {
                k: "You get",
                v: tooSmall ? <span className="down">Minimum $5</span> : `≈ ${formatShares(quote.out, 2)} ${v.id.code}`,
              },
              {
                k: quote.source === "quote" ? "Cost" : "Fee",
                v: costUsd6 !== null ? `≈ ${formatUsd6(costUsd6)}` : `${b.feeBps / 100}%/yr`,
              },
            ]}
            action={
              stage === "running" ? (
                <TxProgress step={buy.step} />
              ) : (
                <Button onClick={go} disabled={usdc === 0n || tooSmall} loading={quote.loading}>
                  {acct.signedIn ? label : "Sign in to buy"}
                </Button>
              )
            }
            footLink={<QuietLink onClick={() => setKeys((k) => !k)}>{keys ? "Done" : "Change amount"}</QuietLink>}
            footMeta={quote.source === "quote" ? `quote ${clock(age).slice(3)}` : quote.loading ? "quoting…" : "estimate · oracle value"}
          >
            {quote.impactBps !== null && quote.impactBps > 50 && (
              <Banner intent="closed" icon={Clock}>
                Fills ~{(quote.impactBps / 100).toFixed(1)}% below value now.
              </Banner>
            )}
            {marketOpen === false && quote.impactBps === null && (
              <Banner intent="closed" icon={Clock}>
                US market closed. Fills can differ from value.
              </Banner>
            )}
            {changeAt && (
              <Banner intent="notice" icon={RefreshCw} action={onSeeChange ? <QuietLink onClick={onSeeChange}>See</QuietLink> : undefined}>
                Recipe changes soon.
              </Banner>
            )}
          </Certificate>
          {stage === "compose" && <AmountPad value={amount} onChange={setAmount} showKeys={keys} />}
          {stage === "compose" && (
            <div className="flex items-center justify-between">
              <span className="t-mono c2 inline-flex items-center gap-1">
                <FlaskConical size={12} strokeWidth={1.75} aria-hidden /> test dollars
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
      <InlineToast>
        Bought {formatUsd6(paid)}
        {refund > 50_000n ? ` · Refunded ${formatUsd6(refund)}` : ""}
      </InlineToast>
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
  );
}

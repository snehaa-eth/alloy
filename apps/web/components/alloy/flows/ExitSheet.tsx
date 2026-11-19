"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, Clock, Download } from "lucide-react";
import { useSellBasket, useWithdraw } from "@/lib/hooks/use-basket-tx";
import { DEFAULT_SLIPPAGE_BPS } from "@/lib/strategy";
import { formatB20, formatUsd6, redeemAmounts, sharesForPercent, sharesToUsd6, valueUsd6 } from "@/lib/units";
import { describeTxError } from "@/lib/tx";
import { Certificate } from "../Certificate";
import { Sheet } from "../Sheet";
import { Banner, Button, ErrorState, InlineToast, QuietLink, Stamp, StockLogo, Tabs } from "../primitives";
import type { BasketView } from "../basket-view";
import { useAccount, useAttestation, useQuoteView } from "../hooks";
import { AttestBlock, CHIP, TxProgress } from "./shared";

type Mode = "usdc" | "stocks";
type Stage = "compose" | "attest" | "running" | "done" | "error";
const PCTS = [2500, 5000, 7500, 10_000];

export function ExitSheet({
  v,
  shares,
  open,
  onOpenChange,
  initialMode = "usdc",
  marketOpen,
}: {
  v: BasketView;
  shares: bigint;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialMode?: Mode;
  marketOpen: boolean | null;
}) {
  const b = v.basket;
  const acct = useAccount();
  const attest = useAttestation();
  const sell = useSellBasket(b.address);
  const withdraw = useWithdraw(b.address);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [pct, setPct] = useState(2500);
  const [stage, setStage] = useState<Stage>("compose");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setStage("compose");
    }
  }, [open, initialMode]);

  const sellShares = shares > 0n ? sharesForPercent(shares, pct) : 0n;
  const keepUsd6 = sharesToUsd6(shares - sellShares, v.nav, b.totalSupply);
  const quote = useQuoteView(b.address, "sell", mode === "usdc" ? sellShares : 0n, v.nav, b.totalSupply);
  const outs = b.totalSupply > 0n && sellShares <= b.totalSupply ? redeemAmounts(b.components.map((c) => c.balance8), sellShares, b.totalSupply) : [];
  const stocksUsd6 = outs.reduce((a, o, i) => a + valueUsd6(o, b.components[i].stock.price8), 0n);
  const costUsd6 = quote.costUsd6;
  const pctLabel = pct === 10_000 ? "All" : `${pct / 100}%`;
  const step = mode === "usdc" ? sell.step : withdraw.step;

  const heldCount = withdraw.result ? b.components.filter((_, i) => (withdraw.result!.owedMask >> BigInt(i)) & 1n).length : 0;
  const result =
    mode === "usdc"
      ? `${formatUsd6(sell.result?.usdcOut ?? quote.out)} USDC added`
      : heldCount
        ? `${b.components.length - heldCount} of ${b.components.length} came through. The rest is held for you.`
        : `${b.components.length} stock tokens in your wallet`;

  async function go() {
    if (!acct.signedIn) return acct.login();
    if (!attest.attested) return setStage("attest");
    setStage("running");
    try {
      if (mode === "usdc") {
        await sell.mutateAsync({ shares: sellShares, slippageBps: DEFAULT_SLIPPAGE_BPS });
      } else {
        await withdraw.mutateAsync({ shares: sellShares });
      }
      setStage("done");
    } catch (e) {
      setErr(describeTxError(e));
      setStage("error");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={b.name} hideTitle>
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
          line={mode === "usdc" ? "Nothing sold. Your basket is unchanged." : "Nothing moved. Try again."}
          action={
            <div className="flex flex-col gap-2">
              <span className="t-mono c2 break-words">{err}</span>
              <Button onClick={() => setStage("compose")}>Try again</Button>
            </div>
          }
        />
      )}
      {stage === "done" && (
        <div className="flex flex-col gap-4">
          <InlineToast>{result}</InlineToast>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      )}
      {(stage === "compose" || stage === "running") && (
        <>
          <Tabs
            label="Exit type"
            value={mode}
            onChange={setMode}
            tabs={[
              { id: "usdc", label: "Get USDC" },
              { id: "stocks", label: "Get the stocks" },
            ]}
          />
          <Certificate
            flat
            serial={v.id.serial}
            stamp={
              <Stamp icon={mode === "usdc" ? ArrowDownLeft : Download}>{mode === "usdc" ? "Exit" : "In kind"}</Stamp>
            }
            title={b.name}
            label={`You receive · ${pctLabel}`}
            figure={<span className="font-sans text-[36px] font-semibold tracking-tight tabular-nums">{mode === "usdc" ? formatUsd6(quote.out) : `≈ ${formatUsd6(stocksUsd6)}`}</span>}
            unit={mode === "usdc" ? "USDC" : `in ${b.components.length} stocks`}
            ledger={[
              { k: "You keep", v: formatUsd6(keepUsd6) },
              mode === "usdc"
                ? { k: "Trading cost (one-time)", v: costUsd6 !== null ? `≈ ${formatUsd6(costUsd6)}` : "pool fees" }
                : { k: "Autopilot", v: "Stops for these" },
            ]}
            action={
              stage === "running" ? (
                <TxProgress step={step} skip={mode === "stocks" ? ["quote", "approve"] : []} />
              ) : shares === 0n ? (
                <Button disabled>Nothing to exit</Button>
              ) : (
                <Button onClick={go}>{acct.signedIn ? (mode === "usdc" ? `Sell ${pctLabel}` : "Get the stocks") : "Sign in"}</Button>
              )
            }
            footLink={mode === "usdc" ? <QuietLink onClick={() => setMode("stocks")}>Get the stocks instead</QuietLink> : undefined}
            footMeta={mode === "usdc" ? "any day" : "always available"}
          >
            <div className="flex gap-2" role="group" aria-label="How much">
              {PCTS.map((p) => (
                <button key={p} type="button" className={CHIP} aria-pressed={pct === p} onClick={() => setPct(p)}>
                  {p === 10_000 ? "All" : `${p / 100}%`}
                </button>
              ))}
            </div>
            {mode === "usdc" && marketOpen === false && (
              <Banner intent="closed" icon={Clock}>
                Market closed. Get the stocks avoids pool prices.
              </Banner>
            )}
            {mode === "stocks" && (
              <div className="flex flex-col">
                {b.components.map((c, i) => (
                  <div key={c.stock.symbol} className="c-row !min-h-[44px]">
                    <StockLogo ticker={c.stock.ticker} />
                    <span className="c-row__title flex-1">{c.stock.ticker}</span>
                    <span className="t-mono c2">{formatB20(outs[i] ?? 0n, 4)}</span>
                    <span className="t-mono w-20 text-right">≈ {formatUsd6(valueUsd6(outs[i] ?? 0n, c.stock.price8))}</span>
                  </div>
                ))}
              </div>
            )}
          </Certificate>
        </>
      )}
    </Sheet>
  );
}

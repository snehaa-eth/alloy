"use client";

/**
 * Sell flow body (designer sell.html): 25% / 50% / All → "You'll sell $X" → real sell tx (lib useSellBasket:
 * quote → exact approve of basket shares → simulate → write → receipt) → the bud pinches off, turns to USDC and
 * rolls into your wallet chip. "Get the stocks instead" keeps the in-kind withdraw (useWithdraw) available.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { TxStep } from "@/lib/tx";
import { describeTxError } from "@/lib/tx";
import { formatB20, pnl, redeemAmounts, sharesForPercent, sharesToUsd6, valueUsd6 } from "@/lib/units";
import { useUsdcBalance } from "@/lib/hooks/use-reads";
import { Odometer } from "../motion/alloy-motion";
import { tintCss } from "../metal/palette";
import { useAccount, useAttestation, usePosition, useQuoteView } from "../hooks";
import type { BasketView } from "../basket-view";
import { recipeFor } from "./BuyFlow";
import { SellStage } from "./SellStage";
import { DUR, SELL_STEPS, sellStatus, sellStepIndex, sellVisualFor, type SellVisual } from "./journey";
import { Chips, Status, Steps, usd } from "./ui";

type Leg<X> = { step: TxStep; run: (shares: bigint) => Promise<unknown>; reset: () => void } & X;
export type SellTx = {
  sell: Leg<{ out: bigint | null }>;
  withdraw: Leg<{ heldMask: bigint | null }>;
};

type Mode = "usdc" | "stocks";
type Stage = "compose" | "attest" | "running" | "done" | "error";
const PCTS = ["2500", "5000", "10000"] as const;
const GENERIC = "That didn't go through. Nothing was spent. Try again.";

export function SellFlow({
  v,
  shares,
  tx,
  initialMode = "usdc",
  open,
  onDone,
  marketOpen,
  onStage,
}: {
  v: BasketView;
  shares: bigint;
  tx: SellTx;
  initialMode?: Mode;
  open: boolean;
  onDone: () => void;
  marketOpen: boolean | null;
  onStage?: (s: string) => void;
}) {
  const b = v.basket;
  const acct = useAccount();
  const attest = useAttestation();
  const pos = usePosition(b.address, b.totalSupply);
  const bal = useUsdcBalance();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [pct, setPct] = useState<(typeof PCTS)[number]>("5000");
  const [stage, setStageRaw] = useState<Stage>("compose");
  const [visual, setVisual] = useState<SellVisual>("pick");
  const [err, setErr] = useState("");
  const [hit, setHit] = useState(false);
  const [ok, setOk] = useState(false);
  const [landed, setLanded] = useState(false);
  const before = useRef(0n);
  const sold = useRef({ shares: 0n, value: 0n, p: 0.5, held: 0n });
  const walletRef = useRef<HTMLDivElement>(null);
  const setStage = (s: Stage) => {
    setStageRaw(s);
    onStage?.(s);
  };
  const leg = mode === "usdc" ? tx.sell : tx.withdraw;

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setStageRaw("compose");
      setVisual("pick");
      setHit(false);
    }
  }, [open, initialMode]);

  const bps = Number(pct);
  const p = bps / 10_000;
  const sellShares = shares > 0n ? sharesForPercent(shares, bps) : 0n;
  const held = sharesToUsd6(shares, v.nav, b.totalSupply);
  const value = sharesToUsd6(sellShares, v.nav, b.totalSupply);
  const heldPnl = pos.costUsd6 ? pnl(held, pos.costUsd6) : null;
  const quote = useQuoteView(b.address, "sell", mode === "usdc" && stage === "compose" ? sellShares : 0n, v.nav, b.totalSupply);
  const live = quote.source === "quote" && !quote.loading;
  const toWallet = mode === "usdc" ? quote.out : value;
  const cost = live && value > quote.out ? value - quote.out : null;
  const outs = useMemo(
    () => (b.totalSupply > 0n && sellShares <= b.totalSupply ? redeemAmounts(b.components.map((c) => c.balance8), sellShares, b.totalSupply) : []),
    [b.components, b.totalSupply, sellShares],
  );

  // ---- real tx step → visual ----
  useEffect(() => {
    if (stage !== "running") return;
    setVisual((cur) => (cur === "pick" || cur === "hold" ? (leg.step === "error" || leg.step === "idle" ? cur : sellVisualFor(leg.step)) : cur));
  }, [leg.step, stage]);
  useEffect(() => {
    const at = (ms: number, f: () => void) => {
      const id = window.setTimeout(f, ms);
      return () => window.clearTimeout(id);
    };
    if (visual === "pinch") return at(DUR.pinch * 1000, () => setVisual("convert"));
    if (visual === "convert") return at(DUR.convert * 1000, () => setVisual("send"));
    if (visual === "send") {
      const a = window.setTimeout(() => setHit(true), DUR.send * 800);
      const z = window.setTimeout(() => setLanded(true), DUR.send * 1000);
      return () => {
        window.clearTimeout(a);
        window.clearTimeout(z);
      };
    }
  }, [visual]);
  useEffect(() => {
    if (stage === "running" && ok && landed) {
      setVisual("done");
      setStage("done");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, landed, stage]);

  async function start() {
    if (sellShares === 0n) return;
    before.current = bal.data ?? 0n;
    sold.current = { shares: sellShares, value, p, held };
    setOk(false);
    setLanded(false);
    setHit(false);
    setErr("");
    setVisual("hold");
    setStage("running");
    try {
      await leg.run(sellShares);
      setVisual((cur) => (cur === "hold" ? "pinch" : cur));
      setOk(true);
    } catch (e) {
      const m = describeTxError(e);
      setErr(m === GENERIC ? "" : m);
      setVisual("err");
      setStage("error");
    }
  }
  function go() {
    if (!acct.signedIn) return acct.login();
    if (!attest.attested) return setStage("attest");
    void start();
  }
  function back() {
    leg.reset();
    setVisual("pick");
    setHit(false);
    setStage("compose");
  }

  const got = mode === "usdc" ? (tx.sell.out ?? toWallet) : sold.current.value;
  const leftAfter = sold.current.held - sold.current.value;
  const status = sellStatus(visual, leg.step, mode === "stocks");
  const k = sellStepIndex(visual);
  const label = visual === "convert" || visual === "send" ? (mode === "usdc" ? `${usd(sold.current.value)} → USDC` : `${usd(sold.current.value)} → stocks`) : usd(stage === "compose" ? value : sold.current.value);
  const addr = acct.address ? `${acct.address.slice(0, 6)}…${acct.address.slice(-4)}` : "your wallet";
  const all = (stage === "compose" ? p : sold.current.p) > 0.99;
  const heldCount = tx.withdraw.heldMask ? b.components.filter((_, i) => (tx.withdraw.heldMask! >> BigInt(i)) & 1n).length : 0;
  const walletVal = hit ? (mode === "usdc" ? usd(before.current + got) : `+${b.components.length - heldCount}`) : mode === "usdc" ? usd(bal.data ?? before.current) : "0";

  return (
    <div className="tr-sell contents">
      <SellStage recipe={recipeFor(v)} p={stage === "compose" ? p : sold.current.p} visual={visual} label={label} usdc={mode === "usdc"} walletRef={walletRef}>
        <div ref={walletRef} className={hit ? "tr-wal hit" : "tr-wal"}>
          <small>Your wallet</small>
          <div className="v num">
            <Odometer value={walletVal} />
          </div>
          <div className="u">{mode === "usdc" ? "USDC" : "stocks"}</div>
        </div>
      </SellStage>

      {stage === "compose" && (
        <div className="tr-pane">
          <div className="tr-own">
            <small className="tr-lbl">You&apos;ll {mode === "usdc" ? "sell" : "take out"}</small>
            <div className="v num">
              <Odometer value={usd(value)} />
            </div>
            <div className="d">
              of your <b className="num">{usd(held)}</b> basket
              {heldPnl && (
                <>
                  {" · "}
                  <span className={heldPnl.bps >= 0 ? "num gain" : "num loss"}>
                    {heldPnl.bps >= 0 ? "+" : "−"}
                    {Math.abs(heldPnl.bps / 100).toFixed(1)}%
                  </span>{" "}
                  since you bought
                </>
              )}
            </div>
          </div>
          <Chips label="How much" options={PCTS.map((x) => ({ v: x, label: x === "10000" ? "All" : `${Number(x) / 100}%` }))} value={pct} onPick={setPct} />

          {mode === "usdc" ? (
            <div className="tr-sellrows">
              <div>
                <span>Selling</span>
                <b>{all ? "Your whole basket" : `${bps / 100}% of your basket`}</b>
              </div>
              <div>
                <span>Trading cost</span>
                <b>{cost === null ? "—" : cost < 10_000n ? "under $0.01" : `about ${usd(cost)}`}</b>
              </div>
              <div className="tot">
                <span>To your wallet</span>
                <b className="num">{quote.loading ? "—" : <Odometer value={usd(toWallet)} />}</b>
              </div>
            </div>
          ) : (
            <div className="tr-sellrows">
              {b.components.map((c, i) => (
                <div key={c.stock.symbol}>
                  <span className="inline-flex items-center gap-2.5">
                    <i className="h-1.5 w-1.5 rounded-full" style={{ background: tintCss(c.stock.ticker) }} />
                    {c.stock.name || c.stock.ticker}
                  </span>
                  <b>
                    {formatB20(outs[i] ?? 0n, 4)} {c.stock.ticker} · {usd(valueUsd6(outs[i] ?? 0n, c.stock.price8))}
                  </b>
                </div>
              ))}
            </div>
          )}

          <div className="tr-go">
            {!acct.signedIn ? (
              <button type="button" className="a-btn a-btn--cream a-btn--lg" onClick={go}>
                Sign in
              </button>
            ) : (
              <button type="button" className="a-btn a-btn--buy a-btn--lg" disabled={sellShares === 0n} onClick={go}>
                {sellShares === 0n ? "Nothing to sell" : mode === "stocks" ? "Get the stocks" : all ? `Sell all ${usd(value)}` : `Sell ${usd(value)}`}
              </button>
            )}
          </div>
          <div className="tr-fine">
            {mode === "usdc" ? (
              <>
                {marketOpen === false ? "US market is closed, so pool prices may differ. " : `Paid out as USDC to ${addr}. Test mode. `}
                <button type="button" onClick={() => setMode("stocks")}>
                  Get the stocks instead
                </button>
              </>
            ) : (
              <>
                Stock tokens go to {addr}. Autopilot stops for these.{" "}
                <button type="button" onClick={() => setMode("usdc")}>
                  Sell for USDC instead
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {stage === "attest" && (
        <div className="tr-pane tr-attest">
          <div className="tr-disp">One thing first.</div>
          <p>I&apos;m not a US person, and this is allowed where I live.</p>
          <div className="tr-acts" style={{ marginTop: 24 }}>
            <button
              type="button"
              className="a-btn a-btn--cream"
              onClick={() => {
                attest.confirm();
                void start();
              }}
            >
              I confirm
            </button>
            <button type="button" className="a-btn a-btn--line" onClick={() => setStage("compose")}>
              Not now
            </button>
          </div>
        </div>
      )}

      {stage === "running" && (
        <div className="tr-pane">
          <Steps labels={SELL_STEPS} at={k} timed={visual === "pinch" ? DUR.pinch : visual === "convert" ? DUR.convert : visual === "send" ? DUR.send : undefined} />
          <Status title={status.title} line={status.line} />
        </div>
      )}

      {stage === "done" && (
        <div className="tr-pane">
          <h2 className="a-h1 tr-done-h">{all ? <>Basket <em>sold.</em></> : <>Sent to your <em>wallet.</em></>}</h2>
          <div className="tr-val">
            <div>
              <small>Received</small>
              <span className="v num">{mode === "usdc" ? usd(got) : `${b.components.length - heldCount} stocks`}</span>
            </div>
            <div>
              <small>Basket left</small>
              <span className="v num">{usd(leftAfter < 0n ? 0n : leftAfter)}</span>
            </div>
          </div>
          <div className="tr-left">
            {heldCount ? `${heldCount} of ${b.components.length} are held for you. Claim them from your portfolio.` : all ? "You can buy back in anytime from $5." : "The rest keeps following the basket."}
          </div>
          <div className="tr-acts" style={{ marginTop: 26 }}>
            <button
              type="button"
              className="a-btn a-btn--cream"
              onClick={() => {
                back();
                onDone();
              }}
            >
              Done
            </button>
            <a className="a-btn a-btn--line" href="/portfolio">
              View portfolio
            </a>
          </div>
        </div>
      )}

      {stage === "error" && (
        <div className="tr-pane tr-err">
          <div className="tr-disp">That didn&apos;t go through.</div>
          <p>Nothing was sold. Your basket is unchanged.</p>
          {err && <p className="why">{err}</p>}
          <div className="tr-acts">
            <button
              type="button"
              className="a-btn a-btn--cream"
              onClick={() => {
                back();
                window.setTimeout(() => void start(), 400);
              }}
            >
              Try again
            </button>
            <button type="button" className="a-btn a-btn--line" onClick={back}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

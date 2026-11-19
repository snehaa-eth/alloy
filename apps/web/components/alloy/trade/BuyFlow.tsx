"use client";

/**
 * The buy flow body shared by the phone sheet (BuySheet) and the desktop sticky panel (BuyPanel):
 * amount ($10 / $25 / $100 + input, min $5) → (sign in) → (one-time non-US check) → Approving → Pouring → Settling
 * → "You're in." with your share glowing, your basket value after the receipt, a share card and Share on X.
 *
 * Money logic is the real one: `tx` wraps lib/hooks/use-basket-tx useBuyBasket (quote → exact approve → simulate →
 * write → receipt). The animation follows tx.step via journey.ts; the drop only falls in once the receipt is in.
 * Errors: the drop bounces back and the sheet says nothing was spent (plus describeTxError's specific reason).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { TxStep } from "@/lib/tx";
import { describeTxError } from "@/lib/tx";
import { MIN_BUY_USDC } from "@/lib/strategy";
import { parseUsdc, sharesToUsd6, pnl } from "@/lib/units";
import { useFaucet } from "@/lib/hooks/use-basket-tx";
import { useUsdcBalance } from "@/lib/hooks/use-reads";
import { Odometer } from "../motion/alloy-motion";
import { MetalBasket } from "../metal/MetalBasket";
import { tintCss } from "../metal/palette";
import type { Recipe } from "../metal/shape";
import { useAccount, useAttestation, usePosition, useQuoteView } from "../hooks";
import type { BasketView } from "../basket-view";
import { BuyStage } from "./BuyStage";
import { BUY_STEPS, DUR, buyStatus, buyStepIndex, buyVisualFor, type BuyVisual } from "./journey";
import { Chips, RingMarkSmall, Status, Steps, XLogo, splitCents, usd } from "./ui";

/** The real tx, or a mock with the same shape (dev story page). */
export type BuyTx = {
  step: TxStep;
  run: (usdcIn: bigint) => Promise<unknown>;
  reset: () => void;
  /** shares received (from the simulated return value), once done */
  shares: bigint | null;
};

type Stage = "compose" | "attest" | "running" | "done" | "error";
const PRESETS = ["10", "25", "100"] as const;
const GENERIC = "That didn't go through. Nothing was spent. Try again.";

function safeParse(s: string): bigint {
  try {
    return parseUsdc(s || "0");
  } catch {
    return 0n;
  }
}

/** Recipe for the metal: target weights, creator style, address seed (same everywhere in the app). */
export function recipeFor(v: BasketView): Recipe {
  const b = v.basket;
  return { weights: b.components.map((c) => ({ ticker: c.stock.ticker, w: c.targetBps / 10_000 })), style: b.mode, seed: b.address };
}

const andList = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export function BuyFlow({
  v,
  tx,
  amount,
  setAmount,
  onDone,
  changeAt,
  onSeeChange,
  marketOpen,
  panel,
  onSell,
  onStage,
}: {
  v: BasketView;
  tx: BuyTx;
  amount: string;
  setAmount: (a: string) => void;
  /** Done on the success pane (sheet: close; panel: back to the amount) */
  onDone: () => void;
  changeAt?: number;
  onSeeChange?: () => void;
  marketOpen: boolean | null;
  /** inline desktop panel (shows your position + Sell) */
  panel?: boolean;
  onSell?: () => void;
  /** pane changes (the frame scrolls back to the top) */
  onStage?: (s: string) => void;
}) {
  const b = v.basket;
  const acct = useAccount();
  const attest = useAttestation();
  const pos = usePosition(b.address, b.totalSupply);
  const bal = useUsdcBalance();
  const faucet = useFaucet();
  const [stage, setStageRaw] = useState<Stage>("compose");
  const [visual, setVisual] = useState<BuyVisual>("amount");
  const [err, setErr] = useState("");
  const [paid, setPaid] = useState(0n);
  const [landed, setLanded] = useState(false);
  const [ok, setOk] = useState(false);
  const prevShares = useRef(0n);
  const usdc = safeParse(amount);
  const dollars = Number(usdc) / 1e6;
  const tooSmall = usdc < MIN_BUY_USDC;
  const quote = useQuoteView(b.address, "buy", stage === "compose" ? usdc : 0n, v.nav, b.totalSupply);
  const recipe = useMemo(() => recipeFor(v), [v]);
  const setStage = (s: Stage) => {
    setStageRaw(s);
    onStage?.(s);
  };

  // current-weight dollar split (real recipe, current weights), biggest first
  const parts = useMemo(
    () => b.components.map((c, i) => ({ ticker: c.stock.ticker, name: c.stock.name || c.stock.ticker, bps: v.now[i]?.bps ?? c.targetBps })).sort((x, y) => y.bps - x.bps),
    [b.components, v.now],
  );
  const shown = stage === "compose" ? usdc : paid;
  const split = splitCents(tooSmall && stage === "compose" ? 0n : shown, parts.map((p) => p.bps));
  const splitBy = useMemo(() => {
    const m = new Map<string, string>();
    parts.forEach((p, i) => m.set(p.ticker, `+${usd(split[i])}`));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts, split.join(",")]);

  // ---- real tx step → visual (never regress once the pour started) ----
  useEffect(() => {
    if (stage !== "running") return;
    setVisual((cur) => (cur === "pour" || cur === "settle" || cur === "bounce" || tx.step === "error" || tx.step === "idle" ? cur : buyVisualFor(tx.step)));
  }, [tx.step, stage]);
  // pour → settle → landed (animation clock; independent of frames so reduced motion still finishes)
  useEffect(() => {
    if (visual === "pour") {
      const id = window.setTimeout(() => setVisual("settle"), DUR.pour * 1000);
      return () => window.clearTimeout(id);
    }
    if (visual === "settle") {
      const id = window.setTimeout(() => setLanded(true), DUR.settle * 1000);
      return () => window.clearTimeout(id);
    }
    if (visual === "bounce") {
      const id = window.setTimeout(() => {
        setVisual("err");
        setStage("error");
      }, DUR.bounce * 1000);
      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visual]);
  useEffect(() => {
    if (stage === "running" && landed && ok) {
      setVisual("done");
      setStage("done");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landed, ok, stage]);

  async function start() {
    if (tooSmall) return;
    prevShares.current = pos.shares;
    setPaid(usdc);
    setLanded(false);
    setOk(false);
    setErr("");
    setVisual("approve");
    setStage("running");
    try {
      await tx.run(usdc);
      setVisual((cur) => (cur === "settle" ? cur : "pour"));
      setOk(true);
    } catch (e) {
      const m = describeTxError(e);
      setErr(m === GENERIC ? "" : m);
      setVisual("bounce");
    }
  }
  function go() {
    if (!acct.signedIn) return acct.login();
    if (!attest.attested) return setStage("attest");
    void start();
  }
  function backToAmount() {
    tx.reset();
    setVisual("amount");
    setStage("compose");
  }

  // ---- your basket after the receipt (real balance; falls back to before + shares received) ----
  const sharesAfter = pos.shares > prevShares.current ? pos.shares : prevShares.current + (tx.shares ?? 0n);
  const valueAfter = sharesToUsd6(sharesAfter, v.nav, b.totalSupply);
  const [valShown, setValShown] = useState("$0.00");
  useEffect(() => {
    if (stage !== "done") return setValShown("$0.00");
    const id = window.setTimeout(() => setValShown(usd(valueAfter)), 150);
    return () => window.clearTimeout(id);
  }, [stage, valueAfter]);

  const low = acct.signedIn && bal.data !== undefined && bal.data < usdc && !tooSmall;
  const status = buyStatus(visual, tx.step, usd(paid), parts.length);
  const k = buyStepIndex(visual);
  const handle = acct.preview ? "@asha" : acct.address ? `${acct.address.slice(0, 6)}…${acct.address.slice(-4)}` : "";
  const names = andList(parts.slice(0, 4).map((p) => p.name));
  const shareText = `I own ${b.name} on @alloy_fi: ${names}${parts.length > 4 ? " and more" : ""} in one basket.`;
  const costUsd6 = quote.costUsd6;
  const impact = quote.impactBps !== null && quote.impactBps > 50 ? quote.impactBps : null;
  const feeYear = (usdc * BigInt(b.feeBps)) / 10_000n;
  const held = sharesToUsd6(pos.shares, v.nav, b.totalSupply);
  const heldPnl = pos.costUsd6 ? pnl(held, pos.costUsd6) : null;
  const dropLabel = tooSmall ? usd(usdc) : `+ ${usd(usdc)}`;

  return (
    <>
      <BuyStage recipe={recipe} amount={stage === "compose" || stage === "attest" ? dollars : Number(paid) / 1e6} visual={visual} label={dropLabel} splitLabel={(t) => splitBy.get(t) ?? ""} />

      {stage === "compose" && (
        <div className="tr-pane">
          <label className={tooSmall ? "tr-amt num low" : "tr-amt num"}>
            <span className="cur">$</span>
            <input
              inputMode="decimal"
              aria-label="Amount in dollars"
              autoComplete="off"
              value={amount}
              style={{ width: `${Math.max(1, amount.length) + 0.15}ch` }}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d.]/g, "");
                const [i, f] = raw.split(".");
                setAmount((f !== undefined ? `${i.slice(0, 6)}.${f.slice(0, 2)}` : i.slice(0, 6)) || "");
              }}
            />
          </label>
          <div className={tooSmall ? "tr-min on" : "tr-min"} aria-live="polite">
            Minimum is $5
          </div>
          <Chips label="Amount" options={PRESETS.map((p) => ({ v: p, label: `$${p}` }))} value={(PRESETS as readonly string[]).includes(amount) ? (amount as (typeof PRESETS)[number]) : null} onPick={setAmount} />

          <div className="tr-get">
            <div className="tr-lbl">You get</div>
            <div className="tr-rows">
              {parts.map((p, i) => (
                <div key={p.ticker}>
                  <i style={{ background: tintCss(p.ticker) }} />
                  {p.name}
                  <span className="ln" />
                  <b>
                    <Odometer value={usd(split[i])} />
                  </b>
                </div>
              ))}
            </div>
          </div>
          <div className="tr-costs">
            <div>
              <span>Trading cost</span>
              <span className={impact ? "warn" : undefined}>
                {tooSmall || quote.loading || costUsd6 === null ? "—" : costUsd6 < 10_000n ? "under $0.01" : `about ${usd(costUsd6)}`}
                {impact && !tooSmall ? ` · ${(impact / 100).toFixed(1)}%` : ""}
              </span>
            </div>
            <div>
              <span>Yearly fee</span>
              <span>
                {b.feeBps / 100}% · about {usd(tooSmall ? 0n : feeYear)} a year
              </span>
            </div>
            <div>
              <span>Creator gets</span>
              <span>80% of the fee</span>
            </div>
            <div>
              <span>Pay with</span>
              <span>Test USDC</span>
            </div>
          </div>
          {changeAt && (
            <div className="tr-note">
              <span>The recipe changes soon.</span>
              {onSeeChange && (
                <button type="button" className="tr-link" onClick={onSeeChange}>
                  See
                </button>
              )}
            </div>
          )}
          {low && (
            <div className="tr-note">
              <span className="num">You have {usd(bal.data ?? 0n)} in test USDC.</span>
              <button type="button" className="tr-link" disabled={faucet.isPending} onClick={() => faucet.mutate()}>
                {faucet.isPending ? "Getting it…" : "Get test money"}
              </button>
            </div>
          )}
          <div className="tr-go">
            {acct.signedIn ? (
              <button type="button" className="a-btn a-btn--buy a-btn--lg" data-buy-primary disabled={tooSmall || low} onClick={go}>
                {tooSmall ? "Minimum is $5" : `Buy ${usd(usdc)}`}
              </button>
            ) : (
              <button type="button" className="a-btn a-btn--cream a-btn--lg" data-buy-primary onClick={go}>
                Sign in to buy
              </button>
            )}
          </div>
          <div className="tr-fine">{marketOpen === false ? "US market is closed, so your price may differ a little." : "Test mode. Prices are real, money is pretend."}</div>
          {panel && pos.shares > 0n && (
            <div className="tr-held">
              <span>
                Your basket <b>{usd(held)}</b>
                {heldPnl && <span className={heldPnl.bps >= 0 ? "gain" : "loss"}> {heldPnl.bps >= 0 ? "+" : "−"}{Math.abs(heldPnl.bps / 100).toFixed(1)}%</span>}
              </span>
              {onSell && (
                <button type="button" className="a-btn a-btn--line a-btn--sm" onClick={onSell}>
                  Sell
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {stage === "attest" && (
        <div className="tr-pane tr-attest">
          <div className="tr-disp">One thing first.</div>
          <p>I&apos;m not a US person, and this is allowed where I live.</p>
          <p className="mt-2 text-[12.5px]" style={{ color: "var(--dim)" }}>
            You own a token that tracks these stocks, not the shares themselves.
          </p>
          <div className="tr-acts" style={{ marginTop: 24 }}>
            <button
              type="button"
              className="a-btn a-btn--buy"
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
          <Steps labels={BUY_STEPS} at={k} timed={visual === "settle" ? DUR.settle : visual === "pour" ? DUR.pour : undefined} />
          <Status title={status.title} line={status.line} />
          <div className="tr-sum">
            <div className="tr-lbl">You get</div>
            <div className="tr-sumline num">
              {parts.map((p, i) => (
                <span key={p.ticker}>
                  {i > 0 && " · "}
                  <b>{usd(split[i])}</b> {p.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {stage === "done" && (
        <div className="tr-pane">
          <h2 className="a-h1 tr-done-h">
            You&apos;re <em>in.</em>
          </h2>
          <div className="tr-val">
            <div>
              <small>Your basket</small>
              <span className="v num">
                <Odometer value={valShown} />
              </span>
            </div>
            <div>
              <small>You added</small>
              <span className="v num">
                <Odometer value={`+${usd(paid)}`} roll={false} />
              </span>
            </div>
          </div>
          <div className="tr-share">
            <MetalBasket recipe={recipe} glow={1} zoom={4.3} className="ss" style={{ position: "absolute" }} />
            <div className="mk">
              <RingMarkSmall />
              ALLOY
            </div>
            <div className="txt">
              <small>I own</small>
              <b>{b.name}</b>
              {handle && <span>{handle} · on Alloy</span>}
            </div>
          </div>
          <div className="tr-acts">
            <a className="a-btn a-btn--cream" href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">
              <XLogo />
              Share on X
            </a>
            <button
              type="button"
              className="a-btn a-btn--line"
              onClick={() => {
                backToAmount();
                onDone();
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {stage === "error" && (
        <div className="tr-pane tr-err">
          <div className="tr-disp">That didn&apos;t go through.</div>
          <p>
            Nothing was spent. Your <span className="num">{usd(paid)}</span> is still in your wallet.
          </p>
          {err && <p className="why">{err}</p>}
          <div className="tr-acts">
            <button
              type="button"
              className="a-btn a-btn--buy"
              onClick={() => {
                backToAmount();
                window.setTimeout(() => void start(), 500);
              }}
            >
              Try again
            </button>
            <button type="button" className="a-btn a-btn--line" onClick={backToAmount}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

/**
 * Basket page (approved liquid-metal design, docs/design/artdir/wow/app/basket.html) on real data:
 * live sculpture (Weights / Today), title + creator + style, return since start, value chart, recipe,
 * "what happens when one wins" for this basket's style, history replay from real rebalance events, key facts.
 * Desktop: sticky BuyPanel on the right. Phone: bottom bar opening BuySheet / ExitSheet. ?buy= and ?sheet= kept.
 */
import { useEffect, useState } from "react";
import { RefreshCw, Scale, Sparkles, XCircle } from "lucide-react";
import { CreatorAvatar, isNew } from "../v5/parts";
import { BuyPanel } from "../v5/BuyPanel";
import type { Performance, RebalanceEvent } from "@/lib/types";
import { STYLES, styleOf } from "../styles";
import { DEFAULT_CHAIN, explorerTxUrl } from "@/lib/chains";
import { usMarketStatus } from "@/lib/market";
import { formatUsd6, sharesToUsd6, pnl } from "@/lib/units";
import { storyDisclosure } from "@/components/compliance/copy";
import { Countdown } from "../Countdown";
import { ValueChart } from "../ValueChart";
import { StatusSignal } from "../status";
import { fmtPct } from "../primitives";
import { cn } from "@/lib/utils";
import { compactUsd6, longDate, pendingChange, shortDate, tickerOf, type BasketView } from "../basket-view";
import { usePosition } from "../hooks";
import { BuySheet } from "../flows/BuySheet";
import { ExitSheet } from "../flows/ExitSheet";
import { AddMoneySheet, ChangeSheet, StrategySheet } from "../flows/NoticeSheets";
import { OdometerOnView, Rise, WordReveal } from "../motion/alloy-motion";
import { HeroStage } from "../basket/HeroStage";
import type { DayMoves } from "../explore/data";
import { FactsSection, HistorySection, RecipeRows, SecHead, WinsSection, countWord } from "../basket/Sections";

type SheetId = "buy" | "exit" | "stocks" | "change" | "money" | "strategy" | null;

/** "The AI Build-Out" → ["The AI", "Build-Out"]: the last word carries the accent. */
function splitName(name: string): [string, string] {
  const i = name.trim().lastIndexOf(" ");
  return i < 0 ? ["", name] : [name.slice(0, i), name.slice(i + 1)];
}

const signedPct = (bps: number) => (Math.abs(bps) < 5 ? "0.0%" : `${bps > 0 ? "+" : "−"}${(Math.abs(bps) / 100).toFixed(1)}%`);

/** Follow: no follow backend yet, so it's remembered on this device only. */
function useLocalFollow(address: string) {
  const key = `alloy:follow:${address.toLowerCase()}`;
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      setOn(window.localStorage.getItem(key) === "1");
    } catch {}
  }, [key]);
  const toggle = () =>
    setOn((x) => {
      try {
        if (x) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, "1");
      } catch {}
      return !x;
    });
  return [on, toggle] as const;
}

export function BasketScreen({
  v,
  perf,
  events,
  moves,
  testnet = false,
  initialBuy,
  initialSheet,
}: {
  v: BasketView;
  perf: Performance;
  events: RebalanceEvent[];
  /** real recent price move per ticker (fraction) and its window in hours; null when the feeds can't say */
  moves?: DayMoves | null;
  testnet?: boolean;
  initialBuy?: string;
  initialSheet?: string;
}) {
  const b = v.basket;
  const pos = usePosition(b.address, b.totalSupply);
  const [sheet, setSheet] = useState<SheetId>(null);
  const [buyAmount, setBuyAmount] = useState(initialBuy ?? "25");
  const [market, setMarket] = useState<boolean | null>(null);
  const [following, toggleFollow] = useLocalFollow(b.address);
  const change = pendingChange(events, b);
  const heldUsd6 = sharesToUsd6(pos.shares, v.nav, b.totalSupply);
  const holding = pos.shares > 0n;
  const style = styleOf(b);
  const mode = STYLES[style];
  const fresh = isNew(v);

  // Height of the app's fixed bottom tab bar (0 when hidden at md+), so the buy bar sits flush on it.
  const [navH, setNavH] = useState<number | null>(null);
  // Height of the sticky header, so the desktop buy panel sticks just under it.
  const [headH, setHeadH] = useState(112);
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>("nav.c-nav");
    const head = document.querySelector<HTMLElement>("header.a-nav");
    const measure = () => {
      setNavH(nav && getComputedStyle(nav).display !== "none" ? nav.getBoundingClientRect().height : 0);
      if (head) setHeadH(Math.round(head.getBoundingClientRect().height));
    };
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (nav) ro.observe(nav);
    if (head) ro.observe(head);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    setMarket(usMarketStatus().open);
    if (initialBuy) {
      // Desktop: the right panel IS the buy flow (no modal). Mobile: open the sheet.
      if (window.matchMedia("(min-width: 1024px)").matches) focusPanel();
      else setSheet("buy");
    } else if (initialSheet === "exit" || initialSheet === "change" || initialSheet === "stocks") setSheet(initialSheet);
  }, [initialBuy, initialSheet]);

  function focusPanel() {
    const el = document.getElementById("buy-panel");
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    (el?.querySelector("[data-buy-primary]") as HTMLButtonElement | null)?.focus({ preventScroll: true });
  }

  // Keep buy intent in the URL so a killed tab (mail app switch) recovers it.
  function openSheet(s: SheetId, amount?: string) {
    if (amount) setBuyAmount(amount);
    setSheet(s);
    const url = new URL(window.location.href);
    url.searchParams.delete("buy");
    url.searchParams.delete("sheet");
    if (s === "buy") url.searchParams.set("buy", amount ?? buyAmount);
    else if (s === "exit" || s === "change" || s === "stocks") url.searchParams.set("sheet", s);
    window.history.replaceState(null, "", url);
  }

  const executed = events.filter((e) => e.status === "executed");
  const ticks = executed.map((e) => ({ t: e.at, label: e.reason ?? (e.kind === "drift-trim" ? "Took some profit" : "Recipe changed") }));
  const position = holding && pos.costUsd6 !== null ? pnl(heldUsd6, pos.costUsd6) : null;
  const nowW = v.now.map((p) => p.bps / 10_000);
  const mv = moves ? v.tickers.map((t) => (t in moves.pct ? moves.pct[t] : null)) : null;
  const [lead, accent] = splitName(b.name);
  const stake = compactUsd6(v.creatorStakeUsd6).replace(/\.\d+$/, "");
  const grown = 100 * (1 + v.sinceBps / 10_000);
  const n = v.tickers.length;
  const chartKind = v.series.length >= 3 ? "value" : v.artSeries.length >= 3 ? "recipe" : null;

  return (
    <div>
      {holding && change && <StatusSignal id={`change-${b.address}`} signal={{ kind: "change", text: `${b.name} changes soon`, href: `/b/${b.address}?sheet=change` }} />}

      <div className="mx-auto grid max-w-[1480px] gap-[clamp(32px,4vw,64px)] px-[var(--gut)] pb-32 pt-6 md:pt-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:pb-16 xl:grid-cols-[minmax(0,1fr)_372px]">
        <div className="min-w-0">
          <HeroStage tickers={v.tickers} now={nowW} moves={mv} hours={moves?.hours ?? 24} style={style} seed={b.address.toLowerCase()} />

          {/* title */}
          <div className="mt-7 md:mt-10">
            <Rise className="a-eyebrow">{b.demo ? "Demo basket" : "Basket"}</Rise>
            <WordReveal as="h1" immediate className="a-h1 mt-3.5 block !text-[40px] md:!text-[clamp(40px,5vw,76px)]">
              {lead ? `${lead} ` : ""}
              <em>{accent}</em>
            </WordReveal>
            <Rise className="mt-[22px] flex flex-wrap items-center gap-2.5 text-[13px] text-mute md:gap-3.5 md:text-[13.5px]" delay={250}>
              <CreatorAvatar handle={b.creator.handle} seed={b.creator.address} size={34} />
              <span>
                by <b className="font-semibold text-ink">@{b.creator.handle}</b>
              </span>
              <i className="hidden h-[3px] w-[3px] rounded-full bg-dim md:block" />
              <span className="inline-flex h-[30px] items-center gap-[5px] rounded-full bg-fill px-3 text-[12.5px] text-ink">
                Has <span className="num font-semibold">{stake}</span> in it
              </span>
              {b.followers > 0 && (
                <>
                  <i className="hidden h-[3px] w-[3px] rounded-full bg-dim md:block" />
                  <span>
                    <span className="num">{b.followers.toLocaleString("en-US")}</span> {b.followers === 1 ? "follower" : "followers"}
                  </span>
                </>
              )}
              <button
                type="button"
                onClick={toggleFollow}
                aria-pressed={following}
                title="Saved on this device"
                className={cn("a-btn a-btn--sm", following ? "a-btn--cream" : "a-btn--line")}
              >
                {following ? "Following" : "Follow"}
              </button>
            </Rise>
            <Rise className="mt-[26px] flex flex-wrap items-center gap-3.5" delay={380}>
              <button
                type="button"
                onClick={() => setSheet("strategy")}
                className="inline-flex h-[34px] items-center gap-2 rounded-full border border-line2 px-3.5 text-[13px] font-medium transition-colors hover:border-[rgba(243,241,238,0.55)]"
                aria-label={`Creator style: ${mode.label}. What does this mean?`}
              >
                <mode.icon size={14} strokeWidth={1.5} aria-hidden /> {mode.label}
              </button>
              <p className="text-[14px] text-mute">{mode.line}</p>
            </Rise>
            {(b.thesis?.trim() || b.story) && (
              <Rise className="mt-5 max-w-[62ch]">
                {b.thesis?.trim() && <p className="text-[15px] leading-relaxed text-mute">{b.thesis.trim()}</p>}
                {b.story && <p className="mt-1 text-[12.5px] text-dim">{storyDisclosure(b.story.source, b.story.disclosureDate)}</p>}
              </Rise>
            )}
          </div>

          {change && (
            <button
              type="button"
              onClick={() => openSheet("change")}
              className="mt-8 flex w-full items-center gap-3 rounded-[18px] border border-line2 px-5 py-4 text-left transition-colors hover:border-[rgba(243,241,238,0.45)]"
              aria-label="See the pending recipe change"
            >
              <RefreshCw size={16} strokeWidth={1.5} aria-hidden />
              <span className="flex-1 text-[14px]">A recipe change is coming</span>
              <span className="num text-[13px] text-mute">
                <Countdown to={change.executableAt ?? change.at} dueLabel="due" />
              </span>
            </button>
          )}

          {/* returns */}
          <Rise className="mt-[46px] grid grid-cols-1 items-end gap-6 border-t border-line pt-[30px] md:grid-cols-[auto_1fr] md:gap-x-14">
            <div>
              <span className="a-kicker">Return since start</span>
              {fresh ? (
                <>
                  <div className="mt-2.5 font-display text-[64px] font-extralight leading-[0.95] tracking-[-0.045em] text-mute md:text-[clamp(56px,6.4vw,92px)]">New</div>
                  <div className="mt-2.5 text-[13px] text-mute">Started {longDate(b.createdAt)}. Returns show after a day of history.</div>
                </>
              ) : (
                <>
                  <div className={cn("mt-2.5 flex font-display text-[64px] font-extralight leading-[0.95] tracking-[-0.045em] md:text-[clamp(56px,6.4vw,92px)]", Math.abs(v.sinceBps) < 5 ? "text-mute" : v.sinceBps > 0 ? "gain" : "loss")}>
                    <OdometerOnView value={signedPct(v.sinceBps)} />
                  </div>
                  <div className="mt-2.5 text-[13px] text-mute">
                    $100 put in on {longDate(v.sinceDate)} is now <span className="num text-ink">${grown.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-7 md:justify-end md:gap-10">
              {(
                [
                  ["Stocks", String(n)],
                  ["Changes", String(executed.length)],
                  ["Fee", `${b.feeBps / 100}% a year`],
                  ["In basket", compactUsd6(v.nav)],
                ] as const
              ).map(([k, val]) => (
                <div key={k}>
                  <span className="a-kicker">{k}</span>
                  <span className="num mt-1.5 block font-display text-[21px] font-light tracking-[-0.02em] md:text-[24px]">{val}</span>
                </div>
              ))}
            </div>
          </Rise>

          {chartKind && (
            <section className="mt-20 md:mt-[110px]">
              <ValueChart values={chartKind === "value" ? v.series : v.artSeries} times={chartKind === "value" ? v.times : []} ticks={ticks} kind={chartKind} />
            </section>
          )}

          <section className="mt-20 md:mt-[110px]">
            <SecHead
              eyebrow="Recipe"
              title={
                <>
                  {countWord(n)} {n === 1 ? "company" : "companies"}, <em>one</em> idea.
                </>
              }
              side={<p className="a-lede max-w-[28ch]">Every $1 you put in splits like this. The line shows the plan.</p>}
            />
            <RecipeRows v={v} moves={mv} hours={moves?.hours ?? 24} />
          </section>

          <WinsSection v={v} style={style} capBps={b.bands?.capBps} />

          <HistorySection v={v} events={events} onOpenPending={() => openSheet("change")} />

          <FactsSection feeBps={b.feeBps} noticeSeconds={b.noticeSeconds} testnet={testnet} />

          <p className="mt-16 text-[12px] text-dim">
            Contract <span className="num">{`${b.address.slice(0, 8)}…${b.address.slice(-6)}`}</span> on {DEFAULT_CHAIN.name}. Value uses oracle prices; buys fill at pool prices. You own a token that
            tracks these stocks, not the shares themselves.
          </p>
        </div>

        {/* Desktop: the buy panel stays in view while the page scrolls. */}
        <aside className="hidden lg:sticky lg:block lg:self-start" style={{ top: headH + 20 }}>
          <BuyPanel
            v={v}
            amount={buyAmount}
            setAmount={setBuyAmount}
            holding={holding}
            heldUsd6={heldUsd6}
            positionBps={position?.bps ?? null}
            onExit={() => openSheet("exit")}
            onAddMoney={() => setSheet("money")}
          />
          {testnet && <p className="mt-3.5 px-1.5 text-[12px] text-dim">Test mode: prices are real, money is pretend.</p>}
        </aside>
      </div>

      {/* Phone / tablet: one bar flush on the tab bar (measured). */}
      <div
        data-buy-bar
        className={cn(
          "fixed inset-x-0 z-30 border-t border-line bg-black/[0.72] px-4 py-3 backdrop-blur-[18px] lg:hidden",
          navH === null && "bottom-[53px] md:bottom-0",
        )}
        style={navH === null ? undefined : { bottom: navH }}
      >
        <div className="mx-auto flex max-w-[640px] items-center justify-between gap-3">
          <div className="min-w-0">
            {holding ? (
              <>
                <span className="block text-[10px] uppercase tracking-[0.18em] text-dim">Your value</span>
                <span className="num block font-display text-[22px] font-light tracking-[-0.02em]">{formatUsd6(heldUsd6)}</span>
              </>
            ) : fresh ? (
              <>
                <span className="block text-[10px] uppercase tracking-[0.18em] text-dim">Return</span>
                <span className="block font-display text-[22px] font-light tracking-[-0.02em] text-mute">New</span>
              </>
            ) : (
              <>
                <span className="block text-[10px] uppercase tracking-[0.18em] text-dim">Since start</span>
                <span className={cn("num block font-display text-[22px] font-light tracking-[-0.02em]", Math.abs(v.sinceBps) < 5 ? "text-mute" : v.sinceBps > 0 ? "gain" : "loss")}>{signedPct(v.sinceBps)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {holding && (
              <button type="button" className="a-btn a-btn--line" onClick={() => openSheet("exit")}>
                Sell
              </button>
            )}
            <button type="button" className="a-btn a-btn--buy a-btn--lg !h-12" onClick={() => openSheet("buy", buyAmount)}>
              {holding ? "Buy more" : "Buy from $5"}
            </button>
          </div>
        </div>
      </div>

      <BuySheet
        v={v}
        open={sheet === "buy"}
        onOpenChange={(o) => (o ? setSheet("buy") : openSheet(null))}
        initial={buyAmount}
        changeAt={change?.executableAt}
        onSeeChange={() => openSheet("change")}
        onAddMoney={() => setSheet("money")}
        marketOpen={market}
      />
      <ExitSheet
        v={v}
        shares={pos.shares}
        open={sheet === "exit" || sheet === "stocks"}
        initialMode={sheet === "stocks" ? "stocks" : "usdc"}
        onOpenChange={(o) => !o && openSheet(null)}
        marketOpen={market}
      />
      {change && (
        <ChangeSheet v={v} change={change} heldUsd6={heldUsd6} open={sheet === "change"} onOpenChange={(o) => !o && openSheet(null)} onExit={() => openSheet("exit")} />
      )}
      <AddMoneySheet open={sheet === "money"} onOpenChange={(o) => !o && setSheet("buy")} backLabel="Back to buy" />
      <StrategySheet mode={style} open={sheet === "strategy"} onOpenChange={(o) => !o && setSheet(null)} />
    </div>
  );
}

export function ChangeFeed({ v, events, onOpenPending }: { v: BasketView; events: RebalanceEvent[]; onOpenPending?: () => void }) {
  const b = v.basket;
  if (events.length === 0)
    return (
      <div className="c-row">
        <span className="c-rowicon">
          <Scale size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="c-row__main">
          <span className="c-row__title">No changes yet</span>
          <span className="c-row__meta">Following the creator&apos;s plan</span>
        </div>
      </div>
    );
  return (
    <div className="c-list">
      {events.map((e) => {
        const I = e.status === "cancelled" ? XCircle : e.kind === "drift-trim" ? Scale : RefreshCw;
        const diff = e.kind === "drift-trim" && e.status === "executed" ? rebalanceLine(b, e) : e.changes.map((c) => `${tickerOf(b, c.symbol)} ${fmtPct(c.fromBps)}→${fmtPct(c.toBps)}`).join("  ");
        const title =
          e.status === "pending" ? "Change pending" : e.status === "cancelled" ? "Change cancelled" : e.kind === "drift-trim" ? "Rebalanced" : "Recipe changed";
        const row = (
          <>
            <span className="c-rowicon" style={e.status === "pending" ? { color: "var(--hi)" } : undefined}>
              <I size={18} strokeWidth={1.75} aria-hidden />
            </span>
            <div className="c-row__main">
              <span className="c-row__title">
                {title}
                {e.aiGenerated && (
                  <span className="t-mono c2 ml-2 inline-flex items-center gap-1">
                    <Sparkles size={11} aria-hidden /> AI
                  </span>
                )}
              </span>
              <span className="c-row__meta truncate">{diff}</span>
            </div>
            <div className="c-row__end">
              <span>{e.costBps !== undefined ? `cost ${(e.costBps / 100).toFixed(2)}%` : e.status === "pending" ? "needs you" : ""}</span>
              <span className="c2">{shortDate(e.at)}</span>
            </div>
          </>
        );
        if (e.status === "pending" && onOpenPending)
          return (
            <button key={e.id} type="button" className="c-row w-full bg-transparent text-left" onClick={onOpenPending}>
              {row}
            </button>
          );
        if (e.txHash)
          return (
            <a key={e.id} className="c-row" href={explorerTxUrl(DEFAULT_CHAIN.id, e.txHash)} target="_blank" rel="noreferrer">
              {row}
            </a>
          );
        return (
          <div key={e.id} className="c-row">
            {row}
          </div>
        );
      })}
    </div>
  );
}

/** Plain-language line: "Took some profit: NVIDIA 46% → 40%, spread to the others." */
function rebalanceLine(b: BasketView["basket"], e: RebalanceEvent): string {
  const big = [...e.changes].sort((x, y) => y.fromBps - y.toBps - (x.fromBps - x.toBps))[0];
  if (!big) return "Moved a little between stocks.";
  const c = b.components.find((x) => x.stock.symbol === big.symbol);
  const name = c?.stock.name || tickerOf(b, big.symbol);
  const moved = Math.max(0, big.fromBps - big.toBps);
  void moved;
  return `Took some profit: ${name} ${fmtPct(big.fromBps)}% → ${fmtPct(big.toBps)}%, spread to the others.`;
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, FlaskConical, Info, RefreshCw, Scissors, Sparkles, XCircle } from "lucide-react";
import { CreatorAvatar, Logos, ReturnValue, daysSince, returnsOf, thesisOf } from "../v5/parts";
import { BuyPanel, Card, NewChart } from "../v5/BuyPanel";
import type { Performance, RebalanceEvent } from "@/lib/types";
import { STRATEGY_MODES } from "@/lib/strategy";
import { DEFAULT_CHAIN, explorerTxUrl } from "@/lib/chains";
import { usMarketStatus } from "@/lib/market";
import { formatUsd6, sharesToUsd6, pnl } from "@/lib/units";
import { storyDisclosure } from "@/components/compliance/copy";
import { Countdown } from "../Countdown";
import { ValueChart } from "../ValueChart";
import { StatusSignal } from "../status";
import { AlloyBar, Button, Signed, StockLogo, fmtPct } from "../primitives";
import { compactUsd6, pendingChange, shortDate, tickerOf, type BasketView } from "../basket-view";
import { usePosition } from "../hooks";
import { BuySheet } from "../flows/BuySheet";
import { ExitSheet } from "../flows/ExitSheet";
import { AddMoneySheet, ChangeSheet, StrategySheet } from "../flows/NoticeSheets";

type SheetId = "buy" | "exit" | "stocks" | "change" | "money" | "strategy" | null;

export function BasketScreen({
  v,
  perf,
  events,
  initialBuy,
  initialSheet,
}: {
  v: BasketView;
  perf: Performance;
  events: RebalanceEvent[];
  initialBuy?: string;
  initialSheet?: string;
}) {
  const b = v.basket;
  const pos = usePosition(b.address, b.totalSupply);
  const [sheet, setSheet] = useState<SheetId>(null);
  const [buyAmount, setBuyAmount] = useState(initialBuy ?? "25");
  const [thesisOpen, setThesisOpen] = useState(false);
  const [market, setMarket] = useState<boolean | null>(null);
  const change = pendingChange(events, b);
  const heldUsd6 = sharesToUsd6(pos.shares, v.nav, b.totalSupply);
  const holding = pos.shares > 0n;
  const mode = STRATEGY_MODES[b.mode];

  useEffect(() => {
    setMarket(usMarketStatus().open);
    if (initialBuy) setSheet("buy");
    else if (initialSheet === "exit" || initialSheet === "change" || initialSheet === "stocks") setSheet(initialSheet);
  }, [initialBuy, initialSheet]);

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

  const ticks = events
    .filter((e) => e.status === "executed")
    .map((e) => ({ t: e.at, label: e.reason ?? (e.kind === "drift-trim" ? "Trim" : "Recipe change") }));

  const position = holding && pos.costUsd6 !== null ? pnl(heldUsd6, pos.costUsd6) : null;

  const r = returnsOf(v, perf);
  const sorted = b.components.map((c, i) => ({ c, i })).sort((x, y) => y.c.targetBps - x.c.targetBps);

  return (
    <div>
      {holding && change && (
        <StatusSignal id={`change-${b.address}`} signal={{ kind: "change", text: `${b.name} changes soon`, href: `/b/${b.address}?sheet=change` }} />
      )}

      <div className="mx-auto max-w-app px-4 pb-40 pt-4 md:px-8 md:pt-6 lg:pb-12">
        <Link href="/explore" className="inline-flex min-h-[40px] items-center gap-1.5 text-[14px] text-tx2 no-underline hover:text-tx">
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden /> Explore
        </Link>

        <div className="mt-2 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          <div className="flex min-w-0 flex-col gap-6">
            {/* Cover hero */}
            <div className="relative h-[220px] overflow-hidden rounded-[24px] md:h-[300px]" style={{ background: `var(--j-${v.id.tone}-d)` }}>
              <Image src={v.id.coverSrcLg} alt="" fill priority sizes="(min-width: 1024px) 860px, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 md:p-8">
                <div className="flex flex-wrap gap-2">
                  {b.demo && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-medium text-tx3 backdrop-blur">
                      <FlaskConical size={12} strokeWidth={1.75} aria-hidden /> Demo
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSheet("strategy")}
                    className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-medium text-tx3 backdrop-blur hover:text-tx"
                    aria-label={`Strategy: ${mode.label}. What does this mean?`}
                  >
                    {mode.label} <Info size={12} strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
                <h1 className="text-[30px] font-semibold leading-[1.05] tracking-tight md:text-[44px]">{b.name}</h1>
              </div>
            </div>

            {/* Creator + thesis */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <CreatorAvatar handle={b.creator.handle} seed={b.creator.address} size={44} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-semibold">@{b.creator.handle}</span>
                  <span className="text-[13px] text-tx2">
                    Creator · <span className="gold">{compactUsd6(v.creatorStakeUsd6)} in</span>
                  </span>
                </div>
                <Logos tickers={v.tickers} max={5} />
              </div>
              <div className="flex flex-col gap-1">
                <p className={thesisOpen ? "text-[16px] leading-relaxed text-tx3" : "line-clamp-3 text-[16px] leading-relaxed text-tx3"}>{thesisOf(v)}</p>
                {!thesisOpen && b.thesis.length > 180 && (
                  <button type="button" className="c-link self-start !min-h-0" onClick={() => setThesisOpen(true)}>
                    More
                  </button>
                )}
                {b.story && <p className="text-[13px] text-tx2">{storyDisclosure(b.story.source, b.story.disclosureDate)}</p>}
              </div>
            </div>

            {/* Value + chart */}
            <Card>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] text-tx2">Value per token</span>
                  <span className="font-display text-[40px] leading-none md:text-[48px]">{formatUsd6(v.navPerShare)}</span>
                </div>
                <span className="text-[14px]">
                  <Signed bps={v.sinceBps} /> <span className="c2">since {shortDate(v.sinceDate)}</span>
                </span>
              </div>
              <div className="mt-5">
                {v.series.length >= 3 ? (
                  <ValueChart values={v.series} times={v.times} tone={v.id.tone} ticks={ticks} height={180} />
                ) : (
                  <NewChart series={v.artSeries} tone={v.id.tone} />
                )}
              </div>
            </Card>

            {/* Did followers win? + Skin in the game (UX_MAP §3.3, COPY basket page) */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-[18px] font-semibold tracking-tight">Did followers win too?</h2>
                </div>
                {b.followers === 0 ? (
                  <div className="mt-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between rounded-[14px] bg-s2 px-4 py-3">
                      <span className="text-[14px] text-tx3">Creator</span>
                      <ReturnValue bps={r.creator} className="text-[20px] font-semibold" />
                    </div>
                    <button type="button" onClick={() => openSheet("buy", buyAmount)} className="c-btn c-btn--secondary !h-11 !rounded-full">
                      Be Founding Follower #1
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-2">
                    {[
                      ["Followers (avg)", r.followers],
                      ["Creator", r.creator],
                    ].map(([k, bps]) => (
                      <div key={k as string} className="flex items-center justify-between rounded-[14px] bg-s2 px-4 py-3">
                        <span className="text-[14px] text-tx3">{k as string}</span>
                        <ReturnValue bps={bps as number | null} className="text-[20px] font-semibold" />
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-[12px] text-tx2" suppressHydrationWarning>
                  {r.creator === null ? daysSince(b.createdAt) < 1 ? "New · first day of history" : `New · ${daysSince(b.createdAt)} days of history` : "Fees included. Past, not promised."}
                </p>
              </Card>
              <Card>
                <h2 className="text-[18px] font-semibold tracking-tight">Skin in the game</h2>
                <div className="mt-4 flex items-center gap-3">
                  <CreatorAvatar handle={b.creator.handle} seed={b.creator.address} size={40} />
                  <div className="flex flex-col">
                    <span className="font-display text-[32px] leading-none gold">{compactUsd6(v.creatorStakeUsd6)}</span>
                    <span className="mt-1 text-[13px] text-tx2">
                      @{b.creator.handle} · {v.creatorStakeBps < 100 ? "under 1%" : `${Math.round(v.creatorStakeBps / 100)}%`} of basket
                    </span>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-s2">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, v.creatorStakeBps / 100)}%`, background: "var(--gold)" }} />
                </div>
              </Card>
            </div>

            {change && (
              <button
                type="button"
                onClick={() => openSheet("change")}
                className="c-banner c-banner--notice w-full cursor-pointer text-left"
                aria-label="See the pending recipe change"
              >
                <RefreshCw aria-hidden />
                <span className="flex-1">Recipe change pending</span>
                <span className="t-num">
                  <Countdown to={change.executableAt ?? change.at} dueLabel="due" />
                </span>
              </button>
            )}

            {/* What's inside */}
            <Card>
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="inside" className="text-[18px] font-semibold tracking-tight">
                  What&apos;s inside
                </h2>
                <span className="text-[13px] text-tx2">{v.tickers.length} stocks</span>
              </div>
              <div className="mt-4">
                <AlloyBar parts={v.target} tone={v.id.tone} legend={false} />
              </div>
              <div className="mt-2 flex flex-col">
                {sorted.map(({ c, i }) => {
                  const drift = v.now[i].bps - c.targetBps;
                  return (
                    <div key={c.stock.symbol} className="c-row">
                      <StockLogo ticker={c.stock.ticker} size="lg" />
                      <div className="c-row__main">
                        <span className="c-row__title font-medium">{c.stock.name || c.stock.ticker}</span>
                        <span className="c-row__meta">
                          <span className="t-num">{c.stock.ticker}</span> · target {fmtPct(c.targetBps)}%
                        </span>
                      </div>
                      <div className="hidden w-[140px] sm:block">
                        <div className="h-1.5 overflow-hidden rounded-full bg-s2">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, v.now[i].bps / 100)}%`, background: `var(--j-${v.id.tone})` }} />
                        </div>
                      </div>
                      <div className="c-row__end w-[72px]">
                        <span className="t-body">{fmtPct(v.now[i].bps)}%</span>
                        <span className={Math.abs(drift) < 5 ? "c2" : drift >= 0 ? "up" : "down"}>
                          {Math.abs(drift) < 5 ? "on target" : `${drift >= 0 ? "▲" : "▼"} ${Math.abs(drift / 100).toFixed(1)} pts`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Changes */}
            <Card>
              <h2 id="changes" className="text-[18px] font-semibold tracking-tight">
                What changed and why
              </h2>
              <div className="mt-2">
                <ChangeFeed v={v} events={events} onOpenPending={() => openSheet("change")} />
              </div>
            </Card>

            <details className="group rounded-[20px] border border-white/[0.07] bg-s1 px-5 py-4 md:px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[16px] font-semibold">
                Details <ChevronDown size={16} className="transition group-open:rotate-180" aria-hidden />
              </summary>
              <dl className="mt-3 flex flex-col">
                {[
                  ["Contract", `${b.address.slice(0, 8)}…${b.address.slice(-6)}`],
                  ["Network", DEFAULT_CHAIN.name],
                  ["Fee", `${b.feeBps / 100}%/yr · creator keeps 80%`],
                  ["Recipe notice", b.noticeSeconds >= 3600 ? `${b.noticeSeconds / 3600}h` : `${b.noticeSeconds / 60} min`],
                  ["Strategy", mode.label],
                  ["Value vs fill", "Value is oracle; buys fill at pool prices"],
                ].map(([k, val]) => (
                  <div key={k} className="flex min-h-[44px] items-center justify-between gap-3 border-t border-white/[0.07] text-[14px]">
                    <dt className="c2">{k}</dt>
                    <dd className="text-right">{val}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[13px] text-tx2">Tokenized stock exposure, not shares. Not for US persons.</p>
            </details>
          </div>

          {/* Right: sticky buy panel + key stats */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <div className="hidden lg:block">
              <BuyPanel
                v={v}
                amount={buyAmount}
                setAmount={setBuyAmount}
                holding={holding}
                heldUsd6={heldUsd6}
                positionBps={position?.bps ?? null}
                onBuy={() => openSheet("buy", buyAmount)}
                onExit={() => openSheet("exit")}
                onAddMoney={() => setSheet("money")}
              />
            </div>
            <div className="rounded-[20px] border border-white/[0.07] bg-s1 p-5">
              <h2 className="text-[15px] font-semibold">Key stats</h2>
              <dl className="mt-2 flex flex-col">
                {(
                  [
                    ["In basket", compactUsd6(v.nav)],
                    ["Followers", b.followers.toLocaleString("en-US")],
                    ["Creator stake", <span key="c" className="gold">{compactUsd6(v.creatorStakeUsd6)}</span>],
                    ["Fee", `${b.feeBps / 100}% a year`],
                    ["Biggest drop", v.series.length >= 3 ? `−${(perf.maxDrawdownBps / 100).toFixed(1)}%` : "New"],
                    ["Change notice", b.noticeSeconds >= 3600 ? `${b.noticeSeconds / 3600} hours` : `${b.noticeSeconds / 60} min`],
                  ] as [string, React.ReactNode][]
                ).map(([k, val]) => (
                  <div key={k} className="flex min-h-[42px] items-center justify-between gap-3 border-t border-white/[0.06] text-[14px] first:border-t-0">
                    <dt className="text-tx2">{k}</dt>
                    <dd className="font-medium tabular-nums">{val}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile / tablet action bar */}
      <div className="fixed inset-x-0 bottom-[60px] z-30 border-t border-white/[0.07] bg-bg/90 px-4 py-3 backdrop-blur-xl md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-[640px] items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[12px] text-tx2">{holding ? "Your value" : "Value per token"}</span>
            <span className="text-[16px] font-semibold tabular-nums">{holding ? formatUsd6(heldUsd6) : formatUsd6(v.navPerShare)}</span>
          </div>
          {holding && (
            <Button variant="secondary" auto className="!rounded-full" onClick={() => openSheet("exit")}>
              Exit
            </Button>
          )}
          <Button auto className="!rounded-full !px-8" onClick={() => openSheet("buy", "25")}>
            Buy
          </Button>
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
        <ChangeSheet
          v={v}
          change={change}
          heldUsd6={heldUsd6}
          open={sheet === "change"}
          onOpenChange={(o) => !o && openSheet(null)}
          onExit={() => openSheet("exit")}
        />
      )}
      <AddMoneySheet open={sheet === "money"} onOpenChange={(o) => !o && setSheet("buy")} backLabel="Back to buy" />
      <StrategySheet mode={b.mode} open={sheet === "strategy"} onOpenChange={(o) => !o && setSheet(null)} />
    </div>
  );
}

export function ChangeFeed({ v, events, onOpenPending }: { v: BasketView; events: RebalanceEvent[]; onOpenPending?: () => void }) {
  const b = v.basket;
  if (events.length === 0)
    return (
      <div className="c-row">
        <span className="c-rowicon">
          <Scissors size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="c-row__main">
          <span className="c-row__title">No trims yet</span>
          <span className="c-row__meta">all within band</span>
        </div>
      </div>
    );
  return (
    <div className="c-list">
      {events.map((e) => {
        const I = e.status === "cancelled" ? XCircle : e.kind === "drift-trim" ? Scissors : RefreshCw;
        const diff = e.changes.map((c) => `${tickerOf(b, c.symbol)} ${fmtPct(c.fromBps)}→${fmtPct(c.toBps)}`).join("  ");
        const title =
          e.status === "pending" ? "Change pending" : e.status === "cancelled" ? "Change cancelled" : e.kind === "drift-trim" ? `Trimmed ${tickerOf(b, e.changes[0]?.symbol ?? "")}` : "Recipe changed";
        const row = (
          <>
            <span className="c-rowicon" style={e.status === "pending" ? { color: "var(--acc)" } : undefined}>
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

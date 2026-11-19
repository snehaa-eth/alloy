"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronDown, FlaskConical, Info, RefreshCw, Scissors, Sparkles, XCircle } from "lucide-react";
import type { Performance, RebalanceEvent } from "@/lib/types";
import { STRATEGY_MODES } from "@/lib/strategy";
import { DEFAULT_CHAIN, explorerTxUrl } from "@/lib/chains";
import { usMarketStatus } from "@/lib/market";
import { formatUsd6, sharesToUsd6, pnl } from "@/lib/units";
import { storyDisclosure } from "@/components/compliance/copy";
import { Countdown } from "../Countdown";
import { ValueChart } from "../ValueChart";
import { StatusSignal } from "../status";
import {
  AlloyBar,
  Avatar,
  Button,
  Ledger,
  QuietLink,
  SectionTitle,
  Signed,
  Stamp,
  StockLogo,
  fmtPct,
} from "../primitives";
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

  return (
    <div>
      {holding && change && (
        <StatusSignal id={`change-${b.address}`} signal={{ kind: "change", text: `${b.name} changes soon`, href: `/b/${b.address}?sheet=change` }} />
      )}

      {/* Cover hero: the ONLY place a photo cover appears (max 30% of viewport). */}
      <div className="c-cover h-[200px] md:h-[280px]" style={{ background: `var(--j-${v.id.tone}-d)` }}>
        <Image src={v.id.coverSrcLg} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="c-cover__scrim" />
        <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-app items-end justify-between gap-3 px-4 pb-3 md:px-6">
          <h1 className="t-body t-strong md:text-[20px]">{b.name}</h1>
          {b.demo && (
            <Stamp icon={FlaskConical} intent="test" className="bg-bg">
              Demo
            </Stamp>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-app gap-8 px-4 pb-28 pt-4 md:grid-cols-[1fr_340px] md:gap-12 md:px-6 md:pb-12">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Hero figure: the one Anton element on this screen */}
          <div className="flex flex-col gap-2">
            <span className="c-cert__label">Value per token · {v.id.serial}</span>
            <span className="t-display md:text-[48px]">{formatUsd6(v.navPerShare)}</span>
            <span className="t-small">
              <Signed bps={v.sinceBps} /> <span className="c2">since {shortDate(v.sinceDate)}</span>
            </span>
          </div>

          <AlloyBar parts={v.target} tone={v.id.tone} size="lg" />

          {v.series.length >= 3 ? (
            <ValueChart values={v.series} times={v.times} tone={v.id.tone} ticks={ticks} />
          ) : (
            <p className="t-mono c2">New · value history starts after the first day.</p>
          )}

          {b.followers > 0 ? (
            <Ledger
              cells={[
                { k: "Followers", v: <Signed bps={perf.followerPnl.bps} /> },
                { k: "Creator", v: <Signed bps={perf.creatorPnl.bps} /> },
              ]}
            />
          ) : (
            <Ledger
              cells={[
                { k: "Followers", v: <span className="c2">None yet</span> },
                { k: "Be", v: "Founding #1" },
              ]}
            />
          )}

          {/* Creator + strategy */}
          <div className="flex items-center gap-3">
            <Avatar creator seed={b.creator.address} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="t-body t-strong truncate">@{b.creator.handle}</span>
              <span className="t-mono c2">
                <span className="gold">{compactUsd6(v.creatorStakeUsd6)} in</span> · {Math.round(v.creatorStakeBps / 100)}% of basket
              </span>
            </div>
            <button type="button" onClick={() => setSheet("strategy")} className="c-stamp cursor-pointer bg-transparent" aria-label={`Strategy: ${mode.label}. What does this mean?`}>
              {mode.label}
              <Info aria-hidden />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <p className={thesisOpen ? "t-body c3" : "t-body c3 line-clamp-2"}>{b.thesis}</p>
            {!thesisOpen && b.thesis.length > 120 && (
              <button type="button" className="c-link self-start !min-h-0" onClick={() => setThesisOpen(true)}>
                More
              </button>
            )}
            {b.story && <p className="t-mono c2">{storyDisclosure(b.story.source, b.story.disclosureDate)}</p>}
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
              <span className="t-mono">
                <Countdown to={change.executableAt ?? change.at} dueLabel="due" />
              </span>
            </button>
          )}

          {/* What's inside: target vs now (real drift) */}
          <section className="flex flex-col gap-2" aria-labelledby="inside">
            <SectionTitle meta={`${v.tickers.length} stocks`}>
              <span id="inside">What&apos;s inside</span>
            </SectionTitle>
            <div className="flex flex-col">
              {b.components.map((c, i) => {
                const drift = v.now[i].bps - c.targetBps;
                return (
                  <div key={c.stock.symbol} className="c-row">
                    <StockLogo ticker={c.stock.ticker} size="lg" />
                    <div className="c-row__main">
                      <span className="c-row__title">{c.stock.ticker}</span>
                      <span className="c-row__meta">target {fmtPct(c.targetBps)}%</span>
                    </div>
                    <div className="c-row__end">
                      <span className="t-body">{fmtPct(v.now[i].bps)}%</span>
                      <span className={drift >= 0 ? "up" : "down"}>
                        {drift >= 0 ? "▲" : "▼"} {Math.abs(drift / 100).toFixed(1)} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* What changed and why */}
          <section className="flex flex-col gap-2" aria-labelledby="changes">
            <SectionTitle>
              <span id="changes">Changes</span>
            </SectionTitle>
            <ChangeFeed v={v} events={events} onOpenPending={() => openSheet("change")} />
          </section>

          <details className="group border-t border-bd pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between t-body t-strong">
              Details <ChevronDown size={16} className="transition group-open:rotate-180" aria-hidden />
            </summary>
            <dl className="mt-2 flex flex-col">
              {[
                ["Contract", `${b.address.slice(0, 8)}…${b.address.slice(-6)}`],
                ["Network", DEFAULT_CHAIN.name],
                ["Fee", `${b.feeBps / 100}%/yr · creator keeps 80%`],
                ["Recipe notice", b.noticeSeconds >= 3600 ? `${b.noticeSeconds / 3600}h` : `${b.noticeSeconds / 60} min`],
                ["Strategy", mode.label],
                ["Max drawdown", `${(perf.maxDrawdownBps / 100).toFixed(1)}%`],
                ["Value vs fill", "Value is oracle; buys fill at pool prices"],
              ].map(([k, val]) => (
                <div key={k} className="flex min-h-[40px] items-center justify-between gap-3 border-t border-bd t-small">
                  <dt className="c2">{k}</dt>
                  <dd className="t-mono text-right">{val}</dd>
                </div>
              ))}
            </dl>
            <p className="t-mono c2 mt-3">Tokenized stock exposure, not shares. Not for US persons.</p>
          </details>
        </div>

        {/* Desktop: sticky position + actions */}
        <aside className="hidden md:block">
          <div className="c-cert sticky top-28">
            <div className="c-cert__head">
              <span className="c-cert__serial">{v.id.serial}</span>
              <Stamp>{holding ? "Holding" : "Not held"}</Stamp>
            </div>
            <div className="c-cert__body">
              <Ledger
                cells={[
                  { k: "Your value", v: holding ? formatUsd6(heldUsd6) : "—" },
                  { k: "Since buy", v: position ? <Signed bps={position.bps} /> : "—" },
                ]}
              />
              <Button onClick={() => openSheet("buy", "25")}>Buy</Button>
              {holding && (
                <Button variant="secondary" onClick={() => openSheet("exit")}>
                  Exit
                </Button>
              )}
            </div>
            <div className="c-cert__foot">
              <QuietLink onClick={() => setSheet("money")}>Add test money</QuietLink>
              <span className="t-mono c2">min $5</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile action bar */}
      <div className="fixed inset-x-0 bottom-[60px] z-30 border-t border-bd bg-bg/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex gap-3">
          {holding && (
            <Button variant="secondary" onClick={() => openSheet("exit")}>
              Exit
            </Button>
          )}
          <Button onClick={() => openSheet("buy", "25")}>Buy</Button>
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

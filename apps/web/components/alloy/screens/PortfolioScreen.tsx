"use client";

/**
 * Portfolio, "your shelf" (docs/design/artdir/wow/app/portfolio.html) on real data:
 * on-chain positions (usePositions), values at live NAV, today's move from the basket's value series,
 * all-time from the per-device cost basis (shown only when it covers every holding), real test-USDC balance + faucet.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { formatB20, formatUsd6, pnl, sharesToUsd6, usd6ToChartNumber, valueUsd6 } from "@/lib/units";
import { useOwed } from "@/lib/hooks/use-reads";
import { StatusSignal } from "../status";
import { pendingChange } from "../basket-view";
import { useAccount } from "../hooks";
import { usePositions } from "../positions";
import type { LoadedBasket } from "../load";
import { ClaimSheet, type HeldItem } from "../flows/NoticeSheets";
import { MetalBasket } from "../metal/MetalBasket";
import { Odometer, OdometerOnView, Rise, WordReveal } from "../motion/alloy-motion";
import { EmptyShelf, Shelf, type ShelfItem } from "../portfolio/Shelf";
import { MoneyCard } from "../portfolio/MoneyCard";
import { DropLoader } from "../states/States";
import { pctText, recipeOfView, signCls } from "../states/recipe";

const DAY = 86_400;

/** Move over the last ~24h from the value series, bps (null without a point that old). */
function dayMoveBps(it: LoadedBasket): number | null {
  const s = it.perf.navSeries;
  if (s.length < 2) return null;
  const end = s[s.length - 1];
  const start = [...s].reverse().find((p) => p.t <= end.t - DAY * 0.8);
  if (!start || start.navPerShareUsd6 <= 0n) return null;
  return Number(((end.navPerShareUsd6 - start.navPerShareUsd6) * 10_000n) / start.navPerShareUsd6);
}

const signedUsd = (u: bigint) => `${u < 0n ? "−" : "+"}${formatUsd6(u < 0n ? -u : u)}`;

export function PortfolioScreen({ items }: { items: LoadedBasket[] }) {
  const acct = useAccount();
  const { map, ready } = usePositions(items.map((i) => ({ address: i.v.basket.address, totalSupply: i.v.basket.totalSupply })));
  const [hl, setHl] = useState<string | null>(null);
  const [ctaHover, setCtaHover] = useState(false);

  const held = useMemo(
    () =>
      items
        .map((it) => {
          const h = map[it.v.basket.address];
          if (!h || h.shares === 0n) return null;
          const value = sharesToUsd6(h.shares, it.v.nav, it.v.basket.totalSupply);
          const dayBps = dayMoveBps(it);
          const dayUsd6 = dayBps === null ? 0n : (value * BigInt(dayBps)) / BigInt(10_000 + dayBps);
          return { it, value, dayBps, dayUsd6, cost: h.costUsd6, p: h.costUsd6 !== null && h.costUsd6 > 0n ? pnl(value, h.costUsd6) : null };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => (b.value > a.value ? 1 : b.value < a.value ? -1 : 0)),
    [items, map],
  );

  const total = held.reduce((a, x) => a + x.value, 0n);
  const anyDay = held.some((x) => x.dayBps !== null);
  const dayUsd6 = held.reduce((a, x) => a + x.dayUsd6, 0n);
  const dayBps = total - dayUsd6 > 0n ? Number((dayUsd6 * 10_000n) / (total - dayUsd6)) : 0;
  // Cost basis is recorded per device (lib/cost-basis); only show "put in" / all-time when it covers every holding.
  const costKnown = held.length > 0 && held.every((x) => x.cost !== null && x.cost > 0n);
  const putIn = costKnown ? held.reduce((a, x) => a + (x.cost ?? 0n), 0n) : null;
  const allUsd6 = putIn !== null ? total - putIn : null;
  const change = held.map((x) => ({ x, c: pendingChange(x.it.events, x.it.v.basket) })).find((y) => y.c);

  const shelf: ShelfItem[] = held.map((x) => ({
    key: x.it.v.basket.address,
    recipe: recipeOfView(x.it.v),
    value: usd6ToChartNumber(x.value),
    name: x.it.v.basket.name,
    valueText: formatUsd6(x.value),
    dayBps: x.dayBps,
  }));

  const pick = (key: string) => {
    document.getElementById(`pf-row-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHl(key);
    window.setTimeout(() => setHl(null), 1600);
  };

  const loading = (!acct.ready && !acct.preview) || (acct.signedIn && !ready);

  return (
    <div className="pf">
      {change?.c && (
        <StatusSignal id="portfolio-change" signal={{ kind: "change", text: `${change.x.it.v.basket.name} changes soon`, href: `/b/${change.x.it.v.basket.address}?sheet=change` }} />
      )}

      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <DropLoader label="Loading your shelf" />
        </div>
      ) : !acct.signedIn ? (
        <>
          <header className="pf-head">
            <div>
              <div className="a-eyebrow">Your shelf</div>
              <WordReveal as="h1" className="pf-signin-h a-h2 mt-3.5 block" immediate>
                Sign in to see <em>your shelf.</em>
              </WordReveal>
            </div>
          </header>
          <EmptyShelf dip={ctaHover} silver />
          <div className="pf-empty">
            <p>Whatever you put in shows up here as metal. Your baskets, their value, and test money to try it with.</p>
            <div className="pf-empty__cta">
              <button type="button" className="a-btn a-btn--cream a-btn--lg" onClick={() => acct.login()} onPointerEnter={() => setCtaHover(true)} onPointerLeave={() => setCtaHover(false)}>
                Sign in
              </button>
              <Link href="/explore" className="a-btn a-btn--line a-btn--lg">
                Explore baskets
              </Link>
            </div>
          </div>
        </>
      ) : (
        <>
          <header className="pf-head">
            <div>
              <div className="a-eyebrow">Your shelf</div>
              <h1 className="pf-tot">
                <OdometerOnView value={formatUsd6(total)} />
              </h1>
              <div className="pf-today">
                {held.length === 0 ? (
                  <span className="lbl">Nothing here yet</span>
                ) : anyDay ? (
                  <>
                    <span className={`chip num ${signCls(dayBps)}`}>
                      <i />
                      <Odometer value={signedUsd(dayUsd6)} />
                    </span>
                    <span className={`num ${signCls(dayBps)}`}>{pctText(dayBps, 2)}</span>
                    <span className="lbl">Today</span>
                  </>
                ) : (
                  <span className="lbl">Value now</span>
                )}
              </div>
            </div>
            {held.length > 0 && (
              <div className="pf-stats">
                {putIn !== null && allUsd6 !== null && (
                  <>
                    <div>
                      <small>Put in</small>
                      <b className="num">{formatUsd6(putIn)}</b>
                    </div>
                    <div>
                      <small>All time</small>
                      <b className={`num ${signCls(Number(allUsd6))}`}>{signedUsd(allUsd6)}</b>
                    </div>
                  </>
                )}
                <div>
                  <small>Baskets</small>
                  <b className="num">{held.length}</b>
                </div>
              </div>
            )}
          </header>

          {held.length > 0 ? <Shelf items={shelf} onPick={pick} /> : <EmptyShelf dip={ctaHover} />}

          {held.length === 0 && (
            <div className="pf-empty">
              <WordReveal as="h2" className="a-h2 block" immediate>
                One drop, <em>waiting.</em>
              </WordReveal>
              <p>Pick a basket you believe in. Whatever you put in shows up here as metal.</p>
              <div className="pf-empty__cta">
                <Link href="/explore" className="a-btn a-btn--buy a-btn--lg" onPointerEnter={() => setCtaHover(true)} onPointerLeave={() => setCtaHover(false)}>
                  Pour your first $5
                </Link>
                <Link href="/explore" className="a-btn a-btn--line a-btn--lg">
                  Explore baskets
                </Link>
              </div>
            </div>
          )}

          <div className={`pf-below ${held.length === 0 ? "pf-below--solo" : ""}`}>
            {held.length > 0 && (
              <Rise as="section" className="pf-hold st-panel" aria-label="Your baskets">
                <div className="pf-hold-h" aria-hidden>
                  <span />
                  <span>Basket</span>
                  <span>Your value</span>
                  <span>Today</span>
                  <span>All time</span>
                  <span />
                </div>
                {held.map((x, i) => {
                  const b = x.it.v.basket;
                  const share = total > 0n ? Number((x.value * 1000n) / total) / 10 : 0;
                  return (
                    <HoldingRow key={b.address} i={i} x={x} share={share} hl={hl === b.address} />
                  );
                })}
              </Rise>
            )}
            <Rise delay={120}>
              <MoneyCard id="money" address={acct.address ?? undefined} />
            </Rise>
          </div>

          {held.map((x) => (
            <OwedRows key={x.it.v.basket.address} it={x.it} />
          ))}
          <p className="pf-legal">You own a token that tracks these stocks, not the shares themselves. You can lose money. Past returns don&apos;t predict future ones.</p>
        </>
      )}
    </div>
  );
}

type HeldRow = { it: LoadedBasket; value: bigint; dayBps: number | null; p: { usd6: bigint; bps: number } | null };

function HoldingRow({ x, i, share, hl }: { x: HeldRow; i: number; share: number; hl: boolean }) {
  const [hov, setHov] = useState(false);
  const v = x.it.v;
  const b = v.basket;
  const recipe = useMemo(() => recipeOfView(v), [v]);
  return (
    <div id={`pf-row-${b.address}`} className={`pf-row ${hl ? "hl" : ""}`} onPointerEnter={() => setHov(true)} onPointerLeave={() => setHov(false)}>
      <Link href={`/b/${b.address}`} className="pf-row__mini" aria-hidden tabIndex={-1}>
        <MetalBasket recipe={recipe} state={hov ? "breathe" : "idle"} zoom={3.3} phase={i} className="h-full w-full" />
      </Link>
      <Link href={`/b/${b.address}`} className="pf-row__nm">
        <b>{b.name}</b>
        <span>
          by @{b.creator.handle} · {b.components.length} stocks
        </span>
      </Link>
      <div className="pf-row__val num">
        <b>{formatUsd6(x.value)}</b>
        <small>{share.toFixed(0)}% of your shelf</small>
      </div>
      <div className={`pf-row__pc pf-row__td num ${signCls(x.dayBps)}`}>{x.dayBps === null ? <span className="text-dim">—</span> : pctText(x.dayBps, 2)}</div>
      <div className={`pf-row__pc pf-row__at num ${signCls(x.p?.bps)}`} title={x.p ? undefined : "Recorded on the device you bought from"}>
        {x.p ? pctText(x.p.bps) : <span className="text-dim">—</span>}
      </div>
      <div className="pf-row__act">
        <Link className="a-btn a-btn--buy a-btn--sm" href={`/b/${b.address}?buy=25`}>
          Buy more
        </Link>
        <Link className="a-btn a-btn--line a-btn--sm" href={`/b/${b.address}?sheet=exit`}>
          Sell
        </Link>
      </div>
    </div>
  );
}

/** Held for you: stocks an in-kind withdraw couldn't deliver. One tap per token (real useOwed + ClaimSheet). */
function OwedRows({ it }: { it: LoadedBasket }) {
  const owed = useOwed(it.v.basket.address);
  const [open, setOpen] = useState<HeldItem | null>(null);
  const list: HeldItem[] = (owed.data ?? [])
    .filter((o) => o.amount8 > 0n)
    .map((o) => {
      const c = it.v.basket.components.find((x) => x.stock.token.toLowerCase() === o.token.toLowerCase());
      return { basket: it.v.basket.address, token: o.token, ticker: o.symbol, amount: formatB20(o.amount8, 4), valueUsd6: c ? valueUsd6(o.amount8, c.stock.price8) : 0n, basketSerial: it.v.id.serial };
    });
  if (!list.length) return null;
  return (
    <section className="pf-owed st-panel" aria-label={`Held for you from ${it.v.basket.name}`}>
      <StatusSignal id={`held-${it.v.basket.address}`} signal={{ kind: "held", text: `${list[0].ticker} held for you`, href: "/portfolio" }} />
      <div className="a-eyebrow px-6 pt-4">Held for you · {it.v.basket.name}</div>
      {list.map((h) => (
        <button key={h.token} type="button" className="pf-owed__row" onClick={() => setOpen(h)}>
          <Download size={16} strokeWidth={1.5} aria-hidden className="text-mute" />
          <span className="flex-1 text-left">
            {h.ticker} <span className="text-mute">· {h.amount}</span>
          </span>
          <span className="a-btn a-btn--line a-btn--sm">Claim</span>
        </button>
      ))}
      {open && <ClaimSheet item={open} open onOpenChange={(o) => !o && setOpen(null)} />}
    </section>
  );
}

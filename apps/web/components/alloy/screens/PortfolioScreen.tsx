"use client";

import { useState } from "react";
import { CalendarDays, Compass, FlaskConical, LogIn } from "lucide-react";
import { formatUsd6, pnl, sharesToUsd6 } from "@/lib/units";
import { BasketRow } from "../BasketCards";
import { Certificate } from "../Certificate";
import { Countdown } from "../Countdown";
import { StatusSignal } from "../status";
import { Button, ButtonLink, EmptyState, QuietLink, Signed, Skeleton, Stamp } from "../primitives";
import { pendingChange, shortDate } from "../basket-view";
import { useAccount } from "../hooks";
import { usePositions } from "../positions";
import type { LoadedBasket } from "../load";
import { AddMoneySheet, ClaimSheet, type HeldItem } from "../flows/NoticeSheets";
import { useOwed, useUsdcBalance } from "@/lib/hooks/use-reads";
import { formatB20, valueUsd6 } from "@/lib/units";
import { Download } from "lucide-react";

const WEEK = 7 * 86_400;

export function PortfolioScreen({ items }: { items: LoadedBasket[] }) {
  const acct = useAccount();
  const { map, ready } = usePositions(items.map((i) => ({ address: i.v.basket.address, totalSupply: i.v.basket.totalSupply })));
  const [money, setMoney] = useState(false);
  const usdc = useUsdcBalance();

  const held = items
    .map((it) => {
      const h = map[it.v.basket.address];
      if (!h || h.shares === 0n) return null;
      const value = sharesToUsd6(h.shares, it.v.nav, it.v.basket.totalSupply);
      // week move from the value series (display only)
      const s = it.perf.navSeries;
      const end = s[s.length - 1];
      const start = [...s].reverse().find((p) => p.t <= end.t - WEEK) ?? s[0];
      const weekBps = start.navPerShareUsd6 > 0n ? Number(((end.navPerShareUsd6 - start.navPerShareUsd6) * 10_000n) / start.navPerShareUsd6) : 0;
      const weekUsd6 = (value * BigInt(weekBps)) / 10_000n;
      return { it, h, value, weekUsd6, p: h.costUsd6 !== null ? pnl(value, h.costUsd6) : null };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const total = held.reduce((a, x) => a + x.value, 0n);
  const known = held.filter((x) => x.h.costUsd6 !== null);
  // Cost basis is recorded per device (lib/cost-basis); only show a return when it covers every holding.
  const all = known.length === held.length && held.length ? pnl(total, known.reduce((a, x) => a + (x.h.costUsd6 ?? 0n), 0n)) : null;
  const weekUsd6 = held.reduce((a, x) => a + x.weekUsd6, 0n);
  const now = items[0]?.perf.navSeries.at(-1)?.t ?? 0;
  const trims = held.flatMap((x) => x.it.events.filter((e) => e.kind === "drift-trim" && e.status === "executed" && e.at >= now - WEEK));
  const changes = held.map((x) => ({ x, c: pendingChange(x.it.events, x.it.v.basket) })).filter((y) => y.c);
  const firstChange = changes[0];

  return (
    <div className="mx-auto max-w-app px-4 pb-8 pt-5 md:px-6 md:pt-8">
      {firstChange && (
        <StatusSignal
          id="portfolio-change"
          signal={{ kind: "change", text: `${firstChange.x.it.v.basket.name} changes soon`, href: `/b/${firstChange.x.it.v.basket.address}?sheet=change` }}
        />
      )}
      <h1 className="t-body t-strong md:text-[20px]">Portfolio</h1>

      {!acct.ready && !acct.preview ? (
        <div className="mt-6 flex flex-col gap-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-[220px] w-full" />
        </div>
      ) : !acct.signedIn ? (
        <EmptyState icon={LogIn} line="Sign in to see your baskets." action={<Button onClick={() => acct.login()}>Sign in</Button>} />
      ) : !ready ? (
        <div className="mt-6 flex flex-col gap-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : held.length === 0 ? (
        <EmptyState icon={Compass} line="Start with $25 of test money." action={<ButtonLink href="/">Explore</ButtonLink>} />
      ) : (
        <div className="mt-5 grid gap-8 md:grid-cols-[1fr_400px] md:gap-12">
          <div className="flex flex-col gap-6 md:order-2">
            <div className="flex flex-col gap-1">
              <span className="t-label">{all ? "Test · since you joined" : "Test · value now"}</span>
              <span className="t-hero">{formatUsd6(total)}</span>
              {all && (
                <span className="t-small">
                  <Signed bps={all.bps} /> <span className="c2">{formatUsd6(all.usd6)}</span>
                </span>
              )}
            </div>
            <Certificate
              serial={held[0].it.v.id.serial}
              stamp={<Stamp icon={CalendarDays}>Statement</Stamp>}
              title="Your baskets"
              label="This week"
              figure={`${weekUsd6 < 0n ? "−" : "+"}${formatUsd6(weekUsd6 < 0n ? -weekUsd6 : weekUsd6)}`}
              unit={`on ${formatUsd6(total, 0)}`}
              ledger={[
                { k: "Trims", v: `${trims.length}${trims.length ? ` · ${trims.map((t) => `${((t.costBps ?? 0) / 100).toFixed(2)}%`).join(", ")}` : ""}` },
                {
                  k: "Change",
                  v: firstChange?.c ? (
                    <Countdown to={firstChange.c.executableAt ?? firstChange.c.at} dueLabel="due" />
                  ) : (
                    "None"
                  ),
                },
              ]}
              action={<ButtonLink href="/activity" variant="secondary">See the week</ButtonLink>}
              footMeta={`${shortDate(now - WEEK)} – ${shortDate(now)}`}
            />
          </div>
          <section className="flex flex-col md:order-1" aria-label="Holdings">
            <h2 className="t-label pb-2">Baskets</h2>
            {held.map((x) => (
              <BasketRow key={x.it.v.basket.address} v={x.it.v} href={`/b/${x.it.v.basket.address}`} value={formatUsd6(x.value)} changeBps={x.p?.bps} />
            ))}
            <h2 className="t-label pb-2 pt-6">Cash</h2>
            <div className="c-row">
              <span className="c-logo c-logo--lg" style={{ background: "var(--l-usdc)" }} aria-hidden>
                $
              </span>
              <div className="c-row__main">
                <span className="c-row__title">Test dollars</span>
                <span className="c-row__meta inline-flex items-center gap-1">
                  <FlaskConical size={12} aria-hidden /> not real money
                </span>
              </div>
              <div className="c-row__end">
                <span className="t-body">{usdc.data !== undefined && usdc.data !== null ? formatUsd6(usdc.data) : "—"}</span>
                <QuietLink onClick={() => setMoney(true)} className="!min-h-0">
                  Add
                </QuietLink>
              </div>
            </div>
            {held.map((x) => (
              <OwedRows key={x.it.v.basket.address} it={x.it} />
            ))}
            <p className="t-mono c2 mt-6">Tokenized stock exposure, not shares. Past performance isn&apos;t a promise.</p>
          </section>
        </div>
      )}
      <AddMoneySheet open={money} onOpenChange={setMoney} />
    </div>
  );
}

/** Held for you: stocks an in-kind withdraw couldn't deliver. One tap per token. */
function OwedRows({ it }: { it: LoadedBasket }) {
  const owed = useOwed(it.v.basket.address);
  const [open, setOpen] = useState<HeldItem | null>(null);
  const items: HeldItem[] = (owed.data ?? [])
    .filter((o) => o.amount8 > 0n)
    .map((o) => {
      const c = it.v.basket.components.find((x) => x.stock.token.toLowerCase() === o.token.toLowerCase());
      return {
        basket: it.v.basket.address,
        token: o.token,
        ticker: o.symbol,
        amount: formatB20(o.amount8, 4),
        valueUsd6: c ? valueUsd6(o.amount8, c.stock.price8) : 0n,
        basketSerial: it.v.id.serial,
      };
    });
  if (!items.length) return null;
  return (
    <>
      <StatusSignal id={`held-${it.v.basket.address}`} signal={{ kind: "held", text: `${items[0].ticker} held for you`, href: "/portfolio" }} />
      <h2 className="t-label pb-2 pt-6">Held for you</h2>
      {items.map((h) => (
        <button key={h.token} type="button" className="c-row w-full bg-transparent text-left" onClick={() => setOpen(h)}>
          <span className="c-rowicon gold">
            <Download size={18} strokeWidth={1.75} aria-hidden />
          </span>
          <div className="c-row__main">
            <span className="c-row__title">{h.ticker}</span>
            <span className="c-row__meta">{h.amount} · no expiry</span>
          </div>
          <span className="t-mono">Claim</span>
        </button>
      ))}
      {open && <ClaimSheet item={open} open onOpenChange={(o) => !o && setOpen(null)} />}
    </>
  );
}

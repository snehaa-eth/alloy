"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, FlaskConical, HelpCircle, LogIn, LogOut, Pencil, Plus, Scale, ShieldCheck } from "lucide-react";
import { formatUsd6 } from "@/lib/units";
import { BasketRow } from "../BasketCards";
import { Certificate } from "../Certificate";
import { Countdown } from "../Countdown";
import { AlloyBarPair, Avatar, Badge, Button, ButtonLink, EmptyState, Ledger, QuietLink, Skeleton, Stamp } from "../primitives";
import { compactUsd6, pendingChange, recipeAfter } from "../basket-view";
import { useAccount } from "../hooks";
import type { LoadedBasket } from "../load";
import { AddMoneySheet } from "../flows/NoticeSheets";

export function MeScreen({ items }: { items: LoadedBasket[] }) {
  const acct = useAccount();
  const [money, setMoney] = useState(false);
  // Preview mode acts as the first basket's creator so creator tools can be reviewed.
  const me = acct.preview ? items[0]?.v.basket.creator.address : acct.address;
  const mine = items.filter((it) => me && it.v.basket.creator.address.toLowerCase() === me.toLowerCase());
  const handle = acct.preview ? items[0]?.v.basket.creator.handle : acct.address ? `${acct.address.slice(0, 6)}…${acct.address.slice(-4)}` : "";
  const aum = mine.reduce((a, it) => a + it.v.nav, 0n);
  const fees = mine.reduce((a, it) => a + it.perf.feesEarnedUsd6, 0n);
  const live = mine.map((it) => ({ it, c: pendingChange(it.events, it.v.basket) })).find((x) => x.c);

  if (!acct.ready && !acct.preview)
    return (
      <div className="mx-auto max-w-[720px] px-4 pt-6">
        <Skeleton className="h-12 w-48" />
      </div>
    );

  return (
    <div className="mx-auto max-w-[720px] px-4 pb-8 pt-5 md:px-8 md:pt-8">
      {!acct.signedIn ? (
        <>
          <h1 className="t-body t-strong md:text-[20px]">Me</h1>
          <EmptyState
            icon={LogIn}
            line="Your profile, your baskets and test dollars to try it with."
            action={
              <div className="flex flex-col gap-2">
                <Button onClick={() => acct.login()}>Sign in with email</Button>
                <ButtonLink href="/create" variant="secondary">
                  Build a basket
                </ButtonLink>
              </div>
            }
          />
        </>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Avatar creator={mine.length > 0} seed={me} />
            <span className="t-body t-strong truncate">@{handle}</span>
            {/* TODO(lib): Founding Creator / Follower numbers from the API. */}
            {mine.length > 0 && <Badge>Founding Creator</Badge>}
          </div>

          <section className="flex flex-col gap-3" aria-labelledby="yb">
            <div className="flex items-center justify-between">
              <h2 id="yb" className="t-label">
                Your baskets
              </h2>
              <QuietLink href="/create">Build</QuietLink>
            </div>
            {mine.length === 0 ? (
              <EmptyState icon={Plus} line="Turn your idea into a basket." action={<ButtonLink href="/create">Build a basket</ButtonLink>} />
            ) : (
              <>
                <Ledger
                  cells={[
                    { k: "In baskets", v: compactUsd6(aum) },
                    { k: "Fees", v: formatUsd6(fees) },
                  ]}
                />
                {live?.c ? (
                  <Certificate
                    serial={live.it.v.id.serial}
                    stamp={
                      <Stamp icon={Pencil} intent="accent">
                        Pending
                      </Stamp>
                    }
                    art={{ series: live.it.v.artSeries, weightsBps: live.it.v.weightsBps, seed: live.it.v.basket.address, tone: live.it.v.id.tone }}
                    title={live.it.v.basket.name}
                    label="Followers notified"
                    figure={String(live.it.v.basket.followers)}
                    bar={<AlloyBarPair before={live.it.v.target} after={recipeAfter(live.it.v.basket, live.c)} tone={live.it.v.id.tone} />}
                    ledger={[
                      { k: "Runs in", v: <Countdown to={live.c.executableAt ?? live.c.at} dueLabel="due" /> },
                      { k: "Reason", v: <span className="q truncate">“{live.c.reason}”</span> },
                    ]}
                    action={
                      <ButtonLink href={`/me/b/${live.it.v.basket.address}`} variant="secondary">
                        Edit or cancel
                      </ButtonLink>
                    }
                    footLink={<QuietLink href={`/b/${live.it.v.basket.address}?sheet=change`}>Follower view</QuietLink>}
                    footMeta={`@${live.it.v.basket.creator.handle}`}
                  />
                ) : null}
                <div className="flex flex-col">
                  {mine.map((it) => (
                    <BasketRow key={it.v.basket.address} v={it.v} href={`/me/b/${it.v.basket.address}`} meta={`${it.v.basket.followers} followers`} />
                  ))}
                </div>
              </>
            )}
          </section>

          <nav className="flex flex-col" aria-label="Account">
            {[
              { label: "Add test money", icon: FlaskConical, onClick: () => setMoney(true) },
              { label: "How Alloy works", icon: HelpCircle, href: "/try" },
              { label: "Fees and legal", icon: Scale, href: "/try#legal" },
              { label: "Not for US persons", icon: ShieldCheck, href: "/try#legal" },
            ].map((r) =>
              r.href ? (
                <Link key={r.label} href={r.href} className="c-row">
                  <r.icon size={18} strokeWidth={1.75} className="c2" aria-hidden />
                  <span className="c-row__title flex-1">{r.label}</span>
                  <ChevronRight size={16} className="c2" aria-hidden />
                </Link>
              ) : (
                <button key={r.label} type="button" className="c-row w-full bg-transparent text-left" onClick={r.onClick}>
                  <r.icon size={18} strokeWidth={1.75} className="c2" aria-hidden />
                  <span className="c-row__title flex-1">{r.label}</span>
                  <ChevronRight size={16} className="c2" aria-hidden />
                </button>
              ),
            )}
            {!acct.preview && (
              <button type="button" className="c-row w-full bg-transparent text-left" onClick={() => acct.logout()}>
                <LogOut size={18} strokeWidth={1.75} className="c2" aria-hidden />
                <span className="c-row__title flex-1">Sign out</span>
              </button>
            )}
          </nav>
        </div>
      )}
      <AddMoneySheet open={money} onOpenChange={setMoney} />
    </div>
  );
}

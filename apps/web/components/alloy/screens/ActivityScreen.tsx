"use client";

import { useState } from "react";
import { Inbox, ReceiptText, RefreshCw } from "lucide-react";
import { formatUsd6, sharesToUsd6 } from "@/lib/units";
import { Certificate } from "../Certificate";
import { Countdown, LocalTime } from "../Countdown";
import { AlloyBarPair, Button, ButtonLink, EmptyState, InlineToast, QuietLink, Skeleton, Stamp, Tabs } from "../primitives";
import { pendingChange, recipeAfter } from "../basket-view";
import { useAccount } from "../hooks";
import { usePositions } from "../positions";
import type { LoadedBasket } from "../load";
import { ChangeFeed } from "./BasketScreen";

type Tab = "needs" | "updates" | "receipts";

export function ActivityScreen({ items }: { items: LoadedBasket[] }) {
  const acct = useAccount();
  const { map, ready } = usePositions(items.map((i) => ({ address: i.v.basket.address, totalSupply: i.v.basket.totalSupply })));
  const [tab, setTab] = useState<Tab>("needs");
  const [kept, setKept] = useState<Record<string, boolean>>({});

  const mine = items.filter((it) => (map[it.v.basket.address]?.shares ?? 0n) > 0n);
  const needs = mine.map((it) => ({ it, c: pendingChange(it.events, it.v.basket) })).filter((x) => x.c);
  const updates = mine.map((it) => ({ it, ev: it.events.filter((e) => e.status !== "pending") })).filter((x) => x.ev.length);
  const receipts = mine.flatMap((it) => it.events.filter((e) => e.txHash).map((e) => ({ it, e })));

  return (
    <div className="mx-auto max-w-[720px] px-4 pb-8 pt-5 md:px-8 md:pt-8">
      <h1 className="t-body t-strong md:text-[20px]">Activity</h1>
      <div className="mt-3">
        <Tabs
          label="Activity"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "needs", label: needs.length ? `Needs you · ${needs.length}` : "Needs you" },
            { id: "updates", label: "Updates" },
            { id: "receipts", label: "Receipts" },
          ]}
        />
      </div>

      {!acct.ready && !acct.preview ? (
        <Skeleton className="mt-4 h-[320px] w-full" />
      ) : !acct.signedIn ? (
        <EmptyState icon={Inbox} line="Sign in to see changes to your baskets." action={<Button onClick={() => acct.login()}>Sign in</Button>} />
      ) : !ready ? (
        <Skeleton className="mt-4 h-[320px] w-full" />
      ) : tab === "needs" ? (
        needs.length === 0 ? (
          <EmptyState icon={Inbox} line="Changes to your baskets show up here." action={<ButtonLink href="/explore">Explore</ButtonLink>} />
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {needs.map(({ it, c }, i) => {
              const v = it.v;
              const held = sharesToUsd6(map[v.basket.address].shares, v.nav, v.basket.totalSupply);
              const movedBps = c!.changes.reduce((a, x) => a + Math.abs(x.toBps - x.fromBps), 0) / 2;
              const at = c!.executableAt ?? c!.at;
              // One full certificate per screen; further notices are rows.
              if (i > 0)
                return (
                  <a key={c!.id} className="c-row" href={`/b/${v.basket.address}?sheet=change`}>
                    <span className="c-rowicon" style={{ color: "var(--acc)" }}>
                      <RefreshCw size={18} strokeWidth={1.75} aria-hidden />
                    </span>
                    <div className="c-row__main">
                      <span className="c-row__title">{v.basket.name} changes</span>
                      <span className="c-row__meta">
                        <Countdown to={at} />
                      </span>
                    </div>
                  </a>
                );
              return (
                <Certificate
                  key={c!.id}
                  serial={v.id.serial}
                  stamp={
                    <Stamp icon={RefreshCw} intent="accent">
                      Change
                    </Stamp>
                  }
                  art={{ series: v.artSeries, weightsBps: v.weightsBps, seed: v.basket.address, tone: v.id.tone }}
                  title={v.basket.name}
                  label="Of yours that moves"
                  figure={`≈ ${formatUsd6((held * BigInt(Math.round(movedBps))) / 10_000n, 0)}`}
                  bar={<AlloyBarPair before={v.target} after={recipeAfter(v.basket, c!)} tone={v.id.tone} />}
                  ledger={[
                    { k: "Runs", v: <LocalTime at={at} /> },
                    { k: c!.aiGenerated ? "Reason · AI" : "Reason", v: <span className="q truncate">“{c!.reason}”</span> },
                  ]}
                  action={
                    kept[c!.id] ? (
                      <InlineToast>You&apos;re staying in.</InlineToast>
                    ) : (
                      // TODO(lib): persist the follower's choice once the API exposes it.
                      <Button onClick={() => setKept((k) => ({ ...k, [c!.id]: true }))}>Keep my basket</Button>
                    )
                  }
                  footLink={<QuietLink href={`/b/${v.basket.address}?sheet=exit`}>Exit before it runs</QuietLink>}
                  footMeta={<Countdown to={at} dueLabel="due · at market open" />}
                />
              );
            })}
          </div>
        )
      ) : tab === "updates" ? (
        updates.length === 0 ? (
          <EmptyState icon={Inbox} line="No updates yet." />
        ) : (
          <div className="mt-2 flex flex-col gap-6">
            {updates.map(({ it, ev }) => (
              <section key={it.v.basket.address} className="flex flex-col">
                <h2 className="t-label py-2">{it.v.basket.name}</h2>
                <ChangeFeed v={it.v} events={ev} />
              </section>
            ))}
            <p className="t-mono c2">Autopilot changes need no action. Costs are the basket&apos;s.</p>
          </div>
        )
      ) : receipts.length === 0 ? (
        <EmptyState icon={ReceiptText} line="Receipts land here after your first buy." action={<ButtonLink href="/explore">Explore</ButtonLink>} />
      ) : (
        <div className="mt-2 flex flex-col">
          {receipts.map(({ it, e }) => (
            <ChangeFeed key={e.id} v={it.v} events={[e]} />
          ))}
        </div>
      )}
    </div>
  );
}

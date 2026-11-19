"use client";

/**
 * Activity, "Everything that moved." (docs/design/artdir/wow/app/activity.html) on real data:
 * basket launches, rebalances and creator recipe changes from the chain (load.ts), each with a looping
 * metal micro-tile. Filters: All / Mine (baskets you hold or made) / Rebalances. Refreshes every 30s.
 * Personal buys and sells need an indexer (not wired yet); signed-in viewers get a link to their wallet history.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import { DEFAULT_CHAIN } from "@/lib/chains";
import { Countdown } from "../Countdown";
import { useAccount } from "../hooks";
import { usePositions } from "../positions";
import type { LoadedBasket } from "../load";
import { tintCss } from "../metal/palette";
import { WordReveal } from "../motion/alloy-motion";
import { MicroTile } from "../activity/MicroTile";
import { buildFeed, dayLabel, timeLabel, type FeedRow } from "../activity/feed";
import { Seg } from "../states/Seg";

type Filter = "all" | "mine" | "rb";

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function ActivityScreen({ items }: { items: LoadedBasket[] }) {
  const acct = useAccount();
  const router = useRouter();
  const now = useNow();
  const { map } = usePositions(items.map((i) => ({ address: i.v.basket.address, totalSupply: i.v.basket.totalSupply })));
  const [filter, setFilter] = useState<Filter>("all");

  // live: pull fresh server data every 30s (pages revalidate at the same rate)
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => clearInterval(t);
  }, [router]);

  const me = acct.address?.toLowerCase();
  const rows = useMemo(
    () => buildFeed(items, (addr, creator) => (map[addr]?.shares ?? 0n) > 0n || (!!me && creator.toLowerCase() === me)),
    [items, map, me],
  );
  const shown = rows.filter((r) => filter === "all" || (filter === "mine" && r.mine) || (filter === "rb" && r.isRebalance));
  const groups: { day: string; rows: FeedRow[] }[] = [];
  for (const r of shown) {
    const d = now === null ? "" : dayLabel(r.at, now);
    const g = groups[groups.length - 1];
    if (g && g.day === d) g.rows.push(r);
    else groups.push({ day: d, rows: [r] });
  }
  const explorer = acct.address ? `${DEFAULT_CHAIN.blockExplorers?.default.url ?? "https://sepolia.basescan.org"}/address/${acct.address}` : null;

  return (
    <div className="ac">
      <header>
        <div className="a-eyebrow">Activity</div>
        <WordReveal as="h1" className="a-h1 mt-3.5 block" immediate>
          Everything that <em>moved.</em>
        </WordReveal>
        <p className="a-lede mt-3.5">Every rebalance in plain words, new baskets, and what creators change and why.</p>
        <div className="ac-ctl">
          <Seg
            label="Filter activity"
            value={filter}
            onChange={setFilter}
            options={[
              { id: "all", label: "All" },
              { id: "mine", label: "Mine" },
              { id: "rb", label: "Rebalances" },
            ]}
          />
          <div className="ac-live">
            <i />
            Live
          </div>
        </div>
      </header>

      <div className="ac-tl">
        {shown.length === 0 ? (
          <div className="ac-empty">
            {filter === "mine" ? (
              acct.signedIn ? (
                <>
                  <p>Nothing yet on baskets you hold or made.</p>
                  <Link href="/explore" className="a-btn a-btn--line a-btn--sm mt-4">
                    Explore baskets
                  </Link>
                </>
              ) : (
                <>
                  <p>Sign in to see what moved in your baskets.</p>
                  <button type="button" className="a-btn a-btn--cream a-btn--sm mt-4" onClick={() => acct.login()}>
                    Sign in
                  </button>
                </>
              )
            ) : (
              <p>No rebalances yet. When one runs, it shows up here in plain words.</p>
            )}
          </div>
        ) : (
          groups.map((g) => (
            <Fragment key={g.day + g.rows[0].id}>
              <div className="ac-day">{g.day || " "}</div>
              {g.rows.map((r, i) => (
                <Row key={r.id} r={r} i={i} now={now} />
              ))}
            </Fragment>
          ))
        )}
      </div>

      {shown.length > 0 && <p className="ac-end">That&apos;s everything so far.</p>}
      {acct.signedIn && explorer && !acct.preview && (
        <p className="ac-end !mt-2">
          Your own buys and sells are in your{" "}
          <a href={explorer} target="_blank" rel="noreferrer" className="text-mute underline underline-offset-4 hover:text-ink">
            wallet history
          </a>
          .
        </p>
      )}
    </div>
  );
}

function Row({ r, i, now }: { r: FeedRow; i: number; now: number | null }) {
  return (
    <Link href={r.href} className="ac-ev">
      <MicroTile kind={r.micro.kind} recipe={r.micro.recipe} from={r.micro.from} keepNew={r.micro.keepNew} phase={i * 0.7} />
      <div className="min-w-0">
        <div className="ac-k">
          <b>{r.label}</b>
          <span>{r.basketName}</span>
        </div>
        <h4>
          {r.lead} <span className="hn">{r.rest}</span>
        </h4>
        {r.quote && <p className="ac-q">“{r.quote}”</p>}
        {r.body && <p>{r.body}</p>}
        {r.mix && (
          <div className="ac-mix">
            {r.mix.map((m) => (
              <span key={m.t}>
                <i style={{ background: tintCss(m.t) }} />
                {m.t} {m.from !== undefined && m.from !== m.to && <s>{m.from}%</s>} {m.to}%
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="ac-r num">
        {r.right?.big && <b className={r.right.quiet ? "quiet" : undefined}>{r.right.big}</b>}
        {r.right?.countdownTo ? (
          <small>
            {r.right.sub} <Countdown to={r.right.countdownTo} dueLabel="now" />
          </small>
        ) : (
          <small>
            {r.right?.sub ? `${r.right.sub} · ` : ""}
            {now === null ? "" : timeLabel(r.at, now)}
          </small>
        )}
      </div>
    </Link>
  );
}

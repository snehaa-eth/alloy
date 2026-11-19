/**
 * Activity feed from real basket data (load.ts): launches (createdAt + the creator's own stake), rebalances
 * (drift events), creator recipe changes (executed / coming up / called off, with the creator's reason).
 * Plain words only. Nothing here is invented: a row exists only for a real on-chain fact.
 */
import type { RebalanceEvent } from "@/lib/types";
import { formatUsd6 } from "@/lib/units";
import type { LoadedBasket } from "../load";
import { recipeAfter, tickerOf } from "../basket-view";
import { STYLES, styleOf } from "../styles";
import type { Recipe } from "../metal/shape";
import { recipeOfView, recipeWith } from "../states/recipe";
import type { MicroKind } from "./MicroTile";

export type FeedKind = "launch" | "rebalance" | "change" | "pending" | "cancelled";

export type FeedRow = {
  id: string;
  at: number;
  kind: FeedKind;
  basket: string;
  href: string;
  label: string;
  basketName: string;
  /** bold lead + muted rest of the headline */
  lead: string;
  rest: string;
  body?: string;
  quote?: string;
  /** before → after weights (whole %), when known */
  mix?: { t: string; from?: number; to: number }[];
  right?: { big?: string; quiet?: boolean; sub?: string; countdownTo?: number };
  micro: { kind: MicroKind; recipe: Recipe; from?: Recipe; keepNew?: boolean };
  /** the viewer holds or created this basket */
  mine: boolean;
  isRebalance: boolean;
};

const pct = (bps: number) => Math.round(bps / 100);

function mixOf(it: LoadedBasket, e: RebalanceEvent) {
  const b = it.v.basket;
  return b.components.map((c) => {
    const ch = e.changes.find((x) => tickerOf(b, x.symbol) === c.stock.ticker || x.symbol === c.stock.symbol);
    return { t: c.stock.ticker, from: ch ? pct(ch.fromBps) : undefined, to: pct(ch ? ch.toBps : c.targetBps) };
  });
}

export function buildFeed(items: LoadedBasket[], isMine: (address: string, creator: string) => boolean): FeedRow[] {
  const rows: FeedRow[] = [];
  for (const it of items) {
    const v = it.v;
    const b = v.basket;
    const handle = `@${b.creator.handle}`;
    const href = `/b/${b.address}`;
    const style = styleOf(b);
    const recipe = recipeOfView(v);
    const base = { basket: b.address, href, basketName: b.name, mine: isMine(b.address, b.creator.address) };

    for (const e of it.events) {
      if (e.kind === "drift-trim" && e.status === "executed" && e.at > 0) {
        const run = style === "let-winners-run";
        rows.push({
          ...base,
          id: e.id,
          at: e.at,
          kind: "rebalance",
          label: "Rebalanced",
          lead: b.name,
          rest: run ? "kept its winner in check" : "got back in shape",
          body: run
            ? "One stock grew past this basket's limit, so a little was moved to the others. Everything else kept running."
            : `Prices pulled the mix away from the plan, so it moved back to ${b.components.map((c) => `${c.stock.ticker} ${pct(c.targetBps)}%`).join(", ")}.`,
          mix: e.changes.length ? mixOf(it, e) : undefined,
          right: { big: "No action needed", quiet: true, sub: e.costBps ? `Cost ${(e.costBps / 100).toFixed(2)}%` : undefined },
          micro: { kind: "reshape", recipe, keepNew: false },
          isRebalance: true,
        });
      } else if (e.kind === "recipe-change") {
        const after = recipeAfter(b, e);
        const from = recipeWith(v, e.changes.length ? b.components.map((c) => e.changes.find((x) => tickerOf(b, x.symbol) === c.stock.ticker)?.fromBps ?? c.targetBps) : v.weightsBps);
        const to = recipeWith(v, after.map((p) => p.bps));
        const mix = e.changes.length ? mixOf(it, e) : undefined;
        if (e.status === "pending") {
          rows.push({
            ...base,
            id: e.id,
            at: e.at,
            kind: "pending",
            label: "Coming up",
            href: `${href}?sheet=change`,
            lead: `${handle}`,
            rest: `is changing ${b.name}`,
            quote: e.reason,
            body: "Followers can keep the new mix or step out before it runs.",
            mix,
            right: { sub: "Runs in", countdownTo: e.executableAt ?? e.at },
            micro: { kind: "morph", recipe: to, from },
            isRebalance: false,
          });
        } else if (e.status === "executed") {
          rows.push({
            ...base,
            id: e.id,
            at: e.at,
            kind: "change",
            label: "Creator update",
            lead: handle,
            rest: `changed the mix of ${b.name}`,
            quote: e.reason,
            body: e.changes.length ? undefined : "The new mix is live for everyone who follows.",
            mix,
            right: { big: "No action needed", quiet: true },
            micro: { kind: "morph", recipe: to, from },
            isRebalance: true,
          });
        } else {
          rows.push({
            ...base,
            id: e.id,
            at: e.at,
            kind: "cancelled",
            label: "Creator update",
            lead: handle,
            rest: `called off a change to ${b.name}`,
            body: "Nothing moved. The basket keeps its current mix.",
            micro: { kind: "morph", recipe, from: recipe },
            isRebalance: false,
          });
        }
      }
    }

    if (b.createdAt > 0) {
      const stake = v.creatorStakeUsd6;
      rows.push({
        ...base,
        id: `launch:${b.address}`,
        at: b.createdAt,
        kind: "launch",
        label: "New basket",
        lead: handle,
        rest: `cast ${b.name}`,
        body: `${b.components.length} stocks, ${STYLES[style].label.toLowerCase()}. ${stake > 0n ? "Their own money went in first." : ""}`.trim(),
        right: stake > 0n ? { big: formatUsd6(stake), sub: "their own money in" } : undefined,
        micro: { kind: "pour", recipe },
        isRebalance: false,
      });
    }
  }
  return rows.sort((a, b) => b.at - a.at);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Today" / "Yesterday" / "Nov 16" in the viewer's zone. */
export function dayLabel(at: number, now: number): string {
  const d = new Date(at * 1000), n = new Date(now * 1000);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(n) - day(d)) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "2m ago" / "3h ago" today, else the local time. */
export function timeLabel(at: number, now: number): string {
  const s = now - at;
  if (s < 0) return "";
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 6 * 3600) return `${Math.floor(s / 3600)}h ago`;
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(at * 1000)).toLowerCase();
}

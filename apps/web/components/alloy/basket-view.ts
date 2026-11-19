/**
 * Pure view-model helpers: turn lib domain objects into what the certificate UI shows.
 * All money math stays bigint (lib/units); numbers are only produced for drawing (charts/art).
 */
import type { Basket, Performance, PricePoint, RebalanceEvent } from "@/lib/types";
import { basketNav } from "@/lib/data";
import { sharesToUsd6, toWeightsBps, usd6ToChartNumber, valueUsd6 } from "@/lib/units";
import { basketIdentity, type BasketIdentity } from "./identity";
import type { RecipePart } from "./primitives";

export type BasketView = {
  basket: Basket;
  id: BasketIdentity;
  nav: bigint;
  navPerShare: bigint;
  /** Value per token (display numbers) for the chart, aligned with `times`. */
  series: number[];
  /** Engraving input: real value series, or the recipe's real feed index for young baskets. */
  artSeries: number[];
  times: number[];
  /** First → last point of the series, bps. */
  sinceBps: number;
  sinceDate: number;
  target: RecipePart[];
  now: RecipePart[];
  weightsBps: number[];
  creatorStakeUsd6: bigint;
  creatorStakeBps: number;
  tickers: string[];
};

/**
 * Weighted index of the components' real feed histories (for the engraving when the basket itself
 * is too new to have a value history). Each stock is resampled to N points and rebased to 1.
 */
export function weightedIndex(basket: Basket, histories: Record<string, PricePoint[]>, n = 64): number[] {
  const legs = basket.components
    .map((c) => ({ w: c.targetBps, h: histories[c.stock.token.toLowerCase()] ?? [] }))
    .filter((l) => l.h.length >= 2);
  if (!legs.length) return [];
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    let acc = 0;
    let wsum = 0;
    for (const l of legs) {
      const t = (k / (n - 1)) * (l.h.length - 1);
      const i = Math.floor(t);
      const f = t - i;
      const a = Number(l.h[i].price8);
      const b = Number(l.h[Math.min(i + 1, l.h.length - 1)].price8);
      const base = Number(l.h[0].price8) || 1;
      acc += l.w * ((a * (1 - f) + b * f) / base);
      wsum += l.w;
    }
    out.push(acc / (wsum || 1));
  }
  return out;
}

export const ART_MIN_POINTS = 20;

export function basketView(basket: Basket, perf?: Performance | null, histories?: Record<string, PricePoint[]>): BasketView {
  const { nav, navPerShare } = basketNav(basket);
  const navNums = (perf?.navSeries ?? []).map((p) => usd6ToChartNumber(p.navPerShareUsd6));
  // Young baskets have too few value points for a meaningful engraving: use the recipe's real feed history.
  const idx = navNums.length < ART_MIN_POINTS && histories ? weightedIndex(basket, histories) : [];
  const artSeries = idx.length >= 2 ? idx : navNums.length >= 2 ? navNums : [1, 1];
  const series = navNums;
  const times = (perf?.navSeries ?? []).map((p) => p.t);
  const first = perf?.navSeries[0]?.navPerShareUsd6 ?? 0n;
  const last = perf?.navSeries[perf.navSeries.length - 1]?.navPerShareUsd6 ?? 0n;
  const sinceBps = first > 0n ? Number(((last - first) * 10_000n) / first) : 0;
  const values = basket.components.map((c) => valueUsd6(c.balance8, c.stock.price8));
  const nowBps = nav > 0n ? toWeightsBps(values) : basket.components.map((c) => c.targetBps);
  const creatorStakeUsd6 = basket.totalSupply > 0n ? sharesToUsd6(basket.creatorShares, nav, basket.totalSupply) : 0n;
  const creatorStakeBps = basket.totalSupply > 0n ? Number((basket.creatorShares * 10_000n) / basket.totalSupply) : 0;
  return {
    basket,
    id: basketIdentity(basket),
    nav,
    navPerShare,
    series,
    artSeries,
    times,
    sinceBps,
    sinceDate: times[0] ?? basket.createdAt,
    target: basket.components.map((c) => ({ ticker: c.stock.ticker, bps: c.targetBps })),
    now: basket.components.map((c, i) => ({ ticker: c.stock.ticker, bps: nowBps[i] })),
    weightsBps: basket.components.map((c) => c.targetBps),
    creatorStakeUsd6,
    creatorStakeBps,
    tickers: basket.components.map((c) => c.stock.ticker),
  };
}

/** The pending recipe change, if any (feed event first, else the on-chain pendingRecipe). */
export function pendingChange(events: RebalanceEvent[], basket?: Basket): RebalanceEvent | undefined {
  const ev = events.find((e) => e.kind === "recipe-change" && e.status === "pending");
  if (ev || !basket?.pendingRecipe) return ev;
  const p = basket.pendingRecipe;
  return {
    id: `${basket.address}-pending`,
    kind: "recipe-change",
    status: "pending",
    at: p.executableAt - basket.noticeSeconds,
    executableAt: p.executableAt,
    changes: basket.components
      .map((c, i) => ({ symbol: c.stock.symbol, fromBps: c.targetBps, toBps: p.weightsBps[i] ?? c.targetBps }))
      .filter((c) => c.fromBps !== c.toBps),
    reason: p.reason,
  };
}

/** Recipe after a change is applied (by stock symbol → ticker). */
export function recipeAfter(basket: Basket, change: RebalanceEvent): RecipePart[] {
  return basket.components.map((c) => {
    const ch = change.changes.find((x) => x.symbol === c.stock.symbol);
    return { ticker: c.stock.ticker, bps: ch ? ch.toBps : c.targetBps };
  });
}

/** symbol ("NVDAc") → ticker ("NVDA") for change rows. */
export function tickerOf(basket: Basket, symbol: string): string {
  return basket.components.find((c) => c.stock.symbol === symbol)?.stock.ticker ?? symbol.replace(/c$/, "");
}

/** Compact USD for ledgers ("$1.2k"). Display only. */
export function compactUsd6(usd6: bigint): string {
  const n = usd6ToChartNumber(usd6 < 0n ? -usd6 : usd6);
  const sign = usd6 < 0n ? "−" : "";
  if (n >= 1_000_000) return `${sign}$${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${sign}$${(n / 1_000).toFixed(1)}k`;
  return `${sign}$${n.toFixed(2)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Aug 21" (UTC, stable across server/client). */
export function shortDate(unix: number): string {
  const d = new Date(unix * 1000);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
export function longDate(unix: number): string {
  const d = new Date(unix * 1000);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "14:22:05" or "2d 3h" for a seconds delta. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s >= 2 * 86_400) return `${Math.floor(s / 86_400)}d ${Math.floor((s % 86_400) / 3600)}h`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, "0")).join(":");
}

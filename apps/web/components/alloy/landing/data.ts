/**
 * Landing view-model (server): plain, serialisable numbers from the real loaders (lib/data via load.ts).
 * Returns are only shown when there is history ("New" otherwise); nothing here is invented.
 */
import type { PricePoint } from "@/lib/types";
import { DEFAULT_CHAIN } from "@/lib/chains";
import type { LoadedBasket } from "../load";
import { isNew, returnsOf, thesisOf } from "../v5/parts";
import { shortDate } from "../basket-view";
import { STYLES, styleOf } from "../styles";
import type { StrategyMode } from "@/lib/types";

export type LBasket = {
  address: string;
  name: string;
  handle: string;
  followers: number;
  thesis: string;
  style: StrategyMode;
  styleLabel: string;
  styleLine: string;
  feeBps: number;
  tickers: string[];
  /** target weights 0..1, same order as tickers */
  weights: number[];
  /** headline return: label + bps, or null bps = "New" */
  ret: { label: string; bps: number | null };
};

export type StoryMoves = {
  /** real price change per ticker over the history window, as a fraction (0.12 = +12%) */
  pct: Record<string, number>;
  /** unix seconds of the window start */
  since: number;
};

export type LandingData = {
  featured: LBasket | null;
  baskets: LBasket[];
  moves: StoryMoves | null;
  testnet: boolean;
};

export function toLBasket({ v, perf }: LoadedBasket): LBasket {
  const b = v.basket;
  const r = returnsOf(v, perf);
  const style = styleOf(b);
  const ret =
    r.creator !== null && b.followers > 0
      ? { label: "Followers", bps: r.followers }
      : isNew(v)
        ? { label: "Return", bps: null }
        : { label: `Since ${shortDate(v.sinceDate)}`, bps: v.sinceBps };
  const sum = b.components.reduce((a, c) => a + c.targetBps, 0) || 1;
  return {
    address: b.address,
    name: b.name,
    handle: b.creator.handle,
    followers: b.followers,
    thesis: thesisOf(v),
    style,
    styleLabel: STYLES[style].label,
    styleLine: STYLES[style].line,
    feeBps: b.feeBps,
    tickers: b.components.map((c) => c.stock.ticker),
    weights: b.components.map((c) => c.targetBps / sum),
    ret,
  };
}

/** Real per-stock price moves over the feed history window (oldest → latest point). */
export function movesFrom(item: LoadedBasket, hist: Record<string, PricePoint[]>): StoryMoves | null {
  const pct: Record<string, number> = {};
  let since = Infinity;
  for (const c of item.v.basket.components) {
    const h = hist[c.stock.token.toLowerCase()] ?? [];
    if (h.length < 2) return null;
    const a = Number(h[0].price8), z = Number(h[h.length - 1].price8);
    if (!(a > 0)) return null;
    pct[c.stock.ticker] = z / a - 1;
    since = Math.min(since, h[0].t);
  }
  return Number.isFinite(since) ? { pct, since } : null;
}

export const isTestnet = () => "testnet" in DEFAULT_CHAIN && DEFAULT_CHAIN.testnet === true;

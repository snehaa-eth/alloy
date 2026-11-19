/**
 * Explore view-model (server): plain, serialisable numbers from the real loaders (lib/data via load.ts).
 * Nothing here is invented: returns only when there is value history ("New" otherwise), themes from the
 * basket's own category / tags / name / stocks, followers as stored.
 */
import type { PricePoint, StrategyMode } from "@/lib/types";
import { usd6ToChartNumber } from "@/lib/units";
import type { LoadedBasket } from "../load";
import { isNew, thesisOf } from "../v5/parts";
import { shortDate } from "../basket-view";
import { STYLES, styleOf } from "../styles";

export type ExBasket = {
  address: string;
  name: string;
  handle: string;
  followers: number;
  thesis: string;
  style: StrategyMode;
  styleLabel: string;
  tickers: string[];
  /** target weights 0..1, same order as tickers */
  weights: number[];
  createdAt: number;
  featured: boolean;
  /** headline return over the last year (since start when younger): label + bps, or bps null = "New" */
  ret: { label: string; bps: number | null };
  themes: string[];
  /** basket value, display number (popular tie-break) */
  nav: number;
};

const BIG_TECH = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA"];
const ENERGY = ["TSLA", "NEE", "FSLR", "ENPH"];
const EVERYDAY = ["KO", "MCD", "COST", "PG", "NKE", "AAPL", "AMZN"];

/** Themes in display order. A basket may sit in several. */
export const THEME_ORDER = ["AI", "Big Tech", "Everyday", "Energy", "Stories", "Momentum"] as const;

function themesOf(item: LoadedBasket): string[] {
  const b = item.v.basket;
  const n = b.name.toLowerCase();
  const t = b.components.map((c) => c.stock.ticker.toUpperCase());
  const share = (set: string[]) => t.filter((x) => set.includes(x)).length / Math.max(1, t.length);
  const out = new Set<string>();
  if (b.category === "ai" || /\bai\b|chip|cloud|machine/.test(n)) out.add("AI");
  if (/big tech|giants|the ten/.test(n) || (t.length >= 3 && share(BIG_TECH) >= 0.99)) out.add("Big Tech");
  if (/everyday|brand|shop|consumer/.test(n) || share(EVERYDAY) >= 0.99 && !out.has("AI") && !out.has("Big Tech")) out.add("Everyday");
  if (/energy|power|solar|\bev\b|electric/.test(n) || t.filter((x) => ENERGY.includes(x)).length >= 2) out.add("Energy");
  if (b.category === "story" || b.story) out.add("Stories");
  if (b.category === "momentum" || /momentum|conviction/.test(n)) out.add("Momentum");
  for (const tag of b.tags ?? []) {
    const k = THEME_ORDER.find((x) => x.toLowerCase() === tag.toLowerCase());
    if (k) out.add(k);
  }
  return THEME_ORDER.filter((x) => out.has(x));
}

/** Trailing-year return from the value series (since start when the basket is younger than a year). */
function yearReturn(item: LoadedBasket): { label: string; bps: number | null } {
  const { v, perf } = item;
  if (isNew(v)) return { label: "Return", bps: null };
  const s = perf.navSeries;
  const last = s[s.length - 1];
  const from = last.t - 365 * 86_400;
  const first = s.find((p) => p.t >= from) ?? s[0];
  const a = first.navPerShareUsd6;
  if (a <= 0n) return { label: "Return", bps: null };
  const bps = Number(((last.navPerShareUsd6 - a) * 10_000n) / a);
  return { label: first.t <= from + 86_400 * 2 ? "1 year" : `Since ${shortDate(first.t)}`, bps };
}

export function toExBasket(item: LoadedBasket, featured: string | null): ExBasket {
  const b = item.v.basket;
  const style = styleOf(b);
  const sum = b.components.reduce((a, c) => a + c.targetBps, 0) || 1;
  return {
    address: b.address,
    name: b.name,
    handle: b.creator.handle,
    followers: b.followers,
    thesis: thesisOf(item.v),
    style,
    styleLabel: STYLES[style].label,
    tickers: b.components.map((c) => c.stock.ticker),
    weights: b.components.map((c) => c.targetBps / sum),
    createdAt: b.createdAt,
    featured: !!featured && b.address.toLowerCase() === featured.toLowerCase(),
    ret: yearReturn(item),
    themes: themesOf(item),
    nav: usd6ToChartNumber(item.v.nav),
  };
}

export type DayMoves = { pct: Record<string, number>; hours: number };

/**
 * Real per-stock price change over the last ~24h of feed history (fraction, 0.012 = +1.2%).
 * When a feed is younger than a day, the window is its whole history if that covers at least 6h;
 * `hours` is the widest window actually used, so the UI can say exactly what it shows. null when nothing is known.
 */
export function dayMoves(tickers: { ticker: string; token: string }[], hist: Record<string, PricePoint[]>): DayMoves | null {
  const pct: Record<string, number> = {};
  let hours = 0;
  for (const { ticker, token } of tickers) {
    const h = [...(hist[token.toLowerCase()] ?? [])].sort((a, b) => a.t - b.t);
    if (h.length < 2) continue;
    const last = h[h.length - 1];
    const target = last.t - 86_400;
    let base: PricePoint | undefined;
    for (const p of h) if (p.t <= target) base = p;
    if (base && target - base.t > 2 * 86_400) continue; // feed idle for days: "today" is unknown
    if (!base && last.t - h[0].t >= 6 * 3600) base = h[0];
    if (!base) continue;
    const a = Number(base.price8), z = Number(last.price8);
    if (!(a > 0)) continue;
    pct[ticker] = z / a - 1;
    hours = Math.max(hours, Math.min(24, Math.round((last.t - base.t) / 3600)));
  }
  return Object.keys(pct).length ? { pct, hours } : null;
}

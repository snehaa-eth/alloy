/**
 * Read layer used by pages (server components) and client hooks.
 *
 * LIVE on Base Sepolia: baskets come from BasketFactory.allBaskets, state from Basket views, prices
 * from the stock feeds (Chainlink AggregatorV3 shape), NAV history from feed round history.
 * Optional text metadata (thesis/tags/image) and rebalance reasons come from apps/api when configured.
 *
 * Falls back to MOCK data (lib/mock/, flagged `source: "mock"`) only when contracts are not deployed on
 * the default chain, NEXT_PUBLIC_USE_MOCKS=1, or the RPC is unreachable.
 *
 * Pages that call these must render dynamically (or set `revalidate`), otherwise `next build`
 * freezes the data at build time.
 */
import type { Address, Basket, NavPoint, Performance, PricePoint, RebalanceEvent, Stock } from "./types";
import { MOCK_BASKETS, mockPerformance, mockRebalances } from "./mock/baskets";
import { MOCK_STOCKS } from "./mock/stocks";
import { navPerShareUsd6, navUsd6 } from "./units";
import { displayBasketName, displayCopy } from "./display";
import { DEFAULT_CHAIN_ID } from "./chains";
import { isDeployed, stockByToken } from "./contracts";
import { fetchAllBasketMeta, fetchBasketMeta, fetchReasons } from "./api/endpoints";
import {
  isAlloyBasket,
  readBasket,
  readBasketAddresses,
  readFollowers,
  readNavSeries,
  readPriceHistory,
  readRebalances,
  readStocks,
  readUserPositions,
  type UserBasketPosition,
} from "./onchain";

const CHAIN = DEFAULT_CHAIN_ID;

/** True when pages read real chain data. */
export function isLive(): boolean {
  return isDeployed(CHAIN) && process.env.NEXT_PUBLIC_USE_MOCKS !== "1";
}

function logFallback(what: string, e: unknown) {
  console.error(`[alloy data] ${what} failed, serving mock data:`, e instanceof Error ? e.message : e);
}

const asMock = (b: Basket): Basket => ({ ...b, name: displayBasketName(b.name), thesis: displayCopy(b.thesis), source: "mock" });

export async function getStocks(): Promise<Stock[]> {
  if (!isLive()) return MOCK_STOCKS;
  try {
    return await readStocks(CHAIN);
  } catch (e) {
    logFallback("getStocks", e);
    return MOCK_STOCKS;
  }
}

async function withFollowers(b: Basket): Promise<Basket> {
  const f = await readFollowers(b);
  return f == null ? b : { ...b, followers: f };
}

export async function getBaskets(): Promise<Basket[]> {
  if (!isLive()) return MOCK_BASKETS.map(asMock);
  try {
    const [addrs, metas] = await Promise.all([readBasketAddresses(CHAIN), fetchAllBasketMeta(CHAIN)]);
    const baskets = await Promise.all(
      addrs.map((a) => readBasket(a, { chainId: CHAIN, meta: metas[a.toLowerCase()] ?? null }).then(withFollowers)),
    );
    // Biggest first.
    return baskets.sort((x, y) => (y.navUsd6 ?? 0n) > (x.navUsd6 ?? 0n) ? 1 : (y.navUsd6 ?? 0n) < (x.navUsd6 ?? 0n) ? -1 : 0);
  } catch (e) {
    logFallback("getBaskets", e);
    return MOCK_BASKETS.map(asMock);
  }
}

export async function getBasket(address: Address): Promise<Basket | null> {
  if (!isLive()) {
    const m = MOCK_BASKETS.find((b) => b.address.toLowerCase() === address.toLowerCase());
    return m ? asMock(m) : null;
  }
  try {
    if (!(await isAlloyBasket(address, CHAIN))) return null;
    const meta = await fetchBasketMeta(CHAIN, address);
    return withFollowers(await readBasket(address, { chainId: CHAIN, meta }));
  } catch (e) {
    logFallback("getBasket", e);
    const m = MOCK_BASKETS.find((b) => b.address.toLowerCase() === address.toLowerCase());
    return m ? asMock(m) : null;
  }
}

const ONE_SHARE_USD6 = 1_000_000n; // seed price: 1 share = $1
const E18 = 10n ** 18n;

function maxDrawdownBps(series: NavPoint[]): number {
  let peak = 0n;
  let worst = 0n;
  for (const p of series) {
    if (p.navPerShareUsd6 > peak) peak = p.navPerShareUsd6;
    if (peak > 0n) {
      const dd = ((peak - p.navPerShareUsd6) * 10_000n) / peak;
      if (dd > worst) worst = dd;
    }
  }
  return Number(worst);
}

/**
 * Performance from chain data. Returns are measured since seed (1 share = $1). Creator and follower
 * returns share the same per-share return; usd6 PnL is scaled by each side's shares.
 */
export async function getPerformance(basket: Basket): Promise<Performance> {
  if (basket.source !== "chain") return mockPerformance(basket);
  let navSeries: NavPoint[] = [];
  try {
    navSeries = await readNavSeries(basket);
  } catch (e) {
    console.error("[alloy data] nav series failed:", e instanceof Error ? e.message : e);
  }
  const nps = basket.navPerShareUsd6 ?? basketNav(basket).navPerShare;
  const bps = Number(((nps - ONE_SHARE_USD6) * 10_000n) / ONE_SHARE_USD6);
  const followerShares = basket.totalSupply - basket.creatorShares; // incl. 0.1% dead seed shares
  const pnlFor = (shares: bigint) => ({
    usd6: (shares > 0n ? shares : 0n) * (nps - ONE_SHARE_USD6) / E18,
    bps,
  });
  return {
    navSeries,
    maxDrawdownBps: maxDrawdownBps(navSeries),
    creatorPnl: pnlFor(basket.creatorShares),
    followerPnl: pnlFor(followerShares),
    feesEarnedUsd6: 0n,
  };
}

export async function getRebalances(basket: Basket): Promise<RebalanceEvent[]> {
  if (basket.source !== "chain") return mockRebalances(basket);
  try {
    const reasons = await fetchReasons(CHAIN, basket.address);
    return await readRebalances(basket, { reasons });
  } catch (e) {
    console.error("[alloy data] rebalances failed:", e instanceof Error ? e.message : e);
    return [];
  }
}

/**
 * Price history for one stock (for the guilloche / sparkline headers), oldest first.
 * Built from the feed's round history; may hold a single point on a freshly deployed feed.
 */
export async function getPriceHistory(token: Address, maxRounds = 96): Promise<PricePoint[]> {
  if (!isLive()) return [];
  const s = stockByToken(CHAIN, token);
  if (!s) return [];
  try {
    return await readPriceHistory(s.feed, { chainId: CHAIN, maxRounds });
  } catch {
    return [];
  }
}

/** Price histories for every component of a basket, keyed by token (lowercase). */
export async function getBasketPriceHistories(basket: Basket, maxRounds = 96): Promise<Record<string, PricePoint[]>> {
  const entries = await Promise.all(
    basket.components.map(async (c) => [c.stock.token.toLowerCase(), await getPriceHistory(c.stock.token, maxRounds)] as const),
  );
  return Object.fromEntries(entries);
}

/** A user's positions across the given (or all) baskets. */
export async function getUserPositions(user: Address, baskets?: Address[]): Promise<UserBasketPosition[]> {
  if (!isLive()) return [];
  const list = baskets ?? (await readBasketAddresses(CHAIN));
  return readUserPositions(user, list, CHAIN);
}

export function basketNav(basket: Basket): { nav: bigint; navPerShare: bigint } {
  if (basket.navUsd6 !== undefined && basket.navPerShareUsd6 !== undefined) {
    return { nav: basket.navUsd6, navPerShare: basket.navPerShareUsd6 };
  }
  const nav = navUsd6(basket.components.map((c) => ({ balance: c.balance8, price: c.stock.price8 })));
  return { nav, navPerShare: navPerShareUsd6(nav, basket.totalSupply) };
}

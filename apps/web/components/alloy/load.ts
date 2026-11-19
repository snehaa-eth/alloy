/** Server-side loader shared by Explore / Portfolio / Activity / Me / Try (reads lib/data only). */
import { getBaskets, getPerformance, getPriceHistory, getRebalances } from "@/lib/data";
import type { Performance, PricePoint, RebalanceEvent } from "@/lib/types";
import { ART_MIN_POINTS, basketView, type BasketView } from "./basket-view";

export type LoadedBasket = { v: BasketView; perf: Performance; events: RebalanceEvent[] };

/** Run `fn` over `xs` with at most `n` in flight (public RPC rate limits). */
async function mapLimit<T, R>(xs: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(xs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, xs.length) }, async () => {
      while (next < xs.length) {
        const i = next++;
        out[i] = await fn(xs[i]);
      }
    }),
  );
  return out;
}

async function loadAllFresh(): Promise<LoadedBasket[]> {
  const t0 = Date.now();
  const baskets = await getBaskets();
  const t1 = Date.now();
  // Performance and rebalances per basket in parallel (they were sequential per basket before).
  const loaded = await Promise.all(
    baskets.map(async (b) => {
      const [perf, events] = await Promise.all([getPerformance(b), getRebalances(b)]);
      return { b, perf, events };
    }),
  );
  const t2 = Date.now();

  // Engraving fallback for young baskets: ONE price-history read per unique stock, 4 at a time (was one by one).
  const tokens = new Set<string>();
  for (const { b, perf } of loaded) if (perf.navSeries.length < ART_MIN_POINTS) b.components.forEach((c) => tokens.add(c.stock.token.toLowerCase()));
  const list = [...tokens];
  const hist = await mapLimit(list, 4, (t) => getPriceHistory(t as `0x${string}`, 64).catch(() => [] as PricePoint[]));
  const histories: Record<string, PricePoint[]> = Object.fromEntries(list.map((t, i) => [t, hist[i]]));
  const t3 = Date.now();
  if (process.env.NODE_ENV !== "production")
    console.info(`[alloy load] ${baskets.length} baskets in ${t3 - t0}ms (list ${t1 - t0}ms · perf+events ${t2 - t1}ms · ${list.length} price histories ${t3 - t2}ms)`);

  return loaded.map(({ b, perf, events }) => ({ v: basketView(b, perf, tokens.size ? histories : undefined), perf, events }));
}

/**
 * Stale-while-revalidate in memory: the first call waits; later calls return the last result at once
 * and refresh it in the background when it is older than 30s. Pages already set `revalidate = 30`,
 * so this serves the same freshness without making a visitor wait on the chain reads.
 */
const TTL_MS = 30_000;
let cache: { at: number; data: LoadedBasket[] } | null = null;
let inflight: Promise<LoadedBasket[]> | null = null;

function refresh(): Promise<LoadedBasket[]> {
  inflight ??= loadAllFresh()
    .then((data) => {
      cache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function loadAll(): Promise<LoadedBasket[]> {
  if (cache) {
    if (Date.now() - cache.at > TTL_MS) refresh().catch(() => {});
    return cache.data;
  }
  return refresh();
}

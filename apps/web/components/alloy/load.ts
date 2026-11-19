/** Server-side loader shared by Explore / Portfolio / Activity / Me / Try (reads lib/data only). */
import { getBaskets, getPerformance, getPriceHistory, getRebalances } from "@/lib/data";
import type { Performance, PricePoint, RebalanceEvent } from "@/lib/types";
import { ART_MIN_POINTS, basketView, type BasketView } from "./basket-view";

export type LoadedBasket = { v: BasketView; perf: Performance; events: RebalanceEvent[] };

export async function loadAll(): Promise<LoadedBasket[]> {
  const baskets = await getBaskets();
  const loaded = await Promise.all(baskets.map(async (b) => ({ b, perf: await getPerformance(b), events: await getRebalances(b) })));

  // Engraving fallback for young baskets: ONE price-history read per unique stock (public RPC rate limits).
  const tokens = new Set<string>();
  for (const { b, perf } of loaded) if (perf.navSeries.length < ART_MIN_POINTS) b.components.forEach((c) => tokens.add(c.stock.token.toLowerCase()));
  const histories: Record<string, PricePoint[]> = {};
  for (const t of tokens) histories[t] = await getPriceHistory(t as `0x${string}`, 64).catch(() => []);

  return loaded.map(({ b, perf, events }) => ({ v: basketView(b, perf, tokens.size ? histories : undefined), perf, events }));
}

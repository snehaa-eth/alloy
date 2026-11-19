import type { Address } from "viem";
import { getBasket, getBasketPriceHistories, getPerformance, getRebalances } from "@/lib/data";
import { loadAll, type LoadedBasket } from "@/components/alloy/load";
import { ART_MIN_POINTS, basketView } from "@/components/alloy/basket-view";
import { FEATURED_BASKET } from "@/components/alloy/config";
import { Landing } from "@/components/alloy/v5/Landing";

/** The featured basket may be newer than the list source; read it directly if it's missing. */
async function loadFeatured(items: LoadedBasket[]): Promise<LoadedBasket[]> {
  if (!FEATURED_BASKET || items.some((i) => i.v.basket.address.toLowerCase() === FEATURED_BASKET!.toLowerCase())) return items;
  const b = await getBasket(FEATURED_BASKET as Address).catch(() => null);
  if (!b) return items;
  const [perf, events] = await Promise.all([getPerformance(b), getRebalances(b)]);
  const hist = perf.navSeries.length < ART_MIN_POINTS ? await getBasketPriceHistories(b, 64).catch(() => ({})) : undefined;
  return [{ v: basketView(b, perf, hist), perf, events }, ...items];
}

export default async function HomePage() {
  return <Landing items={await loadFeatured(await loadAll())} />;
}

/** Live chain data: re-read at most every 30s. */
export const revalidate = 30;

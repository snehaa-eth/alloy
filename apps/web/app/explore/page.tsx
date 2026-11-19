import type { Metadata } from "next";
import type { Address } from "viem";
import { getBasket, getBasketPriceHistories, getPerformance, getRebalances } from "@/lib/data";
import { loadAll, type LoadedBasket } from "@/components/alloy/load";
import { ART_MIN_POINTS, basketView } from "@/components/alloy/basket-view";
import { ExploreView } from "@/components/alloy/screens/ExploreView";
import { FEATURED_BASKET, isPublic } from "@/components/alloy/config";
import { toExBasket } from "@/components/alloy/explore/data";

export const metadata: Metadata = { title: "Explore" };

export default async function ExplorePage() {
  const items: LoadedBasket[] = (await loadAll()).filter(({ v }) => isPublic(v.basket));
  // The featured basket may be newer than the list source.
  if (FEATURED_BASKET && !items.some(({ v }) => v.basket.address.toLowerCase() === FEATURED_BASKET!.toLowerCase())) {
    const b = await getBasket(FEATURED_BASKET as Address).catch(() => null);
    if (b) {
      const [perf, events] = await Promise.all([getPerformance(b), getRebalances(b)]);
      const hist = perf.navSeries.length < ART_MIN_POINTS ? await getBasketPriceHistories(b, 64).catch(() => ({})) : undefined;
      items.unshift({ v: basketView(b, perf, hist), perf, events });
    }
  }
  return <ExploreView items={items.map((i) => toExBasket(i, FEATURED_BASKET))} />;
}

/** Live chain data: re-read at most every 30s. */
export const revalidate = 30;

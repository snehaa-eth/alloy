import type { Metadata } from "next";
import type { Address } from "viem";
import { getBasket, getPerformance } from "@/lib/data";
import { loadAll } from "@/components/alloy/load";
import { basketView } from "@/components/alloy/basket-view";
import { ExploreView } from "@/components/alloy/screens/ExploreView";
import { FEATURED_BASKET, isPublic } from "@/components/alloy/config";

export const metadata: Metadata = { title: "Explore" };

export default async function ExplorePage() {
  const items = (await loadAll()).filter(({ v }) => isPublic(v.basket)).map(({ v, perf }) => ({ v, perf }));
  // The featured basket may be newer than the list source.
  if (FEATURED_BASKET && !items.some(({ v }) => v.basket.address.toLowerCase() === FEATURED_BASKET!.toLowerCase())) {
    const b = await getBasket(FEATURED_BASKET as Address).catch(() => null);
    if (b) {
      const perf = await getPerformance(b);
      items.unshift({ v: basketView(b, perf), perf });
    }
  }
  return <ExploreView items={items} />;
}

/** Live chain data: re-read at most every 30s. */
export const revalidate = 30;

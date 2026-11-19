import type { Address } from "viem";
import { getBasket, getBasketPriceHistories, getPerformance, getRebalances } from "@/lib/data";
import { loadAll, type LoadedBasket } from "@/components/alloy/load";
import { ART_MIN_POINTS, basketView } from "@/components/alloy/basket-view";
import { FEATURED_BASKET, isPublic } from "@/components/alloy/config";
import { Landing } from "@/components/alloy/landing/Landing";
import { isTestnet, movesFrom, toLBasket, type LandingData } from "@/components/alloy/landing/data";

/** The featured basket may be newer than the list source; read it directly if it's missing. */
async function loadFeatured(items: LoadedBasket[]): Promise<LoadedBasket[]> {
  if (!FEATURED_BASKET || items.some((i) => i.v.basket.address.toLowerCase() === FEATURED_BASKET!.toLowerCase())) return items;
  const b = await getBasket(FEATURED_BASKET as Address).catch(() => null);
  if (!b) return items;
  const [perf, events] = await Promise.all([getPerformance(b), getRebalances(b)]);
  const hist = perf.navSeries.length < ART_MIN_POINTS ? await getBasketPriceHistories(b, 64).catch(() => ({})) : undefined;
  return [{ v: basketView(b, perf, hist), perf, events }, ...items];
}

async function landingData(): Promise<LandingData> {
  const items = await loadFeatured(await loadAll());
  const visible = items.filter((i) => isPublic(i.v.basket));
  const sorted = [...visible].sort((a, b) => b.v.basket.followers - a.v.basket.followers);
  // Featured: FEATURED_BASKET (config.ts) → an "AI Build-Out" by name → most followed.
  const featured =
    (FEATURED_BASKET ? items.find((i) => i.v.basket.address.toLowerCase() === String(FEATURED_BASKET).toLowerCase()) : undefined) ||
    visible.find((i) => /ai build/i.test(i.v.basket.name)) ||
    sorted[0];
  const others = sorted.filter((i) => i !== featured);
  const shelf = (featured ? [featured, ...others] : others).slice(0, 4);
  // Real price moves of the featured basket's stocks (feed history) for the "Prices move" story step.
  const hist = featured ? await getBasketPriceHistories(featured.v.basket, 64).catch(() => null) : null;
  return {
    featured: featured ? toLBasket(featured) : null,
    baskets: shelf.map(toLBasket),
    moves: featured && hist ? movesFrom(featured, hist) : null,
    testnet: isTestnet(),
  };
}

export default async function HomePage() {
  return <Landing data={await landingData()} />;
}

/** Live chain data: re-read at most every 30s. */
export const revalidate = 30;

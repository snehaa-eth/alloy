import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAddress, type Address } from "viem";
import { getBasket, getBasketPriceHistories, getPerformance, getRebalances } from "@/lib/data";
import { ART_MIN_POINTS, basketView } from "@/components/alloy/basket-view";
import { ProposeScreen } from "@/components/alloy/screens/ProposeScreen";

export const metadata: Metadata = { title: "Your basket" };

export default async function CreatorBasketPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const basket = isAddress(address, { strict: false }) ? await getBasket(address as Address) : null;
  if (!basket) notFound();
  const [perf, events] = await Promise.all([getPerformance(basket), getRebalances(basket)]);
  // TODO(lib): gate on connected wallet == basket.creator (contract enforces it anyway).
  return <ProposeScreen v={basketView(basket, perf, perf.navSeries.length < ART_MIN_POINTS ? await getBasketPriceHistories(basket, 64).catch(() => ({})) : undefined)} perf={perf} events={events} />;
}

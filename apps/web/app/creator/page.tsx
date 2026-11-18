import type { Metadata } from "next";
import { CreatorDashboard, type CreatorBasketSummary } from "@/components/creator/CreatorDashboard";
import { basketNav, getBaskets, getPerformance } from "@/lib/data";

export const metadata: Metadata = { title: "Creator dashboard" };

export default async function CreatorPage() {
  const baskets = await getBaskets();
  const summaries: CreatorBasketSummary[] = await Promise.all(
    baskets.map(async (b) => ({
      address: b.address,
      name: b.name,
      symbol: b.symbol,
      creator: b.creator.address,
      aumUsd6: basketNav(b).nav,
      feesEarnedUsd6: (await getPerformance(b)).feesEarnedUsd6,
      followers: b.followers,
      noticeSeconds: b.noticeSeconds,
      components: b.components.map((c) => ({ ticker: c.stock.ticker, targetBps: c.targetBps })),
    })),
  );
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-28">
      <h1 className="mb-2 text-3xl font-semibold">Creator dashboard</h1>
      <p className="mb-8 text-gray-400">Your baskets, assets under management, fees earned, and recipe changes.</p>
      <CreatorDashboard baskets={summaries} />
    </div>
  );
}

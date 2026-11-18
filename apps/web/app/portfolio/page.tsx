import type { Metadata } from "next";
import { PortfolioView, type PortfolioBasket } from "@/components/portfolio/PortfolioView";
import { basketNav, getBaskets } from "@/lib/data";

export const metadata: Metadata = { title: "Portfolio" };

export default async function PortfolioPage() {
  const baskets = await getBaskets();
  const summaries: PortfolioBasket[] = baskets.map((b) => ({
    address: b.address,
    name: b.name,
    symbol: b.symbol,
    nav: basketNav(b).nav,
    totalSupply: b.totalSupply,
  }));
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-28">
      <h1 className="mb-8 text-3xl font-semibold">Portfolio</h1>
      <PortfolioView baskets={summaries} />
    </div>
  );
}

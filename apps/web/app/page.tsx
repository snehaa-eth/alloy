import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BasketCard } from "@/components/basket/BasketCard";
import { getBaskets, getPerformance } from "@/lib/data";

export default async function ExplorePage() {
  const baskets = await getBaskets();
  const performances = await Promise.all(baskets.map((b) => getPerformance(b)));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-28">
      <section className="mb-12 max-w-3xl">
        <h1 className="mb-4 text-4xl font-semibold leading-tight md:text-5xl">Invest in stories, not symbols.</h1>
        <p className="mb-6 text-lg text-gray-400">
          Curated on-chain baskets of tokenized U.S. stock exposure on Base. Buy a whole theme in one tap; the basket
          rebalances itself, and you can see exactly how followers did next to the creator.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="metal" size="lg">
            <a href="#baskets">Explore baskets</a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/create">Create a basket</Link>
          </Button>
        </div>
      </section>

      <section id="baskets">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Baskets</h2>
          <p className="text-xs text-gray-500">Sorted by AUM · demo data</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {baskets.map((b, i) => (
            <BasketCard key={b.address} basket={b} performance={performances[i]} />
          ))}
        </div>
      </section>
    </div>
  );
}

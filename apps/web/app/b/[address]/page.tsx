import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isAddress, type Address } from "viem";
import { ArrowLeft } from "lucide-react";
import { DonutChartWithLegend } from "@/components/DonutChart";
import { StocksTable } from "@/components/stocks/StocksTable";
import type { BundleRow } from "@/components/stocks/columns";
import { NavChart } from "@/components/basket/NavChart";
import { PnlCompareCard } from "@/components/basket/PnlCompareCard";
import { RebalanceFeed } from "@/components/basket/RebalanceFeed";
import { StrategyBadge } from "@/components/basket/StrategyBadge";
import { TradePanel } from "@/components/basket/TradePanel";
import { storyDisclosure } from "@/components/compliance/copy";
import { basketNav, getBasket, getPerformance, getRebalances } from "@/lib/data";
import { STRATEGY_MODES } from "@/lib/strategy";
import { formatBps, formatShares, formatUsd6, toWeightsBps, valueUsd6 } from "@/lib/units";

type Props = { params: Promise<{ address: string }> };

async function load(params: Props["params"]) {
  const { address } = await params;
  if (!isAddress(address, { strict: false })) return null;
  return getBasket(address as Address);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const basket = await load(params);
  if (!basket) return { title: "Basket not found" };
  const title = `${basket.name} (${basket.symbol})`;
  const description = `${basket.thesis} Curated by @${basket.creator.handle} on Alloy.`;
  return {
    title,
    description,
    openGraph: { title, description, url: `/b/${basket.address}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

export default async function BasketPage({ params }: Props) {
  const basket = await load(params);
  if (!basket) notFound();

  const [performance, rebalances] = await Promise.all([getPerformance(basket), getRebalances(basket)]);
  const { nav, navPerShare } = basketNav(basket);
  const values = basket.components.map((c) => valueUsd6(c.balance8, c.stock.price8));
  const current = nav > 0n ? toWeightsBps(values) : basket.components.map(() => 0);
  const rows: BundleRow[] = basket.components.map((c, i) => ({
    symbol: c.stock.symbol,
    ticker: c.stock.ticker,
    name: c.stock.name,
    price8: c.stock.price8,
    balance8: c.balance8,
    valueUsd6: values[i],
    targetBps: c.targetBps,
    currentBps: current[i],
  }));
  const mode = STRATEGY_MODES[basket.mode];
  const renderedAt = performance.navSeries[performance.navSeries.length - 1]?.t ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-28">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All baskets
      </Link>

      <header className="mb-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold md:text-4xl">{basket.name}</h1>
          <span className="text-gray-500">{basket.symbol}</span>
          <StrategyBadge mode={basket.mode} />
          {basket.demo && (
            <span className="rounded bg-yellow-900/40 px-2 py-0.5 text-xs text-yellow-300">
              Demo basket · 10-minute recipe notice
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Curated by {basket.creator.displayName} (@{basket.creator.handle})
        </p>
        <p className="mt-4 max-w-3xl text-gray-300">{basket.thesis}</p>
        {basket.story && (
          <p className="mt-2 text-xs text-gray-500">{storyDisclosure(basket.story.source, basket.story.disclosureDate)}</p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-5">
          <Stat label="NAV / share" value={formatUsd6(navPerShare)} />
          <Stat label="AUM" value={formatUsd6(nav, 0)} />
          <Stat label="Followers" value={String(basket.followers)} />
          <Stat label="Creator stake" value={`${formatShares(basket.creatorShares, 2)} ${basket.symbol}`} />
          <Stat label="Management fee" value={`${formatBps(basket.feeBps)}/yr`} />
        </div>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-10">
          <section>
            <h2 className="mb-3 text-xl font-semibold">Performance</h2>
            <NavChart series={performance.navSeries} />
          </section>

          <PnlCompareCard performance={performance} />

          <section>
            <h2 className="mb-1 text-xl font-semibold">What&apos;s inside</h2>
            <p className="mb-4 text-sm text-gray-500">
              Strategy: {mode.label}. {mode.oneLiner}
            </p>
            <DonutChartWithLegend
              slices={basket.components.map((c) => ({ label: c.stock.ticker, sublabel: c.stock.name, bps: c.targetBps }))}
            />
            <div className="mt-6">
              <StocksTable rows={rows} />
            </div>
          </section>

          <section>
            <h2 className="mb-1 text-xl font-semibold">Rebalances</h2>
            <p className="mb-4 text-sm text-gray-500">
              Recipe changes are announced {basket.demo ? "10 minutes" : "24 hours"} ahead. Every rebalance is capped at
              1.5% loss and must pass price-feed health checks.
            </p>
            <RebalanceFeed events={rebalances} renderedAt={renderedAt} />
          </section>
        </div>

        <div className="w-full lg:sticky lg:top-24 lg:w-80 lg:self-start">
          <TradePanel
            feeBps={basket.feeBps}
            basket={{
              address: basket.address,
              name: basket.name,
              symbol: basket.symbol,
              nav,
              totalSupply: basket.totalSupply,
              components: basket.components.map((c) => ({ symbol: c.stock.symbol, balance8: c.balance8 })),
            }}
          />
        </div>
      </div>
    </div>
  );
}

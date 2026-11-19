import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAddress, type Address } from "viem";
import { getBasket, getBasketPriceHistories, getPerformance, getRebalances } from "@/lib/data";
import { ART_MIN_POINTS, basketView } from "@/components/alloy/basket-view";
import { BasketScreen } from "@/components/alloy/screens/BasketScreen";
import { dayMoves } from "@/components/alloy/explore/data";
import { isTestnet } from "@/components/alloy/landing/data";

type Props = {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function load(params: Props["params"]) {
  const { address } = await params;
  if (!isAddress(address, { strict: false })) return null;
  return getBasket(address as Address);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const basket = await load(params);
  if (!basket) return { title: "Basket not found" };
  const title = basket.name;
  const description = `${basket.thesis} By @${basket.creator.handle}. A token that tracks these stocks, not the shares themselves.`;
  return {
    title,
    description,
    openGraph: { title, description, url: `/b/${basket.address}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BasketPage({ params, searchParams }: Props) {
  const basket = await load(params);
  if (!basket) notFound();
  const sp = await searchParams;
  // Feed histories serve both the young-basket chart fallback and the real 24h moves ("Today").
  const [perf, events, hist] = await Promise.all([getPerformance(basket), getRebalances(basket), getBasketPriceHistories(basket, 96).catch(() => ({}))]);
  const buy = typeof sp.buy === "string" && /^\d+(\.\d{1,2})?$/.test(sp.buy) ? sp.buy : undefined;
  const sheet = typeof sp.sheet === "string" ? sp.sheet : undefined;
  const moves = dayMoves(
    basket.components.map((c) => ({ ticker: c.stock.ticker, token: c.stock.token })),
    hist,
  );
  return (
    <BasketScreen
      v={basketView(basket, perf, perf.navSeries.length < ART_MIN_POINTS ? hist : undefined)}
      perf={perf}
      events={events}
      moves={moves}
      testnet={isTestnet()}
      initialBuy={buy}
      initialSheet={sheet}
    />
  );
}

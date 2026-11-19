import { notFound } from "next/navigation";
import type { Address } from "viem";
import { getBasket, getPerformance } from "@/lib/data";
import { basketView } from "@/components/alloy/basket-view";
import { DevTrade } from "@/components/alloy/trade/DevTrade";

/** Dev-only story page for the buy / sell flows with a MOCKED tx (no wallet). Never served in production. */
export default async function DevTradePage({ searchParams }: { searchParams: Promise<{ [k: string]: string | undefined }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  const basket = await getBasket((sp.b ?? "0xA6665F87702Ba1cDeF544E890147B2b5d305Cec3") as Address);
  if (!basket) notFound();
  const perf = await getPerformance(basket);
  return <DevTrade v={basketView(basket, perf)} view={sp.view ?? "buy"} fail={sp.fail} scale={Number(sp.ms ?? 1)} />;
}

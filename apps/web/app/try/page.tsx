import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadAll } from "@/components/alloy/load";
import { TryScreen } from "@/components/alloy/screens/TryScreen";
import { DEMO_BASKET } from "@/lib/contracts";

export const metadata: Metadata = { title: "Try Alloy in 2 minutes" };

export default async function TryPage() {
  const all = await loadAll();
  // TODO(lib): one judge demo basket per judge from a pool; for now the on-chain DEMO_BASKET or the first demo basket.
  const demo =
    all.find((x) => x.v.basket.address.toLowerCase() === DEMO_BASKET.toLowerCase()) ?? all.find((x) => x.v.basket.demo) ?? all[0];
  if (!demo) notFound();
  return <TryScreen demo={demo} others={all.filter((x) => x !== demo)} />;
}

/** Live chain data: re-read at most every 30s. */
export const revalidate = 30;

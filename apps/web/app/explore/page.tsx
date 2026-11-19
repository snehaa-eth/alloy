import type { Metadata } from "next";
import { loadAll } from "@/components/alloy/load";
import { ExploreView } from "@/components/alloy/screens/ExploreView";

export const metadata: Metadata = { title: "Explore" };

export default async function ExplorePage() {
  const items = await loadAll();
  return <ExploreView items={items.map(({ v, perf }) => ({ v, perf }))} />;
}

/** Live chain data: re-read at most every 30s. */
export const revalidate = 30;

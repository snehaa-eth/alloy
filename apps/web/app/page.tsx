import { loadAll } from "@/components/alloy/load";
import { ExploreView } from "@/components/alloy/screens/ExploreView";

export default async function ExplorePage() {
  const items = await loadAll();
  return <ExploreView views={items.map((i) => i.v)} />;
}

/** Live chain data: re-read at most every 30s. */
export const revalidate = 30;

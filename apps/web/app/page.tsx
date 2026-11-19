import { loadAll } from "@/components/alloy/load";
import { Landing } from "@/components/alloy/v5/Landing";

export default async function HomePage() {
  return <Landing items={await loadAll()} />;
}

/** Live chain data: re-read at most every 30s. */
export const revalidate = 30;

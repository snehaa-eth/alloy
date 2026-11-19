import type { Metadata } from "next";
import { loadAll } from "@/components/alloy/load";
import { PortfolioScreen } from "@/components/alloy/screens/PortfolioScreen";

export const metadata: Metadata = { title: "Portfolio" };

export default async function PortfolioPage() {
  return <PortfolioScreen items={await loadAll()} />;
}

/** Live chain data: re-read at most every 30s. */
export const revalidate = 30;

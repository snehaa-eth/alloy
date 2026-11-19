import type { Metadata } from "next";
import { loadAll } from "@/components/alloy/load";
import { ActivityScreen } from "@/components/alloy/screens/ActivityScreen";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage() {
  return <ActivityScreen items={await loadAll()} />;
}

/** Live chain data: re-read at most every 30s. */
export const revalidate = 30;

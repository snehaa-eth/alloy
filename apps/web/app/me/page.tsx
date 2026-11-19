import type { Metadata } from "next";
import { loadAll } from "@/components/alloy/load";
import { MeScreen } from "@/components/alloy/screens/MeScreen";

export const metadata: Metadata = { title: "Me" };

export default async function MePage() {
  return <MeScreen items={await loadAll()} />;
}

/** Live chain data: re-read at most every 30s. */
export const revalidate = 30;

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadAll } from "@/components/alloy/load";
import { isPublic } from "@/components/alloy/config";
import { CreatorScreen } from "@/components/alloy/creator/CreatorScreen";

type Props = { params: Promise<{ handle: string }> };

/** Creator profile by handle (@meera_invests) or address (0x…). Baskets come from the same real loader as Explore. */
async function load(params: Props["params"]) {
  const raw = decodeURIComponent((await params).handle).replace(/^@/, "").toLowerCase();
  const all = await loadAll();
  const mine = all.filter(({ v }) => v.basket.creator.handle.toLowerCase() === raw || v.basket.creator.address.toLowerCase() === raw);
  const pub = mine.filter(({ v }) => isPublic(v.basket));
  return pub.length ? pub : mine;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const items = await load(params);
  if (!items.length) return { title: "Creator not found" };
  const c = items[0].v.basket.creator;
  return { title: `@${c.handle}`, description: `${items.length} ${items.length === 1 ? "basket" : "baskets"} by @${c.handle} on Alloy.` };
}

export default async function CreatorPage({ params }: Props) {
  const items = await load(params);
  if (!items.length) notFound();
  return <CreatorScreen items={items} />;
}

/** Live chain data: re-read at most every 30s. */
export const revalidate = 30;

import type { Metadata } from "next";
import { Waitlist } from "@/components/alloy/waitlist/Waitlist";

/**
 * /waitlist/pass/[n]: the link people share from their pass. Same waitlist page, but its preview card on X is
 * that pass (opengraph-image.tsx next to this file). Not gated: proxy.ts never redirects /waitlist/*.
 */
export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const { n } = await params;
  const num = passNumber(n);
  const title = num ? `Alloy early pass #${num}` : "Alloy early pass";
  const description = "Baskets of US stocks around one idea, from $5. Get your pass.";
  return { title, description, openGraph: { title, description }, twitter: { card: "summary_large_image", title, description } };
}

function passNumber(n: string) {
  const v = Number.parseInt(n, 10);
  return Number.isFinite(v) && v > 0 && v < 10_000_000 ? String(v).padStart(4, "0") : null;
}

export default function PassPage() {
  return <Waitlist />;
}

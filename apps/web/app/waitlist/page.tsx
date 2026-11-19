import type { Metadata } from "next";
import { Waitlist } from "@/components/alloy/waitlist/Waitlist";

export const metadata: Metadata = {
  title: "Join the waitlist",
  description: "Baskets of US stocks around one idea, from $5, built by creators you follow. Real money on Base is coming. Get in first.",
  openGraph: { title: "Alloy · Join the waitlist", description: "Baskets of US stocks around one idea, from $5. Live on Base soon." },
};

export default function WaitlistPage() {
  return <Waitlist />;
}

/**
 * Alloy landing (approved liquid-metal design, docs/design/artdir/wow/index.html) on real data:
 * scroll story on the featured basket → baskets shelf → fine print → footer.
 */
import Link from "next/link";
import type { LandingData } from "./data";
import { Story } from "./Story";
import { BasketsSection, EndSection, TrustSection } from "./Sections";

export function Landing({ data }: { data: LandingData }) {
  const { featured } = data;
  return (
    <div className="relative">
      {featured ? (
        <Story b={featured} moves={data.moves} />
      ) : (
        <section className="flex min-h-[100vh] flex-col items-center justify-center px-4 text-center">
          <h1 className="a-display text-[clamp(44px,5.6vw,84px)] leading-[1.02]">
            Stocks, <em className="a-acc">alloyed.</em>
          </h1>
          <p className="mt-4 font-display font-light text-mute">Baskets of US stocks around one idea. From $5.</p>
          <Link href="/explore" className="a-btn a-btn--line a-btn--lg mt-8">
            Explore baskets
          </Link>
        </section>
      )}
      <BasketsSection baskets={data.baskets} />
      <TrustSection feeBps={featured?.feeBps ?? 100} testnet={data.testnet} />
      <EndSection featured={featured} />
    </div>
  );
}

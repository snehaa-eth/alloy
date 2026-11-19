/**
 * v5 landing: hero + featured story, live numbers, how it works, trending, honesty band, create CTA.
 * Server component; all numbers come from lib/data via loadAll().
 */
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Coins, DoorOpen, HandCoins, KeyRound, MessageSquareText, Percent, Plus, ShieldCheck } from "lucide-react";
import { formatUsd6 } from "@/lib/units";
import { AlloyBar, fmtPct } from "../primitives";
import { StoryScroll } from "../motion/StoryScroll";
import { HeroStories } from "../motion/HeroStories";
import { compactUsd6 } from "../basket-view";
import type { LoadedBasket } from "../load";
import { FEATURED_BASKET, isPublic } from "../config";
import { BasketCard, CreatorAvatar, Logos, ReturnValue, SectionHead, returnsOf, thesisOf } from "./parts";

export function Landing({ items }: { items: LoadedBasket[] }) {
  // Public lists hide demo / judge baskets (they live on /try) and retired baskets (config.ts).
  const visible = items.filter((i) => isPublic(i.v.basket));
  const sorted = [...visible].sort((a, b) => b.v.basket.followers - a.v.basket.followers);
  // Featured story: FEATURED_BASKET (config.ts) → else an "AI Build-Out" by name (visible first) → else most followed.
  const featured =
    (FEATURED_BASKET ? items.find((i) => i.v.basket.address.toLowerCase() === String(FEATURED_BASKET).toLowerCase()) : undefined) ||
    visible.find((i) => /ai build/i.test(i.v.basket.name)) ||
    items.find((i) => /ai build/i.test(i.v.basket.name)) ||
    sorted[0];
  const others = sorted.filter((i) => i !== featured);
  // Few public baskets: include the featured one so the row never looks half empty.
  const trending = (others.length < 3 && featured ? [featured, ...others] : others).slice(0, 4);
  const cols = Math.min(4, trending.length + (trending.length < 4 ? 1 : 0));
  const totalNav = visible.reduce((a, i) => a + i.v.nav, 0n);
  const followers = visible.reduce((a, i) => a + i.v.basket.followers, 0);
  const stocks = new Set(items.flatMap((i) => i.v.tickers)).size;
  const feePct = featured ? featured.v.basket.feeBps / 100 : 1;
  // Hero stories: only themes with a live public basket; the card swaps in sync with the rolling word.
  const heroStories = (
    [
      ["AI", featured],
      ["Big Tech", visible.find((i) => /big tech/i.test(i.v.basket.name))],
      ["Tesla", visible.find((i) => /conviction|tesla|\bev\b/i.test(i.v.basket.name))],
    ] as [string, LoadedBasket | undefined][]
  )
    .filter((x): x is [string, LoadedBasket] => !!x[1])
    .filter((x, k, a) => a.findIndex((y) => y[1] === x[1]) === k)
    .map(([word, item]) => ({ word, item }));

  return (
    <div className="overflow-x-clip">
      {/* ---------------- Hero ---------------- */}
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-40 -top-40 hidden h-[520px] w-[520px] rounded-full opacity-[0.14] blur-[120px] md:block" style={{ background: "var(--cta)" }} />
          <div className="absolute -right-40 top-20 h-[520px] w-[620px] rounded-full opacity-[0.07] blur-[140px]" style={{ background: "var(--acc)" }} />
        </div>
        <HeroStories
          stories={heroStories.map(({ word, item }) => ({ word, card: <FeaturedStory item={item} fan={visible.filter((x) => x !== item).slice(0, 2)} /> }))}
          top={
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[13px] text-tx3">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--acc)" }} aria-hidden /> Invest in stories, not symbols.
            </span>
          }
          bottom={
            <>
              <p className="max-w-[480px] text-[18px] leading-relaxed text-tx3">Baskets of US stocks, built around one idea. From $5.</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/explore" className="c-btn c-btn--primary c-btn--auto !h-[52px] !rounded-full !px-7">
                  Explore baskets <ArrowRight size={16} strokeWidth={2} aria-hidden />
                </Link>
                <Link href="/create" className="c-btn c-btn--secondary c-btn--auto !h-[52px] !rounded-full !px-7">
                  <Plus size={16} strokeWidth={2} aria-hidden /> Build a basket
                </Link>
              </div>
              <p className="-mt-3 text-[13px] text-tx2">Not available in the US. You can lose money.</p>
              <dl className="mt-2 grid max-w-[480px] grid-cols-3 gap-4 border-t border-white/[0.08] pt-6">
                {[
                  ["$5", "minimum"],
                  [`${feePct}%`, "a year, nothing else"],
                  ["Anytime", "sell or withdraw"],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-1">
                    <dt className="text-[20px] font-semibold">{k}</dt>
                    <dd className="text-[13px] text-tx2">{v}</dd>
                  </div>
                ))}
              </dl>
            </>
          }
        />
      </section>

      {/* ---------------- Trust strip ---------------- */}
      <section aria-label="Why it's safe to try" className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-app flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-5 md:px-8">
          <ul className="flex flex-wrap items-center gap-x-8 gap-y-3 text-[14px] text-tx3">
            {(
              [
                [DoorOpen, "Exit anytime"],
                [Percent, `Fee ${feePct}% a year, nothing else`],
                [MessageSquareText, "Every trade explained"],
                [KeyRound, "Your basket, your keys"],
              ] as [typeof DoorOpen, string][]
            ).map(([I, t]) => (
              <li key={t} className="inline-flex items-center gap-2">
                <I size={16} strokeWidth={1.75} className="text-tx2" aria-hidden /> {t}
              </li>
            ))}
          </ul>
          <a href="#held" className="inline-flex items-center gap-1 text-[14px] font-medium text-tx no-underline hover:text-tx3">
            How your money is held <ArrowRight size={14} strokeWidth={2} aria-hidden />
          </a>
        </div>
      </section>

      {/* ---------------- Live numbers ---------------- */}
      <section aria-label="Alloy today" className="border-y border-white/[0.07] bg-s1/60">
        <div className="mx-auto grid max-w-app grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4 md:px-8">
          {[
            [String(visible.length), "Baskets live"],
            followers > 0 ? [followers.toLocaleString("en-US"), "Followers"] : ["24/7", "Buy and sell"],
            [compactUsd6(totalNav), "In baskets"],
            [String(stocks), "US stocks inside"],
          ].map(([k, v]) => (
            <div key={v} className="flex flex-col gap-1">
              <span className="font-display text-[36px] leading-none tracking-[0.01em] md:text-[44px]">{k}</span>
              <span className="text-[14px] text-tx2">{v}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="mx-auto max-w-app px-4 py-16 md:px-8 md:py-24 lg:py-12" aria-label="How it works">
        {!featured && <SectionHead id="how" title="How it works" />}
        {featured && (
          <StoryScroll
            heading={<SectionHead id="how" title="How it works" />}
            mobileHeading={<SectionHead title="How it works" />}
            parts={featured.v.target}
            tone={featured.v.id.tone}
            covers={visible.slice(0, 4).map((i) => ({ src: i.v.id.coverSrc, tone: i.v.id.tone }))}
          />
        )}
      </section>

      {/* ---------------- Trending ---------------- */}
      {trending.length > 0 && (
        <section className="mx-auto max-w-app px-4 pb-20 md:px-8 md:pb-28" aria-labelledby="live">
          <SectionHead
            id="live"
            title="Live baskets"
            sub="Most followed."
            action={
              <Link href="/explore" className="inline-flex items-center gap-1.5 text-[15px] font-medium text-tx no-underline hover:text-tx3">
                See all baskets <ArrowRight size={16} strokeWidth={2} aria-hidden />
              </Link>
            }
          />
          <div
            className={`-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 ${cols >= 4 ? "xl:grid-cols-4" : cols === 3 ? "lg:grid-cols-3" : ""}`}
          >
            {trending.map((i) => (
              <div key={i.v.basket.address} className="w-[82%] flex-none snap-start sm:w-auto">
                <BasketCard v={i.v} perf={i.perf} />
              </div>
            ))}
            {trending.length < 4 && (
              <Link
                href="/create"
                className="hidden min-h-[260px] flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-white/15 p-6 text-center text-tx no-underline transition hover:border-white/30 sm:flex"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-s2">
                  <Plus size={20} strokeWidth={1.75} aria-hidden />
                </span>
                <span className="text-[16px] font-semibold">Build your own</span>
                <span className="max-w-[220px] text-[14px] text-tx2">Up to 10 stocks. Your weights. Others can follow.</span>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ---------------- How your money is held (plain words, no performance claims) ---------------- */}
      <section id="held" className="v-silk relative mb-20 scroll-mt-20 overflow-hidden md:mb-28" aria-labelledby="held-h">
        <div className="relative mx-auto grid max-w-app items-start gap-10 px-4 py-14 md:px-8 md:py-16 lg:grid-cols-[1fr_440px] lg:gap-16">
          <div className="flex flex-col gap-8">
            <SectionHead id="held-h" title="Nothing hidden" sub="See the creator's own money, every change and why, and how followers did next to the creator, once there's history." onBrand />
            <ul className="grid gap-5 sm:grid-cols-3">
              {(
                [
                  [HandCoins, "Creators put money in", "You see their stake, and if they sell."],
                  [Clock, "Changes announced a day early", "You can leave before a recipe changes."],
                  [DoorOpen, "Your exit stays open", "Sell for dollars, or take the stocks."],
                ] as [typeof Clock, string, string][]
              ).map(([Icon, t, d]) => (
                <li key={t} className="flex flex-col gap-2">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/25 shadow-[inset_0_0_0_1px_rgba(242,240,237,0.18)]">
                    <Icon size={18} strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="text-[15px] font-semibold">{t}</span>
                  <span className="text-[14px] text-tx3">{d}</span>
                </li>
              ))}
            </ul>
          </div>
          <HowHeld />
        </div>
      </section>

      {/* ---------------- Create CTA ---------------- */}
      <section className="mx-auto max-w-app px-4 pb-16 md:px-8 md:pb-24" aria-labelledby="create">
        <div
          className="relative grid items-center gap-10 overflow-hidden rounded-[28px] p-6 md:p-12 lg:grid-cols-[1fr_420px]"
          style={{ background: "var(--s1)", boxShadow: "inset 0 0 0 1px rgba(242,240,237,0.07)" }}
        >
          <div className="flex flex-col gap-6">
            <SectionHead id="create" title="Have an idea? Build a basket." sub="Pick up to 10 stocks, set the weights, put in $10. Others can follow it." />
            <Link href="/create" className="c-btn c-btn--primary c-btn--auto !h-[52px] w-fit !rounded-full !px-7">
              <Plus size={16} strokeWidth={2} aria-hidden /> Build a basket
            </Link>
          </div>
          {featured && <RecipeMock item={featured} />}
        </div>
      </section>
    </div>
  );
}


function FeaturedStory({ item, fan }: { item: LoadedBasket; fan: LoadedBasket[] }) {
  const { v, perf } = item;
  const b = v.basket;
  const r = returnsOf(v, perf);
  // Real data only: returns appear once there's history; until then stocks · fee · min · followers.
  const stats: [string, React.ReactNode][] =
    r.creator === null || b.followers === 0
      ? [
          ["Stocks", String(v.tickers.length)],
          ["Fee", `${b.feeBps / 100}%/yr`],
          ["Minimum", "$5"],
          ["Followers", b.followers.toLocaleString("en-US")],
        ]
      : [
          ["Followers' return", <ReturnValue key="f" bps={r.followers} />],
          ["Creator's return", <ReturnValue key="c" bps={r.creator} />],
          ["Fee", `${b.feeBps / 100}%/yr`],
          ["Minimum", "$5"],
        ];
  return (
    <article className="v-par-fast relative isolate">
      {/* Burgundy radial glow behind the featured story */}
      <div aria-hidden className="v-par-glow absolute -inset-4 -z-20 rounded-full opacity-50 blur-3xl md:-inset-10 md:opacity-70" style={{ background: "radial-gradient(closest-side, rgba(163,22,58,0.32), transparent 75%)" }} />
      {/* Fanned basket covers behind the featured story (UX_MAP landing: real covers, fanned) */}
      {fan.map((f, k) => (
        <div
          key={f.v.basket.address}
          aria-hidden
          className="v-par-slow absolute top-6 -z-10 hidden h-[260px] w-[200px] overflow-hidden rounded-[22px] border border-white/10 opacity-55 lg:block"
          style={{
            [k === 0 ? "left" : "right"]: -56,
            transform: `rotate(${k === 0 ? -8 : 8}deg)`,
            background: "#1a0a0e",
          }}
        >
          <Image src={f.v.id.coverSrc} alt="" fill sizes="200px" className="v-duo object-cover" />
          <div className="v-duo-tint absolute inset-0" />
        </div>
      ))}
      <div className="overflow-hidden rounded-[24px] border border-white/[0.1] bg-s1 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]">
        <div className="relative h-[150px] md:h-[170px] bg-[#1a0a0e]">
          <Image src={v.id.coverSrcLg} alt="" fill priority sizes="(min-width: 1024px) 560px, 100vw" className="v-duo object-cover" />
          <div className="v-duo-tint absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-s1 via-s1/20 to-transparent" />
          <span className="absolute left-4 top-4 rounded-full px-3 py-1 text-[12px] font-medium text-tx" style={{ background: "var(--cta)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)" }}>Featured story</span>
        </div>
        <div className="-mt-8 flex flex-col gap-5 px-5 pb-5 md:px-6 md:pb-6">
          <div className="relative flex items-end gap-3">
            <CreatorAvatar handle={b.creator.handle} seed={b.creator.address} size={52} ring />
            <div className="flex min-w-0 flex-col pb-0.5">
              <span className="truncate text-[15px] font-semibold">@{b.creator.handle}</span>
              <span className="text-[13px] text-tx2">
                Creator has <span className="gold">{compactUsd6(v.creatorStakeUsd6).replace(/\.\d+$/, "")}</span> in it
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[24px] font-semibold leading-tight tracking-tight">{b.name}</h2>
            <p className="line-clamp-2 text-[15px] text-tx3">{thesisOf(v)}</p>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map(([k, val]) => (
              <div key={k} className="flex flex-col gap-1 rounded-[14px] bg-s2 px-3 py-3">
                <dt className="text-[12px] leading-tight text-tx2">{k}</dt>
                <dd className="text-[16px] font-semibold">{val}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-3">
            <AlloyBar parts={v.target} tone={v.id.tone} legend={false} multi />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {[...v.target]
                .sort((a, c) => c.bps - a.bps)
                .map((p) => (
                  <span key={p.ticker} className="inline-flex items-center gap-1.5 text-[13px] text-tx3">
                    <Logos tickers={[p.ticker]} />
                    <span className="t-num text-tx">{p.ticker}</span>
                    <span className="text-tx2">{fmtPct(p.bps)}%</span>
                  </span>
                ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/b/${b.address}`} className="c-btn c-btn--secondary !rounded-full">
              See inside
            </Link>
            <Link href={`/b/${b.address}?buy=25`} className="c-btn c-btn--primary !rounded-full">
              Buy $25
            </Link>
          </div>
          <p className="flex items-center justify-center gap-2 text-[12px] text-tx2">
            <span className="v-live" aria-hidden /> Live price {formatUsd6(v.navPerShare)} per share of this basket
          </p>
        </div>
      </div>
    </article>
  );
}

/** "How your money is held", in plain words. Never claims backing by any exchange or network. */
function HowHeld() {
  const rows: [typeof ShieldCheck, string][] = [
    [Coins, "Your dollars buy tokenized exposure to US stocks, held in an on-chain basket."],
    [KeyRound, "The basket share sits in your own account. Only you can move it."],
    [DoorOpen, "Sell anytime, or withdraw the stock tokens themselves."],
    [ShieldCheck, "Not available to US persons. You can lose money."],
  ];
  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-white/[0.08] bg-bg/80 p-6">
      <span className="text-[17px] font-semibold">How your money is held</span>
      <ul className="flex flex-col gap-3.5">
        {rows.map(([I, t]) => (
          <li key={t} className="flex gap-3 text-[14px] leading-snug text-tx3">
            <I size={16} strokeWidth={1.75} className="mt-0.5 flex-none text-tx2" aria-hidden />
            {t}
          </li>
        ))}
      </ul>
      <p className="border-t border-white/[0.07] pt-4 text-[12px] text-tx2">Tokenized stock exposure, not shares. Not investment advice.</p>
    </div>
  );
}

function RecipeMock({ item }: { item: LoadedBasket }) {
  const parts = [...item.v.target].sort((a, b) => b.bps - a.bps);
  return (
    <div aria-hidden className="flex flex-col gap-4 rounded-[20px] border border-white/[0.08] bg-black/40 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold">Your recipe</span>
        <span className="text-[13px] text-tx2">{parts.length} stocks · 100%</span>
      </div>
      {parts.map((p) => (
        <div key={p.ticker} className="flex items-center gap-3">
          <Logos tickers={[p.ticker]} size="lg" />
          <span className="t-num w-14 text-tx">{p.ticker}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-tx" style={{ width: `${p.bps / 100}%` }} />
          </div>
          <span className="t-num w-10 text-right text-tx3">{fmtPct(p.bps)}%</span>
        </div>
      ))}
      <AlloyBar parts={parts} tone={item.v.id.tone} legend={false} />
    </div>
  );
}

/**
 * v5 landing: hero + featured story, live numbers, how it works, trending, honesty band, create CTA.
 * Server component; all numbers come from lib/data via loadAll().
 */
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, DoorOpen, HandCoins, Plus, ShieldCheck } from "lucide-react";
import { formatUsd6 } from "@/lib/units";
import { AlloyBar, AlloyBarPair, fmtPct } from "../primitives";
import { compactUsd6 } from "../basket-view";
import type { LoadedBasket } from "../load";
import { BasketCard, CreatorAvatar, Logos, ReturnValue, SectionHead, returnsOf, thesisOf } from "./parts";

export function Landing({ items }: { items: LoadedBasket[] }) {
  const sorted = [...items].sort((a, b) => b.v.basket.followers - a.v.basket.followers);
  const featured = items.find((i) => /ai build/i.test(i.v.basket.name)) ?? sorted[0];
  const trending = sorted.filter((i) => i !== featured).slice(0, 4);
  const totalNav = items.reduce((a, i) => a + i.v.nav, 0n);
  const followers = items.reduce((a, i) => a + i.v.basket.followers, 0);
  const stocks = new Set(items.flatMap((i) => i.v.tickers)).size;

  return (
    <div className="overflow-x-clip">
      {/* ---------------- Hero ---------------- */}
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full opacity-[0.22] blur-[120px]" style={{ background: "var(--brand)" }} />
          <div className="absolute -right-40 top-20 h-[520px] w-[620px] rounded-full opacity-[0.16] blur-[140px]" style={{ background: "var(--j-sapp)" }} />
        </div>
        <div className="mx-auto grid max-w-app items-center gap-12 px-4 pb-16 pt-10 md:px-8 md:pb-24 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="flex flex-col gap-7">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[13px] text-tx3">
              <span className="h-1.5 w-1.5 rounded-full bg-gain" aria-hidden /> Tokenized US stocks · on Base
            </span>
            <h1 className="font-display text-[56px] uppercase leading-[0.95] tracking-[0.01em] sm:text-[72px] xl:text-[92px]">
              Invest in stories,
              <br />
              <span className="text-tx2">not symbols.</span>
            </h1>
            <p className="max-w-[480px] text-[18px] leading-relaxed text-tx3">
              Baskets of US stocks built around one idea. We keep them balanced.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/explore" className="c-btn c-btn--primary c-btn--auto !h-[52px] !rounded-full !px-7">
                Explore baskets <ArrowRight size={16} strokeWidth={2} aria-hidden />
              </Link>
              <Link href="/create" className="c-btn c-btn--secondary c-btn--auto !h-[52px] !rounded-full !px-7">
                <Plus size={16} strokeWidth={2} aria-hidden /> Build a basket
              </Link>
            </div>
            <dl className="mt-2 grid max-w-[480px] grid-cols-3 gap-4 border-t border-white/[0.08] pt-6">
              {[
                ["$5", "minimum"],
                ["24h", "notice"],
                ["Anytime", "exit"],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1">
                  <dt className="text-[20px] font-semibold">{k}</dt>
                  <dd className="text-[13px] text-tx2">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          {featured && <FeaturedStory item={featured} fan={trending.slice(0, 2)} />}
        </div>
      </section>

      {/* ---------------- Live numbers ---------------- */}
      <section aria-label="Alloy today" className="border-y border-white/[0.07] bg-s1/60">
        <div className="mx-auto grid max-w-app grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4 md:px-8">
          {[
            [String(items.length), "Baskets live"],
            followers > 0 ? [followers.toLocaleString("en-US"), "Followers"] : ["24/7", "Buy and exit"],
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
      <section className="mx-auto max-w-app px-4 py-20 md:px-8 md:py-28" aria-labelledby="how">
        <SectionHead id="how" title="How it works" sub="Three steps. No stock picking." />
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          <Step n={1} title="Pick a story" body="AI build-out, space, big tech. Each basket is a recipe of US stocks.">
            <div className="flex -space-x-5">
              {items.slice(0, 4).map((i, k) => (
                <div
                  key={i.v.basket.address}
                  className="relative h-[84px] w-[84px] overflow-hidden rounded-[16px] border-2 border-s1"
                  style={{ transform: `rotate(${(k - 1.5) * 5}deg)`, background: `var(--j-${i.v.id.tone}-d)` }}
                >
                  <Image src={i.v.id.coverSrc} alt="" fill sizes="84px" className="object-cover" />
                </div>
              ))}
            </div>
          </Step>
          <Step n={2} title="Start with $5" body="Put in USDC. You get one basket token that holds all of it.">
            <div className="flex items-center gap-4">
              <span className="font-display text-[56px] leading-none">$5</span>
              <div className="flex flex-wrap gap-2">
                {["$10", "$25", "$100"].map((p) => (
                  <span key={p} className="rounded-full border border-white/10 px-3 py-1.5 text-[13px] text-tx3">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </Step>
          <Step n={3} title="We keep it balanced" body="Prices drift, we trim. Every change comes with a one-line reason.">
            {featured ? (
              <div className="w-full">
                <AlloyBarPair
                  tone={featured.v.id.tone}
                  before={featured.v.target.map((p, k) => ({ ...p, bps: Math.max(100, p.bps + (k === 0 ? 900 : -300)) }))}
                  after={featured.v.target}
                />
              </div>
            ) : null}
          </Step>
        </ol>
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
          <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
            {trending.map((i) => (
              <div key={i.v.basket.address} className="w-[82%] flex-none snap-start sm:w-auto">
                <BasketCard v={i.v} perf={i.perf} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- Honesty band ---------------- */}
      <section className="mx-auto max-w-app px-4 pb-20 md:px-8 md:pb-28" aria-labelledby="honest">
        <div className="grid gap-10 overflow-hidden rounded-[28px] border border-white/[0.07] bg-s1 p-6 md:p-12 lg:grid-cols-[1fr_440px] lg:gap-16">
          <div className="flex flex-col gap-8">
            <SectionHead id="honest" title="Did followers win too?" sub="Every basket shows how followers did next to how the creator did. Fees included." />
            <ul className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                [HandCoins, "Creators put money in", "You see their stake, and if they sell."],
                [Clock, "Changes come with notice", "Recipe changes wait 24 hours."],
                [DoorOpen, "Your exit stays open", "Sell to USDC or take the stocks."],
              ].map(([I, t, d]) => {
                const Icon = I as typeof Clock;
                return (
                  <li key={t as string} className="flex flex-col gap-2">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-s2">
                      <Icon size={18} strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="text-[15px] font-semibold">{t as string}</span>
                    <span className="text-[14px] text-tx2">{d as string}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <ExampleCompare />
        </div>
      </section>

      {/* ---------------- Create CTA ---------------- */}
      <section className="mx-auto max-w-app px-4 pb-16 md:px-8 md:pb-24" aria-labelledby="create">
        <div
          className="relative grid items-center gap-10 overflow-hidden rounded-[28px] p-6 md:p-12 lg:grid-cols-[1fr_420px]"
          style={{ background: "linear-gradient(120deg, #2a000a 0%, #160408 45%, #141416 100%)" }}
        >
          <div className="flex flex-col gap-6">
            <SectionHead id="create" title="Got a thesis? Bottle it." sub="Pick up to 10 stocks, set the weights, seed it with $10. Others can follow." />
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

function Step({ n, title, body, children }: { n: number; title: string; body: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-6 rounded-[20px] border border-white/[0.07] bg-s1 p-6">
      <div className="flex h-[96px] items-center">{children}</div>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-tx2">Step {n}</span>
        <span className="text-[20px] font-semibold tracking-tight">{title}</span>
        <span className="text-[15px] text-tx2">{body}</span>
      </div>
    </li>
  );
}

function FeaturedStory({ item, fan }: { item: LoadedBasket; fan: LoadedBasket[] }) {
  const { v, perf } = item;
  const b = v.basket;
  const r = returnsOf(v, perf);
  const stats: [string, React.ReactNode][] = [
    [
      "Followers vs creator",
      r.creator === null ? (
        <span className="text-tx3">New</span>
      ) : (
        <span className="inline-flex items-baseline gap-1.5">
          <ReturnValue bps={r.followers} /> <span className="text-[13px] font-normal text-tx2">vs</span> <ReturnValue bps={r.creator} />
        </span>
      ),
    ],
    ["Stocks", String(v.tickers.length)],
    ["Followers", b.followers > 0 ? b.followers.toLocaleString("en-US") : "Be first"],
    ["Minimum", "$5"],
  ];
  return (
    <article className="relative isolate">
      <div aria-hidden className="absolute -inset-3 -z-10 rounded-[32px] opacity-60 blur-2xl" style={{ background: `var(--j-${v.id.tone}-d)` }} />
      {/* Fanned basket covers behind the featured story (UX_MAP landing: real covers, fanned) */}
      {fan.map((f, k) => (
        <div
          key={f.v.basket.address}
          aria-hidden
          className="absolute top-6 -z-10 hidden h-[260px] w-[200px] overflow-hidden rounded-[22px] border border-white/10 opacity-80 lg:block"
          style={{
            [k === 0 ? "left" : "right"]: -56,
            transform: `rotate(${k === 0 ? -8 : 8}deg)`,
            background: `var(--j-${f.v.id.tone}-d)`,
          }}
        >
          <Image src={f.v.id.coverSrc} alt="" fill sizes="200px" className="object-cover" />
          <div className="absolute inset-0 bg-black/30" />
        </div>
      ))}
      <div className="overflow-hidden rounded-[24px] border border-white/[0.1] bg-s1 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
        <div className="relative h-[150px] md:h-[170px]" style={{ background: `var(--j-${v.id.tone}-d)` }}>
          <Image src={v.id.coverSrcLg} alt="" fill priority sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-s1 via-s1/20 to-transparent" />
          <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[12px] font-medium text-tx3 backdrop-blur">Featured story</span>
        </div>
        <div className="-mt-8 flex flex-col gap-5 px-5 pb-5 md:px-6 md:pb-6">
          <div className="relative flex items-end gap-3">
            <CreatorAvatar handle={b.creator.handle} seed={b.creator.address} size={52} ring />
            <div className="flex min-w-0 flex-col pb-0.5">
              <span className="truncate text-[15px] font-semibold">@{b.creator.handle}</span>
              <span className="text-[13px] text-tx2">
                Creator · <span className="gold">{compactUsd6(v.creatorStakeUsd6)} in</span>
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
            <AlloyBar parts={v.target} tone={v.id.tone} legend={false} />
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
          <p className="text-center text-[12px] text-tx2">Value per token {formatUsd6(v.navPerShare)} · test network</p>
        </div>
      </div>
    </article>
  );
}

/** Illustrative follower-vs-creator card (example numbers from COPY.md, clearly labelled). */
function ExampleCompare() {
  const rows = [
    { k: "Followers (avg)", bps: 1180, w: 95 },
    { k: "Creator", bps: 1240, w: 100 },
  ];
  return (
    <div className="flex flex-col gap-5 rounded-[20px] border border-white/[0.07] bg-bg p-6">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold">Since launch</span>
        <span className="rounded-full bg-s2 px-2.5 py-1 text-[12px] text-tx2">Example</span>
      </div>
      {rows.map((r) => (
        <div key={r.k} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[14px] text-tx3">{r.k}</span>
            <span className="text-[20px] font-semibold up">+{(r.bps / 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-s2">
            <div className="h-full rounded-full" style={{ width: `${r.w}%`, background: r.k === "Creator" ? "var(--tx2)" : "var(--gain)" }} />
          </div>
        </div>
      ))}
      <p className="text-[14px] text-tx2">Followers trail by 0.6% since launch. That&apos;s the fee plus timing.</p>
      <p className="flex items-center gap-1.5 border-t border-white/[0.07] pt-4 text-[12px] text-tx2">
        <ShieldCheck size={14} strokeWidth={1.75} aria-hidden /> Example numbers, not a promise. You can lose money.
      </p>
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

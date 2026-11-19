/**
 * Alloy v5 "warm" building blocks: initial avatars, rich cover cards, return pairs, footer.
 * Server-safe (no hooks).
 */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { FlaskConical, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Performance } from "@/lib/types";
import { AlloyBar, AlloyLegend, StockLogo } from "../primitives";
import { Ticker } from "../motion/Ticker";
import { hash32 } from "../guilloche-gen";
import { compactUsd6, shortDate, type BasketView } from "../basket-view";

// ---------------------------------------------------------------------------
// Brand mark: 40/25/20/15 ring (the basket split) + copper core, letter-spaced A L L O Y
// ---------------------------------------------------------------------------

export function RingMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9.2" stroke="#F3F1EE" strokeOpacity=".9" strokeWidth="1.2" strokeDasharray="20.7 1.6 12.8 1.6 10.1 1.6 7.4 1.6" transform="rotate(-90 12 12)" />
      <circle cx="12" cy="12" r="3.2" fill="#E39B6E" />
    </svg>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("a-mark text-[13px] tracking-[0.46em] md:text-[15px] md:tracking-[0.52em]", className)}>
      <RingMark />
      ALLOY
    </span>
  );
}

// ---------------------------------------------------------------------------
// Initial avatar (no photos of real people)
// ---------------------------------------------------------------------------

export function CreatorAvatar({ handle, seed, size = 32, ring }: { handle: string; seed?: string; size?: number; ring?: boolean }) {
  const h = hash32((seed ?? handle).toLowerCase());
  // Polished-metal disc, turned per handle so creators still differ (no brand colour, no photos).
  const angle = h % 360;
  const letter = (handle.replace(/^@/, "").match(/[a-z0-9]/i)?.[0] ?? "A").toUpperCase();
  return (
    <span
      aria-hidden
      className="inline-flex flex-none items-center justify-center rounded-full font-semibold text-black/70"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: `conic-gradient(from ${angle}deg, #f3f1ee, #7d7a76, #2a2928, #cfcac4, #f3f1ee)`,
        boxShadow: ring ? "0 0 0 3px #000, 0 0 0 4px rgba(243,241,238,0.22)" : "inset 0 0 0 1px rgba(255,255,255,0.2)",
      }}
    >
      {letter}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Returns
// ---------------------------------------------------------------------------

/** True when there is enough value history to show returns honestly. */
export function hasHistory(v: BasketView): boolean {
  return v.series.length >= 3;
}

/** Under a day of value history: show "New" instead of a since-start return (a 0.0% today reads as dead). */
export function isNew(v: BasketView): boolean {
  if (!hasHistory(v)) return true;
  return v.times[v.times.length - 1] - v.times[0] < 86_400;
}

export function Pct({ bps, className, tick }: { bps: number; className?: string; tick?: boolean }) {
  // Anything that rounds to 0.0% is flat: muted, no sign (a green "+0.0%" reads as a gain).
  const flat = Math.abs(bps) < 5;
  const up = bps >= 0;
  const text = flat ? "0.0%" : `${up ? "+" : "−"}${(Math.abs(bps) / 100).toFixed(1)}%`;
  return <span className={cn(flat ? "c2" : up ? "up" : "down", "whitespace-nowrap tabular-nums", className)}>{tick ? <Ticker value={text} /> : text}</span>;
}

/** Whole days since a unix time (for "New · N days of history"). */
export function daysSince(unix: number): number {
  return Math.max(0, Math.floor((Date.now() / 1000 - unix) / 86_400));
}

export function NewTag({ className }: { className?: string }) {
  return <span className={cn("whitespace-nowrap text-tx3", className)}>New</span>;
}

/** Followers' return vs creator's return; "New" before there is history. */
export function returnsOf(v: BasketView, perf?: Performance) {
  const live = hasHistory(v) && !!perf;
  return {
    followers: live && v.basket.followers > 0 ? perf!.followerPnl.bps : null,
    creator: live ? perf!.creatorPnl.bps : null,
  };
}

/** `tick`: roll digits when the value changes (passive views only, never inside trade sheets). */
export function ReturnValue({ bps, className, tick }: { bps: number | null; className?: string; tick?: boolean }) {
  return bps === null ? <NewTag className={className} /> : <Pct bps={bps} className={className} tick={tick} />;
}

/** Creator thesis, or a plain one-liner from the recipe when the creator left it empty. */
export function thesisOf(v: BasketView): string {
  const t = v.basket.thesis?.trim();
  if (t) return t;
  const names = [...v.basket.components].sort((a, b) => b.targetBps - a.targetBps).map((c) => c.stock.name || c.stock.ticker);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0] ?? "US stocks";
  return `${list}, held together in one basket.`;
}

// ---------------------------------------------------------------------------
// Logos
// ---------------------------------------------------------------------------

/** Stock logos side by side (no overlap, so no logo hides another), max 4 + "+N". */
export function Logos({ tickers, max = 4, size = "md" }: { tickers: string[]; max?: number; size?: "md" | "lg" }) {
  const extra = tickers.length - max;
  return (
    <span className="flex items-center gap-1" aria-label={tickers.join(", ")}>
      {tickers.slice(0, max).map((t) => (
        <StockLogo key={t} ticker={t} size={size} />
      ))}
      {extra > 0 && <span className="ml-1 text-[13px] tabular-nums text-tx2">+{extra}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Rich basket card (cover + story + numbers)
// ---------------------------------------------------------------------------

export function BasketCard({ v, perf, priority }: { v: BasketView; perf?: Performance; priority?: boolean }) {
  const b = v.basket;
  const r = returnsOf(v, perf);
  return (
    <Link
      href={`/b/${b.address}`}
      className="v-spot group flex flex-col overflow-hidden rounded-[20px] border border-white/[0.07] bg-s1 text-tx no-underline transition duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-s2"
    >
      <div className="relative h-[136px] overflow-hidden bg-[var(--tint)] sm:h-[160px]">
        <Image
          src={v.id.coverSrc}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1280px) 320px, (min-width: 768px) 50vw, 100vw"
          className="v-duo object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="v-duo-tint absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-s1 to-transparent" />
        {b.demo && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-medium text-tx3 backdrop-blur">
            <FlaskConical size={12} strokeWidth={1.75} aria-hidden /> Demo
          </span>
        )}
        {b.followers > 0 && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-medium tabular-nums text-tx3 backdrop-blur">
            <Users size={12} strokeWidth={1.75} aria-hidden /> {b.followers}
            <span className="sr-only"> followers</span>
          </span>
        )}
      </div>

      <div className="-mt-6 flex flex-1 flex-col gap-4 px-5 pb-5">
        <div className="relative flex items-end gap-2">
          <CreatorAvatar handle={b.creator.handle} seed={b.creator.address} size={36} ring />
          <span className="truncate pb-0.5 text-[13px] text-tx2">
            @{b.creator.handle} · has <span className="gold">{compactUsd6(v.creatorStakeUsd6).replace(/\.\d+$/, "")}</span> in it
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="truncate text-[18px] font-semibold leading-tight tracking-tight">{b.name}</h3>
          <p className="line-clamp-2 min-h-[40px] text-[14px] leading-[20px] text-tx2">{thesisOf(v)}</p>
        </div>

        {/* Real data only. Followers vs creator once both exist; otherwise the basket's return (or "New") + the minimum.
            Fee and minimum are the same on every card, so Explore states them once instead. */}
        <div className="grid grid-cols-2 gap-2">
          {(r.creator !== null && b.followers > 0
            ? [
                ["Followers' return", <ReturnValue key="f" bps={r.followers} className="text-[15px] font-semibold" />],
                ["Creator's return", <ReturnValue key="c" bps={r.creator} className="text-[15px] font-semibold" />],
              ]
            : [
                [
                  isNew(v) ? "Return" : `Since ${shortDate(v.sinceDate)}`,
                  isNew(v) ? <NewTag key="r" /> : <Pct key="r" bps={v.sinceBps} className="text-[15px] font-semibold" />,
                ],
                ["Invest", <span key="p" className="tabular-nums">From $5</span>],
              ]
          ).map(([k, val]) => (
            <div key={k as string} className="flex flex-col gap-0.5 rounded-[14px] bg-s2 px-3 py-2.5">
              <span className="text-[12px] text-tx2">{k}</span>
              <span className="text-[15px] font-semibold">{val}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <AlloyBar parts={v.target} tone={v.id.tone} size="sm" legend={false} />
          <AlloyLegend items={[...v.target].sort((a, c) => c.bps - a.bps)} max={4} />
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

export function SectionHead({ title, sub, action, id, onBrand }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; id?: string; onBrand?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h2 id={id} className="font-display text-[28px] font-light leading-[1.08] tracking-[-0.022em] md:text-[36px]">
          {title}
        </h2>
        {sub ? <p className={cn("max-w-[560px] text-[15px] md:text-[16px]", onBrand ? "text-tx3" : "text-tx2")}>{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Footer (compliance)
// ---------------------------------------------------------------------------

/** Soft burgundy wash at the top of app pages (brand presence without loud surfaces). */
export function BrandWash() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px]"
      style={{ background: "transparent" }}
    />
  );
}

export function SiteFooter() {
  return (
    <footer className="relative z-[1] mt-8 border-t border-line">
      <div className="flex flex-col gap-8 px-[var(--gut)] py-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="flex flex-col gap-3">
            <BrandMark />
            <p className="max-w-[320px] text-[14px] text-mute">Invest in stories, not symbols.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2 text-[13.5px] sm:grid-cols-3">
            <Link className="text-mute no-underline transition-colors hover:text-ink" href="/explore">Explore</Link>
            <Link className="text-mute no-underline transition-colors hover:text-ink" href="/create">Build a basket</Link>
            <Link className="text-mute no-underline transition-colors hover:text-ink" href="/try">2-minute tour</Link>
            <Link className="text-mute no-underline transition-colors hover:text-ink" href="/portfolio">Portfolio</Link>
            <Link className="text-mute no-underline transition-colors hover:text-ink" href="/activity">Activity</Link>
            <a className="text-mute no-underline transition-colors hover:text-ink" href="https://x.com/alloy_fi" target="_blank" rel="noreferrer">
              X · @alloy_fi
            </a>
          </nav>
        </div>
        <div className="flex flex-col gap-2 border-t border-line pt-6 text-[12px] text-dim md:flex-row md:items-center md:justify-between">
          <p>You own a token that tracks these stocks, not the shares themselves · Not available to US persons · You can lose money</p>
          <p>Not investment advice</p>
        </div>
      </div>
    </footer>
  );
}

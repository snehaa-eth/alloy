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
import { AlloyBar, StockLogo } from "../primitives";
import { hash32 } from "../guilloche-gen";
import { TONE_HEX, TONES } from "../identity";
import { compactUsd6, type BasketView } from "../basket-view";

// ---------------------------------------------------------------------------
// Brand mark: three stacked bars (the alloy bar, tiny) + wordmark
// ---------------------------------------------------------------------------

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span aria-hidden className="flex h-[18px] w-[18px] flex-col justify-center gap-[2px]">
        <i className="block h-[6px] rounded-[2px] bg-tx" />
        <i className="block h-[4px] rounded-[2px] bg-tx/70" />
        <i className="block h-[3px] rounded-[2px]" style={{ background: "var(--acc)" }} />
      </span>
      <span className="text-[17px] font-semibold tracking-tight">Alloy</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Initial avatar (no photos of real people)
// ---------------------------------------------------------------------------

export function CreatorAvatar({ handle, seed, size = 32, ring }: { handle: string; seed?: string; size?: number; ring?: boolean }) {
  const h = hash32((seed ?? handle).toLowerCase());
  const a = TONE_HEX[TONES[h % TONES.length]];
  const b = TONE_HEX[TONES[(h >> 3) % TONES.length]];
  const letter = (handle.replace(/^@/, "").match(/[a-z0-9]/i)?.[0] ?? "A").toUpperCase();
  return (
    <span
      aria-hidden
      className="inline-flex flex-none items-center justify-center rounded-full font-semibold text-tx"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: `linear-gradient(135deg, ${a.mid}, ${b.deep === a.deep ? a.deep : b.mid} 70%)`,
        boxShadow: ring ? "0 0 0 3px var(--s1), 0 0 0 4px rgba(242,240,237,0.18)" : "inset 0 0 0 1px rgba(255,255,255,0.12)",
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

export function Pct({ bps, className }: { bps: number; className?: string }) {
  const up = bps >= 0;
  return (
    <span className={cn(up ? "up" : "down", "whitespace-nowrap tabular-nums", className)}>
      {up ? "+" : "−"}
      {(Math.abs(bps) / 100).toFixed(1)}%
    </span>
  );
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

export function ReturnValue({ bps, className }: { bps: number | null; className?: string }) {
  return bps === null ? <NewTag className={className} /> : <Pct bps={bps} className={className} />;
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

export function Logos({ tickers, max = 5, size = "md" }: { tickers: string[]; max?: number; size?: "md" | "lg" }) {
  const extra = tickers.length - max;
  return (
    <span className="flex items-center" aria-label={tickers.join(", ")}>
      <span className="c-stack">
        {tickers.slice(0, max).map((t) => (
          <StockLogo key={t} ticker={t} size={size} />
        ))}
      </span>
      {extra > 0 && <span className="ml-2 text-[13px] text-tx2">+{extra}</span>}
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
      className="group flex flex-col overflow-hidden rounded-[20px] border border-white/[0.07] bg-s1 text-tx no-underline transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-[#17171a]"
    >
      <div className="relative h-[160px] overflow-hidden" style={{ background: `var(--j-${v.id.tone}-d)` }}>
        <Image
          src={v.id.coverSrc}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1280px) 320px, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-s1 to-transparent" />
        {b.demo && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-medium text-tx3 backdrop-blur">
            <FlaskConical size={12} strokeWidth={1.75} aria-hidden /> Demo
          </span>
        )}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-medium text-tx3 backdrop-blur">
          <Users size={12} strokeWidth={1.75} aria-hidden /> {b.followers}
        </span>
      </div>

      <div className="-mt-6 flex flex-1 flex-col gap-4 px-5 pb-5">
        <div className="relative flex items-end gap-2">
          <CreatorAvatar handle={b.creator.handle} seed={b.creator.address} size={36} ring />
          <span className="truncate pb-0.5 text-[13px] text-tx2">
            @{b.creator.handle} · <span className="gold">{compactUsd6(v.creatorStakeUsd6)} in</span>
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="truncate text-[18px] font-semibold leading-tight tracking-tight">{b.name}</h3>
          <p className="truncate text-[14px] leading-[20px] text-tx2">{thesisOf(v)}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5 rounded-[14px] bg-s2 px-3 py-2.5">
            {b.followers > 0 ? (
              <>
                <span className="text-[12px] text-tx2">Followers</span>
                <ReturnValue bps={r.followers} className="text-[15px] font-semibold" />
              </>
            ) : (
              <>
                <span className="text-[12px] text-tx2">Founding</span>
                <span className="text-[15px] font-semibold">Be #1</span>
              </>
            )}
          </div>
          <div className="flex flex-col gap-0.5 rounded-[14px] bg-s2 px-3 py-2.5">
            <span className="text-[12px] text-tx2">Creator</span>
            <ReturnValue bps={r.creator} className="text-[15px] font-semibold" />
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <AlloyBar parts={v.target} tone={v.id.tone} size="sm" legend={false} />
          <div className="flex items-center justify-between gap-2">
            <Logos tickers={v.tickers} max={3} />
            <span className="text-[13px] text-tx2">{v.tickers.length} stocks</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

export function SectionHead({ title, sub, action, id }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h2 id={id} className="text-[26px] font-semibold leading-tight tracking-tight md:text-[32px]">
          {title}
        </h2>
        {sub ? <p className="max-w-[560px] text-[15px] text-tx2 md:text-[16px]">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Footer (compliance)
// ---------------------------------------------------------------------------

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-white/[0.07]">
      <div className="mx-auto flex max-w-app flex-col gap-8 px-4 py-10 md:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="flex flex-col gap-3">
            <BrandMark />
            <p className="max-w-[320px] text-[14px] text-tx2">Invest in stories, not symbols.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2 text-[14px] sm:grid-cols-3">
            <Link className="text-tx2 no-underline hover:text-tx" href="/explore">Explore</Link>
            <Link className="text-tx2 no-underline hover:text-tx" href="/create">Build a basket</Link>
            <Link className="text-tx2 no-underline hover:text-tx" href="/try">2-minute tour</Link>
            <Link className="text-tx2 no-underline hover:text-tx" href="/portfolio">Portfolio</Link>
            <Link className="text-tx2 no-underline hover:text-tx" href="/activity">Activity</Link>
            <a className="text-tx2 no-underline hover:text-tx" href="https://x.com/alloy_fi" target="_blank" rel="noreferrer">
              X · @alloy_fi
            </a>
          </nav>
        </div>
        <div className="flex flex-col gap-2 border-t border-white/[0.07] pt-6 text-[13px] text-tx2 md:flex-row md:items-center md:justify-between">
          <p>Tokenized stock exposure, not shares · Not available to US persons · You can lose money</p>
          <p>Not investment advice · Base Sepolia test network</p>
        </div>
      </div>
    </footer>
  );
}

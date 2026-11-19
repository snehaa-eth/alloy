"use client";

/**
 * System states in the liquid-metal language (docs/design/artdir/wow/app/states.html):
 * - <DropLoader>: one wobbling cream drop that bounces (used by the loading.tsx files).
 * - <MeltedPage>: 404, "This page melted." with a chrome puddle and a drip that keeps falling into it.
 * - <EmptySearch>: "Nothing matches …" with a silver drop rolling left and right, looking.
 */
import Link from "next/link";
import { useRef } from "react";
import { useMetalRegion } from "../metal/MetalCanvas";
import { bump, clamp, lerp, ss } from "../metal/math";
import { WordReveal } from "../motion/alloy-motion";
import { cam, CREAM, drop, looseSpec, SILVER } from "./kit";

/** Loader: a drop bouncing on an invisible floor, wobbling harder on each landing. */
export function DropLoader({ label = "Loading", className }: { label?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const supported = useMetalRegion(ref, ({ T }) => {
    const P = 1.1, t = (T % P) / P;
    const h = Math.abs(Math.sin(t * Math.PI));
    const land = 1 - ss(0, 0.18, h);
    return looseSpec(cam(4.6, 0.2, 0.1), [drop([0, -0.55 + h * 1.1, 0], 0.5 - land * 0.04, CREAM)], { t: T, k: 0.3, wob: 2.6 + land * 2, tint: 0.12, rip: land * 0.6 });
  });
  return (
    <div className={`st-loader ${className ?? ""}`} role="status" aria-live="polite">
      <div ref={ref} className="st-loader__metal" aria-hidden>
        {supported === false && <span className="st-loader__css" />}
      </div>
      <p className="st-loader__t">
        {label}
        <i />
        <i />
        <i />
      </p>
    </div>
  );
}

/** Full-page loader used by loading.tsx (centred in the viewport under the nav). */
export function PageLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-[calc(100dvh-160px)] items-center justify-center px-4">
      <DropLoader label={label} />
    </div>
  );
}

/** 404 art: a CSS chrome puddle (the renderer has no vertical squash yet) + a real metal drip. */
function Puddle() {
  const ref = useRef<HTMLDivElement>(null);
  useMetalRegion(ref, ({ T }) => {
    const D = 2.6, t = (T % D) / D;
    const f = clamp(t / 0.45);
    const hang = ss(0.75, 1, t);
    // falls, vanishes into the puddle, then a new one gathers at the top
    const d = t < 0.45 ? drop([0.05, lerp(1.25, -0.95, f * f), 0], 0.17, SILVER) : drop([0.05, 1.3 - hang * 0.08, 0], 0.15 * hang, SILVER);
    return looseSpec(cam(5.2, 0.6, 0.15), [d], { t: T, k: 0.3, tint: 0.1, wob: 1.4 });
  });
  return (
    <div className="st-pud" aria-hidden>
      <div ref={ref} className="st-pud__drip" />
      <svg className="st-pud__pool" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="st-chrome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d9d6d1" />
            <stop offset=".18" stopColor="#f6f4f0" />
            <stop offset=".34" stopColor="#5d5b58" />
            <stop offset=".62" stopColor="#1a1a1a" />
            <stop offset="1" stopColor="#8a8681" />
          </linearGradient>
          <radialGradient id="st-hi" cx=".46" cy=".36" r=".5">
            <stop offset="0" stopColor="#fff" stopOpacity=".95" />
            <stop offset=".55" stopColor="#fff" stopOpacity=".35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="st-rim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e39b6e" stopOpacity="0" />
            <stop offset=".85" stopColor="#e39b6e" stopOpacity=".35" />
            <stop offset="1" stopColor="#e39b6e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <ellipse cx="200" cy="96" rx="190" ry="14" fill="#000" opacity=".9" />
        <path className="st-pud__shape" d="M22 70 C 30 46, 92 40, 150 44 C 196 47, 220 36, 268 40 C 330 45, 384 54, 380 74 C 376 94, 300 98, 236 96 C 186 95, 150 100, 96 98 C 44 96, 14 88, 22 70 Z" fill="url(#st-chrome)" />
        <path d="M70 62 C 110 52, 170 56, 214 54 C 262 52, 300 56, 330 64 C 300 70, 250 72, 210 70 C 160 69, 112 72, 70 62 Z" fill="url(#st-hi)" />
        <path d="M30 76 C 120 92, 290 92, 376 72" stroke="url(#st-rim)" strokeWidth="2" fill="none" />
        <ellipse className="st-pud__ring" cx="204" cy="62" rx="20" ry="4" fill="none" stroke="#f3f1ee" strokeOpacity=".5" />
      </svg>
    </div>
  );
}

export function MeltedPage() {
  return (
    <section className="st-nf">
      <Puddle />
      <div className="st-nf__copy">
        <div className="a-eyebrow">Error 404</div>
        <WordReveal as="h1" className="a-h1 st-nf__h" immediate>
          This page <em>melted.</em>
        </WordReveal>
        <p className="a-lede mt-3 max-w-[34ch]">The link may be old, or the basket was taken down. Your money is fine.</p>
        <div className="mt-6 flex flex-wrap gap-2.5 st-nf__cta">
          <Link href="/explore" className="a-btn a-btn--cream a-btn--lg">
            Back to Explore
          </Link>
          <Link href="/portfolio" className="a-btn a-btn--line a-btn--lg">
            Your shelf
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Empty search result. `suggestions` are theme words that set the query; "Create one" links to /create. */
export function EmptySearch({ query, suggestions = [], onPick }: { query: string; suggestions?: string[]; onPick?: (q: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useMetalRegion(ref, ({ T }) => {
    const x = Math.sin(T * 1.3) * 1.1;
    const y = -0.35 + Math.abs(Math.cos(T * 1.3)) * 0.06;
    return looseSpec(cam(4, 0.25, -0.1), [drop([x, y, 0], 0.42, SILVER)], { t: T, k: 0.3, wob: 1.6, tint: 0.1, rip: bump(0, 1, Math.abs(Math.cos(T * 1.3))) * 0.1 });
  });
  return (
    <div className="st-es">
      <div ref={ref} className="st-es__look" aria-hidden />
      <h4 className="font-display text-[21px] font-light tracking-[-0.01em]">Nothing matches “{query}”.</h4>
      <p className="mt-1.5 text-[13.5px] text-mute">Try a theme or a ticker. Or make the basket yourself.</p>
      <div className="mt-[18px] flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button key={s} type="button" className="a-btn a-btn--line a-btn--sm" onClick={() => onPick?.(s)}>
            {s}
          </button>
        ))}
        <Link href="/create" className="a-btn a-btn--line a-btn--sm">
          Create one
        </Link>
      </div>
    </div>
  );
}

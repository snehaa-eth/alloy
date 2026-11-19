"use client";

/**
 * Landing "How it works" scroll storytelling (MOTION.md §5.2):
 * Pick a basket → Start with $5 → Prices move → It runs on autopilot (creator styles).
 * Desktop: a 500vh track (one full viewport of scroll per step); the stepper (left) and the live card (right) stay
 * pinned while scroll position picks the step, so the card morphs in place (no scroll-jacking). Clicking a step
 * scrolls to it. Phones: no pinning; four compact stacked cards. Reduced motion: same layout, transitions off (CSS).
 */
import Image from "next/image";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlloyBar, StockLogo, fmtPct, type RecipePart } from "../primitives";
import type { Tone } from "../identity";
import { STYLES, STYLE_ORDER } from "../styles";

type Cover = { src: string; tone: Tone; name?: string };

const STEPS = [
  { t: "Pick a basket", d: "One theme, like AI or big tech. Each basket is a recipe of US stocks." },
  { t: "Start with $5", d: "Put in dollars. You get one basket share that holds all of it." },
  { t: "Prices move", d: "Winners grow. One stock can become a bigger slice." },
  { t: "It runs on autopilot", d: "Each basket follows its creator's plan. You don't lift a finger." },
];

const GROW = 1400; // the winner grows +14 pts and, under "Let winners run", stays there
const TAKEOVER = 6000; // dotted "takes over" line: the featured basket only sells if one stock passes 60%

function weightsAt(parts: RecipePart[], step: number, drift: number): RecipePart[] {
  if (step < 2 || parts.length < 2) return parts;
  const add = Math.round(GROW * (step >= 3 ? 1 : drift));
  const top = parts[0];
  const rest = parts.slice(1);
  const restTotal = rest.reduce((a, p) => a + p.bps, 0) || 1;
  return [{ ...top, bps: top.bps + add }, ...rest.map((p) => ({ ...p, bps: Math.max(0, p.bps - Math.round((add * p.bps) / restTotal)) }))];
}

export function StoryVisual({
  parts,
  tone,
  covers,
  step,
  drift,
  compact,
}: {
  parts: RecipePart[];
  tone: Tone;
  covers: Cover[];
  step: number;
  drift: number;
  compact?: boolean;
}) {
  const now = weightsAt(parts, step, drift);
  const top = parts[0];
  const topNow = now[0];
  const rows = compact ? now.slice(0, step >= 2 ? 1 : 2) : now;
  const result =
    step <= 0
      ? `${parts.length} stocks, one idea. You buy the whole recipe.`
      : step === 1
        ? "$25 is split across the stocks by weight."
        : step === 2
          ? `${top?.ticker} rises from ${fmtPct(top?.bps ?? 0)}% to ${fmtPct(topNow?.bps ?? 0)}% of the basket.`
          : `${top?.ticker} stays at ${fmtPct(topNow?.bps ?? 0)}%. It only sells if one stock passes ${TAKEOVER / 100}%.`;

  return (
    <div className={cn("flex flex-col rounded-[20px] border border-white/[0.07] bg-s1", compact ? "justify-center gap-4 p-4" : cn("h-[480px] overflow-hidden p-6", step >= 3 ? "gap-3" : "gap-5"))}>
      {compact ? (
        <div className="flex items-center justify-between">
          <div className="flex -space-x-4">
            {covers.slice(0, 3).map((c, k) => (
              <div
                key={c.src + k}
                className={cn("v-swap relative h-10 w-10 overflow-hidden rounded-[12px] border-2 border-s1 bg-[var(--tint)]", k > 0 && step >= 1 && "opacity-30")}
                style={{ transform: `rotate(${(k - 1) * 6}deg)` }}
              >
                <Image src={c.src} alt="" fill sizes="48px" className="v-duo object-cover" />
                <div className="v-duo-tint absolute inset-0" />
              </div>
            ))}
          </div>
          <span className={cn("v-swap font-display text-[32px] leading-none", step >= 1 ? "opacity-100" : "translate-y-2 opacity-0")}>$25</span>
        </div>
      ) : (
        /* Desktop: step 1 = three real basket covers to pick from (first one picked); later steps = the picked basket + $25. */
        <div className={cn("v-swap relative flex-none", step >= 1 ? "h-[80px]" : "h-[132px]")}>
          <div className={cn("v-swap absolute inset-0 grid grid-cols-3 gap-3", step >= 1 && "pointer-events-none opacity-0")} aria-hidden={step >= 1}>
            {covers.slice(0, 3).map((c, k) => (
              <div
                key={c.src + k}
                className={cn("relative overflow-hidden rounded-[14px] bg-[var(--tint)]", k === 0 ? "shadow-[inset_0_0_0_2px_var(--acc)]" : "opacity-60")}
              >
                <Image src={c.src} alt="" fill sizes="180px" className="v-duo object-cover" />
                <div className="v-duo-tint absolute inset-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                {c.name && <span className="absolute inset-x-3 bottom-2.5 truncate text-[13px] font-semibold">{c.name}</span>}
                {k === 0 && <span className="absolute left-2.5 top-2.5 h-2 w-2 rounded-full" style={{ background: "var(--acc)" }} aria-hidden />}
              </div>
            ))}
          </div>
          <div className={cn("v-swap absolute inset-0 flex items-center gap-4", step >= 1 ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0")} aria-hidden={step < 1}>
            {covers[0] && (
              <div className="relative h-[72px] w-[72px] flex-none overflow-hidden rounded-[16px] bg-[var(--tint)] shadow-[inset_0_0_0_2px_var(--acc)]">
                <Image src={covers[0].src} alt="" fill sizes="72px" className="v-duo object-cover" />
                <div className="v-duo-tint absolute inset-0" />
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-[17px] font-semibold">{covers[0]?.name}</span>
              <span className="text-[14px] text-tx2">{step === 1 ? "1 basket share" : step === 2 ? "Prices moved" : "Following the creator's plan"}</span>
            </div>
            <span className="font-display text-[48px] leading-none">$25</span>
          </div>
        </div>
      )}

      <div className={cn("flex flex-col", compact ? "gap-4" : cn("flex-1 justify-center", step >= 3 ? "gap-3" : "gap-6"))}>
      <AlloyBar parts={now} tone={tone} legend={false} />

      <ul className={cn("flex flex-col", compact || step >= 3 ? "gap-3" : "gap-[22px]")}>
        {rows.map((p, k) => {
          const isTop = k === 0;
          return (
            <li key={p.ticker} className="flex items-center gap-3">
              <StockLogo ticker={p.ticker} />
              <span className="t-num w-12 text-tx">{p.ticker}</span>
              <div className="relative h-2 flex-1 rounded-full bg-white/[0.07]">
                {isTop && step >= 3 && (
                  <span aria-hidden className="absolute -inset-y-2 border-l border-dashed border-white/40" style={{ left: `${TAKEOVER / 100}%` }}>
                    <span className="absolute -top-4 left-1 whitespace-nowrap text-[10px] text-tx2">takes over</span>
                  </span>
                )}
                <span
                  className="absolute inset-y-0 left-0 w-full origin-left rounded-full transition-transform duration-700"
                  style={{ transform: `scaleX(${p.bps / 10_000})`, background: isTop && step >= 2 ? "var(--acc)" : "var(--tx)", transitionTimingFunction: "var(--ease-in-out)" }}
                />
              </div>
              <span className="t-num w-16 text-right text-tx3">{step === 1 ? `$${((25 * p.bps) / 10_000).toFixed(2)}` : `${fmtPct(p.bps)}%`}</span>
            </li>
          );
        })}
      </ul>

      {step >= 3 && (
        <ul className="grid gap-2">
          {STYLE_ORDER.map((m, k) => {
            const I = STYLES[m].icon;
            return (
              <li key={m} className={cn("flex items-start gap-3 rounded-[14px] px-3 py-2 text-[13px]", k === 0 ? "bg-s2 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--acc)_45%,transparent)]" : "bg-s2/50")}>
                <I size={15} strokeWidth={1.75} className="mt-0.5 flex-none" style={{ color: k === 0 ? "var(--acc)" : "var(--tx2)" }} aria-hidden />
                <span>
                  <span className="font-semibold">{STYLES[m].label}</span>
                  {k === 0 ? <span className="text-tx2"> · {STYLES[m].line}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      </div>

      <p className={cn("flex items-center gap-2 border-t border-white/[0.07] pt-3 text-[14px] text-tx3", !compact && "mt-auto")} aria-live="polite">
        <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: "var(--acc)" }} aria-hidden />
        {result}
      </p>
    </div>
  );
}

export function StoryScroll({ parts, tone, covers, heading, mobileHeading }: { parts: RecipePart[]; tone: Tone; covers: Cover[]; heading: ReactNode; mobileHeading: ReactNode }) {
  const sorted = [...parts].sort((a, b) => b.bps - a.bps);
  const track = useRef<HTMLDivElement | null>(null);
  const [p, setP] = useState(0);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setP(Math.min(0.999, Math.max(0, v))));
  const step = Math.floor(p * 4);
  const drift = step >= 3 ? 1 : step === 2 ? Math.min(1, (p * 4 - 2) * 1.6) : 0;

  function jump(k: number) {
    const el = track.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const range = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + range * ((k + 0.55) / 4), behavior: "smooth" });
  }

  return (
    <>
      {/* Phones: compact stacked cards, no pinning */}
      <div className="lg:hidden">{mobileHeading}</div>
      <ol className="mt-8 flex flex-col gap-4 lg:hidden">
        {STEPS.map((s, k) => (
          <li key={s.t} className="flex flex-col gap-3">
            <StepText n={k + 1} t={s.t} d={s.d} on />
            <StoryVisual parts={sorted} tone={tone} covers={covers} step={k} drift={1} compact />
          </li>
        ))}
      </ol>

      {/* Desktop: heading + stepper + card pinned together (top = navbar + 24px, centred in the rest); scroll picks the step */}
      <div ref={track} className="relative hidden h-[500vh] lg:block">
        <div className="v-story-pin sticky top-[max(88px,calc(32px+50vh-280px))] flex flex-col gap-6">
          {heading}
          <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-center gap-16">
          <ol className="flex flex-col gap-1.5" aria-label="How it works">
            {STEPS.map((s, k) => (
              <li key={s.t}>
                <button type="button" onClick={() => jump(k)} aria-current={step === k ? "step" : undefined} className="w-full text-left">
                  <StepText n={k + 1} t={s.t} d={s.d} on={step === k} done={step > k} />
                </button>
              </li>
            ))}
          </ol>
          <StoryVisual parts={sorted} tone={tone} covers={covers} step={step} drift={drift} />
          </div>
        </div>
      </div>
    </>
  );
}

function StepText({ n, t, d, on, done }: { n: number; t: string; d: string; on: boolean; done?: boolean }) {
  return (
    <div className={cn("v-swap flex gap-4 rounded-[16px] px-4 py-3", on ? "bg-s1 opacity-100" : done ? "opacity-75 hover:opacity-100" : "opacity-55 hover:opacity-100")}>
      <span
        className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full text-[14px] font-semibold"
        style={on ? { background: "var(--acc)", color: "var(--bg)" } : { background: "var(--s2)" }}
      >
        {n}
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-[18px] font-semibold leading-tight tracking-tight md:text-[20px]">{t}</span>
        <span className="text-[14px] text-tx2 md:text-[15px]">{d}</span>
      </span>
    </div>
  );
}

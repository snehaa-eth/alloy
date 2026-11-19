"use client";

/**
 * Landing "How it works" scroll storytelling (MOTION.md §5.2):
 * Pick a basket → Start small → Prices move → It runs on autopilot (creator styles).
 * One worked example everywhere (desktop = phone): $25 in; NVDA-style top stock goes 40% → 50%, so $25 → $30; the
 * plan keeps it at 50% (sells only past 60%).
 * Desktop: the stepper (left) and the live card (right) stay pinned while scroll picks the step; each step gets an
 * equal share of the scroll, counted from the moment the whole block is on screen (no scroll-jacking). Clicking a
 * step scrolls to it. Phones: no pinning; four stacked cards. Reduced motion: same layout, transitions off (CSS).
 */
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlloyBar, StockLogo, fmtPct, type RecipePart } from "../primitives";
import type { Tone } from "../identity";
import { STYLES, STYLE_ORDER } from "../styles";

type Cover = { src: string; tone: Tone; name?: string };

const STEPS = [
  { t: "Pick a basket", d: "One theme, like AI or big tech. Each basket is a recipe of US stocks." },
  { t: "Start small", d: "From $5. Here: $25." },
  { t: "Prices move", d: "Winners grow, and so does your basket." },
  { t: "It runs on autopilot", d: "Each basket follows its creator's plan. You don't lift a finger." },
];

const START = 25; // illustrated deposit, in dollars
const GROW = 1000; // the top stock's weight goes up 10 points (e.g. 40% → 50%; only its price moves) and, under "Let winners run", stays there
const TAKEOVER = 6000; // dotted line: the featured basket only sells if one stock passes 60%
const PLAN = STYLE_ORDER[0]; // the featured basket's plan: Let winners run

function weightsAt(parts: RecipePart[], step: number): RecipePart[] {
  if (step < 2 || parts.length < 2) return parts;
  const add = GROW;
  const top = parts[0];
  const rest = parts.slice(1);
  const restTotal = rest.reduce((a, p) => a + p.bps, 0) || 1;
  return [{ ...top, bps: top.bps + add }, ...rest.map((p) => ({ ...p, bps: Math.max(0, p.bps - Math.round((add * p.bps) / restTotal)) }))];
}

/**
 * Basket value after the illustrated move. Only the top stock's price moves, so the other stocks keep their dollars:
 * value = dollars in the rest / the rest's new share. 40% to 50% turns $25 into $30 (the top stock goes $10 to $15).
 */
function valueAt(parts: RecipePart[], now: RecipePart[]): number {
  const w0 = (parts[0]?.bps ?? 0) / 10_000;
  const w1 = (now[0]?.bps ?? 0) / 10_000;
  if (w1 >= 1) return START;
  return (START * (1 - w0)) / (1 - w1);
}

const usd = (n: number) => `$${n.toFixed(2)}`;
const usdShort = (n: number) => (Math.abs(n - Math.round(n)) < 0.005 ? `$${Math.round(n)}` : usd(n));

export function StoryVisual({
  parts,
  tone,
  covers,
  step,
  compact,
}: {
  parts: RecipePart[];
  tone: Tone;
  covers: Cover[];
  step: number;
  compact?: boolean;
}) {
  const now = weightsAt(parts, step);
  const top = parts[0];
  const topNow = now[0];
  const value = step >= 2 ? valueAt(parts, now) : START;
  const topGain = top && topNow && top.bps > 0 ? Math.round(((value * topNow.bps) / (START * top.bps) - 1) * 100) : 0;
  const plan = STYLES[PLAN];
  const PlanIcon = plan.icon;
  const result =
    step <= 0
      ? `${parts.length} stocks, one idea. You buy the whole recipe.`
      : step === 1
        ? `${usdShort(START)} is split across the stocks by weight.`
        : step === 2
          ? `${top?.ticker} rose ${topGain}%, so your ${usdShort(START)} is now ${usdShort(value)}.`
          : `${top?.ticker} stays at ${fmtPct(topNow?.bps ?? 0)}%. It only sells if one stock passes ${TAKEOVER / 100}%.`;

  return (
    <div
      className={cn(
        "flex flex-col rounded-[20px] border border-white/[0.07] bg-s1",
        compact ? "gap-4 p-4" : cn("h-[480px] overflow-hidden p-6", step >= 3 ? "gap-4" : "gap-5"),
      )}
    >
      {/* Head: step 1 = three real basket covers to pick from (first one picked); later = the picked basket + its value. */}
      {step <= 0 ? (
        <div className={cn("grid flex-none grid-cols-3", compact ? "gap-2" : "gap-3")}>
          {covers.slice(0, 3).map((c, k) => (
            <div key={c.src + k} className={cn("flex min-w-0 flex-col gap-1.5", k > 0 && "opacity-60")}>
              <div
                className={cn(
                  "relative overflow-hidden rounded-[14px] bg-[var(--tint)]",
                  compact ? "aspect-[4/3]" : "h-[150px]",
                  k === 0 && "shadow-[inset_0_0_0_2px_var(--hi)]",
                )}
              >
                <Image src={c.src} alt="" fill sizes="(min-width: 1024px) 180px, 33vw" className="v-duo object-cover" />
                <div className="v-duo-tint absolute inset-0" />
                {k === 0 && <span className="absolute left-2.5 top-2.5 h-2 w-2 rounded-full" style={{ background: "var(--hi)" }} aria-hidden />}
              </div>
              {c.name && <span className={cn("line-clamp-2 font-semibold leading-tight", compact ? "text-[12px]" : "text-[13px]")}>{c.name}</span>}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-none items-center gap-3">
          {covers[0] && (
            <div className={cn("relative flex-none overflow-hidden rounded-[14px] bg-[var(--tint)] shadow-[inset_0_0_0_2px_var(--hi)]", compact ? "h-12 w-12" : "h-[72px] w-[72px]")}>
              <Image src={covers[0].src} alt="" fill sizes="72px" className="v-duo object-cover" />
              <div className="v-duo-tint absolute inset-0" />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className={cn("truncate font-semibold", compact ? "text-[15px]" : "text-[17px]")}>{covers[0]?.name}</span>
            <span className={cn("text-tx2", compact ? "text-[13px]" : "text-[14px]")}>
              {step === 1 ? "Your money, split" : step === 2 ? "Prices moved" : "Following the creator's plan"}
            </span>
          </div>
          <span
            className={cn("t-num flex-none font-display leading-none", compact ? "text-[32px]" : "text-[48px]")}
            style={step >= 2 && value > START + 0.005 ? { color: "var(--gain)" } : undefined}
          >
            {usdShort(value)}
          </span>
        </div>
      )}

      <div className={cn("flex flex-col", compact ? "gap-4" : cn("flex-1 justify-center", step >= 3 ? "gap-5" : "gap-6"))}>
        <AlloyBar parts={now} tone={tone} legend={false} />

        {step >= 1 && (
        <ul className={cn("flex flex-col", compact || step >= 3 ? "gap-3" : "gap-[18px]")}>
          {now.map((p, k) => {
            const isTop = k === 0;
            return (
              <li key={p.ticker} className="flex items-center gap-3">
                <StockLogo ticker={p.ticker} />
                <span className="t-num w-12 text-tx">{p.ticker}</span>
                <div className="relative h-2 flex-1 rounded-full bg-white/[0.07]">
                  {isTop && step >= 3 && (
                    <span aria-hidden className="absolute -inset-y-2 border-l border-dashed border-white/40" style={{ left: `${TAKEOVER / 100}%` }}>
                      <span className="absolute -top-4 left-1 whitespace-nowrap text-[11px] text-tx2">{TAKEOVER / 100}%</span>
                    </span>
                  )}
                  <span
                    className="absolute inset-y-0 left-0 w-full origin-left rounded-full transition-transform duration-700"
                    style={{
                      transform: `scaleX(${p.bps / 10_000})`,
                      background: isTop && step >= 2 ? "var(--gain)" : "var(--tx)",
                      transitionTimingFunction: "var(--ease-in-out)",
                    }}
                  />
                </div>
                {/* Steps 2–3: each stock's dollars (only the winner's grow). Step 4: weights, read against the 60% line. */}
                <span className="t-num w-16 text-right text-tx3">{step >= 3 ? `${fmtPct(p.bps)}%` : usd((value * p.bps) / 10_000)}</span>
              </li>
            );
          })}
        </ul>
        )}

        {step >= 3 && (
          <div className="flex items-start gap-3 rounded-[14px] bg-s2 px-3 py-2.5 text-[13px] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--hi)_45%,transparent)]">
            <PlanIcon size={15} strokeWidth={1.75} className="mt-0.5 flex-none" style={{ color: "var(--hi)" }} aria-hidden />
            <span>
              <span className="font-semibold">{plan.label}</span>
              <span className="text-tx2"> · {plan.line}</span>
            </span>
          </div>
        )}
      </div>

      <p className={cn("flex items-start gap-2 border-t border-white/[0.07] pt-3 text-[14px] text-tx3", !compact && "mt-auto")} aria-live="polite">
        <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full" style={{ background: "var(--hi)" }} aria-hidden />
        {result}
      </p>
    </div>
  );
}

export function StoryScroll({ parts, tone, covers, heading, mobileHeading }: { parts: RecipePart[]; tone: Tone; covers: Cover[]; heading: ReactNode; mobileHeading: ReactNode }) {
  const sorted = [...parts].sort((a, b) => b.bps - a.bps);
  const track = useRef<HTMLDivElement | null>(null);
  const pin = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState(0);

  // Scroll range over which the steps play: from "whole pinned block on screen" to "pin releases". Split in 4 equal parts.
  const range = useCallback(() => {
    const el = track.current;
    const pn = pin.current;
    if (!el || !pn) return null;
    const trackTop = el.getBoundingClientRect().top + window.scrollY;
    const stickyTop = parseFloat(getComputedStyle(pn).top) || 0;
    const stuck = trackTop - stickyTop; // scrollY where the block pins
    const visible = trackTop - Math.max(0, window.innerHeight - pn.offsetHeight); // scrollY where it's fully on screen
    const start = Math.min(stuck, visible);
    const end = trackTop + el.offsetHeight - pn.offsetHeight - stickyTop; // scrollY where the pin releases
    return { start, end: Math.max(start + 1, end) };
  }, []);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = range();
      if (!r) return;
      const p = Math.min(0.999, Math.max(0, (window.scrollY - r.start) / (r.end - r.start)));
      setStep(Math.floor(p * 4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [range]);

  function jump(k: number) {
    const r = range();
    if (!r) return;
    window.scrollTo({ top: r.start + (r.end - r.start) * ((k + 0.5) / 4), behavior: "smooth" });
  }

  return (
    <>
      {/* Phones: compact stacked cards, no pinning */}
      <div className="lg:hidden">{mobileHeading}</div>
      <ol className="mt-8 flex flex-col gap-4 lg:hidden">
        {STEPS.map((s, k) => (
          <li key={s.t} className="flex flex-col gap-3">
            <StepText n={k + 1} t={s.t} d={s.d} on />
            <StoryVisual parts={sorted} tone={tone} covers={covers} step={k} compact />
          </li>
        ))}
      </ol>

      {/* Desktop: heading + stepper + card pinned together (top = navbar + 24px, centred in the rest); scroll picks the step.
          Track = pinned block (~560px) + 4 × 60vh of scroll, one equal share per step. */}
      <div ref={track} className="relative hidden h-[calc(240vh+560px)] lg:block">
        <div ref={pin} className="v-story-pin sticky top-[max(88px,calc(32px+50vh-280px))] flex flex-col gap-6">
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
          <StoryVisual parts={sorted} tone={tone} covers={covers} step={step} />
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
        style={on ? { background: "var(--hi)", color: "var(--bg)" } : { background: "var(--s2)" }}
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

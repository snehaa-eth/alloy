"use client";

/**
 * Landing "How it works" sticky storytelling (MOTION.md §5.2):
 * Pick a story → Start with $5 → Prices move → It runs on autopilot (creator styles).
 * Stepper + one live visual, side by side on desktop, stacked (~1 screen) on phones. No pinning, no scroll-jacking:
 * steps auto-advance while the section is on screen; tapping a step selects it and pauses. Reduced motion: no autoplay.
 * The pinned visual changes in place as the steps scroll past; drift is scroll-linked (scrub back to undo).
 * Reduced motion: no pinning, four static panels in their end states. Low power: steps swap with a 120ms crossfade.
 */
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AlloyBar, StockLogo, fmtPct, type RecipePart } from "../primitives";
import type { Tone } from "../identity";
import { useLowPower } from "./MotionRoot";
import { STYLES, STYLE_ORDER } from "../styles";

type Cover = { src: string; tone: Tone };

const STEPS = [
  { t: "Pick a story", d: "AI build-out, space, big tech. Each basket is a recipe of US stocks." },
  { t: "Start with $5", d: "Put in USDC. You get one basket token that holds all of it." },
  { t: "Prices move", d: "Winners grow. One stock can get too big." },
  { t: "It runs on autopilot", d: "Each basket follows its creator's plan. You don't lift a finger." },
];

const GROW = 1400; // the winner grows +14 pts and, under 🚀 Let winners run, stays there
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
  still,
}: {
  parts: RecipePart[];
  tone: Tone;
  covers: Cover[];
  step: number;
  drift: number;
  still?: boolean;
}) {
  const now = weightsAt(parts, step, drift);
  const rising = step >= 2;
  const shown = step >= 0 || !!still;
  return (
    <div className="flex h-full flex-col gap-5 rounded-[20px] border border-white/[0.07] bg-s1 p-5 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex -space-x-4">
          {covers.slice(0, 4).map((c, k) => (
            <div
              key={c.src + k}
              className={cn("v-swap relative h-12 w-12 overflow-hidden rounded-[12px] border-2 border-s1 bg-[#1a0a0e]", k > 0 && step >= 1 && "opacity-30")}
              style={{ transform: shown ? `rotate(${(k - 1.5) * 6}deg)` : "translateY(12px)" }}
            >
              <Image src={c.src} alt="" fill sizes="48px" className="v-duo object-cover" />
              <div className="v-duo-tint absolute inset-0" />
            </div>
          ))}
        </div>
        <span className={cn("v-swap font-display text-[44px] leading-none", step >= 1 ? "opacity-100" : "translate-y-2 opacity-0")}>$25</span>
      </div>

      <AlloyBar parts={now} tone={tone} legend={false} multi />

      <ul className="flex flex-col gap-3">
        {now.map((p, k) => {
          const isTop = k === 0;
          return (
            <li
              key={p.ticker}
              className="v-swap flex items-center gap-3"
              style={{ opacity: shown ? 1 : 0, transform: shown ? "none" : "translateX(-20px)", transitionDelay: `${k * 60}ms` }}
            >
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
                  style={{ transform: `scaleX(${p.bps / 10_000})`, background: isTop && rising ? "var(--acc)" : "var(--tx)", transitionTimingFunction: "var(--ease-in-out)" }}
                />
              </div>
              <span className="t-num w-16 text-right text-tx3">{step === 1 ? `$${((25 * p.bps) / 10_000).toFixed(2)}` : `${fmtPct(p.bps)}%`}</span>
            </li>
          );
        })}
      </ul>

      {/* Caption area (fixed height, no layout jump). Step 4 lists the three creator styles; the bars above show "Let winners run". */}
      <div className="min-h-[124px]">
        {step >= 3 ? (
          <ul className="grid gap-2">
            {STYLE_ORDER.map((m, k) => {
              const I = STYLES[m].icon;
              return (
                <li key={m} className={cn("flex items-start gap-3 rounded-[14px] px-3 py-2 text-[13px]", k === 0 ? "bg-s2 shadow-[inset_0_0_0_1px_rgba(196,26,66,0.45)]" : "bg-s2/50")}>
                  <I size={15} strokeWidth={1.75} className="mt-0.5 flex-none" style={{ color: k === 0 ? "var(--acc)" : "var(--tx2)" }} aria-hidden />
                  <span>
                    <span className="font-semibold">{STYLES[m].label}</span>
                    <span className="text-tx2"> · {STYLES[m].line}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="pt-2 text-[14px] text-tx2">
            {step <= 0
              ? `${parts.length} stocks, one idea. You buy the whole recipe.`
              : step === 1
                ? "$25 is split across the stocks by weight."
                : `${parts[0]?.ticker ?? "One stock"} rises. Its share of the basket grows.`}
          </p>
        )}
      </div>
    </div>
  );
}

export function StoryScroll({ parts, tone, covers }: { parts: RecipePart[]; tone: Tone; covers: Cover[] }) {
  const reduced = useReducedMotion();
  const low = useLowPower();
  const sorted = [...parts].sort((a, b) => b.bps - a.bps);
  const [step, setStep] = useState(0);
  const [drift, setDrift] = useState(0);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Plays only while on screen; no scroll-jacking or pinned void (MOTION.md principle 5).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (reduced || paused || !inView) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % 4), step === 3 ? 5200 : 3200);
    return () => clearTimeout(t);
  }, [step, inView, paused, reduced]);
  useEffect(() => {
    if (step !== 2) return setDrift(step > 2 ? 1 : 0);
    setDrift(0);
    const t = setTimeout(() => setDrift(1), low ? 0 : 350);
    return () => clearTimeout(t);
  }, [step, low]);

  return (
    <div ref={ref} className="mt-10 grid items-center gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
      <ol className="flex flex-col gap-1.5" aria-label="How it works">
        {STEPS.map((s, k) => (
          <li key={s.t}>
            <button
              type="button"
              onClick={() => {
                setStep(k);
                setPaused(true);
              }}
              aria-current={step === k ? "step" : undefined}
              className="w-full text-left"
            >
              <StepText n={k + 1} t={s.t} d={s.d} on={step === k} done={step > k} />
            </button>
          </li>
        ))}
      </ol>
      <StoryVisual parts={sorted} tone={tone} covers={covers} step={step} drift={step >= 3 ? 1 : drift} />
    </div>
  );
}

function StepText({ n, t, d, on, done }: { n: number; t: string; d: string; on: boolean; done?: boolean }) {
  return (
    <div className={cn("v-swap flex gap-4 rounded-[16px] px-4 py-3", on ? "bg-s1 opacity-100" : done ? "opacity-75 hover:opacity-100" : "opacity-60 hover:opacity-100")}>
      <span
        className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full text-[14px] font-semibold"
        style={on ? { background: "var(--cta)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)" } : { background: "var(--s2)" }}
      >
        {n}
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-[18px] font-semibold leading-tight tracking-tight md:text-[20px]">{t}</span>
        <span className={cn("text-[14px] text-tx2 md:text-[15px]", !on && "hidden md:block")}>{d}</span>
      </span>
    </div>
  );
}

"use client";

/**
 * Motion root (MOTION.md §3, §6.8): LazyMotion (domAnimation, small bundle) + MotionConfig reducedMotion="user",
 * low-power detection (deviceMemory ≤ 2, saveData, or slow first frames) → html[data-motion="low"],
 * and one delegated pointer listener that drives the card spotlight (.v-spot) via CSS vars.
 * framer-motion is the same engine as the `motion` package (motion/react re-exports it); it is already a dependency.
 */
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const LowPower = createContext(false);
export const useLowPower = () => useContext(LowPower);

export function MotionRoot({ children }: { children: ReactNode }) {
  const [low, setLow] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    let isLow = (nav.deviceMemory ?? 8) <= 2 || nav.connection?.saveData === true || (mobile && (navigator.hardwareConcurrency ?? 8) <= 4);
    const apply = (v: boolean) => {
      setLow(v);
      if (v) document.documentElement.dataset.motion = "low";
    };
    if (isLow) return apply(true);
    // Measure the first 30 frames; > 24ms average → low power.
    let n = 0;
    let last = performance.now();
    let sum = 0;
    let raf = 0;
    const tick = (t: number) => {
      sum += t - last;
      last = t;
      if (++n < 30) raf = requestAnimationFrame(tick);
      else if (sum / n > 24 && document.visibilityState === "visible") apply((isLow = true));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(".v-spot") as HTMLElement | null;
      if (!el) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <LowPower.Provider value={low}>
      <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 520, damping: 46 }}>
          {children}
        </MotionConfig>
      </LazyMotion>
    </LowPower.Provider>
  );
}

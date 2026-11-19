"use client";

/**
 * Hero word swap: AI ↔ BIG TECH. Every word sits in the same grid cell, so the slot is always as wide as the
 * widest word and nothing around it moves; the words crossfade in place (no roll, no clipping, no overlap).
 * Reduced motion / low power: instant swap (HeroStories also holds the first word in that case).
 */
import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLowPower } from "./MotionRoot";

/** Uncontrolled (rotates itself) unless `index` is given (HeroStories drives it in sync with the card). */
export function WordRotator({ words, interval = 2200, index }: { words: string[]; interval?: number; index?: number }) {
  const reduced = useReducedMotion();
  const low = useLowPower();
  const [i, setI] = useState(0);
  const still = reduced || low;

  useEffect(() => {
    if (still || index !== undefined) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") setI((x) => (x + 1) % words.length);
    }, interval);
    return () => clearInterval(t);
  }, [still, interval, words.length, index]);

  const idx = index ?? (still ? 0 : i);
  return (
    <span className="inline-grid" style={{ color: "var(--acc)" }}>
      {words.map((w, k) => (
        <span
          key={w}
          className="whitespace-nowrap [grid-area:1/1]"
          style={{
            opacity: k === idx ? 1 : 0,
            // The outgoing word fades a little faster than the incoming one, so the two never read as stacked.
            transition: still ? "none" : `opacity ${k === idx ? 420 : 220}ms ease-out ${k === idx ? 120 : 0}ms`,
          }}
        >
          {w}
        </span>
      ))}
    </span>
  );
}

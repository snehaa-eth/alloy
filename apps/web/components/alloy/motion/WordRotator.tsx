"use client";

/**
 * Hero word roll: AI → SPACE → BIG TECH (smooth vertical roll, width eases so "STORY." never jumps).
 * Reduced motion / low power: static first word.
 */
import { useReducedMotion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLowPower } from "./MotionRoot";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Uncontrolled (rotates itself) unless `index` is given (HeroStories drives it in sync with the card). */
export function WordRotator({ words, interval = 2200, index }: { words: string[]; interval?: number; index?: number }) {
  const reduced = useReducedMotion();
  const low = useLowPower();
  const [i, setI] = useState(0);
  const [widths, setWidths] = useState<number[]>([]);
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const still = reduced || low;

  useIso(() => {
    const measure = () => setWidths(refs.current.map((el) => el?.getBoundingClientRect().width ?? 0));
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (still || index !== undefined) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") setI((x) => (x + 1) % words.length);
    }, interval);
    return () => clearInterval(t);
  }, [still, interval, words.length, index]);

  const idx = index ?? (still ? 0 : i);
  return (
    <span
      className="relative inline-block overflow-hidden align-bottom"
      style={{
        height: "0.95em",
        width: widths[idx] ? `${widths[idx]}px` : undefined,
        transition: "width 260ms var(--ease-out)",
        color: "var(--acc)",
      }}
    >
      <span
        className="flex flex-col"
        style={{ transform: `translateY(-${idx * 0.95}em)`, transition: reduced ? "none" : "transform 520ms var(--ease-out)" }}
      >
        {words.map((w, k) => (
          <span key={w} ref={(el) => void (refs.current[k] = el)} className="block w-max whitespace-nowrap" style={{ height: "0.95em", lineHeight: 0.95 }}>
            {w}
          </span>
        ))}
      </span>
    </span>
  );
}

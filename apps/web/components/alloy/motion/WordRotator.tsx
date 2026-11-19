"use client";

/**
 * Hero word roll: AI → BIG TECH (smooth vertical roll, width eases so "STORY." never jumps).
 * No clipping: when the next word is wider the slot widens FIRST, then the word rolls in; when it is narrower the
 * word rolls first, then the slot narrows. Only the vertical axis is clipped.
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
  // Direction of the last change: growing → width leads, roll follows; shrinking → roll leads, width follows.
  const prev = useRef(idx);
  const [grow, setGrow] = useState(false);
  useIso(() => {
    if (prev.current !== idx) {
      setGrow((widths[idx] ?? 0) > (widths[prev.current] ?? 0));
      prev.current = idx;
    }
  }, [idx, widths]);
  const W = 240;
  const R = 480;
  const anim = !reduced && !still;
  return (
    <span
      className="relative inline-block align-bottom"
      style={{
        height: "0.95em",
        overflowX: "visible",
        overflowY: "clip",
        width: widths[idx] ? `${widths[idx]}px` : undefined,
        transition: anim ? `width ${W}ms var(--ease-out) ${grow ? 0 : R - 120}ms` : "none",
        color: "var(--acc)",
      }}
    >
      <span
        className="flex flex-col"
        style={{ transform: `translateY(-${idx * 0.95}em)`, transition: anim ? `transform ${R}ms var(--ease-out) ${grow ? W - 60 : 0}ms` : "none" }}
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

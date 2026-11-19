"use client";

/**
 * Rolling number ticker (MOTION.md §5.4): digit columns roll when the value changes; first render is still.
 * Passive numbers only — NEVER use inside Buy / Exit sheets while the user is deciding (Principle 2).
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DIGITS = "0123456789";

export function Ticker({ value, className }: { value: string; className?: string }) {
  const [still, setStill] = useState(true);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      // Enable transitions after the first paint so mount never rolls.
      const id = requestAnimationFrame(() => setStill(false));
      return () => cancelAnimationFrame(id);
    }
  }, [value]);
  const chars = [...value];
  return (
    <span className={cn("v-tick", still && "v-tick--still", className)} aria-label={value} role="text">
      {chars.map((c, k) => {
        const d = DIGITS.indexOf(c);
        const i = chars.length - 1 - k; // stagger right → left
        if (d < 0)
          return (
            <span key={`${k}-${c}`} aria-hidden>
              {c}
            </span>
          );
        return (
          <span key={k} className="v-tick__col" aria-hidden>
            <span className="v-tick__stack" style={{ transform: `translateY(-${d}em)`, ["--i" as string]: i }}>
              {[...DIGITS].map((x) => (
                <span key={x}>{x}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

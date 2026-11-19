"use client";

/**
 * Alloy bar morph (MOTION.md §5.4): one bar whose bands reflow from the current recipe to the new one
 * (flex-grow transition, 700ms ease-in-out). Plays once on mount; "Now / After" lets people replay it.
 * Reduced motion: the bands jump (transition disabled globally) — the Now/After toggle still works.
 */
import { useEffect, useState } from "react";
import { AlloyBar, fmtPct, type RecipePart } from "../primitives";
import type { Tone } from "../identity";

export function AlloyBarMorph({ before, after, tone }: { before: RecipePart[]; after: RecipePart[]; tone: Tone }) {
  const order = [...before].sort((a, b) => b.bps - a.bps).map((p) => p.ticker);
  for (const p of after) if (!order.includes(p.ticker)) order.push(p.ticker);
  const [showAfter, setShowAfter] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowAfter(true), 450);
    return () => clearTimeout(t);
  }, []);
  const diff = order
    .map((t) => ({ t, a: before.find((p) => p.ticker === t)?.bps ?? 0, b: after.find((p) => p.ticker === t)?.bps ?? 0 }))
    .filter((d) => d.a !== d.b);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1" role="group" aria-label="Recipe">
        {(["Now", "After"] as const).map((l) => {
          const on = (l === "After") === showAfter;
          return (
            <button key={l} type="button" aria-pressed={on} onClick={() => setShowAfter(l === "After")} className="c-preset !h-7 !min-w-0 !px-3">
              {l}
            </button>
          );
        })}
      </div>
      <AlloyBar parts={showAfter ? after : before} tone={tone} legend={false} order={order} label={showAfter ? "Recipe after" : "Recipe now"} />
      <div className="c-alloy__legend">
        {diff.map((d) => (
          <span key={d.t}>
            {d.t} {fmtPct(d.a)}→{fmtPct(d.b)}
          </span>
        ))}
      </div>
    </div>
  );
}

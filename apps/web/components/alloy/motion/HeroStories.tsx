"use client";

/**
 * Hero: the rolling theme word and the featured basket card change TOGETHER, and only between themes that have a
 * live public basket. Pauses on hover/focus; reduced motion / low power = static first theme.
 *
 * Layout: desktop = text column (intro on top, `after` below) + card on the right spanning both rows.
 * Phone = intro → card → `after`, so the basket card is in the first screen and the secondary facts sit below it.
 */
import { useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLowPower } from "./MotionRoot";
import { WordRotator } from "./WordRotator";
import { HeroParallax } from "./HeroParallax";

export type HeroStory = { word: string; card: ReactNode };

export function HeroStories({
  stories,
  top,
  bottom,
  after,
  interval = 3600,
}: {
  stories: HeroStory[];
  top: ReactNode;
  bottom: ReactNode;
  after?: ReactNode;
  interval?: number;
}) {
  const reduced = useReducedMotion();
  const low = useLowPower();
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  const still = reduced || low || stories.length < 2;

  useEffect(() => {
    if (still || hold) return;
    const t = setInterval(() => document.visibilityState === "visible" && setI((x) => (x + 1) % stories.length), interval);
    return () => clearInterval(t);
  }, [still, hold, interval, stories.length]);

  const idx = still ? 0 : i;
  const word = stories[idx]?.word ?? "AI";
  return (
    <div
      className="mx-auto grid max-w-app gap-8 px-4 pb-10 pt-6 md:px-8 md:pt-16 lg:grid-cols-[1.1fr_1fr] lg:grid-rows-[auto_auto] lg:gap-x-16 lg:gap-y-8 lg:pb-14"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocusCapture={() => setHold(true)}
      onBlurCapture={() => setHold(false)}
    >
      <div className="flex flex-col gap-5 md:gap-7 lg:self-end">
        {top}
        <h1
          className="font-display text-[44px] uppercase leading-[0.95] tracking-[0.01em] sm:text-[72px] xl:text-[88px]"
          aria-label={`Buy the whole ${word} story.`}
          aria-live="off"
        >
          <span aria-hidden>
            <span className="v-word" style={{ ["--i" as string]: 0 }}>Buy</span> <span className="v-word" style={{ ["--i" as string]: 1 }}>the</span>{" "}
            <span className="v-word" style={{ ["--i" as string]: 2 }}>whole</span>
            <br />
            <span className="v-word" style={{ ["--i" as string]: 3 }}>
              <WordRotator words={stories.map((s) => s.word)} index={idx} />
            </span>{" "}
            <span className="v-word" style={{ ["--i" as string]: 4 }}>story.</span>
          </span>
        </h1>
        {bottom}
      </div>
      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
        <HeroParallax>
          <div className="grid">
            {stories.map((s, k) => (
              <div
                key={s.word}
                className={cn("flex transition-opacity duration-500 [grid-area:1/1]", k === idx ? "opacity-100" : "pointer-events-none opacity-0")}
                aria-hidden={k !== idx}
                inert={k !== idx ? true : undefined}
              >
                {s.card}
              </div>
            ))}
          </div>
        </HeroParallax>
      </div>
      {after && <div className="flex flex-col gap-5 lg:col-start-1 lg:row-start-2 lg:self-start">{after}</div>}
    </div>
  );
}

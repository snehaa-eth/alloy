"use client";

/**
 * Hero: the rolling theme word and the featured basket card change TOGETHER, and only between stories that have a
 * live public basket. Pauses on hover/focus; reduced motion / low power = static first story.
 */
import { useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLowPower } from "./MotionRoot";
import { WordRotator } from "./WordRotator";
import { HeroParallax } from "./HeroParallax";

export type HeroStory = { word: string; card: ReactNode };

export function HeroStories({ stories, top, bottom, interval = 3600 }: { stories: HeroStory[]; top: ReactNode; bottom: ReactNode; interval?: number }) {
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
      className="mx-auto grid max-w-app items-center gap-12 px-4 pb-16 pt-10 md:px-8 md:pb-24 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocusCapture={() => setHold(true)}
      onBlurCapture={() => setHold(false)}
    >
      <div className="flex flex-col gap-7">
        {top}
        <h1 className="font-display text-[54px] uppercase leading-[0.95] tracking-[0.01em] sm:text-[72px] xl:text-[88px]" aria-label={`Buy the whole ${word} story.`} aria-live="off">
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
      <HeroParallax>
        <div className="grid">
          {stories.map((s, k) => (
            <div
              key={s.word}
              className={cn("transition-opacity duration-500 [grid-area:1/1]", k === idx ? "opacity-100" : "pointer-events-none opacity-0")}
              aria-hidden={k !== idx}
              inert={k !== idx ? true : undefined}
            >
              {s.card}
            </div>
          ))}
        </div>
      </HeroParallax>
    </div>
  );
}

"use client";

/**
 * Variant A, "cinematic centre": centred headline over a huge melting sculpture, a glass sign-up bar riding its base,
 * live price strip, list counter, bento of metal vignettes, slim early-tester row, giant footer.
 */
import { useRef, useState } from "react";
import { Rise, WordReveal } from "../motion/alloy-motion";
import { InviteLink, InviteSignIn, useInvitedParam } from "./InviteSignIn";
import { MeltSculpture } from "./MeltSculpture";
import { BuiltRow, EarlyPill, FactChips, GiantFooter, JoinBar, ListCounter, PriceStrip, SUBLINE, VIGNETTES, WHY, WhyHeading } from "./parts";

export function VariantA() {
  const cap = useRef<HTMLDivElement>(null);
  const [invited, setInvited] = useInvitedParam();
  const [fromLink, setFromLink] = useState(false);
  const onPhase = (f: number) => {
    const el = cap.current;
    if (!el) return;
    (el.children[0] as HTMLElement).style.opacity = String(Math.max(0, 1 - f * 2.2));
    (el.children[1] as HTMLElement).style.opacity = String(Math.max(0, f * 2.2 - 1.2));
  };
  return (
    <>
      <section className="relative flex flex-col items-center px-4 pb-14 pt-[92px] text-center md:pt-[clamp(88px,11svh,120px)]">
        <Rise>
          <EarlyPill className="justify-center" />
        </Rise>
        <h1 className="a-display mt-5 text-[clamp(54px,min(8.6vw,13svh),140px)] leading-[0.94] tracking-[-0.04em]">
          <WordReveal immediate>
            Stocks, <em className="a-acc">alloyed.</em>
          </WordReveal>
        </h1>
        <Rise delay={200}>
          <p className="mx-auto mt-4 max-w-[62ch] font-display text-[clamp(14.5px,1.15vw,17px)] font-light leading-[1.55] text-mute md:mt-5">{SUBLINE}</p>
        </Rise>

        {/* the sculpture: huge, centred; the sign-up bar rides its base */}
        <div className="relative w-full max-w-[1400px] md:-mt-[1svh]">
          <MeltSculpture onPhase={onPhase} spread={1.6} zoom={[5.8, 3.55]} className="h-[42svh] min-h-[300px] w-full md:h-[clamp(300px,calc(100svh-410px),64svh)] md:min-h-0" />
          <div ref={cap} aria-hidden className="pointer-events-none absolute inset-x-0 top-[6%] mx-auto h-5 w-48 text-center text-[11px] uppercase tracking-[0.32em] text-dim">
            <span className="absolute inset-0">
              <span className="text-ink">4</span> companies
            </span>
            <span className="absolute inset-0 opacity-0">
              <span className="text-ink">1</span> basket
            </span>
          </div>
        </div>
        <Rise delay={260} className="relative z-[2] -mt-[64px] w-full max-w-[860px] md:-mt-[88px]">
          {invited ? (
            <InviteSignIn autoStart={fromLink} onBack={() => setInvited(false)} />
          ) : (
            <JoinBar
              noteExtra={
                <InviteLink
                  onClick={() => {
                    setFromLink(true);
                    setInvited(true);
                  }}
                />
              }
            />
          )}
        </Rise>
        <Rise delay={340} className="mt-5 flex flex-col items-center gap-4">
          <FactChips className="justify-center" />
          <BuiltRow className="justify-center" />
        </Rise>
      </section>

      <PriceStrip className="mt-2" />

      <ListCounter className="px-4 pt-[clamp(72px,11vh,120px)]" />

      <section className="relative px-[clamp(16px,6vw,96px)] pt-[clamp(72px,11vh,130px)]">
        <div className="mx-auto max-w-[1320px]">
          <WhyHeading />
          <div className="mt-10 grid grid-cols-1 gap-3.5 md:mt-12 md:grid-cols-12 md:gap-4">
            {WHY.map((w, i) => {
              const V = VIGNETTES[i];
              const big = i === 0;
              return (
                <Rise key={w.t} delay={i * 90} className={big ? "md:col-span-7 md:row-span-2" : "md:col-span-5"}>
                  <article className={"a-card flex h-full flex-col " + (big ? "" : "md:flex-row")}>
                    <V className={big ? "a-sculpt h-[260px] md:h-[400px]" : "a-sculpt h-[200px] md:h-auto md:min-h-[230px] md:w-[46%] md:flex-none"} />
                    <div className={"flex flex-1 flex-col p-[26px] " + (big ? "md:p-[34px]" : "md:justify-end")}>
                      <span className="num font-display text-[12px] font-light tracking-[0.24em] text-dim">{w.n}</span>
                      <h3 className={"mt-3 font-display font-light tracking-[-0.015em] " + (big ? "text-[28px] md:text-[34px]" : "text-[22px]")}>{w.t}</h3>
                      <p className="mt-2 max-w-[44ch] text-[14px] leading-[1.6] text-mute">{w.b}</p>
                    </div>
                  </article>
                </Rise>
              );
            })}
          </div>
        </div>
      </section>

      <GiantFooter />
    </>
  );
}

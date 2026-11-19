"use client";

/** Landing sections after the story: baskets shelf, "fine print, made big", footer sculpture + wordmark. */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@/lib/hooks/use-wallet";
import { MetalBasket } from "../metal/MetalBasket";
import { useMetalFrame } from "../metal/MetalCanvas";
import { clamp, easeOut } from "../metal/math";
import { tintCss } from "../metal/palette";
import type { Recipe } from "../metal/shape";
import { OdometerOnView, Rise, WordReveal } from "../motion/alloy-motion";
import type { LBasket } from "./data";

const recipeOf = (b: LBasket): Recipe => ({ weights: b.tickers.map((t, i) => ({ ticker: t, w: b.weights[i] })), style: b.style, seed: b.address.toLowerCase() });

function Ret({ ret }: { ret: LBasket["ret"] }) {
  if (ret.bps === null)
    return (
      <span className="text-[12.5px]">
        <small className="block text-[10.5px] uppercase tracking-[0.14em] text-dim">Return</small>
        <span className="text-mute">New</span>
      </span>
    );
  const flat = Math.abs(ret.bps) < 5;
  const up = ret.bps >= 0;
  return (
    <span className="text-[12.5px]">
      <small className="block text-[10.5px] uppercase tracking-[0.14em] text-dim">{ret.label}</small>
      <span className={`num ${flat ? "text-mute" : up ? "gain" : "loss"}`}>{flat ? "0.0%" : `${up ? "+" : "−"}${(Math.abs(ret.bps) / 100).toFixed(1)}%`}</span>
    </span>
  );
}

function BasketCard({ b, i }: { b: LBasket; i: number }) {
  const [hover, setHover] = useState(false);
  const recipe = useMemo(() => recipeOf(b), [b]);
  const mix = b.tickers.map((t, k) => ({ t, w: b.weights[k] })).sort((x, y) => y.w - x.w);
  return (
    <Rise delay={i * 80} className="h-full">
      <article className="a-card flex h-full flex-col pb-[22px]" onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
        <Link href={`/b/${b.address}`} className="flex flex-1 flex-col text-ink no-underline" aria-label={`${b.name}, by @${b.handle}`}>
          <MetalBasket recipe={recipe} state={hover ? "breathe" : "idle"} assemble phase={i} zoom={3.7} className="a-sculpt h-[220px] md:h-[250px]" />
          <div className="flex flex-1 flex-col px-[22px] pt-5">
            <h4 className="font-display text-[21px] font-light tracking-[-0.01em]">{b.name}</h4>
            <div className="mt-[3px] text-[12.5px] text-mute">
              by <b className="font-medium text-ink">@{b.handle}</b>
              {b.followers > 0 ? (
                <>
                  {" "}
                  · <span className="num">{b.followers.toLocaleString("en-US")}</span> {b.followers === 1 ? "follower" : "followers"}
                </>
              ) : null}
            </div>
            <p className="mt-3 line-clamp-2 min-h-[42px] text-[13.5px] text-mute">{b.thesis}</p>
            <div className="mt-4 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11.5px] tracking-[0.04em] text-mute">
              {mix.slice(0, 5).map((m) => (
                <span key={m.t} className="flex items-center gap-1.5">
                  <i className="h-1.5 w-1.5 rounded-full" style={{ background: tintCss(m.t) }} />
                  {m.t} <span className="num">{Math.round(m.w * 100)}%</span>
                </span>
              ))}
              {mix.length > 5 && <span>+{mix.length - 5}</span>}
            </div>
          </div>
        </Link>
        <div className="mt-5 flex items-center justify-between px-[22px]">
          <Ret ret={b.ret} />
          <Link href={`/b/${b.address}?buy=25`} className="a-btn a-btn--buy a-btn--sm">
            Buy $25
          </Link>
        </div>
      </article>
    </Rise>
  );
}

export function BasketsSection({ baskets }: { baskets: LBasket[] }) {
  if (!baskets.length) return null;
  return (
    <section id="baskets" className="relative px-[clamp(16px,6vw,96px)] py-[clamp(110px,16vh,180px)]">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="a-eyebrow">Baskets</div>
          <WordReveal as="h2" className="a-h2 mt-[18px] block max-w-[14ch]">
            Pick a story. <em>Own</em> all of it.
          </WordReveal>
        </div>
        <div className="flex flex-col items-start gap-4">
          <WordReveal as="p" className="a-lede block max-w-[44ch]" delay={200}>
            Each basket is built by a creator you can follow. Same shape for everyone who buys it.
          </WordReveal>
          <Link href="/explore" className="a-btn a-btn--line a-btn--sm">
            See all baskets
          </Link>
        </div>
      </div>
      <div className="mt-16 grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {baskets.map((b, i) => (
          <BasketCard key={b.address} b={b} i={i} />
        ))}
      </div>
    </section>
  );
}

/** One "fine print" row: accent line draws in, the big word slides from `par`, effects fire once. */
function Fact({ big, par, title, body, extra, onIn }: { big: React.ReactNode; par: number; title: string; body: React.ReactNode; extra?: React.ReactNode; onIn?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);
  const cb = useRef(onIn);
  cb.current = onIn;
  useMetalFrame(({ H, phone, reduced }) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top > H * 1.2 || r.bottom < -H * 0.2) return;
    const pr = clamp((H * 0.95 - r.top) / (H * 0.5));
    const ln = el.querySelector<HTMLElement>("[data-ln]")!;
    const bg = el.querySelector<HTMLElement>("[data-big]")!;
    ln.style.transform = `scaleX(${reduced ? 1 : easeOut(pr)})`;
    bg.style.transform = reduced ? "none" : `translate3d(${(1 - easeOut(pr)) * par * (phone ? 0.6 : 2.2)}px,0,0)`;
    bg.style.opacity = String(reduced ? 1 : 0.15 + 0.85 * easeOut(clamp(pr * 1.4)));
    if (pr > 0.35 && !fired.current) {
      fired.current = true;
      cb.current?.();
    }
  });
  return (
    <div ref={ref} className="relative grid grid-cols-1 items-center gap-2.5 border-b border-line py-[30px] md:grid-cols-[1.1fr_1fr] md:gap-6 md:py-[38px]">
      <div data-big className="whitespace-nowrap font-display text-[58px] font-extralight leading-[0.92] tracking-[-0.045em] will-change-transform md:text-[clamp(64px,10vw,150px)]">
        {big}
      </div>
      <div>
        <h5 className="font-display text-[22px] font-light tracking-[-0.01em]">{title}</h5>
        <p className="mt-2 max-w-[36ch] text-mute">{body}</p>
        {extra}
      </div>
      <i data-ln className="absolute -bottom-px left-0 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-copper to-transparent" />
    </div>
  );
}

function Typed({ text, go }: { text: string; go: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!go) return;
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (rm) return setN(text.length);
    setN(0);
    let k = 0;
    const id = window.setInterval(() => {
      k++;
      setN(k);
      if (k >= text.length) window.clearInterval(id);
    }, 55);
    return () => window.clearInterval(id);
  }, [go, text]);
  return (
    <div className="num mt-3 text-[12.5px] tracking-[0.06em] text-dim">
      {text.slice(0, n)}
      <i className="ml-0.5 inline-block h-[13px] w-[7px] bg-copper align-[-2px] motion-safe:animate-[a-blink_1s_steps(1)_infinite]" />
    </div>
  );
}

export function TrustSection({ feeBps, testnet }: { feeBps: number; testnet: boolean }) {
  const w = useWallet();
  const [sellOn, setSellOn] = useState(0);
  const [typeOn, setTypeOn] = useState(false);
  const fee = (feeBps / 100).toFixed(feeBps % 100 === 0 ? 0 : 1);
  const addr = w.address ? `${w.address.slice(0, 6)}…${w.address.slice(-4)}` : "your wallet · Base";
  return (
    <section id="trust" className="relative px-[clamp(16px,6vw,96px)] py-[clamp(110px,16vh,180px)]">
      <div className="a-eyebrow">The fine print, made big</div>
      <WordReveal as="h2" className="a-h2 mt-[18px] block max-w-[14ch]">
        Small to start. <em>Easy</em> to leave.
      </WordReveal>
      <div className="mt-[70px] border-t border-line">
        <Fact par={40} big={<>$<OdometerOnView value="5" />
        </>} title="Start with five dollars." body="Top up whenever you like. No minimum after that." />
        <Fact
          par={-30}
          big={
            <>
              <OdometerOnView value={fee} />
              <em className="a-acc not-italic">%</em>
            </>
          }
          title="A year. That's the fee."
          body={<>One yearly fee, shown before you buy. The creator gets 80% of it, Alloy 20%.</>}
        />
        <Fact
          par={30}
          big="Anytime"
          title="Sell when you want."
          body="Some or all of it, any day."
          onIn={() => {
            setSellOn(1);
            window.setTimeout(() => setSellOn(2), 1700);
          }}
          extra={
            <div className="mt-3.5 h-[3px] w-[220px] overflow-hidden rounded-[3px] bg-line">
              <i className="block h-full bg-ink transition-[width] duration-[1600ms] ease-alloy" style={{ width: sellOn === 0 ? 0 : sellOn === 1 ? "100%" : "38%" }} />
            </div>
          }
        />
        <Fact
          par={-40}
          big={<em className="a-acc not-italic">Yours.</em>}
          title="In your own wallet."
          body={
            <>
              Your basket sits in your wallet on Base, not with us.
              {testnet && <span className="text-dim"> Test mode for now: prices are real, money is pretend.</span>}
            </>
          }
          onIn={() => setTypeOn(true)}
          extra={<Typed text={addr} go={typeOn} />}
        />
      </div>
    </section>
  );
}

export function EndSection({ featured }: { featured: LBasket | null }) {
  const word = useRef<HTMLDivElement>(null);
  const recipe = useMemo(() => (featured ? recipeOf(featured) : null), [featured]);
  useMetalFrame(({ H, reduced }) => {
    const el = word.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top > H * 1.2) return;
    const wp = clamp((H - r.top) / (H * 0.6));
    [...el.children].forEach((s, i) => {
      const l = reduced ? 1 : easeOut(clamp(wp * 1.6 - i * 0.12));
      (s as HTMLElement).style.opacity = String(l);
      (s as HTMLElement).style.transform = `translate3d(0,${(1 - l) * 60}px,0)`;
    });
  });
  return (
    <footer className="relative px-[clamp(16px,6vw,96px)] pb-10 pt-[clamp(40px,8vh,90px)] text-center">
      {recipe && <MetalBasket recipe={recipe} state="idle" assemble lean zoom={3.9} className="mx-auto -mt-10 mb-2.5 h-[300px] max-w-[900px] md:h-[420px]" />}
      <div className="a-eyebrow">Alloy</div>
      <WordReveal as="h2" className="a-h2 mx-auto mt-[18px] block">
        Own the <em>whole</em> story.
      </WordReveal>
      <div className="mt-[34px] flex flex-wrap justify-center gap-2.5">
        {featured && (
          <Link href={`/b/${featured.address}?buy=25`} className="a-btn a-btn--buy a-btn--lg">
            Buy {featured.name}
          </Link>
        )}
        <Link href="/explore" className="a-btn a-btn--line a-btn--lg">
          Explore baskets
        </Link>
      </div>
      <div
        ref={word}
        aria-hidden
        className="mr-[-0.32em] mt-[clamp(90px,14vh,150px)] select-none font-display text-[clamp(70px,17vw,260px)] font-extralight leading-none tracking-[0.32em]"
      >
        {"ALLOY".split("").map((c, i) => (
          <span key={i} className="inline-block bg-gradient-to-b from-[rgba(243,241,238,.55)] to-[rgba(243,241,238,0)] to-[88%] bg-clip-text text-transparent will-change-[transform,opacity]">
            {c}
          </span>
        ))}
      </div>
      <div className="mt-10 flex flex-col justify-between gap-5 border-t border-line pt-[22px] text-left text-[12px] text-dim md:flex-row">
        <div>
          <b className="font-medium text-mute">Not available in the US. You can lose money.</b>
          <br />
          Baskets hold tokenized US stock exposure on Base. You own a token that tracks the stocks, not the shares. Past returns don&apos;t predict future ones.
        </div>
        <div className="flex flex-wrap gap-[22px]">
          <Link href="/try" className="no-underline hover:text-ink">
            2-minute tour
          </Link>
          <Link href="/create" className="no-underline hover:text-ink">
            Build a basket
          </Link>
          <a href="https://x.com/alloy_fi" target="_blank" rel="noreferrer" className="no-underline hover:text-ink">
            X
          </a>
          <span>© 2026 Alloy</span>
        </div>
      </div>
    </footer>
  );
}

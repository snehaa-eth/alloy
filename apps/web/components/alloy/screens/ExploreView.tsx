"use client";

/**
 * Explore (approved liquid-metal design, docs/design/artdir/wow/app/explore.html) on real data:
 * header + live counts, sticky theme / sort bar, gallery of live metal baskets with FLIP reflow.
 */
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { Odometer, OdometerOnView, Rise, WordReveal } from "../motion/alloy-motion";
import { Chips } from "../explore/Chips";
import { ExploreCard } from "../explore/ExploreCard";
import { THEME_ORDER, type ExBasket } from "../explore/data";

type Sort = "popular" | "new" | "best";

const popular = (a: ExBasket, b: ExBasket) => b.followers - a.followers || Number(b.featured) - Number(a.featured) || b.nav - a.nav;
const SORTERS: Record<Sort, (a: ExBasket, b: ExBasket) => number> = {
  popular,
  new: (a, b) => b.createdAt - a.createdAt || popular(a, b),
  // real returns first (highest first); "New" baskets after, by popularity
  best: (a, b) => (a.ret.bps === null ? 1 : 0) - (b.ret.bps === null ? 1 : 0) || (b.ret.bps ?? 0) - (a.ret.bps ?? 0) || popular(a, b),
};

/** Height of the sticky app header (nav + status strip), so the filter bar sticks right under it. */
function useHeaderH() {
  const [h, setH] = useState(76);
  useEffect(() => {
    const el = document.querySelector<HTMLElement>("header.a-nav");
    if (!el) return;
    const m = () => setH(Math.round(el.getBoundingClientRect().height));
    m();
    const ro = new ResizeObserver(m);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return h;
}

export function ExploreView({ items }: { items: ExBasket[] }) {
  const [theme, setTheme] = useState<string>("All");
  const [sort, setSort] = useState<Sort>("popular");
  const headerH = useHeaderH();
  const bar = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const before = useRef<{ rects: Map<string, DOMRect>; gh: number } | null>(null);

  const themes = useMemo(() => THEME_ORDER.filter((t) => items.some((b) => b.themes.includes(t))), [items]);
  const list = useMemo(() => items.filter((b) => theme === "All" || b.themes.includes(theme)).sort(SORTERS[sort]), [items, theme, sort]);
  const followers = items.reduce((a, b) => a + b.followers, 0);
  const creators = new Set(items.map((b) => b.handle.toLowerCase())).size;
  const anyReturns = list.some((b) => b.ret.bps !== null);

  /** FLIP: remember where every card is before the change… */
  const snapshot = () => {
    const rects = new Map<string, DOMRect>();
    els.current.forEach((el, k) => rects.set(k, el.getBoundingClientRect()));
    before.current = { rects, gh: grid.current?.offsetHeight ?? 0 };
  };
  const pickTheme = (v: string) => {
    if (v === theme) return;
    snapshot();
    setTheme(v);
  };
  const pickSort = (v: Sort) => {
    if (v === sort) return;
    snapshot();
    setSort(v);
  };

  /** …then glide each one from there to its new place; newcomers rise in; the grid height eases. */
  useLayoutEffect(() => {
    const snap = before.current;
    before.current = null;
    if (!snap || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ease = "cubic-bezier(.16,1,.3,1)";
    list.forEach((b, i) => {
      const el = els.current.get(b.address);
      if (!el) return;
      const f = snap.rects.get(b.address);
      if (f) {
        const l = el.getBoundingClientRect();
        const dx = f.left - l.left, dy = f.top - l.top;
        if (Math.abs(dx) + Math.abs(dy) > 1) el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: 900, easing: ease, delay: i * 30, fill: "backwards" });
      } else {
        el.animate(
          [
            { transform: "translateY(40px) scale(.94)", opacity: 0, filter: "blur(8px)" },
            { transform: "none", opacity: 1, filter: "blur(0)" },
          ],
          { duration: 1000, easing: ease, delay: 120 + i * 60, fill: "backwards" },
        );
      }
    });
    const g = grid.current;
    if (g) {
      const nh = g.offsetHeight;
      if (Math.abs(nh - snap.gh) > 2) g.animate([{ height: `${snap.gh}px` }, { height: `${nh}px` }], { duration: 700, easing: ease });
    }
  }, [list]);

  /** Metal never draws under the stuck filter bar. */
  const clip = useCallback((): [number, number, number, number] | null => {
    const el = bar.current;
    if (!el || getComputedStyle(el).position !== "sticky") return null;
    const r = el.getBoundingClientRect();
    return [0, r.top + r.height * 0.72, window.innerWidth, window.innerHeight];
  }, []);

  const themeOpts = [{ v: "All", label: "All" }, ...themes.map((t) => ({ v: t, label: t }))];

  return (
    <div className="px-[clamp(16px,6vw,96px)] pb-24">
      <header className="flex flex-wrap items-end justify-between gap-[22px] pt-10 md:gap-8 md:pt-[clamp(56px,9vh,96px)]">
        <div>
          <Rise className="a-eyebrow">Explore</Rise>
          <WordReveal as="h1" immediate className="a-h1 mt-[18px] block max-w-[13ch] !text-[42px] md:!text-[clamp(40px,5vw,76px)]">
            Find a story worth <em>owning.</em>
          </WordReveal>
          <Rise as="p" className="a-lede mt-4" delay={300}>
            Baskets of US stocks, built by people you can follow. From $5.
          </Rise>
        </div>
        <Rise className="hidden gap-10 pb-1.5 md:flex" delay={450}>
          <div>
            <span className="a-kicker">Baskets</span>
            <span className="mt-1.5 flex font-display text-[34px] font-extralight tracking-[-0.02em]">
              <OdometerOnView value={String(items.length)} />
            </span>
          </div>
          <div>
            <span className="a-kicker">{followers > 0 ? "Following" : "Creators"}</span>
            <span className="mt-1.5 flex font-display text-[34px] font-extralight tracking-[-0.02em]">
              <OdometerOnView value={(followers > 0 ? followers : creators).toLocaleString("en-US")} />
            </span>
          </div>
        </Rise>
      </header>

      <div
        ref={bar}
        className="relative z-10 -mx-4 mt-[30px] flex flex-col gap-2.5 bg-[linear-gradient(#000_70%,rgba(0,0,0,0))] px-4 pb-3.5 pt-2.5 md:sticky md:top-[var(--bar-top)] md:mx-0 md:mt-14 md:flex-row md:items-center md:justify-between md:gap-4 md:px-0 md:py-3.5"
        style={{ "--bar-top": `${headerH}px` } as CSSProperties}
      >
        <div className="a-chips-scroll -mr-4 pr-4 md:mr-0 md:pr-0">
          <Chips label="Theme" options={themeOpts} value={theme} onChange={pickTheme} />
        </div>
        <div className="flex items-center justify-between gap-3 md:justify-end">
          <span className="text-[12px] uppercase tracking-[0.14em] text-dim">Sort</span>
          <Chips
            label="Sort"
            value={sort}
            onChange={pickSort}
            options={[
              { v: "popular", label: "Popular" },
              { v: "new", label: "New" },
              { v: "best", label: "Best 1Y" },
            ]}
          />
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5 text-[12.5px] text-mute" aria-live="polite">
        <Odometer value={String(list.length)} className="num" />
        <span>{list.length === 1 ? "basket" : theme === "All" ? "baskets" : `baskets in ${theme}`}</span>
      </div>

      {list.length === 0 ? (
        <div className="py-[60px] text-center text-mute">No baskets here yet.</div>
      ) : (
        <div ref={grid} className="relative mt-[22px] grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-[18px] min-[1101px]:grid-cols-3">
          {list.map((b, i) => (
            <ExploreCard
              key={b.address}
              b={b}
              i={items.indexOf(b)}
              clip={clip}
              dimRet={sort === "new"}
              ref={(el) => {
                if (el) els.current.set(b.address, el);
                else els.current.delete(b.address);
              }}
            />
          ))}
        </div>
      )}

      <Link
        href="/create"
        className="group mt-[18px] flex items-center gap-4 rounded-[24px] border border-dashed border-line2 px-[22px] py-[18px] text-ink no-underline transition-colors hover:border-[rgba(243,241,238,0.45)]"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-display text-[18px] font-light">Build your own</span>
          <span className="text-[13px] text-mute">Up to 10 stocks. Your weights. Others can follow.</span>
        </span>
        <ArrowRight size={16} strokeWidth={1.5} className="flex-none text-mute transition-transform duration-500 group-hover:translate-x-1" aria-hidden />
      </Link>
      {anyReturns && <p className="mt-10 text-[12px] text-dim">Past returns don&apos;t predict future ones.</p>}
    </div>
  );
}

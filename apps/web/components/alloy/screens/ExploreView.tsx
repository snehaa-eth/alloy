"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Plus, Search, SearchX, X } from "lucide-react";
import type { Performance } from "@/lib/types";
import type { BasketView } from "../basket-view";
import { ButtonLink, EmptyState } from "../primitives";
import { BasketCard, BrandWash, hasHistory } from "../v5/parts";

/** UX_MAP §3.3 Explore: search + theme chips + sort. */
type Tab = "all" | "ai" | "story";
type Sort = "popular" | "new";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ai", label: "AI" },
  { id: "story", label: "Stories" },
];

export function ExploreView({ items }: { items: { v: BasketView; perf?: Performance }[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<Sort>("popular");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    let l = [...items];
    // Popular = most followers; while nobody follows anything yet, the biggest baskets (by value) lead.
    const byValue = (a: (typeof l)[number], b: (typeof l)[number]) => (b.v.nav > a.v.nav ? 1 : b.v.nav < a.v.nav ? -1 : 0);
    const anyFollowers = l.some(({ v }) => v.basket.followers > 0);
    if (sort === "popular") l.sort((a, b) => (anyFollowers ? b.v.basket.followers - a.v.basket.followers : 0) || byValue(a, b));
    if (sort === "new") l.sort((a, b) => b.v.basket.createdAt - a.v.basket.createdAt);
    if (tab === "story") l = l.filter(({ v }) => v.basket.category === "story" || v.basket.story);
    if (tab === "ai") l = l.filter(({ v }) => v.basket.category === "ai" || /\bai\b/i.test(v.basket.name));
    const s = q.trim().toLowerCase();
    if (s)
      l = l.filter(
        ({ v }) =>
          v.basket.name.toLowerCase().includes(s) ||
          v.basket.creator.handle.toLowerCase().includes(s) ||
          v.tickers.some((t) => t.toLowerCase().includes(s)),
      );
    return l;
  }, [items, tab, sort, q]);
  const anyReturns = list.some(({ v }) => hasHistory(v));
  const fees = new Set(items.map(({ v }) => v.basket.feeBps));
  const fee = fees.size === 1 ? [...fees][0] / 100 : null;

  return (
    <div className="relative isolate">
    <BrandWash />
    <div className="mx-auto max-w-app px-4 pb-12 pt-8 md:px-8 md:pt-12">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1 md:gap-2">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight md:text-[40px]">Explore baskets</h1>
          <p className="text-[15px] text-tx2 md:text-[16px]">Pick a theme. From $5{fee !== null ? `, ${fee}% a year` : ""}.</p>
        </div>
        <Link
          href="/create"
          aria-label="Build a basket"
          className="c-btn c-btn--secondary c-btn--auto !h-11 flex-none !rounded-full !px-4 !text-[14px] md:!px-5"
        >
          <Plus size={16} strokeWidth={2} aria-hidden /> <span className="md:hidden">Build</span>
          <span className="hidden md:inline">Build a basket</span>
        </Link>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 md:mt-8 md:flex-row md:items-center md:justify-between">
        <div role="tablist" aria-label="Filter baskets" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 md:pb-0">
          {TABS.map((t) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.id)}
                className={
                  "h-10 flex-none rounded-full px-4 text-[14px] font-medium transition " +
                  (on ? "bg-tx text-bg" : "border border-white/10 bg-transparent text-tx3 hover:border-white/25 hover:text-tx")
                }
              >
                {t.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSort(sort === "popular" ? "new" : "popular")}
            className="h-10 flex-none rounded-full border border-white/10 px-4 text-[14px] font-medium text-tx2 md:hidden"
            aria-label={`Sort: ${sort === "popular" ? "Popular" : "New"}. Tap to change.`}
          >
            ↕ {sort === "popular" ? "Popular" : "New"}
          </button>
        </div>
        <div className="flex items-center gap-3">
        <div role="radiogroup" aria-label="Sort" className="hidden h-11 flex-none items-center rounded-full border border-white/10 p-1 md:flex">
          {(
            [
              ["popular", "Popular"],
              ["new", "New"],
            ] as [Sort, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={sort === id}
              onClick={() => setSort(id)}
              className={"h-full rounded-full px-4 text-[13px] font-medium transition " + (sort === id ? "bg-s2 text-tx" : "text-tx2 hover:text-tx")}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative flex h-11 w-full items-center md:w-[300px]">
          <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-4 text-tx2" aria-hidden />
          <input
            className="h-full w-full rounded-full border border-white/10 bg-s1 pl-11 pr-10 text-[14px] text-tx outline-none placeholder:text-tx2 focus:border-white/30"
            placeholder="Search basket, stock or creator"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search baskets"
          />
          {q && (
            <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="absolute right-3 text-tx2 hover:text-tx">
              <X size={16} strokeWidth={1.75} />
            </button>
          )}
        </label>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={SearchX}
          line={q ? `Nothing for “${q}” yet.` : "No baskets here yet."}
          action={<ButtonLink href="/create">{q ? `Build “${q.slice(0, 18)}”` : "Build a basket"}</ButtonLink>}
        />
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(({ v, perf }, i) => (
            <BasketCard key={v.basket.address} v={v} perf={perf} priority={i < 4} />
          ))}
          {/* Full-row slim banner: fits any card count without leaving a lone tile and dead columns. */}
          <Link
            href="/create"
            className="col-span-full flex items-center gap-4 rounded-[20px] border border-dashed border-white/15 px-5 py-4 text-tx no-underline transition hover:border-white/30 hover:bg-white/[0.02]"
          >
            <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-s2">
              <Plus size={18} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[15px] font-semibold">Build your own</span>
              <span className="text-[13px] text-tx2">Up to 10 stocks. Your weights. Others can follow.</span>
            </span>
            <ArrowRight size={16} strokeWidth={1.75} className="flex-none text-tx2" aria-hidden />
          </Link>
        </div>
      )}
      {/* The site footer already says what you own; only add the returns caveat when returns are on screen. */}
      {anyReturns && <p className="mt-10 text-[13px] text-tx2">Past returns aren&apos;t a promise.</p>}
    </div>
    </div>
  );
}

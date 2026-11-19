"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search, SearchX, X } from "lucide-react";
import type { Performance } from "@/lib/types";
import type { BasketView } from "../basket-view";
import { ButtonLink, EmptyState } from "../primitives";
import { BasketCard, BrandWash } from "../v5/parts";

/** UX_MAP §3.3 Explore: search + theme chips + sort. */
type Tab = "all" | "ai" | "story";
type Sort = "followed" | "new";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ai", label: "AI" },
  { id: "story", label: "Stories" },
];

export function ExploreView({ items }: { items: { v: BasketView; perf?: Performance }[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<Sort>("followed");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    let l = [...items];
    if (sort === "followed") l.sort((a, b) => b.v.basket.followers - a.v.basket.followers || (b.v.nav > a.v.nav ? 1 : b.v.nav < a.v.nav ? -1 : 0));
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

  return (
    <div className="relative isolate">
    <BrandWash />
    <div className="mx-auto max-w-app px-4 pb-12 pt-8 md:px-8 md:pt-12">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1 md:gap-2">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight md:text-[40px]">Explore baskets</h1>
          <p className="text-[15px] text-tx2 md:text-[16px]">Pick a story. Start with $5.</p>
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
            onClick={() => setSort(sort === "followed" ? "new" : "followed")}
            className="h-10 flex-none rounded-full border border-white/10 px-4 text-[14px] font-medium text-tx2 md:hidden"
            aria-label={`Sort: ${sort === "followed" ? "Popular" : "New"}. Tap to change.`}
          >
            ↕ {sort === "followed" ? "Popular" : "New"}
          </button>
        </div>
        <div className="flex items-center gap-3">
        <div role="radiogroup" aria-label="Sort" className="hidden h-11 flex-none items-center rounded-full border border-white/10 p-1 md:flex">
          {(
            [
              ["followed", "Popular"],
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
          <Link
            href="/create"
            className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-white/15 p-6 text-center text-tx no-underline transition hover:border-white/30 hover:bg-white/[0.02]"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-s2">
              <Plus size={20} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="text-[16px] font-semibold">Build your own</span>
            <span className="max-w-[220px] text-[14px] text-tx2">Up to 10 stocks. Your weights. Others can follow.</span>
          </Link>
        </div>
      )}
      <p className="mt-10 text-[13px] text-tx2">Tokenized stock exposure, not shares. Returns shown are past, not promised.</p>
    </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Plus, Search, SearchX } from "lucide-react";
import { BasketRow, HoldingCertificate } from "../BasketCards";
import type { BasketView } from "../basket-view";
import { ButtonLink, EmptyState, IconButton, Tabs } from "../primitives";

type Tab = "followed" | "new" | "story";

export function ExploreView({ views }: { views: BasketView[] }) {
  const [tab, setTab] = useState<Tab>("followed");
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    let l = [...views];
    if (tab === "followed") l.sort((a, b) => b.basket.followers - a.basket.followers);
    if (tab === "new") l.sort((a, b) => b.basket.createdAt - a.basket.createdAt);
    if (tab === "story") l = l.filter((v) => v.basket.category === "story" || v.basket.story);
    const s = q.trim().toLowerCase();
    if (s)
      l = l.filter(
        (v) =>
          v.basket.name.toLowerCase().includes(s) ||
          v.basket.creator.handle.toLowerCase().includes(s) ||
          v.tickers.some((t) => t.toLowerCase().includes(s)),
      );
    return l;
  }, [views, tab, q]);

  const [featured, ...rest] = list;

  return (
    <div className="mx-auto max-w-app px-4 pb-8 pt-5 md:px-6 md:pt-8">
      <div className="c-top">
        <div className="flex flex-col gap-1">
          <h1 className="t-body t-strong md:text-[20px]">Explore</h1>
          <p className="t-mono c2 hidden md:block">Invest in stories, not symbols.</p>
        </div>
        <div className="flex items-center gap-3">
          <ButtonLink href="/create" variant="secondary" auto className="!hidden md:!inline-flex c-btn--sm">
            <Plus size={14} strokeWidth={1.75} aria-hidden /> Build a basket
          </ButtonLink>
          <IconButton label={searching ? "Close search" : "Search"} icon={Search} onClick={() => setSearching((s) => !s)} />
        </div>
      </div>

      {searching && (
        <div className="mt-3">
          <input
            autoFocus
            className="c-field__box"
            placeholder="Basket, stock or creator"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search baskets"
          />
        </div>
      )}

      <div className="mt-3 md:max-w-[520px]">
        <Tabs
          label="Sort baskets"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "followed", label: "Most followed" },
            { id: "new", label: "New" },
            { id: "story", label: "Story" },
          ]}
        />
      </div>

      {!featured ? (
        <EmptyState
          icon={SearchX}
          line={q ? `Nothing for “${q}” yet.` : "No baskets here yet."}
          action={<ButtonLink href="/create">{q ? `Build “${q.slice(0, 18)}”` : "Build a basket"}</ButtonLink>}
        />
      ) : (
        <div className="mt-4 grid gap-6 md:grid-cols-[400px_1fr] md:gap-10">
          <HoldingCertificate v={featured} />
          <section aria-label="More baskets" className="flex flex-col">
            <h2 className="t-label hidden pb-2 md:block">More baskets</h2>
            {rest.length === 0 ? (
              <div className="flex flex-col gap-3 py-4">
                <p className="t-body c3">More baskets are on the way.</p>
                <ButtonLink href="/create" variant="secondary" auto className="self-start">
                  Build the next one
                </ButtonLink>
              </div>
            ) : (
              <div className="flex flex-col">
                {rest.map((v) => (
                  <BasketRow key={v.basket.address} v={v} href={`/b/${v.basket.address}`} />
                ))}
              </div>
            )}
            <p className="t-mono c2 mt-4">Tokenized stock exposure, not shares.</p>
          </section>
        </div>
      )}
    </div>
  );
}

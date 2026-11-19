"use client";

/**
 * Creator profile (docs/design/artdir/wow/app/creator.html) on real data: the creator's baskets as metal,
 * followers, their own money in, what their fee share earns at today's size, track record from the value
 * series, and their notes (reasons given for recipe changes).
 * Follow is local to this device: there is no follow backend yet, and the button says so.
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { formatUsd6, usd6ToChartNumber } from "@/lib/units";
import type { LoadedBasket } from "../load";
import { shortDate } from "../basket-view";
import { STYLES, styleOf } from "../styles";
import { MetalBasket } from "../metal/MetalBasket";
import { tintCss } from "../metal/palette";
import { OdometerOnView, Rise, WordReveal } from "../motion/alloy-motion";
import { pctText, recipeOfView, signCls } from "../states/recipe";
import { thesisOf } from "../v5/parts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FOLLOW_KEY = "alloy.follow.v1";

/** "meera_invests" → ["Meera", "invests."]; falls back to the display name. */
function heading(handle: string, display: string): [string, string] {
  const parts = handle.split(/[._]/).filter(Boolean);
  if (parts.length === 2 && parts[1].length >= 4 && /^[a-z]+$/i.test(parts[1])) return [parts[0][0].toUpperCase() + parts[0].slice(1), `${parts[1]}.`];
  const d = display.replace(/\.$/, "").split(" ");
  return d.length > 1 ? [d.slice(0, -1).join(" "), `${d[d.length - 1]}.`] : [d[0], "."];
}

function useFollow(handle: string) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      setOn((JSON.parse(localStorage.getItem(FOLLOW_KEY) ?? "[]") as string[]).includes(handle));
    } catch {
      /* storage blocked */
    }
  }, [handle]);
  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      const set = new Set(JSON.parse(localStorage.getItem(FOLLOW_KEY) ?? "[]") as string[]);
      if (next) set.add(handle);
      else set.delete(handle);
      localStorage.setItem(FOLLOW_KEY, JSON.stringify([...set]));
    } catch {
      /* session only */
    }
    if (next) toast.success(`Following @${handle}`, { description: "Saved on this device." });
  };
  return { on, toggle };
}

export function CreatorScreen({ items }: { items: LoadedBasket[] }) {
  const c = items[0].v.basket.creator;
  const sorted = useMemo(() => [...items].sort((a, b) => b.v.basket.followers - a.v.basket.followers || (b.v.nav > a.v.nav ? 1 : -1)), [items]);
  const top = sorted[0];
  const [first, accent] = heading(c.handle, c.displayName);
  const since = Math.min(...items.map((x) => x.v.basket.createdAt).filter((t) => t > 0));
  const followers = items.reduce((a, x) => a + x.v.basket.followers, 0);
  const own = items.reduce((a, x) => a + x.v.creatorStakeUsd6, 0n);
  // creator keeps 80% of the yearly fee on followers' money (everything that isn't their own stake)
  const earnYr = items.reduce((a, x) => {
    const followerMoney = x.v.nav > x.v.creatorStakeUsd6 ? x.v.nav - x.v.creatorStakeUsd6 : 0n;
    return a + (followerMoney * BigInt(x.v.basket.feeBps) * 8n) / 100_000n;
  }, 0n);
  const withHistory = items.filter((x) => x.perf.navSeries.length >= 2);
  const avgBps = withHistory.length ? Math.round(withHistory.reduce((a, x) => a + x.v.sinceBps, 0) / withHistory.length) : null;
  const follow = useFollow(c.handle);
  const notes = items
    .flatMap((x) => x.events.filter((e) => e.kind === "recipe-change" && e.reason).map((e) => ({ x, e })))
    .sort((a, b) => b.e.at - a.e.at)
    .slice(0, 2);
  const n = items.length;
  const word = n === 1 ? "One basket." : n === 2 ? "Two baskets." : n === 3 ? "Three baskets." : `${n} baskets.`;

  return (
    <div className="cp">
      <header className="cp-hero">
        <div className="cp-ava">
          <MetalBasket recipe={recipeOfView(top.v)} zoom={3.9} lean className="h-full w-full" />
        </div>
        <div className="cp-who">
          <div className="a-eyebrow">
            Creator {Number.isFinite(since) && <span className="text-mute">· since {MONTHS[new Date(since * 1000).getUTCMonth()]} {new Date(since * 1000).getUTCFullYear()}</span>}
          </div>
          <WordReveal as="h1" className="a-h1 mt-2.5 block" immediate>
            {accent === "." ? (
              <>
                {first}
                <em>.</em>
              </>
            ) : (
              <>
                {first} <em>{accent}</em>
              </>
            )}
          </WordReveal>
          <div className="mt-1.5 text-[15px] text-mute">@{c.handle}</div>
          <p className="cp-bio">
            {n} {n === 1 ? "basket" : "baskets"} on Alloy, {own > 0n ? "with their own money in first" : "built in the open"}.
          </p>
        </div>
        <div className="cp-acts">
          <button type="button" className={`a-btn a-btn--lg ${follow.on ? "a-btn--line" : "a-btn--cream"}`} onClick={follow.toggle} aria-pressed={follow.on} title="Saved on this device">
            {follow.on ? (
              <>
                <Check size={14} strokeWidth={1.75} aria-hidden /> Following
              </>
            ) : (
              "Follow"
            )}
          </button>
          <Link href={`/b/${top.v.basket.address}?buy=5`} className="a-btn a-btn--buy a-btn--lg">
            Buy from $5
          </Link>
        </div>
      </header>

      <section className="cp-stats">
        <div className="cp-st">
          <small>Followers</small>
          <div className="v">
            <OdometerOnView value={followers.toLocaleString("en-US")} />
          </div>
          <p>People copying {n === 1 ? "this basket" : "these baskets"}</p>
        </div>
        <div className="cp-st">
          <small>Own money in</small>
          <div className="v">
            <OdometerOnView value={formatUsd6(own, 0)} />
          </div>
          <p>Across {n === 1 ? "one basket" : `${n} baskets`}</p>
        </div>
        <div className="cp-st">
          <small>Fee share</small>
          <div className="v">
            <OdometerOnView value={formatUsd6(earnYr)} />
          </div>
          <p>A year at today&apos;s size · 80% of the fee</p>
        </div>
        <div className="cp-st">
          <small>Track record</small>
          <div className={`v ${signCls(avgBps)}`}>{avgBps === null ? <span className="text-mute">New</span> : <OdometerOnView value={pctText(avgBps)} />}</div>
          <p>Average since launch</p>
        </div>
      </section>

      <section className="cp-sec">
        <div className="cp-sec-h">
          <div>
            <div className="a-eyebrow">Collection</div>
            <WordReveal as="h2" className="a-h2 mt-3.5 block">
              {word.split(" ")[0]} <em>{word.split(" ").slice(1).join(" ")}</em> One temperament.
            </WordReveal>
          </div>
          <p className="a-lede max-w-[40ch]">Each one holds the creator&apos;s own money first. Same shape for everyone who follows.</p>
        </div>
        <div className="cp-cards">
          {sorted.map((x, i) => (
            <Card key={x.v.basket.address} x={x} i={i} tag={i === 0 && n > 1 && x.v.basket.followers > 0 ? "Most followed" : undefined} />
          ))}
        </div>
      </section>

      <section className="cp-sec">
        <div className="a-eyebrow">Track record</div>
        <WordReveal as="h2" className="a-h2 mt-3.5 block">
          {avgBps !== null && avgBps < 0 ? (
            <>
              Honest, <em>in the open.</em>
            </>
          ) : (
            <>
              Steady, <em>on purpose.</em>
            </>
          )}
        </WordReveal>
        <div className="cp-rec">
          <Rise className="cp-chart st-panel">
            <Chart x={top} />
          </Rise>
          <Rise className="cp-facts st-panel" delay={120}>
            <Fact k="Rebalances run" v={String(items.reduce((a, x) => a + x.events.filter((e) => e.status === "executed").length, 0))} />
            <Fact
              k="Biggest dip"
              v={
                top.perf.maxDrawdownBps > 0 ? <span className="loss">−{(top.perf.maxDrawdownBps / 100).toFixed(1)}%</span> : <span className="text-mute">None yet</span>
              }
            />
            <Fact k="Own money in" v={formatUsd6(own)} />
            <Fact k="Style" v={STYLES[styleOf(top.v.basket)].label} />
            <Fact k="Fee followers pay" v={`${top.v.basket.feeBps / 100}% a year`} />
          </Rise>
        </div>
        {notes.length > 0 && (
          <div className="cp-notes">
            {notes.map(({ x, e }, i) => (
              <Rise key={e.id} className="cp-note st-panel" delay={i * 100}>
                <div className="a-eyebrow !text-[10.5px]">
                  Note · {x.v.basket.name} · {shortDate(e.at)}
                </div>
                <q>{e.reason}</q>
                <small>{e.changes.length ? `Changed ${e.changes.length} ${e.changes.length === 1 ? "weight" : "weights"}` : "No changes"}</small>
              </Rise>
            ))}
          </div>
        )}
      </section>
      <p className="pf-legal">Past returns don&apos;t predict future ones. You can lose money.</p>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="cp-fct">
      <span>{k}</span>
      <b className="num">{v}</b>
    </div>
  );
}

function Card({ x, i, tag }: { x: LoadedBasket; i: number; tag?: string }) {
  const [hov, setHov] = useState(false);
  const v = x.v;
  const b = v.basket;
  const recipe = useMemo(() => recipeOfView(v), [v]);
  const mix = b.components.map((c) => ({ t: c.stock.ticker, w: c.targetBps })).sort((p, q) => q.w - p.w);
  const hasRet = x.perf.navSeries.length >= 2;
  return (
    <Rise delay={i * 110} className="h-full">
      <article className="a-card flex h-full flex-col pb-[22px]" onPointerEnter={() => setHov(true)} onPointerLeave={() => setHov(false)}>
        <Link href={`/b/${b.address}`} className="flex flex-1 flex-col text-ink no-underline">
          <div className="relative">
            <MetalBasket recipe={recipe} state={hov ? "breathe" : "idle"} assemble phase={i} zoom={3.9} className="a-sculpt h-[220px] md:h-[260px]" />
            {tag && <span className="absolute right-[18px] top-4 text-[10.5px] uppercase tracking-[0.2em] text-dim">{tag}</span>}
          </div>
          <div className="px-[22px] pt-5">
            <h4 className="font-display text-[21px] font-light tracking-[-0.01em]">{b.name}</h4>
            <div className="mt-[3px] text-[12.5px] text-mute">
              {b.followers.toLocaleString("en-US")} following · {b.components.length} stocks
            </div>
            <p className="mt-3 line-clamp-2 min-h-[42px] text-[13.5px] text-mute">{thesisOf(v)}</p>
            <div className="mt-4 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11.5px] tracking-[0.04em] text-mute">
              {mix.map((m) => (
                <span key={m.t} className="flex items-center gap-1.5">
                  <i className="h-1.5 w-1.5 rounded-full" style={{ background: tintCss(m.t) }} />
                  {m.t} <span className="num">{Math.round(m.w / 100)}%</span>
                </span>
              ))}
            </div>
          </div>
        </Link>
        <div className="mt-5 flex items-end justify-between px-[22px]">
          <span className="text-[12.5px]">
            <small className="block text-[10.5px] uppercase tracking-[0.14em] text-dim">{hasRet ? `Since ${shortDate(v.sinceDate)}` : "Return"}</small>
            <b className={`num text-[15px] font-medium ${hasRet ? signCls(v.sinceBps) : "text-mute"}`}>{hasRet ? pctText(v.sinceBps) : "New"}</b>
          </span>
          <Link href={`/b/${b.address}?buy=5`} className="a-btn a-btn--buy a-btn--sm">
            Buy from $5
          </Link>
        </div>
      </article>
    </Rise>
  );
}

/** "$100 became $X" from the basket's real value series, with the ranges the history covers. */
function Chart({ x }: { x: LoadedBasket }) {
  const all = x.perf.navSeries;
  const span = all.length >= 2 ? all[all.length - 1].t - all[0].t : 0;
  const ranges = [
    { id: "1W", s: 7 * 86_400 },
    { id: "1M", s: 30 * 86_400 },
    { id: "3M", s: 90 * 86_400 },
    { id: "1Y", s: 365 * 86_400 },
  ].filter((r) => r.s < span * 1.5);
  const opts = [...ranges.filter((r) => r.s < span), { id: "All", s: span }];
  const [rid, setRid] = useState("All");
  const r = opts.find((o) => o.id === rid) ?? opts[opts.length - 1];
  const end = all[all.length - 1];
  const pts = all.filter((p) => !end || p.t >= end.t - r.s);
  const nums = pts.map((p) => usd6ToChartNumber(p.navPerShareUsd6));
  if (nums.length < 2)
    return (
      <div className="flex h-full min-h-[240px] flex-col justify-between">
        <small className="a-eyebrow">{x.v.basket.name}</small>
        <p className="text-mute">New. The line starts after its first day of prices.</p>
      </div>
    );
  const base = nums[0];
  const lo = Math.min(...nums), hi = Math.max(...nums);
  const pad = (hi - lo) * 0.15 + base * 0.002;
  const X = (i: number) => (i / (nums.length - 1)) * 600;
  const Y = (v: number) => 240 - ((v - lo + pad) / (hi - lo + 2 * pad)) * 240;
  const d = nums.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  const last = nums[nums.length - 1];
  const chBps = Math.round((last / base - 1) * 10_000);
  const became = (100 * last) / base;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => pts[Math.round(f * (pts.length - 1))].t);
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <small className="a-eyebrow">{x.v.basket.name} · $100 became</small>
          <b className="cp-chart__v num">${became.toFixed(2)}</b>
          <span className={`num text-[13px] ${signCls(chBps)}`}>
            {pctText(chBps)} {rid === "All" ? `since ${shortDate(pts[0].t)}` : `in ${rid}`}
          </span>
        </div>
        {opts.length > 1 && (
          <div className="flex gap-1">
            {opts.map((o) => (
              <button key={o.id} type="button" className={`cp-rng ${o.id === r.id ? "on" : ""}`} onClick={() => setRid(o.id)} aria-pressed={o.id === r.id}>
                {o.id}
              </button>
            ))}
          </div>
        )}
      </div>
      <svg viewBox="0 0 600 240" preserveAspectRatio="none" className="cp-svg" aria-label={`Value of $100 over time, now $${became.toFixed(2)}`}>
        <defs>
          <linearGradient id="cp-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#F3F1EE" stopOpacity=".10" />
            <stop offset="1" stopColor="#F3F1EE" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" x2="600" y1={Y(base)} y2={Y(base)} stroke="rgba(243,241,238,.14)" strokeDasharray="2 5" />
        <path d={`${d} L600 240 L0 240 Z`} fill="url(#cp-fill)" />
        <path key={r.id} className="cp-line" d={d} fill="none" stroke="#F3F1EE" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" pathLength={1} />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-dim">
        {ticks.map((t, i) => (
          <span key={i}>{span < 2 * 86_400 ? new Date(t * 1000).toISOString().slice(11, 16) : shortDate(t)}</span>
        ))}
      </div>
    </>
  );
}

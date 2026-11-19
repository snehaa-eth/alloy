"use client";

/**
 * Basket page sections below the fold (docs/design/artdir/wow/app/basket.html):
 * recipe rows, "what happens when one wins" (tied to the basket's real style), history replay from the
 * real rebalance events, key facts.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import type { RebalanceEvent, StrategyMode } from "@/lib/types";
import { useWallet } from "@/lib/hooks/use-wallet";
import { useMetalRegion } from "../metal/MetalCanvas";
import { bump, clamp, easeInOut, lerp } from "../metal/math";
import { tintCss } from "../metal/palette";
import { OdometerOnView, Rise, WordReveal, useInView } from "../motion/alloy-motion";
import { Countdown } from "../Countdown";
import { longDate, tickerOf, type BasketView } from "../basket-view";
import { STYLES, styleOf } from "../styles";
import { camAt, formAt, pctTxt, syncTags } from "./kit";

export function SecHead({ id, eyebrow, title, side }: { id?: string; eyebrow: string; title: ReactNode; side?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <div className="a-eyebrow">{eyebrow}</div>
        <WordReveal as="h2" className="a-h2 mt-3 block max-w-[16ch] !text-[clamp(32px,3.6vw,52px)]">
          {title}
        </WordReveal>
        {id && <span id={id} className="sr-only" />}
      </div>
      {side}
    </div>
  );
}

const NUM_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
export const countWord = (n: number) => NUM_WORDS[n] ?? String(n);

function TagBox({ tickers, r }: { tickers: string[]; r: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={r} className="absolute inset-0" aria-hidden>
      {tickers.map((t) => (
        <div key={t} className="a-tag">
          <b>{t}</b>
          <span className="v num" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Recipe
// ---------------------------------------------------------------------------------------------------------

export function RecipeRows({ v, moves, hours = 24 }: { v: BasketView; moves: (number | null)[] | null; hours?: number }) {
  const b = v.basket;
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, "0px 0px -20% 0px");
  const rows = b.components.map((c, i) => ({ c, i, now: v.now[i].bps / 100, plan: c.targetBps / 100, mv: moves?.[i] ?? null })).sort((x, y) => y.plan - x.plan || y.now - x.now);
  const scale = Math.max(50, ...rows.map((r) => Math.max(r.now, r.plan)) ) * 1.04;
  const showToday = !!moves && moves.some((x) => x !== null);
  const cols = showToday ? "md:grid-cols-[minmax(150px,1.3fr)_2fr_76px_86px]" : "md:grid-cols-[minmax(150px,1.3fr)_2fr_86px]";
  return (
    <div ref={ref} className="mt-[34px] border-t border-line">
      <div className={`hidden gap-5 border-b border-line py-3.5 text-[10.5px] uppercase tracking-[0.18em] text-dim md:grid ${cols}`}>
        <span>Stock</span>
        <span>Weight now</span>
        <span className="text-right">Now</span>
        {showToday && <span className="text-right">{hours}h</span>}
      </div>
      {rows.map(({ c, i, now, plan, mv }, k) => (
        <div
          key={c.stock.symbol}
          className={`grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-2.5 border-b border-line py-4 transition-colors duration-500 hover:bg-[linear-gradient(90deg,transparent,var(--fill),transparent)] md:gap-5 md:py-5 ${cols}`}
        >
          <div className="flex items-center gap-3">
            <i className="h-2 w-2 flex-none rounded-full" style={{ background: tintCss(c.stock.ticker) }} />
            <div className="min-w-0">
              <b className="text-[13.5px] font-semibold tracking-[0.06em]">{c.stock.ticker}</b>
              <span className="block truncate text-[12.5px] text-mute">{c.stock.name || c.stock.ticker}</span>
            </div>
          </div>
          <div className="a-wbar order-last col-span-3 md:order-none md:col-span-1">
            <i style={{ width: seen ? `${(now / scale) * 100}%` : 0, transitionDelay: `${k * 120}ms` }} />
            <u style={{ left: `${(plan / scale) * 100}%` }} title={`Plan ${plan.toFixed(0)}%`} />
            {k === 0 && <span className="absolute -top-4 text-[9.5px] tracking-[0.12em] text-dim" style={{ left: `${(plan / scale) * 100}%`, transform: "translateX(-50%)" }}>plan</span>}
          </div>
          <div className="num text-right font-display text-[20px] font-light tracking-[-0.02em]">
            {now.toFixed(1)}%<small className="-mt-0.5 block font-sans text-[11.5px] tracking-normal text-dim">plan {Math.round(plan)}%</small>
          </div>
          {showToday && (
            <div className={`num min-w-[58px] text-right text-[14px] font-medium ${mv === null ? "text-dim" : Math.abs(mv) < 0.0005 ? "text-mute" : mv >= 0 ? "gain" : "loss"}`}>
              {mv === null ? "–" : pctTxt(mv)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// What happens when one wins (an illustration of the basket's real style, on its real recipe)
// ---------------------------------------------------------------------------------------------------------

export function WinsSection({ v, style, capBps }: { v: BasketView; style: StrategyMode; capBps?: number }) {
  const b = v.basket;
  const tickers = v.tickers;
  const plan = useMemo(() => {
    const s = b.components.reduce((a, c) => a + c.targetBps, 0) || 1;
    return b.components.map((c) => c.targetBps / s);
  }, [b.components]);
  const top = plan.indexOf(Math.max(...plan));
  const win = plan.map((p, i) => (p * (i === top ? 1.2 : 1)) / (1 + 0.2 * plan[top]));
  const name = b.components[top]?.stock.name || tickers[top];
  const P = Math.round(plan[top] * 100), Wn = Math.round(win[top] * 100);
  const cap = capBps && capBps < 10_000 ? Math.round(capBps / 100) : null;
  const goesBack = style !== "let-winners-run";
  const steps: [string, string][] = [
    [`${name} jumps 20%.`, "Its part of your basket is now worth more."],
    style === "trend-aware" ? ["We let it ride while it rises.", `Its share grows to ${Wn}%.`] : [`Its share grows to ${Wn}%.`, style === "balanced" ? `That's more than the plan's ${P}%.` : "Nothing is sold. The winner keeps its bigger slice."],
    style === "balanced"
      ? ["We take some profit.", `Back to ${P}%. The extra is spread across the others.`]
      : style === "trend-aware"
        ? ["When it turns, we take some profit.", "The extra moves to the other stocks."]
        : cap
          ? [`Only past ${cap}% is some profit taken.`, "Until then, winners keep running."]
          : ["The plan only changes with notice.", "You see any change before it happens."],
  ];
  const others: Record<StrategyMode, ReactNode> = {
    "let-winners-run": (
      <>
        <b className="font-medium text-ink">Keep the mix</b> would move it back to the plan sooner. <b className="font-medium text-ink">Ride the trend</b> would take profit once it turns.
      </>
    ),
    balanced: (
      <>
        <b className="font-medium text-ink">Let winners run</b> would keep the bigger slice. <b className="font-medium text-ink">Ride the trend</b> would wait until it turns.
      </>
    ),
    "trend-aware": (
      <>
        <b className="font-medium text-ink">Let winners run</b> would keep holding. <b className="font-medium text-ink">Keep the mix</b> would move it back to the plan sooner.
      </>
    ),
  };

  const stage = useRef<HTMLDivElement>(null);
  const tags = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const t = useRef(0);
  useMetalRegion(stage, ({ rect, T, dt, phone, reduced }) => {
    t.current = reduced ? 4.5 : (t.current + dt) % 9;
    const x = t.current;
    const up = easeInOut(clamp((x - 1.2) / 1.6));
    const back = goesBack ? easeInOut(clamp((x - 5.6) / 1.6)) : easeInOut(clamp((x - 8.4) / 0.6));
    const w = plan.map((p, i) => lerp(lerp(p, win[i], up), p, back));
    const step = x < 1.2 ? -1 : x < 3.2 ? 0 : x < 5.6 ? 1 : x < 8.4 ? 2 : -1;
    list.current?.querySelectorAll<HTMLElement>("[data-ws]").forEach((el, i) => {
      el.classList.toggle("on", i === step);
      const seg = [[1.2, 3.2], [3.2, 5.6], [5.6, 8.4]][i];
      el.style.setProperty("--p", String(clamp((x - seg[0]) / (seg[1] - seg[0]))));
    });
    const posed = formAt(tickers, w, style, b.address.toLowerCase(), { ang: 0.25 + Math.sin(T * 0.2) * 0.2, t: T });
    const cam = camAt(phone ? 5.6 : 5.1, 0.25, 0.1);
    syncTags(tags.current, posed, cam, rect, (i) => ({ op: 1, v: `${Math.round(w[i] * 100)}%`, color: i === top && up * (1 - back) > 0.3 ? "var(--gain)" : undefined }), { top: 14 });
    return {
      cam,
      drops: posed.drops,
      o: { t: T, zone: posed.zone, shim: bump(0.05, 0.3, x / 9) * 0.9 + bump(0.62, 0.9, x / 9) * 0.8, shimPos: lerp(-2.4, 2.4, ((x - 0.5) / 3.5) % 1), rip: goesBack ? bump(0.68, 0.92, x / 9) * 0.7 : 0 },
    };
  });

  return (
    <section className="mt-20 md:mt-[110px]" aria-labelledby="wins-h">
      <SecHead eyebrow={STYLES[style].label} title={<>What happens when <em>one</em> wins.</>} />
      <div className="mt-[34px] grid items-center gap-[18px] md:grid-cols-2 md:gap-8">
        <div ref={stage} className="relative h-[300px] overflow-hidden rounded-[24px] border border-line md:h-[380px]">
          <TagBox tickers={tickers} r={tags} />
          <span className="absolute bottom-3.5 left-5 text-[11px] uppercase tracking-[0.16em] text-dim">Example</span>
        </div>
        <div>
          <div ref={list} className="flex flex-col gap-1.5">
            {steps.map(([h, p], i) => (
              <div key={i} data-ws className="a-ws">
                <b className="mb-1 block font-display text-[21px] font-light tracking-[-0.01em]">{h}</b>
                <p className="text-[14px] opacity-80">{p}</p>
              </div>
            ))}
          </div>
          <p className="mt-[18px] border-t border-line pt-[18px] text-[13.5px] text-mute">{others[style]}</p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------
// History: every real change, tap to replay the reshape
// ---------------------------------------------------------------------------------------------------------

type Entry = { id: string; at: number; title: string; from: number[]; to: number[]; note?: string; pending?: RebalanceEvent; txHash?: string; cancelled?: boolean };

function entriesOf(v: BasketView, events: RebalanceEvent[]): Entry[] {
  const b = v.basket;
  const idx = (sym: string) => b.components.findIndex((c) => c.stock.symbol === sym);
  const n = b.components.length;
  let plan = b.components.map((c) => c.targetBps / 10_000);
  const out: Entry[] = [];
  const sorted = [...events].sort((x, y) => y.at - x.at);
  for (const e of sorted) {
    const from = [...plan], to = [...plan];
    for (const ch of e.changes) {
      const i = idx(ch.symbol);
      if (i < 0) continue;
      from[i] = ch.fromBps / 10_000;
      to[i] = ch.toBps / 10_000;
    }
    let title: string;
    if (e.status === "pending") title = "Change coming";
    else if (e.status === "cancelled") title = "Change cancelled";
    else if (e.kind === "drift-trim") title = "Back to the plan";
    else {
      const added = e.changes.find((c) => c.fromBps === 0 && c.toBps > 0);
      const removed = e.changes.find((c) => c.toBps === 0 && c.fromBps > 0);
      title = added ? `Added ${tickerOf(b, added.symbol)}` : removed ? `Removed ${tickerOf(b, removed.symbol)}` : "Recipe changed";
    }
    out.push({ id: e.id, at: e.at, title, from, to: e.status === "cancelled" ? from : to, note: e.reason, pending: e.status === "pending" ? e : undefined, txHash: e.txHash, cancelled: e.status === "cancelled" });
    // walking back in time: an executed recipe change means the plan used to be `from`
    if (e.status === "executed" && e.kind === "recipe-change") plan = from;
  }
  const live = plan.filter((x) => x > 0).length;
  out.push({ id: "start", at: b.createdAt, title: "Started", from: new Array(n).fill(0), to: plan, note: `${countWord(live)} ${live === 1 ? "company" : "companies"} to begin.` });
  return out;
}

export function HistorySection({ v, events, onOpenPending }: { v: BasketView; events: RebalanceEvent[]; onOpenPending: () => void }) {
  const b = v.basket;
  const tickers = v.tickers;
  const list = useMemo(() => entriesOf(v, events), [v, events]);
  const [k, setK] = useState(0);
  const X = useRef({ t: 99, from: list[0].to, to: list[0].to });
  const stage = useRef<HTMLDivElement>(null);
  const tags = useRef<HTMLDivElement>(null);
  const seen = useInView(stage, "0px 0px -40% 0px");
  const replay = (i: number) => {
    setK(i);
    X.current = { t: 0, from: list[i].from, to: list[i].to };
  };
  useEffect(() => {
    if (seen) replay(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen]);

  useMetalRegion(stage, ({ rect, T, dt, phone, reduced }) => {
    const s = X.current;
    s.t += dt;
    const p = reduced ? 1 : easeInOut(clamp((s.t - 0.5) / 1.8));
    const w = s.to.map((x, i) => lerp(s.from[i], x, p));
    const tot = w.reduce((a, c) => a + c, 0);
    const posed = formAt(tickers, w, styleOf(b), b.address.toLowerCase(), { ang: 0.3 + Math.sin(T * 0.18) * 0.25, t: T, rs: 0.25 + 0.75 * Math.sqrt(Math.min(1, tot)) });
    const cam = camAt(phone ? 5.6 : 5.1, 0.25, 0.1);
    syncTags(
      tags.current,
      posed,
      cam,
      rect,
      (i) => {
        if (w[i] < 0.01 || Math.max(s.from[i], s.to[i]) <= 0) return { op: 0, v: "" };
        const ch = s.from[i] !== s.to[i] && p < 1 && s.t < 4;
        return { op: 1, v: ch ? `${Math.round(s.from[i] * 100)} → ${Math.round(s.to[i] * 100)}%` : `${Math.round(w[i] * 100)}%` };
      },
      { top: 14, bottom: 40 },
    );
    return { cam, drops: posed.drops, o: { t: T, zone: posed.zone, shim: bump(0.6, 1.15, p + 0.1) * 0.9, shimPos: lerp(-2.4, 2.4, p), rip: bump(0.85, 1.6, s.t / 2.3) * 0.8 } };
  });

  const cur = list[k];
  return (
    <section className="mt-20 md:mt-[110px]">
      <SecHead
        eyebrow="History"
        title={<>Every change, <em>on the record.</em></>}
        side={<p className="a-lede max-w-[30ch]">{list.length > 1 ? "Tap a change to watch the basket reshape." : "No changes yet. It follows the creator's plan."}</p>}
      />
      <div className="mt-[34px] grid items-start gap-[18px] md:grid-cols-2 md:gap-8">
        <div ref={stage} className="relative h-[320px] overflow-hidden rounded-[24px] border border-line md:sticky md:top-[130px] md:h-[400px]">
          <TagBox tickers={tickers} r={tags} />
          <div className="absolute inset-x-5 bottom-4 flex justify-between text-[12px] text-dim">
            <span>
              {longDate(cur.at)} · {cur.title}
            </span>
            <button type="button" onClick={() => replay(k)} className="pointer-events-auto flex items-center gap-1.5 hover:text-ink">
              <RotateCcw size={12} strokeWidth={1.5} aria-hidden /> Replay
            </button>
          </div>
        </div>
        <ol className="relative pl-7 before:absolute before:bottom-3 before:left-[5px] before:top-3 before:w-px before:bg-line">
          {list.map((e, i) => (
            <li key={e.id}>
              <button type="button" className={`a-ev ${i === k ? "on" : ""}`} onClick={() => replay(i)} aria-pressed={i === k}>
                <div className="text-[11px] uppercase tracking-[0.16em] text-dim">{longDate(e.at)}</div>
                <div className="a-ev-t mt-1 font-display text-[20px] font-light">{e.title}</div>
                <div className="num mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12.5px] text-mute">
                  {tickers.map((t, j) =>
                    Math.round(e.from[j] * 100) === Math.round(e.to[j] * 100) && !e.cancelled ? null : e.cancelled && e.from[j] === e.to[j] ? null : (
                      <span key={t} className="inline-flex items-center gap-1.5">
                        <i className="h-1.5 w-1.5 rounded-full" style={{ background: tintCss(t) }} />
                        {t} {Math.round(e.from[j] * 100)}% → {Math.round(e.to[j] * 100)}%
                      </span>
                    ),
                  )}
                </div>
                {e.note && <p className="mt-2 text-[13px] text-mute">{e.note}</p>}
                <span className="a-ev-replay absolute right-3.5 top-[18px] flex items-center gap-1.5 text-[12px] text-dim">
                  <RotateCcw size={12} strokeWidth={1.5} aria-hidden /> Replay
                </span>
              </button>
              {e.pending && (
                <button type="button" onClick={onOpenPending} className="a-btn a-btn--line a-btn--sm -mt-1 mb-3">
                  See the change · <Countdown to={e.pending.executableAt ?? e.pending.at} dueLabel="due" />
                </button>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Key facts
// ---------------------------------------------------------------------------------------------------------

function Fact({ big, title, body, extra }: { big: ReactNode; title: string; body: ReactNode; extra?: ReactNode }) {
  return (
    <Rise className="border-b border-line py-6 md:px-[26px] md:py-[30px] md:[&:nth-child(3n+1)]:pl-0 md:[&:not(:nth-child(3n))]:border-r">
      <div className="font-display text-[48px] font-extralight leading-none tracking-[-0.04em] md:text-[56px]">{big}</div>
      <h5 className="mt-3.5 text-[14.5px] font-semibold">{title}</h5>
      <p className="mt-1 max-w-[30ch] text-[13.5px] text-mute">{body}</p>
      {extra}
    </Rise>
  );
}

export function FactsSection({ feeBps, noticeSeconds, testnet }: { feeBps: number; noticeSeconds: number; testnet: boolean }) {
  const w = useWallet();
  const fee = (feeBps / 100).toFixed(feeBps % 100 === 0 ? 0 : 1);
  const notice = noticeSeconds >= 86_400 ? `${Math.round(noticeSeconds / 86_400)}d` : noticeSeconds >= 3600 ? `${Math.round(noticeSeconds / 3600)}h` : `${Math.round(noticeSeconds / 60)}m`;
  return (
    <section className="mt-20 md:mt-[110px]">
      <SecHead eyebrow="Key facts" title={<>Small to start. <em>Easy</em> to leave.</>} />
      <div className="mt-[34px] grid grid-cols-1 border-t border-line md:grid-cols-3">
        <Fact
          big={
            <>
              <OdometerOnView value={fee} />
              <em className="font-light not-italic text-copper">%</em>
            </>
          }
          title="A year. That's the fee."
          body="Taken a little each day. The creator gets 80% of it, Alloy 20%."
        />
        <Fact
          big={
            <>
              $<OdometerOnView value="5" />
            </>
          }
          title="To start."
          body="Add any amount after that."
        />
        <Fact
          big="Yours."
          title="In your own wallet."
          body="You hold the basket token on Base, not us."
          extra={w.address ? <div className="num mt-2.5 text-[12px] tracking-[0.06em] text-dim">{`${w.address.slice(0, 6)}…${w.address.slice(-4)}`}</div> : null}
        />
        <Fact big="Anytime" title="Sell some or all." body="The money goes back to your wallet as USDC." />
        <Fact big={<span className="num">{notice}</span>} title="Notice before any change." body="If the creator changes the plan, you see it first and can leave." />
        {testnet && <Fact big="Test" title="Test mode is on." body="Prices are real. Money is pretend." />}
      </div>
    </section>
  );
}

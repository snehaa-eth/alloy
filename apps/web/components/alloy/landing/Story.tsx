"use client";

/**
 * Landing scroll story (port of docs/design/artdir/wow/index.html #story), on the featured basket's REAL recipe:
 *   hero (one drop per stock, mouse lean) → melt into ONE form (tint zones) → pour $25 → prices move (real feed
 *   moves since the window start) → rebalance → sell.
 * 1000vh section with a sticky stage; one metal region (the stage) + one frame tick for the DOM (tags, captions, totals).
 * The $25 is an example amount; the moves are real price changes, labelled with their start date.
 */
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { shortDate } from "../basket-view";
import { useMetalFrame, useMetalRegion } from "../metal/MetalCanvas";
import { bump, clamp, damp, easeInOut, easeOut, lerp, norm, project, ss, sub, type Cam, type V3 } from "../metal/math";
import { tintFor } from "../metal/palette";
import { posedDrops, shapeFromRecipe, type Drop, type Posed } from "../metal/shape";
import { neckK, pourAt } from "../metal/actions";
import { placeTag, resolveTags, type TagEl } from "../metal/tags";
import { splitWords, wordsAt } from "../motion/alloy-motion";
import type { LBasket, StoryMoves } from "./data";

const HERO_D: V3[] = [[-2.8, 0.1, 0.2], [3.05, -0.75, -0.4], [-1.75, -1.7, 0.75], [2.5, 1.45, -1.2]];
const HERO_M: V3[] = [[-0.7, -1.2, 0.3], [0.8, -2.3, -0.3], [-0.55, -3.3, 0.5], [0.95, -0.7, -0.9]];
const rad = (w: number) => 0.95 * Math.sqrt(w) + 0.05;
const STEPS: [number, number][] = [[0.27, 0.43], [0.44, 0.59], [0.6, 0.74], [0.75, 0.91]];
const SELL_SHARE = 0.3;

type Stock = { t: string; w: number; pct: number };

/** Max 4 drops: top 3 + the rest merged ("+N"). */
function storyStocks(b: LBasket, moves: StoryMoves | null): Stock[] {
  const all = b.tickers.map((t, i) => ({ t, w: b.weights[i], pct: moves?.pct[t] ?? 0 })).sort((x, y) => y.w - x.w);
  if (all.length <= 4) return all;
  const rest = all.slice(3);
  const w = rest.reduce((a, x) => a + x.w, 0);
  return [...all.slice(0, 3), { t: `+${rest.length}`, w, pct: rest.reduce((a, x) => a + x.pct * x.w, 0) / (w || 1) }];
}

/** Set a tag's value + change text; true when the width may have changed. */
function kids0(t: HTMLElement, v: string, ch: string, chc: string): boolean {
  const k = t.children;
  let changed = false;
  if (k[1].textContent !== v) {
    k[1].textContent = v;
    changed = true;
  }
  if (k[2].textContent !== ch) {
    k[2].textContent = ch;
    changed = true;
  }
  (k[2] as HTMLElement).style.color = chc;
  return changed;
}

const money = (v: number) => "$" + v.toFixed(2);
const pctTxt = (f: number) => (f >= 0 ? "+" : "−") + Math.abs(f * 100).toFixed(Math.abs(f) < 0.1 ? 1 : 0) + "%";

export function Story({ b, moves }: { b: LBasket; moves: StoryMoves | null }) {
  const stocks = useMemo(() => storyStocks(b, moves), [b, moves]);
  const n = stocks.length;
  const seed = b.address.toLowerCase();
  const baseShape = useMemo(() => shapeFromRecipe({ weights: stocks.map((s) => ({ ticker: s.t, w: s.w })), style: b.style, seed }), [stocks, b.style, seed]);
  const gain = stocks.reduce((a, s) => a + s.w * s.pct, 0); // basket move, fraction
  const winner = stocks.reduce((bi, s, i) => (s.pct > stocks[bi].pct ? i : bi), 0);

  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const st = useRef({
    p: 0,
    ps: -1,
    cur: stocks.map((s, i) => ({ p: [...HERO_D[i]] as V3, r: rad(s.w), c: tintFor(s.t) })) as Drop[],
    pour: { p: [0, 4, 0], r: 0, c: [1, 0.86, 0.74] } as Drop,
    sell: { p: [0, 0, 0], r: 0, c: [0.9, 0.92, 0.95] } as Drop,
    mspd: 0,
    mprev: [0, 0] as [number, number],
    cam: null as Cam | null,
    posed: null as Posed | null,
    fuse: 0,
    o: { k: 0.3, shim: 0, shimPos: 0, rip: 0, alpha: 1, wob: 1, zm: 0, zt: 0.13, k2: 0.32 },
    words: [] as HTMLElement[][],
  });

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    st.current.words = [...el.querySelectorAll<HTMLElement>("[data-sw]")].map((h) => splitWords(h));
  }, []);

  useMetalFrame(({ T, dt, W, H, mouse, phone, reduced }) => {
    const el = root.current;
    if (!el) return;
    const s = st.current;
    const q = <E extends HTMLElement = HTMLElement>(sel: string) => el.querySelector<E>(sel)!;
    const sr = el.getBoundingClientRect();
    if (sr.bottom < -H || sr.top > 2 * H) return; // story far away: nothing to do
    s.p = clamp(-sr.top / (el.offsetHeight - H));
    s.ps = s.ps < 0 || reduced ? s.p : damp(s.ps, s.p, 0.0009, dt);
    const p = s.ps;
    const mspd = Math.min(1, (Math.hypot(mouse[0] - s.mprev[0], mouse[1] - s.mprev[1]) / Math.max(dt, 0.001)) * 0.6);
    s.mspd = lerp(s.mspd, mspd, 0.08);
    s.mprev = [mouse[0], mouse[1]];

    // phases
    const fuse = easeInOut(ss(0.045, 0.2, p));
    const buy = clamp((p - 0.27) / 0.15), mv = clamp((p - 0.44) / 0.15), rb = clamp((p - 0.6) / 0.13), sl = clamp((p - 0.75) / 0.14);
    const out = ss(0.92, 1, p);
    const heroK = 1 - fuse;
    s.fuse = fuse;
    const fy = phone ? -0.55 : 0;
    const mk = easeOut(clamp(mv * 1.3)) * (1 - easeOut(clamp(rb * 1.2))); // move amount, undone by the rebalance

    // the form: zones re-partition with the real moves during "Prices move", back to plan on rebalance
    const shape =
      mk > 0.002 && moves
        ? shapeFromRecipe({ weights: stocks.map((x) => ({ ticker: x.t, w: x.w * (1 + x.pct * mk * 3) })), style: b.style, seed })
        : baseShape;
    const swell = 1 + 0.1 * ss(0.35, 0.75, buy);
    const shrink = 1 - 0.08 * ss(0.2, 0.8, sl);
    const breathe = 1 + Math.sin(T * 1.6) * 0.012 * clamp(mv * 3) * (1 - rb);
    const ang = Math.sin(T * 0.2) * 0.25 + mouse[0] * 0.2 * fuse;
    const rsForm = (phone ? 1.12 : 1.0) * swell * shrink * breathe;
    const posed = posedDrops(shape, { ang, t: T, off: [0, fy, 0], rs: rsForm, bob: 0.03 });
    s.posed = posed;

    // drops: hero positions → the form's lobes (extra stocks sink into the core)
    const HP = phone ? HERO_M : HERO_D;
    s.cur.forEach((d, i) => {
      if (i >= n) return;
      const lobe = posed.drops[i < shape.lobes.length ? i : 0];
      const tgtR = i < shape.lobes.length ? lobe.r : lobe.r * 0.85;
      const tp: V3 = [lerp(HP[i][0], lobe.p[0], fuse), lerp(HP[i][1], lobe.p[1], fuse), lerp(HP[i][2], lobe.p[2], fuse)];
      const bob = Math.sin(T * 0.7 + i * 1.9) * 0.09 * heroK;
      tp[1] += bob;
      tp[0] += Math.cos(T * 0.5 + i * 2.4) * 0.05 * heroK;
      // mouse lean (hero)
      const lean = (0.16 + 0.05 * i) * heroK;
      const mw = [mouse[0] * (phone ? 1.6 : 4), mouse[1] * (phone ? 3.2 : 2.5)];
      tp[0] += (mw[0] - tp[0]) * lean * 0.35;
      tp[1] += (mw[1] - tp[1]) * lean * 0.35;
      // two drops drift together and kiss (hero only)
      if (heroK > 0 && n === 4 && (i === 3 || i === 2)) {
        const j = i === 3 ? 1 : 0;
        const kiss = ss(0.35, 1, Math.sin(T * 0.42 + (i === 2 ? 2.8 : 0))) * heroK;
        const dv = norm(sub(tp, s.cur[j].p));
        const rr = (s.cur[j].r + d.r) * 0.9;
        const tg: V3 = [s.cur[j].p[0] + dv[0] * rr, s.cur[j].p[1] + dv[1] * rr, s.cur[j].p[2] + dv[2] * rr];
        for (let a = 0; a < 3; a++) tp[a] = lerp(tp[a], tg[a], kiss * 0.85);
      }
      const tr = lerp(rad(stocks[i].w), tgtR, fuse);
      // spring (mercury lag); once fused the form holds its shape
      const kS = reduced ? 1 : 1 - Math.pow(lerp(0.001 + 0.004 * i, 0.00001, fuse), dt);
      for (let a = 0; a < 3; a++) d.p[a] = lerp(d.p[a], tp[a], kS);
      d.r = reduced ? tr : lerp(d.r, tr, 1 - Math.pow(0.0005, dt));
    });

    // pour drop ($25) and the cursor droplet in the hero
    const P = s.pour;
    let k2 = 0.32;
    if (buy > 0 && buy < 0.62) {
      // smooth buy pour (designer A.pourAt): fall, neck by the real gap (A.neckK), damped settle
      const top = Math.max(...posed.drops.filter((x) => x.r > 0.01).map((x) => x.p[1] + x.r));
      const pr = pourAt(clamp(buy / 0.6), { y0: phone ? 3.6 : 3.0, ya: top + 0.2, yc: top - 0.35, r: 0.24 });
      P.p = [0.05, pr.y, 0.25];
      P.r = pr.r * ss(0, 0.04, buy);
      k2 = Math.max(pr.k2, neckK(P, posed.drops));
    } else if (p < 0.06) {
      const hk = 1 - ss(0, 0.05, p);
      P.p = phone ? [Math.sin(T * 0.4) * 1.1, -1.4 + Math.cos(T * 0.31) * 1.4, 0.5] : [mouse[0] * 4.1, mouse[1] * 2.6, 0.55];
      P.r = (phone ? 0.11 : 0.13) * hk * (reduced ? 0 : ss(0, 1, T * 0.8));
    } else P.r = 0;
    // sell drop leaves the form
    const S = s.sell;
    if (sl > 0) {
      const e = ss(0, 0.35, sl), m = easeInOut(ss(0.25, 1, sl));
      const bounce = Math.abs(Math.sin(m * Math.PI * 2.2)) * 0.35 * (1 - m);
      S.p = [lerp(0.3, phone ? -0.55 : 0.15, m), lerp(-0.3 + fy, (phone ? -2.1 : -1.45) + fy * 0.3, m) + bounce, lerp(0.4, phone ? 2.6 : 2.5, m)];
      S.r = 0.4 * e;
    } else S.r = 0;

    const fuseShim = ss(0.6, 1, fuse), pourShim = ss(0.45, 0.75, buy);
    s.o = {
      k: lerp(0.3, 0.8, fuse),
      shim: bump(0.55, 1, ss(0.12, 0.22, p)) * 1.1 + bump(0.45, 0.8, buy) * 0.8,
      shimPos: fuse < 0.999 || buy < 0.45 ? lerp(-2.6, 2.6, fuseShim) : lerp(-2.6, 2.6, pourShim),
      rip: bump(0.17, 0.27, p) + bump(0.5, 0.7, buy) * 0.7,
      alpha: 1 - out,
      wob: 1 + s.mspd * 2.2 * (1 - fuse),
      zm: ss(0.35, 0.95, fuse),
      zt: lerp(0.13, 0.5, ss(0.3, 1, fuse)),
      k2,
    };
    const camFuse = fuse;
    const mx = mouse[0] * (1 - fuse * 0.6), my = mouse[1] * (1 - fuse * 0.6);
    const cz = phone ? lerp(9.2, 10.8, camFuse) : 6.2;
    s.cam = { ro: [mx * 0.35, fy + my * 0.22, cz], ta: [0, fy, 0], tan: 0.42 };
    const cam = s.cam;

    // ---- DOM ----
    const tagOn = (1 - ss(0, 0.035, p)) * (reduced ? 1 : ss(0, 1, T * 1.2));
    const tags = el.querySelectorAll<HTMLElement>("[data-tag]");
    tags.forEach((t, i) => {
      let op = 0, v = "", ch = "", chc = "";
      if (p < 0.05) {
        op = tagOn;
        v = Math.round(stocks[i].w * 100) + "%";
      } else if (buy > 0.5 && rb < 0.15) {
        op = ss(0.5, 0.7, buy) * (1 - ss(0, 0.12, rb));
        const k = easeOut(clamp(mv * 1.3));
        v = money(25 * stocks[i].w * (1 + stocks[i].pct * k));
        if (mv > 0.05 && moves) {
          ch = pctTxt(stocks[i].pct * k);
          chc = stocks[i].pct >= 0 ? "var(--gain)" : "var(--loss)";
        }
      } else if (rb > 0.15 && sl < 0.15) {
        op = ss(0.15, 0.35, rb) * (1 - ss(0, 0.12, sl));
        v = Math.round(stocks[i].w * 100) + "%";
      }
      const tg = t as TagEl;
      if (kids0(t, v, ch, chc)) tg._w = 0;
      if (p < 0.05) {
        // hero: label at each drop's upper right
        const d = s.cur[i];
        const pr = project(cam, [d.p[0] + d.r * 0.78, d.p[1] + d.r * 0.78, d.p[2]], W, H);
        const tw = tg._w || (tg._w = t.offsetWidth || 90);
        t.classList.remove("l");
        t.style.opacity = String(op);
        t.style.transform = `translate3d(${Math.max(12, Math.min(W - tw - 12, pr[0] + 8))}px,${pr[1] - 8}px,0)`;
      } else {
        // fused: anchor on the silhouette toward the stock's zone; collisions resolved after the loop
        placeTag(tg, cam, posed.anchors[i], posed.ctr, W, H, op, 1.45);
        tg._wt = stocks[i].w;
      }
    });
    if (p >= 0.05) resolveTags([...tags] as TagEl[], W, H, { top: phone ? 90 : 100, bottom: 40 });
    {
      const t = q("[data-selltag]");
      const pr = project(cam, [S.p[0] + S.r, S.p[1] + S.r * 0.4, S.p[2]], W, H);
      t.style.opacity = String(ss(0.55, 0.75, sl) * (1 - ss(0.92, 1, p)));
      t.style.transform = `translate3d(${Math.min(pr[0] + 8, W - 190)}px,${pr[1] - 8}px,0)`;
    }
    {
      const t = q("[data-pourtag]");
      const pr = project(cam, [P.p[0] + 0.3, P.p[1], P.p[2]], W, H);
      t.style.opacity = String(P.r > 0.02 && buy > 0 ? ss(0.05, 0.2, buy) : 0);
      t.style.transform = `translate3d(${pr[0] + 8}px,${pr[1] - 8}px,0)`;
    }

    // hero copy
    const hOut = ss(0, 0.045, p);
    const hero = q("[data-hero]");
    hero.style.opacity = String(1 - hOut);
    hero.style.filter = hOut > 0.01 ? `blur(${hOut * 12}px)` : "none";
    hero.style.transform = (phone ? "" : "translateY(-50%) ") + `translateY(${-hOut * 40}px) scale(${1 - hOut * 0.04})`;
    hero.style.pointerEvents = hOut > 0.5 ? "none" : "auto";
    q("[data-cue]").style.opacity = String(1 - ss(0, 0.02, p));
    // morph caption
    const aIn = ss(0.04, 0.08, p) * (1 - ss(0.15, 0.19, p)), bIn = ss(0.19, 0.23, p) * (1 - ss(0.27, 0.3, p));
    const setM = (e: HTMLElement, v: number) => {
      e.style.opacity = String(v);
      e.style.filter = v > 0.99 ? "none" : `blur(${(1 - v) * 14}px)`;
      e.style.transform = `translateY(${(1 - v) * 14}px) scale(${0.96 + 0.04 * v})`;
    };
    setM(q("[data-ma]"), aIn);
    setM(q("[data-mb]"), bIn);
    q("[data-who]").style.opacity = String(bIn);
    // steps
    const rail = el.querySelectorAll<HTMLElement>("[data-rail] > div");
    el.querySelectorAll<HTMLElement>("[data-step]").forEach((stp, i) => {
      const [a, z] = STEPS[i];
      const vin = ss(a, a + 0.035, p), vout = ss(z - 0.025, z, p);
      stp.style.opacity = vin * (1 - vout) > 0.001 ? (vout > 0 ? String(1 - vout) : "1") : "0";
      stp.style.transform = (phone ? "" : "translateY(-50%) ") + `translateY(${-vout * 30}px)`;
      if (s.words[i]) wordsAt(s.words[i], vin, reduced);
      (stp.querySelector("p") as HTMLElement).style.opacity = String(ss(a + 0.02, a + 0.05, p));
      (stp.querySelector("[data-k]") as HTMLElement).style.opacity = String(ss(a, a + 0.02, p));
      rail[i]?.classList.toggle("on", p >= a && p < z);
    });
    q("[data-rail]").style.opacity = String(ss(0.25, 0.28, p) * (1 - ss(0.9, 0.93, p)));
    // total
    const tv = ss(0.33, 0.38, p) * (1 - ss(0.9, 0.93, p));
    const total = q("[data-total]");
    total.style.opacity = String(tv);
    total.style.pointerEvents = tv > 0.5 ? "auto" : "none";
    const k = easeOut(clamp(mv * 1.3));
    const grown = 25 * (1 + gain * k);
    const sold = 25 * (1 + gain) * SELL_SHARE;
    let tot = 25 * ss(0.3, 0.4, p) + 25 * gain * k * ss(0.3, 0.4, p);
    tot -= sold * ss(0.55, 0.75, sl);
    const tvEl = q("[data-totv]");
    const tvs = money(tot);
    if (tvEl.textContent !== tvs) tvEl.textContent = tvs;
    const td = q("[data-totd]");
    const html =
      mv > 0.05 && sl < 0.4 && moves
        ? `<span class="${gain >= 0 ? "gain" : "loss"}">${gain >= 0 ? "+" : "−"}$${Math.abs(grown - 25).toFixed(2)} &nbsp;${pctTxt(gain * k)}</span>`
        : sl > 0.5
          ? `<span style="color:var(--mute)">${money(sold)} sold to your wallet</span>`
          : "&nbsp;";
    if (td.innerHTML !== html) td.innerHTML = html;
  });

  const supported = useMetalRegion(stage, ({ T }) => {
    const s = st.current;
    if (!s.cam || !s.posed || s.p >= 1 || s.o.alpha < 0.01) return null;
    const drops: (Drop | null)[] = [...s.cur, s.pour, s.sell];
    return { cam: s.cam, drops, o: { ...s.o, t: T, n: 4, zone: s.posed.zone } };
  });

  // pad to 4 slots: fewer stocks → empty slots
  while (st.current.cur.length < 4) st.current.cur.push({ p: [0, 60, 0], r: 0, c: [1, 1, 1] });

  const buyHref = `/b/${b.address}?buy=25`;
  return (
    <section id="story" ref={root} className="relative" style={{ height: "1000vh" }} aria-label="How a basket works">
      <div ref={stage} className="sticky top-0 h-[100vh] overflow-hidden">
        {supported === false && <span className="a-metal-fallback" />}
        <div data-hero className="absolute inset-x-0 top-[24%] px-4 text-center will-change-[opacity,transform,filter] md:top-1/2 md:-translate-y-1/2">
          <h1 className="a-display text-[clamp(44px,5.6vw,84px)] leading-[1.02] tracking-[-0.025em]">
            Stocks, <em className="a-acc">alloyed.</em>
          </h1>
          <p className="mt-3 font-display text-[clamp(15px,1.25vw,18px)] font-light text-mute md:mt-[18px]">Baskets of US stocks around one idea. From $5.</p>
          <div className="mt-[22px] flex justify-center gap-2.5 md:mt-[30px]">
            <Link href={`/b/${b.address}?buy=5`} className="a-btn a-btn--buy a-btn--lg">
              Start with $5
            </Link>
            <Link href="/explore" className="a-btn a-btn--line a-btn--lg">
              Explore baskets
            </Link>
          </div>
        </div>
        <div data-cue className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-[11px] uppercase tracking-[0.32em] text-dim md:flex">
          Scroll to melt
          <i className="block h-[38px] w-px origin-top bg-gradient-to-b from-[rgba(243,241,238,.34)] to-transparent motion-safe:animate-[a-cue_2.2s_cubic-bezier(.16,1,.3,1)_infinite]" />
        </div>

        {stocks.map((x) => (
          <div key={x.t} data-tag className="a-tag">
            <b>{x.t}</b>
            <span className="v num" />
            <span className="ch num" />
          </div>
        ))}
        <div data-selltag className="a-tag">
          <b>SOLD</b>
          <span className="v num">{money(25 * (1 + gain) * SELL_SHARE)} → wallet</span>
        </div>
        <div data-pourtag className="a-tag">
          <span className="v num" style={{ color: "var(--copper)" }}>
            + $25.00
          </span>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-[13vh] h-[1.2em] text-center font-display text-[clamp(30px,3.4vw,48px)] font-extralight tracking-[-0.02em] md:top-[15vh]">
          <span data-ma className="absolute inset-x-0 opacity-0">
            <span className="num">{n}</span> companies
          </span>
          <span data-mb className="absolute inset-x-0 opacity-0">
            <span className="a-acc">1</span> basket
          </span>
        </div>
        <div data-who className="pointer-events-none absolute inset-x-0 top-[calc(13vh+52px)] text-center text-[12.5px] tracking-[0.02em] text-mute opacity-0 md:top-[calc(15vh+1.2*clamp(30px,3.4vw,48px)+34px)]">
          {b.name} &nbsp;·&nbsp; by @{b.handle}
        </div>

        {[
          ["Buy", "Pour in $25.", `It splits by weight on its own. One buy, ${b.tickers.length} ${b.tickers.length === 1 ? "company" : "companies"}.`],
          ["Prices move", "Winners grow inside.", "Each company moves with its own price. Your basket moves with all of them."],
          ["Rebalance", "Back in shape.", `${b.styleLabel}. ${b.styleLine}`],
          ["Sell", "Sell anytime.", "Some or all. The money lands back in your wallet."],
        ].map(([k, h, t], i) => (
          <div
            key={k}
            data-step
            className="pointer-events-none absolute left-4 right-4 top-[12vh] opacity-0 md:left-[clamp(16px,7vw,110px)] md:right-auto md:top-1/2 md:w-[min(360px,30vw)]"
          >
            <div data-k className="flex items-center gap-3.5 text-[11px] uppercase tracking-[0.3em] text-dim">
              <span className="text-copper">0{i + 1}</span>
              {k}
            </div>
            <h3 data-sw className="mt-3 font-display text-[30px] font-extralight leading-[1.08] tracking-[-0.022em] md:mt-[18px] md:text-[clamp(30px,3vw,46px)]">
              {h}
            </h3>
            <p className="mt-2 max-w-[30ch] text-[13.5px] text-mute md:mt-3.5 md:text-[14.5px]">{t}</p>
          </div>
        ))}

        <div data-rail className="absolute right-[clamp(16px,4vw,56px)] top-1/2 hidden -translate-y-1/2 flex-col gap-3.5 text-right text-[11px] tracking-[0.2em] text-dim opacity-0 md:flex [&>div.on]:text-ink [&>div.on>i]:w-[34px] [&>div.on>i]:bg-copper">
          {["BUY", "MOVE", "REBALANCE", "SELL"].map((r) => (
            <div key={r} className="flex items-center justify-end gap-2.5 transition-colors duration-500">
              {r}
              <i className="block h-px w-3.5 bg-current transition-[width] duration-700 ease-alloy" />
            </div>
          ))}
        </div>

        <div data-total className="absolute bottom-[5vh] right-4 text-right opacity-0 md:bottom-[10vh] md:right-[clamp(16px,4vw,56px)]">
          <small className="block text-[11px] uppercase tracking-[0.24em] text-dim">Your basket · example</small>
          <div data-totv className="num mt-1 font-display text-[30px] font-extralight tracking-[-0.02em] md:text-[40px]">
            $25.00
          </div>
          <div data-totd className="num mt-0.5 text-[13px]">
            &nbsp;
          </div>
          <div className="mt-1 text-[11px] text-dim">{moves ? `Real price moves since ${shortDate(moves.since)}` : "Prices update every market day"}</div>
          <Link href={buyHref} className="a-btn a-btn--buy a-btn--sm mt-3">
            Buy this basket
          </Link>
        </div>
      </div>
    </section>
  );
}

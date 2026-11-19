"use client";

/**
 * One Explore card: a live liquid-metal sculpture made from the basket's real recipe (weights, style,
 * seed = address) on the shared page canvas, ticker labels on their zones when hovered / focused,
 * name, creator, thesis, real return (or "New"), followers, Buy.
 * The whole card is one link (stretched over the card); Buy is its own link above it.
 */
import Link from "next/link";
import { forwardRef, useMemo, useRef, useState } from "react";
import { useMetalRegion } from "../metal/MetalCanvas";
import { clamp, damp, easeOut, lerp, ss } from "../metal/math";
import { posedDrops, shapeFromRecipe } from "../metal/shape";
import { placeTag, resolveTags, type TagEl } from "../metal/tags";
import { tintCss } from "../metal/palette";
import { shortDate } from "../basket-view";
import type { ExBasket } from "./data";

export function RetValue({ bps, className }: { bps: number | null; className?: string }) {
  if (bps === null) return <span className={`text-mute ${className ?? ""}`}>New</span>;
  const flat = Math.abs(bps) < 5;
  const up = bps >= 0;
  return <span className={`num ${flat ? "text-mute" : up ? "gain" : "loss"} ${className ?? ""}`}>{flat ? "0.0%" : `${up ? "+" : "−"}${(Math.abs(bps) / 100).toFixed(1)}%`}</span>;
}

function CardMetal({ b, i, hover, clip }: { b: ExBasket; i: number; hover: boolean; clip?: () => [number, number, number, number] | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const tagBox = useRef<HTMLDivElement>(null);
  const shape = useMemo(
    () => shapeFromRecipe({ weights: b.tickers.map((t, k) => ({ ticker: t, w: b.weights[k] })), style: b.style, seed: b.address.toLowerCase() }),
    [b.address, b.tickers, b.weights, b.style],
  );
  const s = useRef({ h: 0, ph: i * 1.7, born: -1 });
  const hv = useRef(hover);
  hv.current = hover;

  const supported = useMetalRegion(
    ref,
    ({ rect, T, dt, mouse, reduced, phone }) => {
      const st = s.current;
      const now = performance.now();
      if (st.born < 0) st.born = now; // assembles the first time it is on screen
      const age = now - st.born;
      const rise = reduced ? 1 : easeOut(clamp(age / 1400));
      const a = reduced ? 1 : easeOut(clamp(age / 900));
      st.h = reduced ? (hv.current ? 1 : 0) : damp(st.h, hv.current ? 1 : 0, 0.015, dt);
      st.ph += dt * (0.35 - st.h * 0.25);
      const t = T + i * 3;
      const posed = posedDrops(shape, { ang: Math.sin(st.ph) * 0.55, sep: lerp(0.35, 0, rise) + st.h * 0.28 + (1 - a) * 0.3, rs: (1 + st.h * 0.03) * lerp(0.85, 1, rise), t });
      const cam = { ro: [mouse[0] * 0.25 * st.h, 0.3 + mouse[1] * 0.15 * st.h, phone ? 4.5 : 4.3] as [number, number, number], ta: [0, 0.1, 0] as [number, number, number], tan: 0.42 };
      // labels: the five biggest front-facing zones, only while hovered
      const box = tagBox.current;
      if (box) {
        const tags = [...box.children] as TagEl[];
        const top = posed.anchors
          .map((d, k) => [d, k] as const)
          .filter(([d]) => d.front > -0.15)
          .sort((x, y) => y[0].w - x[0].w)
          .slice(0, 5)
          .map(([, k]) => k);
        posed.anchors.forEach((d, k) => {
          const tg = tags[k];
          if (!tg) return;
          placeTag(tg, cam, d, posed.ctr, rect.width, rect.height, top.includes(k) ? ss(0.25, 1, st.h) * a : 0, 1.5);
          tg._wt = d.w;
        });
        if (st.h > 0.02) resolveTags(tags, rect.width, rect.height);
      }
      return {
        cam,
        drops: posed.drops,
        o: { t, zone: posed.zone, alpha: a, zt: 0.5 + st.h * 0.14, shim: st.h * 0.6, shimPos: lerp(-2.4, 2.4, (T * 0.25 + i * 0.3) % 1) },
      };
    },
    clip,
  );

  return (
    <div ref={ref} className="a-sculpt h-[240px] md:h-[290px]" aria-hidden>
      {supported === false && <span className="a-metal-fallback" />}
      <div ref={tagBox} className="absolute inset-0 overflow-visible">
        {b.tickers.map((t, k) => (
          <div key={t} className="a-tag">
            <b>{t}</b>
            <span className="v num">{Math.round(b.weights[k] * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const ExploreCard = forwardRef<HTMLElement, { b: ExBasket; i: number; clip?: () => [number, number, number, number] | null; dimRet?: boolean }>(function ExploreCard(
  { b, i, clip, dimRet },
  fwd,
) {
  const [hover, setHover] = useState(false);
  const mix = b.tickers.map((t, k) => ({ t, w: b.weights[k] })).sort((x, y) => y.w - x.w);
  return (
    <article
      ref={fwd}
      data-ex-card
      className="a-ex-card"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <div className="relative">
        <CardMetal b={b} i={i} hover={hover} clip={clip} />
        <span className="absolute left-4 top-4 inline-flex h-[26px] items-center gap-[7px] rounded-full border border-line bg-black/35 px-[11px] text-[11.5px] text-mute">
          <i className="h-[5px] w-[5px] rounded-full bg-mute" />
          {b.styleLabel}
        </span>
        <span className="num absolute right-5 top-[21px] text-[11.5px] tracking-[0.04em] text-dim">
          {b.tickers.length} {b.tickers.length === 1 ? "stock" : "stocks"}
        </span>
      </div>
      <div className="px-[18px] pt-[18px] md:px-[22px] md:pt-5">
        <h3 className="font-display text-[22px] font-light tracking-[-0.012em]">
          <Link href={`/b/${b.address}`} className="text-ink no-underline outline-none after:absolute after:inset-0 after:z-[1] after:rounded-[24px] focus-visible:after:ring-1 focus-visible:after:ring-[var(--line2)]">
            {b.name}
          </Link>
        </h3>
        <div className="mt-1 text-[12.5px] text-mute">
          by <b className="font-medium text-ink">@{b.handle}</b>
        </div>
        <p className="mt-3 line-clamp-2 min-h-[42px] max-w-[34ch] text-[13.5px] text-mute">{b.thesis}</p>
        {/* phone + no-hover devices: the recipe in words (hover labels need a pointer) */}
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] tracking-[0.04em] text-mute [@media(hover:hover)]:hidden">
          {mix.slice(0, 4).map((m) => (
            <span key={m.t} className="flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full" style={{ background: tintCss(m.t) }} />
              {m.t} <span className="num">{Math.round(m.w * 100)}%</span>
            </span>
          ))}
          {mix.length > 4 && <span>+{mix.length - 4}</span>}
        </div>
      </div>
      <div className="mt-5 flex items-end gap-5 border-t border-line px-[18px] pb-[18px] pt-[14px] md:gap-7 md:px-[22px] md:pb-5 md:pt-4">
        <div className={`a-stat transition-opacity duration-500 ${dimRet ? "opacity-60" : ""}`}>
          <small>{b.ret.label}</small>
          <RetValue bps={b.ret.bps} className="text-[21px] md:text-[24px]" />
        </div>
        {b.followers > 0 ? (
          <div className="a-stat">
            <small>Followers</small>
            <span className="num text-[21px] text-mute md:text-[24px]">{b.followers.toLocaleString("en-US")}</span>
          </div>
        ) : (
          <div className="a-stat">
            <small>Started</small>
            <span className="num text-[21px] text-mute md:text-[24px]">{shortDate(b.createdAt)}</span>
          </div>
        )}
        <Link href={`/b/${b.address}?buy=25`} className="a-btn a-btn--buy a-btn--sm relative z-[2] ml-auto self-center">
          Buy from $5
        </Link>
      </div>
    </article>
  );
});

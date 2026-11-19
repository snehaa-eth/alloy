/**
 * Small helpers shared by the basket page's metal stages (hero, "when one wins", history replay):
 * pose a form for arbitrary live weights and keep the DOM ticker tags next to their zones.
 * Uses the metal module's public API only (shapeFromRecipe / posedDrops / placeTag / resolveTags).
 */
import type { Cam } from "../metal/math";
import { posedDrops, shapeFromRecipe, type BasketStyle, type Posed } from "../metal/shape";
import { placeTag, resolveTags, type TagEl } from "../metal/tags";

export type FormOpts = { ang?: number; sep?: number; rs?: number; t?: number; bob?: number };

/** Form for `weights` (same order as tickers). All-zero weights pose an even form (callers shrink it via rs). */
export function formAt(tickers: string[], weights: number[], style: BasketStyle, seed: string, o: FormOpts): Posed {
  const tot = weights.reduce((a, b) => a + Math.max(0, b), 0);
  const ws = tot > 0.001 ? weights : weights.map(() => 1);
  return posedDrops(shapeFromRecipe({ weights: tickers.map((t, i) => ({ ticker: t, w: ws[i] ?? 0 })), style, seed }), o);
}

export const camAt = (z: number, y: number, ty: number, mx = 0, my = 0): Cam => ({ ro: [mx, y + my, z], ta: [0, ty, 0], tan: 0.42 });

export type TagSpec = { op: number; v: string; color?: string; wt?: number };

/** Place each `.a-tag` child of `box` on its stock's zone; `spec(i)` gives opacity + value text. */
export function syncTags(
  box: HTMLElement | null,
  posed: Posed,
  cam: Cam,
  rect: DOMRect,
  spec: (i: number) => TagSpec,
  opts: { push?: number; top?: number; bottom?: number } = {},
) {
  if (!box) return;
  const tags = [...box.children] as TagEl[];
  posed.anchors.forEach((d, i) => {
    const tg = tags[i];
    if (!tg) return;
    const s = spec(i);
    const v = tg.children[1] as HTMLElement | undefined;
    if (v && v.textContent !== s.v) {
      v.textContent = s.v;
      tg._w = 0; // re-measure
    }
    if (v) v.style.color = s.color ?? "";
    if (s.op <= 0.001) {
      tg.style.opacity = "0";
      tg._op = 0;
      return;
    }
    placeTag(tg, cam, d, posed.ctr, rect.width, rect.height, s.op, opts.push ?? 1.5);
    tg._wt = s.wt ?? d.w;
  });
  resolveTags(tags, rect.width, rect.height, { top: opts.top, bottom: opts.bottom });
}

export const pctTxt = (f: number) => `${f >= 0 ? "+" : "−"}${Math.abs(f * 100).toFixed(1)}%`;

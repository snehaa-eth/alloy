/** One recipe per basket, the same everywhere (landing, shelf, activity, creator): target weights, live style, address seed. */
import type { BasketView } from "../basket-view";
import type { Recipe } from "../metal/shape";
import { styleOf } from "../styles";

export function recipeOfView(v: BasketView): Recipe {
  const b = v.basket;
  const sum = b.components.reduce((a, c) => a + c.targetBps, 0) || 1;
  return { weights: b.components.map((c) => ({ ticker: c.stock.ticker, w: c.targetBps / sum })), style: styleOf(b), seed: b.address.toLowerCase() };
}

/** Recipe with explicit weights (bps, same order as the basket's components). */
export function recipeWith(v: BasketView, weightsBps: number[]): Recipe {
  const r = recipeOfView(v);
  const sum = weightsBps.reduce((a, x) => a + x, 0) || 1;
  return { ...r, weights: r.weights.map((x, i) => ({ ticker: x.ticker, w: (weightsBps[i] ?? 0) / sum })) };
}

/** "+1.2%" / "−0.3%" / "0.0%" from bps (display only). */
export function pctText(bps: number, digits = 1): string {
  if (Math.abs(bps) < 10 ** (2 - digits) / 2) return `${(0).toFixed(digits)}%`;
  return `${bps >= 0 ? "+" : "−"}${(Math.abs(bps) / 100).toFixed(digits)}%`;
}

export const signCls = (bps: number | null | undefined) => (bps == null || Math.abs(bps) < 1 ? "text-mute" : bps > 0 ? "gain" : "loss");

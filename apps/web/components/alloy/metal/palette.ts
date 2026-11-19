/**
 * Fixed colour per ticker, everywhere (ported from the designer's core.js: [hue°, saturation] → rgb at v = 1).
 * Unknown tickers hash to a hue. Shader tints are 0..1 RGB.
 */
import { hashSeed } from "./math";

export type RGB = [number, number, number];

const hsv = (h: number, sa: number): RGB => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return 1 - sa * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5), f(3), f(1)];
};

/** [hue, saturation, name] */
export const PAL: Record<string, [number, number, string]> = {
  NVDA: [100, 0.72, "NVIDIA"],
  MSFT: [212, 0.68, "Microsoft"],
  GOOGL: [44, 0.58, "Alphabet"],
  AMZN: [27, 0.78, "Amazon"],
  AAPL: [262, 0.34, "Apple"],
  TSLA: [0, 0.66, "Tesla"],
  META: [191, 0.66, "Meta"],
  AMD: [334, 0.62, "AMD"],
  AVGO: [284, 0.52, "Broadcom"],
  TSM: [166, 0.58, "TSMC"],
  ORCL: [12, 0.46, "Oracle"],
  NFLX: [352, 0.82, "Netflix"],
  COST: [226, 0.42, "Costco"],
  KO: [4, 0.82, "Coca-Cola"],
  MCD: [52, 0.8, "McDonald’s"],
  NKE: [0, 0, "Nike"],
  NEE: [138, 0.6, "NextEra"],
  FSLR: [200, 0.4, "First Solar"],
  ENPH: [36, 0.55, "Enphase"],
  PG: [240, 0.5, "P&G"],
};

const cache = new Map<string, RGB>();

/** Canonical ticker: token symbols carry a "c" suffix on testnet (NVDAc → NVDA). */
const canon = (t: string) => {
  const T = t.toUpperCase();
  return PAL[T] ? T : PAL[T.replace(/C$/, "")] ? T.replace(/C$/, "") : T;
};

export function tintFor(ticker: string): RGB {
  const T = canon(ticker);
  let c = cache.get(T);
  if (!c) {
    const p = PAL[T] ?? [hashSeed(T) % 360, 0.6, T];
    c = hsv(p[0], p[1]);
    cache.set(T, c);
  }
  return c;
}

/** CSS colour for a legend dot (tint lifted toward white: .7·c + .3, as the designer's A.dot). */
export function tintCss(ticker: string): string {
  const c = tintFor(ticker).map((v) => Math.round((0.7 * v + 0.3) * 255));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

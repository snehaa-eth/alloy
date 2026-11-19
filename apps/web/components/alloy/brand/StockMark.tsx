/**
 * A company's mark (brand/stockMarks: simple-icons paths, Microsoft drawn) on a round chip in its brand colour.
 * Light brand colours get a dark mark so it always reads. Returns null when we have no mark (caller falls back).
 */
import { MSFT_SQUARES, STOCK_MARKS, canonTicker } from "./stockMarks";

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

/** The bare mark (no chip), sized to fill `size` px. */
export function StockMarkSvg({ ticker, size, color }: { ticker: string; size: number; color?: string }) {
  const k = canonTicker(ticker);
  if (k === "MSFT")
    return (
      <svg viewBox="0 0 23 23" width={size} height={size} aria-hidden>
        {MSFT_SQUARES.map(([x, y, c]) => (
          <rect key={c} x={x} y={y} width="10" height="10" fill={color ?? c} />
        ))}
      </svg>
    );
  const m = STOCK_MARKS[k];
  if (!m) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d={m.d} fill={color ?? m.hex} />
    </svg>
  );
}

/** Round chip with the mark; `px` = chip size. null when the ticker has no mark. */
export function StockMarkChip({ ticker, px, className }: { ticker: string; px: number; className?: string }) {
  const k = canonTicker(ticker);
  if (k === "MSFT")
    return (
      <span className={className} style={{ background: "#fff" }} aria-hidden>
        <StockMarkSvg ticker={k} size={Math.round(px * 0.56)} />
      </span>
    );
  const m = STOCK_MARKS[k];
  if (!m) return null;
  const light = lum(m.hex) > 0.45;
  // near-black brands (Apple, Nike, Uber…) would vanish on the dark UI: white chip, mark in its own colour
  const dark = lum(m.hex) < 0.02;
  return (
    <span className={className} style={{ background: dark ? "#fff" : m.hex }} aria-hidden>
      <StockMarkSvg ticker={k} size={Math.round(px * 0.56)} color={dark ? m.hex : light ? "#0C0A0A" : "#fff"} />
    </span>
  );
}

/**
 * Inline stock marker for lists (recipe rows, buy split, explore recipe): the company mark chip when we have one,
 * otherwise the ticker's metal tint dot (so unknown tickers still match their zone on the metal).
 */
export function TickerMark({ ticker, px = 16, tint }: { ticker: string; px?: number; tint: string }) {
  const chip = StockMarkChip({ ticker, px, className: "inline-flex h-full w-full flex-none items-center justify-center rounded-full" });
  if (chip) return <span className="inline-flex flex-none" style={{ width: px, height: px }}>{chip}</span>;
  const d = Math.max(6, Math.round(px * 0.4));
  return <span aria-hidden className="inline-flex flex-none items-center justify-center" style={{ width: px, height: px }}><i className="block rounded-full" style={{ width: d, height: d, background: tint }} /></span>;
}

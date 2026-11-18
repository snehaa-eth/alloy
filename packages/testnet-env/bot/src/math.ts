/**
 * Uniswap v3 price math for stock (8 dec) / USDC (6 dec) pools priced by 8-dec feeds.
 * price (token1 raw per token0 raw):
 *   stock is token0: answer * 10^usdcDec / 10^(feedDec + stockDec)
 *   stock is token1: the inverse
 * sqrtPriceX96 = sqrt(price * 2^192). Mirrors src/lib/PriceMath.sol.
 */
export const Q96 = 1n << 96n;
export const Q192 = 1n << 192n;
export const FEED_DEC = 8;
export const STOCK_DEC = 8;
export const USDC_DEC = 6;

const SCALE = 10n ** BigInt(FEED_DEC + STOCK_DEC);
const USDC_SCALE = 10n ** BigInt(USDC_DEC);

export function bigintSqrt(x: bigint): bigint {
  if (x < 0n) throw new Error("sqrt of negative");
  if (x < 2n) return x;
  let z = 1n << ((BigInt(x.toString(2).length) + 1n) >> 1n); // >= sqrt(x)
  let y = (x / z + z) >> 1n;
  while (y < z) {
    z = y;
    y = (x / y + y) >> 1n;
  }
  return z;
}

export function sqrtPriceX96FromAnswer(answer: bigint, stockIsToken0: boolean): bigint {
  if (answer <= 0n) throw new Error("answer must be > 0");
  const num = answer * USDC_SCALE;
  return bigintSqrt(stockIsToken0 ? (num * Q192) / SCALE : (SCALE * Q192) / num);
}

/** Feed-style 8-dec USD answer implied by a pool sqrtPriceX96. */
export function answerFromSqrtPriceX96(sqrtPriceX96: bigint, stockIsToken0: boolean): bigint {
  const sq = sqrtPriceX96 * sqrtPriceX96; // price * 2^192
  return stockIsToken0 ? (sq * SCALE) / (USDC_SCALE * Q192) : (SCALE * Q192) / (sq * USDC_SCALE);
}

/** |a-b| / b in bps (b = reference), 2-decimal precision. */
export function deviationBps(a: bigint, b: bigint): number {
  if (b === 0n) return Number.POSITIVE_INFINITY;
  const d = a > b ? a - b : b - a;
  return Number((d * 1_000_000n) / b) / 100;
}

export interface SwapPlan {
  zeroForOne: boolean;
  /** Gross amountIn (fee included, +0.1% margin) needed to move in-range liquidity from current to target. */
  amountIn: bigint;
  sqrtPriceLimitX96: bigint;
}

const divUp = (a: bigint, b: bigint) => (a + b - 1n) / b;

/**
 * Exact input needed to move price from sqrtCurrent to sqrtTarget assuming constant in-range liquidity L
 * (true while no initialized tick is crossed; our seeded position is one wide range). The swap is sent with
 * sqrtPriceLimitX96 = target, so any over-estimate is simply not consumed (v3 exactInput fills partially).
 */
export function planSwapToTarget(
  sqrtCurrent: bigint,
  sqrtTarget: bigint,
  liquidity: bigint,
  feePips: number,
): SwapPlan | null {
  if (sqrtCurrent === sqrtTarget) return null;
  const zeroForOne = sqrtTarget < sqrtCurrent; // selling token0 pushes price (token1/token0) down
  const net = zeroForOne
    ? divUp(divUp(liquidity * Q96 * (sqrtCurrent - sqrtTarget), sqrtCurrent), sqrtTarget) // dx = L(1/st - 1/sc)
    : divUp(liquidity * (sqrtTarget - sqrtCurrent), Q96); // dy = L(st - sc)
  const gross = divUp(net * 1_000_000n, 1_000_000n - BigInt(feePips));
  return { zeroForOne, amountIn: gross + gross / 1000n + 1n, sqrtPriceLimitX96: sqrtTarget };
}

/** Parse "+20%", "-5%", "x1.5", "123.45" into a new 8-dec answer. */
export function applyChange(current: bigint, spec: string): bigint {
  const s = spec.trim();
  const pct = /^([+-]?\d+(?:\.\d+)?)%$/.exec(s);
  if (pct) {
    const bps = BigInt(Math.round(Number(pct[1]) * 100));
    const next = (current * (10_000n + bps)) / 10_000n;
    if (next <= 0n) throw new Error(`change ${spec} would make price <= 0`);
    return next;
  }
  const mul = /^x(\d+(?:\.\d+)?)$/i.exec(s);
  if (mul) return (current * BigInt(Math.round(Number(mul[1]) * 1e6))) / 1_000_000n;
  const abs = /^\$?(\d+(?:\.\d+)?)$/.exec(s);
  if (abs) return usdToAnswer(abs[1]!);
  throw new Error(`cannot parse price change "${spec}" (use +20%, -5%, x1.5 or 123.45)`);
}

/** "152.13559575" -> 15213559575n (8 dec), exact decimal parsing (no float error). */
export function usdToAnswer(usd: string | number): bigint {
  const str = typeof usd === "number" ? usd.toFixed(8) : usd;
  const [i, f = ""] = str.split(".");
  return BigInt(i!) * 10n ** 8n + BigInt((f + "00000000").slice(0, 8));
}

export function fmtUsd(answer: bigint): string {
  const neg = answer < 0n;
  const a = neg ? -answer : answer;
  return `${neg ? "-" : ""}$${a / 10n ** 8n}.${(a % 10n ** 8n).toString().padStart(8, "0").slice(0, 4)}`;
}

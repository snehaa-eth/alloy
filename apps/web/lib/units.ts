/**
 * Pure bigint money math for Alloy (ARCHITECTURE.md §4 "Frontend rules").
 *
 * Never use `Number` for amounts. Units:
 *   USDC   = 6 decimals   (usd6)
 *   B20    = 8 decimals   (raw balance; never apply uiMultiplier again)
 *   price  = 8 decimals   (Chainlink: underlying price x multiplier per raw token)
 *   shares = 18 decimals  (basket ERC-20)
 *
 * value(usd6) = bal8 * px8 / 1e10
 *
 * Basis points (bps) are small integers (contract uint16), so they are plain
 * `number`s, but always validated as safe integers.
 *
 * TODO(sdk): move to packages/sdk/units.ts once the shared package exists.
 */
import { formatUnits, parseUnits } from "viem";

export const USDC_DECIMALS = 6;
export const B20_DECIMALS = 8;
export const PRICE_DECIMALS = 8;
export const SHARE_DECIMALS = 18;

export const BPS_DENOMINATOR = 10_000;
const BPS = 10_000n;
const ONE_SHARE = 10n ** 18n;
/** bal8 * px8 has 16 decimals; USDC has 6 -> divide by 1e10. */
const VALUE_DIVISOR = 10n ** 10n;

export const MAX_COMPONENTS = 10;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function assertNonNegative(name: string, v: bigint): void {
  if (v < 0n) throw new RangeError(`${name} must be >= 0, got ${v}`);
}

function assertBps(name: string, bps: number): void {
  if (!Number.isSafeInteger(bps) || bps < 0 || bps > BPS_DENOMINATOR) {
    throw new RangeError(`${name} must be an integer in [0, 10000], got ${bps}`);
  }
}

/** floor(a * b / d) */
export function mulDiv(a: bigint, b: bigint, d: bigint): bigint {
  if (d === 0n) throw new RangeError("mulDiv: division by zero");
  assertNonNegative("a", a);
  assertNonNegative("b", b);
  return (a * b) / d;
}

/** ceil(a * b / d) */
export function mulDivUp(a: bigint, b: bigint, d: bigint): bigint {
  if (d === 0n) throw new RangeError("mulDivUp: division by zero");
  assertNonNegative("a", a);
  assertNonNegative("b", b);
  const p = a * b;
  return p === 0n ? 0n : (p - 1n) / d + 1n;
}

// ---------------------------------------------------------------------------
// Valuation
// ---------------------------------------------------------------------------

/** USDC (6dp) value of a raw B20 balance (8dp) at a Chainlink price (8dp). Rounds down. */
export function valueUsd6(bal8: bigint, px8: bigint): bigint {
  return mulDiv(bal8, px8, VALUE_DIVISOR);
}

export type PricedBalance = { balance: bigint; price: bigint };

/**
 * Basket NAV in usd6 = sum(bal_i * px_i) / 1e10.
 * Sums at full precision before dividing (one rounding instead of N).
 */
export function navUsd6(components: readonly PricedBalance[]): bigint {
  let acc = 0n;
  for (const c of components) {
    assertNonNegative("balance", c.balance);
    assertNonNegative("price", c.price);
    acc += c.balance * c.price;
  }
  return acc / VALUE_DIVISOR;
}

/** usd6 value of exactly one whole share (1e18 units). 0 when supply is 0. */
export function navPerShareUsd6(nav: bigint, totalSupply: bigint): bigint {
  if (totalSupply === 0n) return 0n;
  return mulDiv(nav, ONE_SHARE, totalSupply);
}

/** usd6 value of `shares` (18dp). Rounds down (conservative for display/sell quotes). */
export function sharesToUsd6(shares: bigint, nav: bigint, totalSupply: bigint): bigint {
  if (totalSupply === 0n) return 0n;
  return mulDiv(shares, nav, totalSupply);
}

/** Shares (18dp) that `usd6` buys at the current NAV. Rounds down (never over-promise). */
export function usd6ToShares(usd6: bigint, nav: bigint, totalSupply: bigint): bigint {
  if (nav === 0n || totalSupply === 0n) return 0n;
  return mulDiv(usd6, totalSupply, nav);
}

/** In-kind amounts paid by `redeem(shares)`: floor(bal_i * shares / ts), per component. */
export function redeemAmounts(
  balances: readonly bigint[],
  shares: bigint,
  totalSupply: bigint,
): bigint[] {
  if (shares > totalSupply) throw new RangeError("shares exceed totalSupply");
  if (totalSupply === 0n) return balances.map(() => 0n);
  return balances.map((b) => mulDiv(b, shares, totalSupply));
}

/** Amounts pulled by `issue(shares)`: ceil(bal_i * shares / ts), per component. */
export function issueAmounts(
  balances: readonly bigint[],
  shares: bigint,
  totalSupply: bigint,
): bigint[] {
  if (totalSupply === 0n) throw new RangeError("cannot issue against empty basket");
  return balances.map((b) => mulDivUp(b, shares, totalSupply));
}

// ---------------------------------------------------------------------------
// Slippage
// ---------------------------------------------------------------------------

/** Minimum acceptable output: floor(amount * (1 - bps)). */
export function minOutWithSlippage(amount: bigint, slippageBps: number): bigint {
  assertBps("slippageBps", slippageBps);
  return mulDiv(amount, BPS - BigInt(slippageBps), BPS);
}

/** Maximum acceptable input: ceil(amount * (1 + bps)). */
export function maxInWithSlippage(amount: bigint, slippageBps: number): bigint {
  assertBps("slippageBps", slippageBps);
  return mulDivUp(amount, BPS + BigInt(slippageBps), BPS);
}

// ---------------------------------------------------------------------------
// Weights (integer bps summing to exactly 10_000)
// ---------------------------------------------------------------------------

/**
 * Convert non-negative magnitudes (e.g. usd6 values) into integer bps that sum to
 * exactly 10_000, using the largest-remainder method. Ties go to the lower index,
 * so the result is deterministic.
 */
export function toWeightsBps(values: readonly bigint[]): number[] {
  if (values.length === 0) return [];
  let total = 0n;
  for (const v of values) {
    assertNonNegative("value", v);
    total += v;
  }
  if (total === 0n) throw new RangeError("toWeightsBps: total is zero");

  const floors: bigint[] = [];
  const rems: bigint[] = [];
  let assigned = 0n;
  for (const v of values) {
    const scaled = v * BPS;
    const f = scaled / total;
    floors.push(f);
    rems.push(scaled % total);
    assigned += f;
  }
  let leftover = Number(BPS - assigned); // < values.length, safe
  const order = values
    .map((_, i) => i)
    .sort((a, b) => (rems[b] === rems[a] ? a - b : rems[b] > rems[a] ? 1 : -1));
  const out = floors.map((f) => Number(f));
  for (const i of order) {
    if (leftover === 0) break;
    out[i] += 1;
    leftover -= 1;
  }
  return out;
}

/** Equal split of 10_000 across n components; remainder goes to the first ones. */
export function equalWeightsBps(n: number): number[] {
  if (!Number.isSafeInteger(n) || n <= 0) return [];
  return toWeightsBps(Array.from({ length: n }, () => 1n));
}

export type WeightsValidation = { ok: true } | { ok: false; errors: string[] };

/** Rules the Basket contract enforces: 1..10 comps, each > 0, integer, sum == 10_000. */
export function validateWeightsBps(weights: readonly number[]): WeightsValidation {
  const errors: string[] = [];
  if (weights.length === 0) errors.push("Pick at least one stock.");
  if (weights.length > MAX_COMPONENTS) errors.push(`At most ${MAX_COMPONENTS} stocks per basket.`);
  let sum = 0;
  weights.forEach((w, i) => {
    if (!Number.isSafeInteger(w)) errors.push(`Weight #${i + 1} must be a whole number of bps.`);
    else if (w <= 0) errors.push(`Weight #${i + 1} must be greater than 0.`);
    else if (w > BPS_DENOMINATOR) errors.push(`Weight #${i + 1} exceeds 100%.`);
    sum += Number.isFinite(w) ? w : 0;
  });
  if (weights.length > 0 && sum !== BPS_DENOMINATOR) {
    errors.push(`Weights must add up to 100.00% (now ${formatBps(sum)}).`);
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

/** Split `amount` by bps weights; the rounding remainder goes to the largest weight. */
export function splitByBps(amount: bigint, weights: readonly number[]): bigint[] {
  assertNonNegative("amount", amount);
  const v = validateWeightsBps(weights);
  if (!v.ok) throw new RangeError(v.errors.join(" "));
  const parts = weights.map((w) => mulDiv(amount, BigInt(w), BPS));
  const rest = amount - parts.reduce((a, b) => a + b, 0n);
  let maxI = 0;
  weights.forEach((w, i) => {
    if (w > weights[maxI]) maxI = i;
  });
  parts[maxI] += rest;
  return parts;
}

/** Parse a user-typed percentage ("33.33") into integer bps (3333). Throws on >2dp. */
export function percentToBps(input: string): number {
  const s = input.trim();
  if (!/^\d{1,3}(\.\d{0,2})?$/.test(s)) throw new RangeError(`Invalid percentage: "${input}"`);
  const bps = Number(parseUnits(s.endsWith(".") ? s.slice(0, -1) : s, 2));
  assertBps("percent", bps);
  return bps;
}

/** 3333 -> "33.33%" */
export function formatBps(bps: number): string {
  const sign = bps < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(bps));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}%`;
}

// ---------------------------------------------------------------------------
// Partial sell
// ---------------------------------------------------------------------------

/**
 * Shares to sell for "sell X%". 100% returns the exact balance (no dust left behind);
 * anything else rounds down.
 */
export function sharesForPercent(balance: bigint, pctBps: number): bigint {
  assertNonNegative("balance", balance);
  assertBps("pctBps", pctBps);
  if (pctBps === BPS_DENOMINATOR) return balance;
  return mulDiv(balance, BigInt(pctBps), BPS);
}

// ---------------------------------------------------------------------------
// PnL
// ---------------------------------------------------------------------------

/** Profit (usd6, may be negative) and return in bps (rounded toward zero). */
export function pnl(currentUsd6: bigint, costUsd6: bigint): { usd6: bigint; bps: number } {
  const usd6 = currentUsd6 - costUsd6;
  const bps = costUsd6 === 0n ? 0 : Number((usd6 * BPS) / costUsd6);
  return { usd6, bps };
}

// ---------------------------------------------------------------------------
// Parsing / formatting (string-based, no float math)
// ---------------------------------------------------------------------------

export function parseUsdc(input: string): bigint {
  const s = input.trim().replace(/,/g, "");
  if (!/^\d+(\.\d*)?$/.test(s)) throw new RangeError(`Invalid USDC amount: "${input}"`);
  const [, frac = ""] = s.split(".");
  if (frac.length > USDC_DECIMALS) throw new RangeError("USDC has at most 6 decimals");
  return parseUnits(s.endsWith(".") ? s.slice(0, -1) : s, USDC_DECIMALS);
}

export function parseShares(input: string): bigint {
  return parseUnits(input.trim(), SHARE_DECIMALS);
}

function groupThousands(int: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Truncating fixed-point formatter: formatFixed(123456789n, 6, 2) -> "123.45" */
export function formatFixed(value: bigint, decimals: number, maxFrac: number): string {
  const neg = value < 0n;
  const s = formatUnits(neg ? -value : value, decimals);
  const [int, frac = ""] = s.split(".");
  const f = frac.slice(0, maxFrac).padEnd(maxFrac, "0");
  const body = maxFrac > 0 ? `${groupThousands(int)}.${f}` : groupThousands(int);
  return neg ? `-${body}` : body;
}

/** usd6 -> "$1,234.56" (truncates, never rounds up). */
export function formatUsd6(usd6: bigint, maxFrac = 2): string {
  const neg = usd6 < 0n;
  const body = formatFixed(neg ? -usd6 : usd6, USDC_DECIMALS, maxFrac);
  return `${neg ? "-" : ""}$${body}`;
}

export function formatShares(shares: bigint, maxFrac = 4): string {
  return formatFixed(shares, SHARE_DECIMALS, maxFrac);
}

export function formatB20(bal8: bigint, maxFrac = 4): string {
  return formatFixed(bal8, B20_DECIMALS, maxFrac);
}

export function formatPrice8(px8: bigint): string {
  return `$${formatFixed(px8, PRICE_DECIMALS, 2)}`;
}

/** Compact for charts/labels only (lossy display, never for math). */
export function usd6ToChartNumber(usd6: bigint): number {
  return Number(formatUnits(usd6, USDC_DECIMALS));
}

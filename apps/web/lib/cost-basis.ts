/**
 * Per-browser cost basis (net USDC put into a basket), so the UI can show PnL without an indexer.
 * Updated after confirmed buys/sells. Best-effort: storage may be unavailable (private mode).
 * Values are stored as decimal strings (bigint-safe).
 */
import type { Address } from "./types";

const key = (chainId: number, user: Address, basket: Address) =>
  `alloy:cost:${chainId}:${user.toLowerCase()}:${basket.toLowerCase()}`;

export function getCostBasis(chainId: number, user: Address, basket: Address): bigint | null {
  try {
    const v = globalThis.localStorage?.getItem(key(chainId, user, basket));
    return v ? BigInt(v) : null;
  } catch {
    return null;
  }
}

function set(chainId: number, user: Address, basket: Address, v: bigint) {
  try {
    globalThis.localStorage?.setItem(key(chainId, user, basket), (v < 0n ? 0n : v).toString());
  } catch {
    /* ignore */
  }
}

export function recordBuy(chainId: number, user: Address, basket: Address, usdcIn: bigint, refundUsd6 = 0n) {
  set(chainId, user, basket, (getCostBasis(chainId, user, basket) ?? 0n) + usdcIn - refundUsd6);
}

/** Selling/withdrawing `shares` of `balanceBefore` removes that fraction of the cost basis. */
export function recordExit(chainId: number, user: Address, basket: Address, shares: bigint, balanceBefore: bigint) {
  const cost = getCostBasis(chainId, user, basket);
  if (cost == null || balanceBefore === 0n) return;
  set(chainId, user, basket, cost - (cost * shares) / balanceBefore);
}

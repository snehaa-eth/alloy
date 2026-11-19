"use client";

/** The viewer's positions across baskets (lib usePortfolio + local cost basis), honouring preview mode. */
import type { Address } from "viem";
import { usePortfolio } from "@/lib/hooks/use-reads";
import { getCostBasis } from "@/lib/cost-basis";
import { DEFAULT_CHAIN_ID } from "@/lib/chains";
import { useAccount } from "./hooks";

export type Held = { shares: bigint; costUsd6: bigint | null };

export function usePositions(baskets: { address: Address; totalSupply: bigint }[]) {
  const acct = useAccount();
  const q = usePortfolio();
  const map: Record<string, Held> = {};

  if (acct.preview) {
    // Preview (dev only): hold 5% of the first two baskets so holder screens can be reviewed.
    baskets.slice(0, 2).forEach((b) => {
      const shares = b.totalSupply / 20n;
      if (shares > 0n) map[b.address] = { shares, costUsd6: null };
    });
    return { map, ready: true };
  }
  for (const p of q.data ?? []) {
    const key = baskets.find((b) => b.address.toLowerCase() === p.basket.toLowerCase())?.address ?? p.basket;
    map[key] = { shares: p.shares, costUsd6: acct.address ? getCostBasis(DEFAULT_CHAIN_ID, acct.address, p.basket) : null };
  }
  return { map, ready: !acct.signedIn || q.isFetched || q.isError };
}

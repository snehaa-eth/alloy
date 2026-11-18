/**
 * Query-key factory. Keys never contain bigint (TanStack hashes keys with
 * JSON.stringify), so amounts are stringified.
 */
import type { Address } from "@/lib/types";

const lc = (a: string) => a.toLowerCase();

export const qk = {
  stocks: () => ["stocks"] as const,
  baskets: {
    all: () => ["baskets"] as const,
    list: (sort: string = "aum") => ["baskets", "list", sort] as const,
    detail: (a: Address) => ["baskets", "detail", lc(a)] as const,
    performance: (a: Address) => ["baskets", "detail", lc(a), "performance"] as const,
    rebalances: (a: Address) => ["baskets", "detail", lc(a), "rebalances"] as const,
  },
  quote: (a: Address, side: "buy" | "sell", amount: bigint) =>
    ["quote", lc(a), side, amount.toString()] as const,
  creator: (a: Address) => ["creator", lc(a)] as const,
  portfolio: (user: Address, chainId: number) => ["portfolio", chainId, lc(user)] as const,
  /** On-chain reads (balances/allowances) for a user, invalidated after every write. */
  onchain: (user: Address, chainId: number) => ["onchain", chainId, lc(user)] as const,
};

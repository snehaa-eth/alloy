"use client";

/** Client-side live reads (TanStack Query). All keyed under qk.onchain(user) so writes invalidate them. */
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { getQuote } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/query-keys";
import { DEFAULT_CHAIN_ID } from "@/lib/chains";
import { isDeployed } from "@/lib/contracts";
import { readBasket, readFaucetStatus, readOwed, readPriceHistory, readUserPositions, readBasketAddresses } from "@/lib/onchain";
import type { QuoteSide } from "@/lib/quote";
import { useWallet } from "./use-wallet";

const CHAIN = DEFAULT_CHAIN_ID;

/**
 * Live quote, refreshed every 15s. Disabled for amount <= 0.
 * `data.legs[i].minOut` / `data.minResult` already include slippage.
 */
export function useQuote(basket: Address | undefined, side: QuoteSide, amount: bigint | null | undefined, slippageBps: number) {
  return useQuery({
    queryKey: [...qk.quote(basket ?? "0x", side, amount ?? 0n), slippageBps],
    queryFn: () => getQuote({ chainId: CHAIN, basket: basket!, side, amount: amount!, slippageBps }),
    enabled: !!basket && !!amount && amount > 0n && isDeployed(CHAIN),
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 1,
  });
}

/** Faucet cooldown + the user's tUSDC and ETH (gas) balances. */
export function useFaucetStatus() {
  const { address } = useWallet();
  return useQuery({
    queryKey: [...qk.onchain(address ?? "0x", CHAIN), "faucet"],
    queryFn: () => readFaucetStatus(address!, CHAIN),
    enabled: !!address && isDeployed(CHAIN),
    refetchInterval: 30_000,
  });
}

/** tUSDC balance (6dp). */
export function useUsdcBalance() {
  const q = useFaucetStatus();
  return { ...q, data: q.data?.usdcBalance };
}

/** Positions across all baskets (shares + value at navPerShare). */
export function usePortfolio() {
  const { address } = useWallet();
  return useQuery({
    queryKey: qk.portfolio(address ?? "0x", CHAIN),
    queryFn: async () => {
      const baskets = await readBasketAddresses(CHAIN);
      const pos = await readUserPositions(address!, baskets, CHAIN);
      return pos.filter((p) => p.shares > 0n);
    },
    enabled: !!address && isDeployed(CHAIN),
    refetchInterval: 30_000,
  });
}

/** Stocks a withdraw couldn't deliver (claim with useClaimOwed). */
export function useOwed(basket: Address) {
  const { address } = useWallet();
  return useQuery({
    queryKey: [...qk.onchain(address ?? "0x", CHAIN), "owed", basket.toLowerCase()],
    queryFn: () => readOwed(address!, basket, CHAIN),
    enabled: !!address && isDeployed(CHAIN),
  });
}

/** Live basket state in the browser (e.g. refresh NAV/pending recipe after a write). */
export function useLiveBasket(basket: Address) {
  return useQuery({
    queryKey: qk.baskets.detail(basket),
    queryFn: () => readBasket(basket, { chainId: CHAIN }),
    enabled: isDeployed(CHAIN),
    refetchInterval: 30_000,
  });
}

/** Feed price history (oldest first) for the guilloche / sparkline. */
export function usePriceHistory(feed: Address | undefined, maxRounds = 96) {
  return useQuery({
    queryKey: ["price-history", CHAIN, feed?.toLowerCase(), maxRounds],
    queryFn: () => readPriceHistory(feed!, { chainId: CHAIN, maxRounds }),
    enabled: !!feed,
    staleTime: 60_000,
  });
}

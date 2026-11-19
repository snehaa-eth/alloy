"use client";

import { erc20Abi, type Address } from "viem";
import { useReadContract } from "wagmi";
import { qk } from "@/lib/api/query-keys";
import { DEFAULT_CHAIN_ID } from "@/lib/chains";
import { isDeployed } from "@/lib/contracts";
import { getCostBasis } from "@/lib/cost-basis";
import { MOCK_POSITIONS } from "@/lib/mock/baskets";
import { useWallet } from "./use-wallet";

/**
 * The connected user's basket-token balance (18dp), read on-chain.
 * costUsd6 = net USDC this browser recorded for buys/sells (null if unknown).
 * Returns MOCK data (`mock: true`) only when contracts aren't deployed on the default chain.
 */
export function useBasketPosition(basket: Address): {
  shares: bigint;
  costUsd6: bigint | null;
  mock: boolean;
  loading: boolean;
  refetch: () => void;
} {
  const { address } = useWallet();
  const live = isDeployed(DEFAULT_CHAIN_ID);
  const read = useReadContract({
    chainId: DEFAULT_CHAIN_ID,
    address: basket,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    scopeKey: address ? JSON.stringify(qk.onchain(address, DEFAULT_CHAIN_ID)) : undefined,
    query: { enabled: live && !!address, refetchInterval: 20_000 },
  });
  const refetch = () => void read.refetch();

  if (!address) return { shares: 0n, costUsd6: null, mock: !live, loading: false, refetch };
  if (live) {
    return {
      shares: read.data ?? 0n,
      costUsd6: getCostBasis(DEFAULT_CHAIN_ID, address, basket),
      mock: false,
      loading: read.isLoading,
      refetch,
    };
  }
  const p = MOCK_POSITIONS.find((x) => x.basket.toLowerCase() === basket.toLowerCase());
  return { shares: p?.shares ?? 0n, costUsd6: p?.costUsd6 ?? null, mock: true, loading: false, refetch };
}

"use client";

import { erc20Abi, type Address } from "viem";
import { useReadContract } from "wagmi";
import { DEFAULT_CHAIN_ID } from "@/lib/chains";
import { isDeployed } from "@/lib/contracts";
import { MOCK_POSITIONS } from "@/lib/mock/baskets";
import { useWallet } from "./use-wallet";

/**
 * The connected user's basket-token balance (18dp).
 * Reads balanceOf on-chain once contracts are deployed; until then returns MOCK data
 * (flagged with `mock: true`) so the UI can be exercised.
 */
export function useBasketPosition(basket: Address): { shares: bigint; costUsd6: bigint | null; mock: boolean; loading: boolean } {
  const { address } = useWallet();
  const live = isDeployed(DEFAULT_CHAIN_ID);
  const read = useReadContract({
    chainId: DEFAULT_CHAIN_ID,
    address: basket,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: live && !!address },
  });

  if (!address) return { shares: 0n, costUsd6: null, mock: !live, loading: false };
  if (live) return { shares: read.data ?? 0n, costUsd6: null, mock: false, loading: read.isLoading };

  const p = MOCK_POSITIONS.find((x) => x.basket.toLowerCase() === basket.toLowerCase());
  return { shares: p?.shares ?? 0n, costUsd6: p?.costUsd6 ?? null, mock: true, loading: false };
}

/**
 * Supported chains: Base Sepolia (84532, demo default) and Base (8453).
 * Selected with NEXT_PUBLIC_DEFAULT_CHAIN_ID. No Monad / Sepolia / Mantle.
 */
import { base, baseSepolia } from "viem/chains";
import type { Chain } from "viem";

export const SUPPORTED_CHAINS = [baseSepolia, base] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number]["id"];

export function isSupportedChainId(id: number | undefined): id is SupportedChainId {
  return SUPPORTED_CHAINS.some((c) => c.id === id);
}

function resolveDefaultChain(): Chain {
  const raw = process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID;
  if (!raw) return baseSepolia;
  const id = Number(raw);
  const chain = SUPPORTED_CHAINS.find((c) => c.id === id);
  if (!chain) {
    throw new Error(
      `NEXT_PUBLIC_DEFAULT_CHAIN_ID=${raw} is not supported (use ${baseSepolia.id} or ${base.id})`,
    );
  }
  return chain;
}

export const DEFAULT_CHAIN = resolveDefaultChain();
export const DEFAULT_CHAIN_ID = DEFAULT_CHAIN.id as SupportedChainId;

/** Optional per-chain RPC override (public-safe URL only; keep keyed RPCs server-side). */
export function rpcUrlFor(chainId: SupportedChainId): string | undefined {
  return chainId === base.id
    ? process.env.NEXT_PUBLIC_BASE_RPC_URL || undefined
    : process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || undefined;
}

export function explorerTxUrl(chainId: number, hash: string): string {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId) ?? DEFAULT_CHAIN;
  return `${chain.blockExplorers?.default.url}/tx/${hash}`;
}

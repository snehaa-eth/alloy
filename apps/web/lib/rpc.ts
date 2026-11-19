/**
 * Read-only viem clients, usable on the server (RSC / route handlers / scripts) and in the browser.
 * Writes never go through these: they use the connected wallet (wagmi / Privy).
 *
 * RPC order (viem `fallback`):
 *   1. RPC_URL_<chainId>  (server-only, may be a keyed Alchemy/QuickNode URL; never shipped to the browser)
 *   2. NEXT_PUBLIC_BASE[_SEPOLIA]_RPC_URL (public-safe override)
 *   3. the chain's public default (https://sepolia.base.org / https://mainnet.base.org)
 */
import { createPublicClient, fallback, http, type PublicClient, type Transport } from "viem";
import { base, baseSepolia } from "viem/chains";
import { DEFAULT_CHAIN_ID, rpcUrlFor, type SupportedChainId } from "./chains";

const CHAINS = { [baseSepolia.id]: baseSepolia, [base.id]: base } as const;

function serverRpc(chainId: SupportedChainId): string | undefined {
  if (typeof window !== "undefined") return undefined;
  return process.env[`RPC_URL_${chainId}`] || undefined;
}

export function rpcUrls(chainId: SupportedChainId): string[] {
  const chain = CHAINS[chainId];
  const urls = [serverRpc(chainId), rpcUrlFor(chainId), chain.rpcUrls.default.http[0]].filter(
    (u): u is string => !!u,
  );
  return [...new Set(urls)];
}

const clients = new Map<number, PublicClient>();

/** Cached read client for a chain. Calls in the same tick are batched into one multicall. */
export function getReadClient(chainId: SupportedChainId = DEFAULT_CHAIN_ID): PublicClient {
  const hit = clients.get(chainId);
  if (hit) return hit;
  const transports: Transport[] = rpcUrls(chainId).map((u) => http(u, { timeout: 12_000, retryCount: 3, retryDelay: 400 }));
  const client = createPublicClient({
    chain: CHAINS[chainId],
    transport: transports.length === 1 ? transports[0] : fallback(transports),
    batch: { multicall: { wait: 16 } },
  }) as PublicClient;
  clients.set(chainId, client);
  return client;
}

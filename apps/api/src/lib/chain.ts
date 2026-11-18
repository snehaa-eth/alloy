import { createPublicClient, fallback, http, type Address, type PublicClient } from "viem";
import { base, baseSepolia } from "viem/chains";
import type { Env, SupportedChainId } from "../config/env";

/**
 * Minimal Basket ABI fragment needed by the API. Basket clones expose
 * `address public creator` (docs/ARCHITECTURE.md §3.1).
 * TODO(contracts): replace with the wagmi-cli generated ABI from packages/sdk
 * once packages/contracts freezes its interface.
 */
export const basketCreatorAbi = [
  {
    type: "function",
    name: "creator",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

/** Reads who controls a basket on-chain. Injected so tests can stub it. */
export interface CreatorReader {
  /** Returns the basket's on-chain creator, or null if `vault` is not a readable basket. */
  getCreator(chainId: SupportedChainId, vault: Address): Promise<Address | null>;
}

export function createPublicClients(env: Env): Record<SupportedChainId, PublicClient> {
  const transport = (url: string | undefined) => (url ? fallback([http(url), http()]) : http());
  return {
    8453: createPublicClient({ chain: base, transport: transport(env.RPC_URL_BASE) }) as PublicClient,
    84532: createPublicClient({ chain: baseSepolia, transport: transport(env.RPC_URL_BASE_SEPOLIA) }) as PublicClient,
  };
}

export function createViemCreatorReader(env: Env): CreatorReader {
  let clients: Record<SupportedChainId, PublicClient> | null = null;
  return {
    async getCreator(chainId, vault) {
      clients ??= createPublicClients(env);
      try {
        // TODO(contracts): also require BasketFactory.isBasket(vault) (or an indexer lookup)
        // so arbitrary contracts that merely expose creator() cannot get metadata attached.
        return await clients[chainId].readContract({
          address: vault,
          abi: basketCreatorAbi,
          functionName: "creator",
        });
      } catch {
        return null;
      }
    },
  };
}

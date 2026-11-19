import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  fallback,
  http,
  type Abi,
  type AbiEvent,
  type Address,
  type PublicClient,
} from "viem";
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
  // batch.multicall: concurrent readContract calls in the same tick are folded into one Multicall3 eth_call.
  const batch = { multicall: { wait: 0 } } as const;
  return {
    8453: createPublicClient({ chain: base, transport: transport(env.RPC_URL_BASE), batch }) as PublicClient,
    84532: createPublicClient({ chain: baseSepolia, transport: transport(env.RPC_URL_BASE_SEPOLIA), batch }) as PublicClient,
  };
}

/**
 * The slice of a viem PublicClient the read services use. Non-generic so tests can
 * stub it with a plain object (see test/chainMock.ts).
 */
export interface ChainClient {
  readContract(args: { address: Address; abi: Abi; functionName: string; args?: readonly unknown[] }): Promise<unknown>;
  getBlockNumber(): Promise<bigint>;
  getLogs(args: {
    address: Address | Address[];
    event: AbiEvent;
    fromBlock: bigint;
    toBlock: bigint;
  }): Promise<ReadonlyArray<{ address: Address; args: unknown }>>;
}

export type ChainClients = (chainId: SupportedChainId) => ChainClient;

export function toChainClient(pc: PublicClient): ChainClient {
  return {
    readContract: (args) => pc.readContract(args as never) as Promise<unknown>,
    getBlockNumber: () => pc.getBlockNumber({ cacheTime: 2_000 }),
    getLogs: (args) => pc.getLogs(args as never) as never,
  };
}

/** Lazily builds one viem client per chain and reuses it across requests. */
export function createChainClients(env: Env): ChainClients {
  let clients: Record<SupportedChainId, ChainClient> | null = null;
  return (chainId) => {
    if (!clients) {
      const pcs = createPublicClients(env);
      clients = { 8453: toChainClient(pcs[8453]), 84532: toChainClient(pcs[84532]) };
    }
    return clients[chainId];
  };
}

/** Typed wrapper: callers state the decoded return type. */
export function read<T>(
  client: ChainClient,
  address: Address,
  abi: Abi | readonly unknown[],
  functionName: string,
  args?: readonly unknown[],
): Promise<T> {
  return client.readContract({ address, abi: abi as Abi, functionName, args }) as Promise<T>;
}

/** True when the error is a contract revert (bad input / state), not an RPC/network failure. */
export function isRevert(err: unknown): boolean {
  if (err instanceof BaseError) return Boolean(err.walk((e) => e instanceof ContractFunctionRevertedError));
  return Boolean((err as { isRevert?: boolean } | null)?.isRevert);
}

/** Name of the custom error a contract reverted with, if viem could decode it. */
export function revertName(err: unknown): string | undefined {
  if (err instanceof BaseError) {
    const r = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (r instanceof ContractFunctionRevertedError) return r.data?.errorName;
  }
  return (err as { errorName?: string } | null)?.errorName;
}

/**
 * Uniswap v3 QuoterV2. `quoteExactInputSingle` is nonpayable on-chain (it reverts internally
 * to return data) but is always used via eth_call, so it is declared `view` here.
 */
export const quoterV2Abi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "view",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

/** packages/testnet-env/src/Faucet.sol (not in @alloy/sdk yet). */
export const faucetAbi = [
  {
    type: "function",
    name: "dripTo",
    stateMutability: "nonpayable",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "availableIn",
    stateMutability: "view",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  { type: "error", name: "NotOwner", inputs: [] },
  { type: "error", name: "CoolingDown", inputs: [{ name: "availableAt", type: "uint256" }] },
  { type: "error", name: "DailyCapReached", inputs: [] },
  { type: "error", name: "ZeroRecipient", inputs: [] },
] as const;

export const transferEvent = {
  type: "event",
  name: "Transfer",
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
} as const satisfies AbiEvent;

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

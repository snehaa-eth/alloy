/**
 * Contract addresses + stock registry, sourced from @alloy/sdk (packages/sdk/src/generated.ts,
 * regenerate with `node packages/sdk/scripts/generate.mjs`), and thin simulate/write wrappers.
 *
 * Base Sepolia (84532) is live. Base (8453) is not deployed yet: `isDeployed(8453) === false`.
 */
import { deployments } from "@alloy/sdk";
import {
  concat,
  decodeAbiParameters,
  encodeFunctionData,
  getAddress,
  keccak256,
  toBytes,
  toHex,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import type { Config } from "wagmi";
import { simulateContract, writeContract } from "wagmi/actions";
import { alloyRouterAbi, basketAbi, basketFactoryAbi, faucetAbi } from "./abis";
import type { SupportedChainId } from "./chains";
import { STRATEGY_MODES } from "./strategy";
import type { StrategyMode } from "./types";

// ---------------------------------------------------------------------------
// Stock registry
// ---------------------------------------------------------------------------

/** Coinbase tokenized-stocks `icon_url`s (api.coinbase.com/v1/tokenized-stocks), keyed by underlying ticker. */
export const STOCK_ICONS: Record<string, string> = {
  AAPL: "https://metadata.coinbase.com/equity_icons/873819f4b14efe44b94abecbc8e8864d2998163abd0ca55b449ee6eb07d0d94c.png",
  AMZN: "https://metadata.coinbase.com/equity_icons/06d3c2cac2c89e3a8bc4b2fe40ff259f104b55244321dea400e44b22f215896b.png",
  GOOGL: "https://metadata.coinbase.com/equity_icons/0e80e31df40f7c42b49a3c7f6d23c6351625d73f235aeb69006ddee9221702b0.png",
  MSFT: "https://metadata.coinbase.com/equity_icons/e90930ade985016f48816c6bd9fd1e8274b28507f4833881b3a16c77c2a3e2e7.png",
  NVDA: "https://metadata.coinbase.com/equity_icons/1fee9b7a44e800d438dd9d96c3283e05784c925c2c871a48ff735950740b551a.png",
  TSLA: "https://metadata.coinbase.com/equity_icons/a3b67028295d0e9fa3182c867b8a9afed5ebcbd8c012de3a46e160ae5e490980.png",
};

const COMPANY_NAMES: Record<string, string> = {
  AAPL: "Apple",
  AMZN: "Amazon",
  GOOGL: "Alphabet",
  MSFT: "Microsoft",
  NVDA: "NVIDIA",
  TSLA: "Tesla",
};

export type StockConfig = {
  /** On-chain token symbol, e.g. "tNVDAc" */
  symbol: string;
  /** Underlying ticker, e.g. "NVDA" */
  ticker: string;
  name: string;
  token: Address;
  /** Chainlink-style feed (8 dec). */
  feed: Address;
  /** Uniswap v3 STOCK/USDC pool (testnet). */
  pool?: Address;
  /** Uniswap v3 fee tier (from the factory's poolData). */
  fee: number;
  decimals: number;
  iconUrl: string | null;
};

export type Deployment = {
  factory: Address;
  router: Address;
  usdc: Address;
  usdcSymbol: string;
  faucet?: Address;
  quoterV2?: Address;
  feedGuard?: Address;
  keeper?: Address;
  /** Block the factory was deployed at (lower bound for log scans). */
  deployedAtBlock: bigint;
  stocks: StockConfig[];
};

function decodeFee(poolData: string | undefined, fallbackFee: number): number {
  if (!poolData || poolData === "0x") return fallbackFee;
  try {
    const [fee] = decodeAbiParameters([{ type: "uint24" }], poolData as Hex);
    return Number(fee);
  } catch {
    return fallbackFee;
  }
}

function buildSepolia(): Deployment {
  const d = deployments["84532"];
  const c = d.contracts;
  const env = d.testnetEnv;
  const stocks: StockConfig[] = Object.entries(c.stocks).map(([symbol, s]) => {
    const meta = env.stocks[symbol as keyof typeof env.stocks];
    const ticker = meta?.underlying ?? symbol.replace(/^t/, "").replace(/c$/, "");
    return {
      symbol,
      ticker,
      name: COMPANY_NAMES[ticker] ?? meta?.name?.replace(/^Alloy Test /, "") ?? ticker,
      token: getAddress(s.token),
      feed: getAddress(s.feed),
      pool: meta?.pool ? getAddress(meta.pool) : undefined,
      fee: decodeFee(s.poolData, c.feeTier),
      decimals: meta?.decimals ?? 8,
      iconUrl: STOCK_ICONS[ticker] ?? null,
    };
  });
  stocks.sort((a, b) => a.ticker.localeCompare(b.ticker));
  return {
    factory: getAddress(c.factory),
    router: getAddress(c.router),
    usdc: getAddress(c.usdc),
    usdcSymbol: env.usdc.symbol,
    faucet: getAddress(env.faucet),
    quoterV2: getAddress(env.uniswap.quoterV2),
    feedGuard: getAddress(c.feedGuard),
    keeper: getAddress(c.keeper),
    deployedAtBlock: BigInt(c.deployedAtBlock),
    stocks,
  };
}

const DEPLOYMENTS: Record<SupportedChainId, Deployment> = {
  84532: buildSepolia(),
  // Base mainnet: not deployed yet (contracts are zero). Real USDC for display only.
  8453: {
    factory: zeroAddress,
    router: zeroAddress,
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    usdcSymbol: "USDC",
    deployedAtBlock: 0n,
    stocks: [],
  },
};

export function getDeployment(chainId: SupportedChainId): Deployment {
  return DEPLOYMENTS[chainId];
}

/** True once factory + router + USDC are deployed (non-zero) on this chain. */
export function isDeployed(chainId: SupportedChainId): boolean {
  const d = getDeployment(chainId);
  return d.factory !== zeroAddress && d.router !== zeroAddress && d.usdc !== zeroAddress;
}

export function stockByToken(chainId: SupportedChainId, token: Address): StockConfig | undefined {
  const t = token.toLowerCase();
  return getDeployment(chainId).stocks.find((s) => s.token.toLowerCase() === t);
}

export function stockByTicker(chainId: SupportedChainId, tickerOrSymbol: string): StockConfig | undefined {
  const q = tickerOrSymbol.toUpperCase();
  return getDeployment(chainId).stocks.find((s) => s.ticker === q || s.symbol.toUpperCase() === q);
}

/** Known demo basket on Base Sepolia (seeded by packages/contracts/script/DemoBasket.s.sol). */
export const DEMO_BASKET: Address = "0x60B0E5813dF4D7C5e602f78743c73CC90A63d36c";

// ---------------------------------------------------------------------------
// Builder Code (ERC-8021 attribution suffix) appended to every tx's calldata.
// Verified harmless on Base Sepolia: B20 precompiles, Basket clones and the Faucet ignore trailing bytes.
// ---------------------------------------------------------------------------

/** PLACEHOLDER until the real Base Builder Code is issued. Set NEXT_PUBLIC_BUILDER_CODE. */
export const BUILDER_CODE = process.env.NEXT_PUBLIC_BUILDER_CODE || "alloy";
const ERC8021_MARKER: Hex = "0x80218021802180218021802180218021";

/** codes (ascii, comma-joined) ++ uint8 length ++ schemaId 0x00 ++ 16-byte ERC-8021 marker */
export function builderDataSuffix(codes: string[] = [BUILDER_CODE]): Hex {
  const body = toHex(codes.join(","));
  const len = (body.length - 2) / 2;
  if (len > 255) throw new RangeError("builder codes too long");
  return concat([body, toHex(len, { size: 1 }), "0x00", ERC8021_MARKER]);
}

export const BUILDER_DATA_SUFFIX: Hex = builderDataSuffix();

// ---------------------------------------------------------------------------
// Contract call wrappers (simulate -> write). Hooks in lib/hooks/use-basket-tx.ts use the
// lower-level `buildTx*` helpers so they can route through Privy gas sponsorship.
// ---------------------------------------------------------------------------

export class NotWiredError extends Error {
  constructor(what: string) {
    super(`${what} is not available on this network yet.`);
    this.name = "NotWiredError";
  }
}

export type BuyArgs = { basket: Address; usdcIn: bigint; minOuts: bigint[]; minShares: bigint };
export type SellArgs = { basket: Address; shares: bigint; minOuts: bigint[]; minUsdc: bigint };
export type RedeemArgs = { basket: Address; shares: bigint; to: Address };
export type CreateArgs = {
  name: string;
  symbol: string;
  components: Address[];
  targetBps: number[];
  mode: StrategyMode;
  feeBps: number;
  demo: boolean;
  usdcSeed: bigint;
  minOuts: bigint[];
  /** Optional CREATE2 salt; random when omitted. */
  salt?: Hex;
};
export type ProposeArgs = { basket: Address; weightsBps: number[]; reasonHash: `0x${string}` };
export type ClaimOwedArgs = { basket: Address; token: Address; to: Address };

type Ctx = { config: Config; chainId: SupportedChainId; account: Address };

/** A fully specified contract call (what simulate + write both take). */
export type ContractTx = {
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args: readonly unknown[];
};

function requireLive(chainId: SupportedChainId, what: string) {
  if (!isDeployed(chainId)) throw new NotWiredError(what);
}

export function randomSalt(): Hex {
  const b = new Uint8Array(32);
  globalThis.crypto.getRandomValues(b);
  return toHex(b);
}

export function createParams(a: Omit<CreateArgs, "usdcSeed" | "minOuts">) {
  const m = STRATEGY_MODES[a.mode];
  return {
    name: a.name,
    symbol: a.symbol,
    comps: a.components,
    targetBps: a.targetBps,
    absBandBps: m.absBandBps,
    relBandBps: m.relBandBps,
    capBps: m.capBps,
    feeBps: a.feeBps,
    demo: a.demo,
    salt: a.salt ?? randomSalt(),
  };
}

export const txs = {
  buy(chainId: SupportedChainId, a: BuyArgs): ContractTx {
    requireLive(chainId, "AlloyRouter.buy");
    return {
      address: getDeployment(chainId).router,
      abi: alloyRouterAbi,
      functionName: "buy",
      args: [a.basket, a.usdcIn, a.minOuts, a.minShares],
    };
  },
  sell(chainId: SupportedChainId, a: SellArgs): ContractTx {
    requireLive(chainId, "AlloyRouter.sell");
    return {
      address: getDeployment(chainId).router,
      abi: alloyRouterAbi,
      functionName: "sell",
      args: [a.basket, a.shares, a.minOuts, a.minUsdc],
    };
  },
  redeem(_chainId: SupportedChainId, a: RedeemArgs): ContractTx {
    return { address: a.basket, abi: basketAbi, functionName: "redeem", args: [a.shares, a.to] };
  },
  claimOwed(_chainId: SupportedChainId, a: ClaimOwedArgs): ContractTx {
    return { address: a.basket, abi: basketAbi, functionName: "claimOwed", args: [a.token, a.to] };
  },
  create(chainId: SupportedChainId, a: CreateArgs): ContractTx {
    requireLive(chainId, "BasketFactory.createBasket");
    return {
      address: getDeployment(chainId).factory,
      abi: basketFactoryAbi,
      functionName: "createBasket",
      args: [createParams(a), a.usdcSeed, a.minOuts],
    };
  },
  propose(_chainId: SupportedChainId, a: ProposeArgs): ContractTx {
    return { address: a.basket, abi: basketAbi, functionName: "proposeRecipe", args: [a.weightsBps, a.reasonHash] };
  },
  cancelRecipe(_chainId: SupportedChainId, basket: Address): ContractTx {
    return { address: basket, abi: basketAbi, functionName: "cancelRecipe", args: [] };
  },
  faucetDrip(chainId: SupportedChainId, to?: Address): ContractTx {
    const f = getDeployment(chainId).faucet;
    if (!f) throw new NotWiredError("Test-USDC faucet");
    return to
      ? { address: f, abi: faucetAbi, functionName: "dripTo", args: [to] }
      : { address: f, abi: faucetAbi, functionName: "drip", args: [] };
  },
};

/** Calldata for a tx, with the Builder Code suffix appended. */
export function encodeTx(tx: ContractTx, suffix: Hex = BUILDER_DATA_SUFFIX): Hex {
  const data = encodeFunctionData({ abi: tx.abi, functionName: tx.functionName, args: tx.args } as unknown as Parameters<
    typeof encodeFunctionData
  >[0]);
  return concat([data, suffix]);
}

/** Canonical reason text: NFC + trim. Must match apps/api/src/modules/reasons/reasonHash.ts. */
export function normalizeReason(text: string): string {
  return text.normalize("NFC").trim();
}

/** keccak256(utf8(normalizeReason(text))) — the `reasonHash` passed to proposeRecipe. */
export function reasonHashOf(reason: string): Hex {
  return keccak256(toBytes(normalizeReason(reason)));
}

async function sim(ctx: Ctx, tx: ContractTx) {
  const { request, result } = await simulateContract(ctx.config, {
    ...(tx as never as Parameters<typeof simulateContract>[1]),
    chainId: ctx.chainId,
    account: ctx.account,
    dataSuffix: BUILDER_DATA_SUFFIX,
  });
  return { request, result };
}
async function send(ctx: Ctx, request: unknown): Promise<`0x${string}`> {
  return writeContract(ctx.config, request as Parameters<typeof writeContract>[1]);
}

/** Back-compat API (simulate returns viem's request; write sends it). */
export const contractCalls = {
  simulateBuy: (ctx: Ctx, a: BuyArgs) => sim(ctx, txs.buy(ctx.chainId, a)).then((r) => r.request),
  writeBuy: send,
  simulateSell: (ctx: Ctx, a: SellArgs) => sim(ctx, txs.sell(ctx.chainId, a)).then((r) => r.request),
  writeSell: send,
  simulateRedeem: (ctx: Ctx, a: RedeemArgs) => sim(ctx, txs.redeem(ctx.chainId, a)).then((r) => r.request),
  writeRedeem: send,
  simulateCreate: (ctx: Ctx, a: CreateArgs) => sim(ctx, txs.create(ctx.chainId, a)).then((r) => r.request),
  writeCreate: send,
  simulatePropose: (ctx: Ctx, a: ProposeArgs) => sim(ctx, txs.propose(ctx.chainId, a)).then((r) => r.request),
  writePropose: send,
};

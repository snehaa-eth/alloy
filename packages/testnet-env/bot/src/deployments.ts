import { readFileSync } from "node:fs";
import type { Address } from "viem";

export interface StockDeployment {
  symbol: string; // tNVDAc
  name: string;
  underlying: string; // NVDA
  decimals: number;
  token: Address;
  feed: Address;
  pool: Address;
  stockIsToken0: boolean;
  positionId: number;
  liquidity: number | string;
  tickLower: number;
  tickUpper: number;
  initialAnswer: number | string;
}

export interface Deployments {
  chainId: number;
  deployer: Address;
  bot: Address;
  deployedAtBlock: number;
  deployedAt: number;
  saltVersion: string;
  b20Factory: Address;
  feedPauseRegistry: Address;
  faucet: Address;
  liquidityUsdPerSide: number;
  feedDecimals: number;
  uniswap: {
    factory: Address;
    positionManager: Address;
    swapRouter02: Address;
    quoterV2: Address;
    feeTier: number;
    tickSpacing: number;
  };
  usdc: { symbol: string; decimals: number; token: Address };
  stocks: Record<string, StockDeployment>;
}

export function loadDeployments(path: string): Deployments {
  const raw = JSON.parse(readFileSync(path, "utf8")) as Deployments;
  if (!raw.stocks || !raw.usdc?.token || !raw.uniswap?.swapRouter02) {
    throw new Error(`${path} does not look like a testnet-env deployment file`);
  }
  return raw;
}

const ALIASES: Record<string, string> = {
  nvda: "NVDA", nvidia: "NVDA",
  googl: "GOOGL", goog: "GOOGL", google: "GOOGL", alphabet: "GOOGL",
  msft: "MSFT", microsoft: "MSFT",
  tsla: "TSLA", tesla: "TSLA",
  aapl: "AAPL", apple: "AAPL",
  amzn: "AMZN", amazon: "AMZN",
};

/** Resolve "google" | "GOOGL" | "tGOOGLc" | "all" to stock deployments. */
export function resolveStocks(d: Deployments, query: string): StockDeployment[] {
  const all = Object.values(d.stocks);
  const q = query.trim();
  if (q.toLowerCase() === "all") return all;
  const byUnderlying = ALIASES[q.toLowerCase()] ?? q.toUpperCase();
  const hit = all.find(
    (s) => s.symbol.toLowerCase() === q.toLowerCase() || s.underlying.toUpperCase() === byUnderlying,
  );
  if (!hit) {
    throw new Error(`unknown stock "${query}". Known: ${all.map((s) => `${s.symbol}/${s.underlying}`).join(", ")}, all`);
  }
  return [hit];
}

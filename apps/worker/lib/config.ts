import { getAddress, type Address } from "viem";
import { deployments } from "./sdk";

/**
 * Addresses + chain settings shared by the indexer (Ponder) and the keeper. Defaults come from @alloy/sdk
 * (packages/contracts/deployments/84532.json); every value can be overridden by env for forks / redeploys.
 */
const d = deployments[84532];

function addr(envName: string, dflt: string): Address {
  return getAddress(process.env[envName] || dflt);
}

export const CHAIN_ID = Number(process.env.CHAIN_ID || 84532);
/** Comma-separated list; >1 entries are combined with viem `fallback()` (keeper) / Ponder load balancing. */
export const RPC_URLS = (process.env.RPC_URL || "https://sepolia.base.org")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const FACTORY = addr("ALLOY_FACTORY", d.contracts.factory);
export const ROUTER = addr("ALLOY_ROUTER", d.contracts.router);
export const USDC = addr("ALLOY_USDC", d.contracts.usdc);
export const START_BLOCK = Number(process.env.START_BLOCK || d.contracts.deployedAtBlock);
/** Base produces a block every 2s, so 1800 blocks = 1 hour. */
export const NAV_SNAPSHOT_BLOCKS = Number(process.env.NAV_SNAPSHOT_BLOCKS || 1800);

export const DEAD = "0x000000000000000000000000000000000000dEaD" as const;
export const ZERO = "0x0000000000000000000000000000000000000000" as const;

/** token address (lowercase) -> symbol, e.g. tNVDAc */
export const STOCK_SYMBOLS: Record<string, string> = Object.fromEntries(
  Object.entries(d.contracts.stocks).map(([sym, s]) => [s.token.toLowerCase(), sym]),
);

// Bridge to @alloy/sdk (packages/sdk/src): ABIs + deployment addresses.
// Imported by relative path so tsc, tsx and vitest all resolve it without a
// workspace install. Do not copy addresses into the API; read them from here.
import { getAddress, isAddressEqual, type Address } from "viem";
import { alloyRouterAbi, basketAbi, basketFactoryAbi, deployments, iAggregatorV3Abi } from "../../../../packages/sdk/src";
import type { SupportedChainId } from "./env";

export { alloyRouterAbi, basketAbi, basketFactoryAbi, iAggregatorV3Abi };

export type Deployment = (typeof deployments)["84532"];

/** Deployment for a chain, or null where Alloy is not deployed yet (8453). */
export function getDeployment(chainId: SupportedChainId): Deployment | null {
  return chainId === 84532 ? deployments["84532"] : null;
}

export interface StockInfo {
  symbol: string;
  name: string;
  underlying: string;
  token: Address;
  feed: Address;
  pool: Address;
  decimals: number;
  /** Allow-listed in the Alloy factory (usable in baskets). */
  allowed: boolean;
}

/** Test stocks from the testnet-env deployment, joined with the factory allow-list. */
export function listStocks(dep: Deployment): StockInfo[] {
  const allowed = Object.values(dep.contracts.stocks).map((s) => s.token as Address);
  return Object.values(dep.testnetEnv.stocks).map((s) => ({
    symbol: s.symbol,
    name: s.name,
    underlying: s.underlying,
    token: getAddress(s.token),
    feed: getAddress(s.feed),
    pool: getAddress(s.pool),
    decimals: s.decimals,
    allowed: allowed.some((a) => isAddressEqual(a, s.token as Address)),
  }));
}

export function findStock(dep: Deployment, token: Address): StockInfo | undefined {
  return listStocks(dep).find((s) => isAddressEqual(s.token, token));
}

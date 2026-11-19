import type { Address } from "viem";
import type { ChainClient, ChainClients } from "../src/lib/chain";
import { getDeployment } from "../src/config/sdk";

type Handler = (address: Address, args: readonly unknown[]) => unknown;

/**
 * Stub viem client: readContract dispatches on functionName (optionally "fn@address").
 * Unknown calls throw, so a test fails loudly if the service reads something unexpected.
 */
export function mockChain(
  handlers: Record<string, Handler | unknown>,
  extra: Partial<ChainClient> = {},
): ChainClients & { calls: string[] } {
  const calls: string[] = [];
  const client: ChainClient = {
    async readContract({ address, functionName, args = [] }) {
      calls.push(functionName);
      const h = handlers[`${functionName}@${address.toLowerCase()}`] ?? handlers[functionName];
      if (h === undefined) throw new Error(`unmocked readContract ${functionName}@${address}`);
      const v = typeof h === "function" ? (h as Handler)(address, args) : h;
      if (v instanceof Error) throw v;
      return v;
    },
    getBlockNumber: async () => 100n,
    getLogs: async () => [],
    ...extra,
  };
  const fn = (() => client) as ChainClients & { calls: string[] };
  fn.calls = calls;
  return fn;
}

export const DEP = getDeployment(84532)!;
export const DEMO: Address = "0x60B0E5813dF4D7C5e602f78743c73CC90A63d36c";
export const S = DEP.testnetEnv.stocks;
export const USDC = DEP.contracts.usdc as Address;

/** A revert as viem surfaces it, enough for isRevert()/revertName(). */
export function revert(errorName?: string) {
  return Object.assign(new Error(`reverted ${errorName ?? ""}`), { isRevert: true, errorName });
}

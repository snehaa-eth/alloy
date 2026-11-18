import type { Address } from "viem";

/**
 * v2 stock universe on Base mainnet (8453): Coinbase B20 stocks that have both
 * a Chainlink feed and an Aerodrome pool. Source: docs/ARCHITECTURE.md §1.
 * TODO: replace with packages/sdk addresses.8453.json once it exists, and
 * re-verify every address on-chain before mainnet.
 */
export const BASE_MAINNET_UNIVERSE: ReadonlyArray<{ symbol: string; address: Address }> = [
  { symbol: "NVDAc", address: "0xb20000000000000000000078ee7ce2fE4908108C" },
  { symbol: "AMZNc", address: "0xb200000000000000000000d9192b6B456483C2E8" },
  { symbol: "SNDKc", address: "0xb200000000000000000000397293Cb8cda9a10c5" },
  { symbol: "GOOGLc", address: "0xb2000000000000000000002D0BA3164cc74f58B7" },
  { symbol: "SPCXc", address: "0xb2000000000000000000007b9fcbd005511aCBd5" },
  { symbol: "METAc", address: "0xb2000000000000000000008bC8786B856E61707C" },
  { symbol: "MSTRc", address: "0xb2000000000000000000004884b426556b92883d" },
  { symbol: "TSLAc", address: "0xb2000000000000000000001e800a7f5189430cD0" },
  { symbol: "AAPLc", address: "0xb200000000000000000000C2e324d24d7eEcd1fb" },
  { symbol: "MSFTc", address: "0xB200000000000000000000Ab99cFa739E253872B" },
];

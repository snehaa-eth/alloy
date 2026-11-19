export * from "./generated";

/** Chain IDs Alloy supports. 84532 = Base Sepolia (demo), 8453 = Base mainnet (proof, not deployed yet). */
export const CHAIN = { baseSepolia: 84532, base: 8453 } as const;

/** Decimals used across the system. Never use JS numbers for amounts; use bigint. */
export const DECIMALS = { usdc: 6, stock: 8, price: 8, shares: 18 } as const;

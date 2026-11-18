import { getAddress, isAddress, type Address } from "viem";
import { z } from "zod";
import type { Env, SupportedChainId } from "../config/env";

/** EVM address, returned in EIP-55 checksum form. Rejects anything that isn't a plain string. */
export const zAddress = z
  .string()
  .trim()
  .refine((v) => isAddress(v, { strict: false }), { message: "must be a 0x-prefixed 20-byte address" })
  .transform((v) => getAddress(v) as Address);

export const zBytes32 = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, "must be a 0x-prefixed 32-byte hex string")
  .transform((v) => v.toLowerCase() as `0x${string}`);

export const zObjectId = z.string().regex(/^[0-9a-f]{24}$/i, "must be a 24-char hex id");

/** chainId from query/body: must be one this deployment serves; defaults to the first configured. */
export function zChainId(env: Env) {
  return z.coerce
    .number()
    .int()
    .refine((n): n is SupportedChainId => (env.CHAIN_IDS as number[]).includes(n), {
      message: `chainId must be one of ${env.CHAIN_IDS.join(", ")}`,
    })
    .default(env.CHAIN_IDS[0]!)
    .transform((n) => n as SupportedChainId);
}

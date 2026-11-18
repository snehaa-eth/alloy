/**
 * zod DTOs for apps/api responses. Amounts are transported as decimal strings.
 * TODO(sdk): import from packages/sdk once the API contract is frozen.
 */
import { z } from "zod";
import { isAddress } from "viem";

export const zAddress = z
  .string()
  .refine((s) => isAddress(s, { strict: false }), "invalid address")
  .transform((s) => s as `0x${string}`);

export const zBigint = z
  .union([z.string().regex(/^-?\d+$/), z.number().int()])
  .transform((v) => BigInt(v));

export const zBps = z.number().int().min(0).max(10_000);

export const quoteSchema = z.object({
  basket: zAddress,
  side: z.enum(["buy", "sell"]),
  /** buy: usdc in (6dp); sell: shares in (18dp) */
  amountIn: zBigint,
  /** buy: shares out (18dp); sell: usdc out (6dp) */
  expectedOut: zBigint,
  /** Per-component swap outputs, same order as the bundle. */
  minOuts: z.array(zBigint),
  priceImpactBps: z.number().int(),
  marketOpen: z.boolean(),
});
export type Quote = z.infer<typeof quoteSchema>;

export const okSchema = z.object({ ok: z.literal(true) });

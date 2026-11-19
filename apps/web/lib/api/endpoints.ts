/**
 * Typed calls to apps/api with graceful fallback. Every reader returns `null` (never throws) when the
 * API is not configured, unreachable, or the endpoint is not implemented yet (501/404), so callers can
 * fall back to on-chain data.
 *
 * Endpoints (apps/api, responses wrapped in `{ data }`):
 *   GET  /quote?chainId&basket&side&amount&slippageBps       (501 until the API's quote service ships)
 *   GET  /baskets/:vault?chainId                             thesis / imageUrl / tags
 *   GET  /baskets?chainId                                    all metadata docs
 *   GET  /baskets/:vault/rebalance-reasons?chainId           reason texts keyed by reasonHash
 *   POST /baskets/:vault/meta?chainId          (Privy JWT, creator only)
 *   POST /baskets/:vault/rebalance-reason?chainId (Privy JWT, creator only)
 *   POST /faucet/drip { chainId, address }     (relayer pays gas; optional — falls back to on-chain drip)
 */
import { z } from "zod";
import type { Address, PublicClient } from "viem";
import type { SupportedChainId } from "../chains";
import { quoteOnchain, type BasketQuote, type QuoteSide } from "../quote";
import { getReadClient } from "../rpc";
import { API_CONFIGURED, ApiError, apiFetch } from "./client";
import { zAddress, zBigint } from "./schemas";

const wrap = <T extends z.ZodTypeAny>(inner: T) => z.object({ data: inner });

export const basketMetaSchema = z.object({
  vault: zAddress,
  title: z.string().nullable().optional(),
  thesis: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
});
export type BasketMetaDto = z.infer<typeof basketMetaSchema>;

export const reasonSchema = z.object({
  text: z.string(),
  reasonHash: z.string(),
  author: z.string().optional(),
  createdAt: z.string().nullable().optional(),
});

/** apps/api QuoteService shape. */
const apiQuoteSchema = z.object({
  basket: zAddress,
  side: z.enum(["buy", "sell"]),
  amount: zBigint,
  legs: z.array(z.object({ token: zAddress, amountIn: zBigint, expectedOut: zBigint, minOut: zBigint })),
  minResult: zBigint,
  expectedResult: zBigint,
  marketOpen: z.boolean(),
  priceImpactBps: z.number().int().optional(),
});

async function soft<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (process.env.NODE_ENV !== "production" && !(e instanceof ApiError && (e.status === 404 || e.status === 501))) {
      console.warn("[alloy api]", e instanceof Error ? e.message : e);
    }
    return null;
  }
}

export async function fetchBasketMeta(chainId: SupportedChainId, vault: Address): Promise<BasketMetaDto | null> {
  if (!API_CONFIGURED) return null;
  const r = await soft(
    apiFetch(`/baskets/${vault}?chainId=${chainId}`, { schema: wrap(basketMetaSchema), timeoutMs: 3_000, next: { revalidate: 60 } }),
  );
  return r?.data ?? null;
}

export async function fetchAllBasketMeta(chainId: SupportedChainId): Promise<Record<string, BasketMetaDto>> {
  if (!API_CONFIGURED) return {};
  const r = await soft(
    apiFetch(`/baskets?chainId=${chainId}&limit=100`, { schema: wrap(z.array(basketMetaSchema)), timeoutMs: 3_000, next: { revalidate: 60 } }),
  );
  return Object.fromEntries((r?.data ?? []).map((m) => [m.vault.toLowerCase(), m]));
}

/** reasonHash (lowercase) -> text */
export async function fetchReasons(chainId: SupportedChainId, vault: Address): Promise<Record<string, string>> {
  if (!API_CONFIGURED) return {};
  const r = await soft(
    apiFetch(`/baskets/${vault}/rebalance-reasons?chainId=${chainId}&limit=100`, {
      schema: wrap(z.array(reasonSchema)),
      timeoutMs: 3_000,
      next: { revalidate: 30 },
    }),
  );
  return Object.fromEntries((r?.data ?? []).map((x) => [x.reasonHash.toLowerCase(), x.text]));
}

export async function fetchApiQuote(
  chainId: SupportedChainId,
  basket: Address,
  side: QuoteSide,
  amount: bigint,
  slippageBps: number,
  accessToken?: string | null,
): Promise<BasketQuote | null> {
  if (!API_CONFIGURED) return null;
  const r = await soft(
    apiFetch(
      `/quote?chainId=${chainId}&basket=${basket}&side=${side}&amount=${amount}&slippageBps=${Math.max(1, slippageBps)}`,
      { schema: wrap(apiQuoteSchema), accessToken, timeoutMs: 4_000 },
    ),
  );
  if (!r) return null;
  const q = r.data;
  return {
    basket: q.basket,
    side: q.side,
    amountIn: q.amount,
    expectedOut: q.expectedResult,
    minResult: q.minResult,
    minOuts: q.legs.map((l) => l.expectedOut),
    legs: q.legs.map((l) => ({ token: l.token, symbol: l.token.slice(0, 8), amountIn: l.amountIn, expectedOut: l.expectedOut, minOut: l.minOut })),
    slippageBps,
    priceImpactBps: q.priceImpactBps ?? 0,
    oracleValueUsd6: 0n,
    refundUsd6: 0n,
    dustUsd6: 0n,
    marketOpen: q.marketOpen,
    source: "api",
    quotedAt: Math.floor(Date.now() / 1000),
  };
}

/**
 * Quote with fallback: on-chain first-class (exact, same block data the tx will see), API only when
 * NEXT_PUBLIC_QUOTE_SOURCE=api. The API path falls back to on-chain on any failure.
 */
export async function getQuote(args: {
  chainId: SupportedChainId;
  basket: Address;
  side: QuoteSide;
  amount: bigint;
  slippageBps: number;
  accessToken?: string | null;
  client?: PublicClient;
}): Promise<BasketQuote> {
  if (process.env.NEXT_PUBLIC_QUOTE_SOURCE === "api") {
    const q = await fetchApiQuote(args.chainId, args.basket, args.side, args.amount, args.slippageBps, args.accessToken);
    if (q) return q;
  }
  const client = args.client ?? getReadClient(args.chainId);
  return quoteOnchain(client, args.chainId, args.basket, args.side, args.amount, args.slippageBps);
}

/** Ask the API relayer to call Faucet.dripTo(address). Returns the tx hash, or null if unavailable. */
export async function requestFaucetRelay(
  chainId: SupportedChainId,
  address: Address,
  accessToken?: string | null,
): Promise<`0x${string}` | null> {
  if (!API_CONFIGURED) return null;
  const r = await soft(
    apiFetch(`/faucet/drip`, {
      method: "POST",
      body: { chainId, address },
      accessToken,
      schema: wrap(z.object({ txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) })),
      timeoutMs: 15_000,
    }),
  );
  return (r?.data.txHash as `0x${string}` | undefined) ?? null;
}

export async function postBasketMeta(
  chainId: SupportedChainId,
  vault: Address,
  body: { thesis?: string; imageUrl?: string; tags?: string[] },
  accessToken: string,
): Promise<boolean> {
  if (!API_CONFIGURED) return false;
  const r = await soft(
    apiFetch(`/baskets/${vault}/meta?chainId=${chainId}`, { method: "POST", body, accessToken, schema: z.unknown() }),
  );
  return r !== null;
}

export async function postRebalanceReason(
  chainId: SupportedChainId,
  vault: Address,
  text: string,
  accessToken: string,
): Promise<boolean> {
  if (!API_CONFIGURED) return false;
  const r = await soft(
    apiFetch(`/baskets/${vault}/rebalance-reason?chainId=${chainId}`, {
      method: "POST",
      body: { text },
      accessToken,
      schema: z.unknown(),
    }),
  );
  return r !== null;
}


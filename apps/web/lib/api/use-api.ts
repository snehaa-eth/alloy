"use client";

import { useCallback, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { z } from "zod";
import { apiFetch } from "./client";
import { getQuote, postBasketMeta, postRebalanceReason, requestFaucetRelay } from "./endpoints";
import { DEFAULT_CHAIN_ID } from "@/lib/chains";
import type { BasketQuote } from "@/lib/quote";
import { DEFAULT_SLIPPAGE_BPS } from "@/lib/strategy";
import type { Address } from "@/lib/types";

/** API client bound to the current Privy session (attaches the access token). */
export function useApi() {
  const { getAccessToken, authenticated } = usePrivy();

  const token = useCallback(async () => (authenticated ? await getAccessToken() : null), [authenticated, getAccessToken]);

  return useMemo(
    () => ({
      get: async <T,>(path: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, signal?: AbortSignal) =>
        apiFetch(path, { schema, signal, accessToken: await token() }),
      post: async <T,>(path: string, body: unknown, schema: z.ZodType<T, z.ZodTypeDef, unknown>) => {
        const accessToken = await token();
        if (!accessToken) throw new Error("Sign in to continue.");
        return apiFetch(path, { method: "POST", body, schema, accessToken });
      },
      /** Quote (on-chain; API when NEXT_PUBLIC_QUOTE_SOURCE=api, falling back to on-chain). */
      quote: async (
        basket: Address,
        side: "buy" | "sell",
        amount: bigint,
        slippageBps: number = DEFAULT_SLIPPAGE_BPS,
      ): Promise<BasketQuote> =>
        getQuote({ chainId: DEFAULT_CHAIN_ID, basket, side, amount, slippageBps, accessToken: await token() }),
      faucetRelay: async (address: Address) => requestFaucetRelay(DEFAULT_CHAIN_ID, address, await token()),
      postMeta: async (vault: Address, body: { thesis?: string; imageUrl?: string; tags?: string[] }) => {
        const t = await token();
        return t ? postBasketMeta(DEFAULT_CHAIN_ID, vault, body, t) : false;
      },
      postReason: async (vault: Address, text: string) => {
        const t = await token();
        return t ? postRebalanceReason(DEFAULT_CHAIN_ID, vault, text, t) : false;
      },
    }),
    [token],
  );
}

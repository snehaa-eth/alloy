"use client";

import { useCallback, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { z } from "zod";
import { apiFetch } from "./client";
import { quoteSchema, type Quote } from "./schemas";
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
      quote: async (basket: Address, side: "buy" | "sell", amount: bigint): Promise<Quote> =>
        apiFetch(`/quote?basket=${basket}&side=${side}&amount=${amount.toString()}`, {
          schema: quoteSchema,
          accessToken: await token(),
        }),
    }),
    [token],
  );
}

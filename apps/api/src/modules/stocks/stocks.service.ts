import { readFile } from "node:fs/promises";
import { getAddress, isAddress, isAddressEqual, type Address } from "viem";
import { z } from "zod";
import type { Env, SupportedChainId } from "../../config/env";
import { BASE_MAINNET_UNIVERSE } from "../../config/universe";
import { HttpError } from "../../lib/errors";

export const COINBASE_STOCKS_URL = "https://api.coinbase.com/v1/tokenized-stocks";
const CACHE_TTL_MS = 5 * 60_000;
const UPSTREAM_TIMEOUT_MS = 5_000;

export interface Stock {
  chainId: SupportedChainId;
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  iconUrl: string | null;
  isin: string | null;
  /** Coinbase display multiplier (corporate actions). Informational only; vault accounts in raw balances. */
  multiplier: number | null;
  /** false if the token is in our universe but missing from the upstream listing. */
  listed: boolean;
}

const CoinbaseToken = z.object({
  contract_address: z.string(),
  symbol: z.string(),
  name: z.string().optional(),
  decimals: z.number().int().optional(),
  icon_url: z.string().optional().nullable(),
  isin: z.string().optional().nullable(),
  multiplier: z.number().optional().nullable(),
});
const CoinbaseResponse = z.object({ tokens: z.array(z.unknown()) });

/**
 * Base Sepolia test-stock deployments, written by packages/testnet-env.
 * TODO(testnet-env): agree on the final file shape; this accepts either
 * `{ stocks: [...] }` or a bare array.
 */
const TestnetStock = z.object({
  symbol: z.string(),
  address: z.string().refine((a) => isAddress(a, { strict: false })),
  name: z.string().optional(),
  decimals: z.number().int().default(8),
});
const TestnetFile = z.union([z.object({ stocks: z.array(TestnetStock) }), z.array(TestnetStock)]);

type CacheEntry = { data: Stock[]; fetchedAt: number };

export function createStocksService(env: Env, fetchImpl: typeof fetch) {
  const cache = new Map<SupportedChainId, CacheEntry>();

  async function fetchMainnet(): Promise<Stock[]> {
    const res = await fetchImpl(COINBASE_STOCKS_URL, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`coinbase tokenized-stocks responded ${res.status}`);
    const body = CoinbaseResponse.parse(await res.json());
    const tokens = body.tokens.flatMap((t) => {
      const p = CoinbaseToken.safeParse(t);
      return p.success && isAddress(p.data.contract_address, { strict: false }) ? [p.data] : [];
    });

    return BASE_MAINNET_UNIVERSE.map(({ symbol, address }) => {
      const t = tokens.find((x) => isAddressEqual(x.contract_address as Address, address));
      return {
        chainId: 8453 as const,
        address,
        symbol: t?.symbol ?? symbol,
        name: t?.name ?? symbol,
        decimals: t?.decimals ?? 8,
        iconUrl: t?.icon_url ?? null,
        isin: t?.isin ?? null,
        multiplier: t?.multiplier ?? null,
        listed: Boolean(t),
      };
    });
  }

  async function readTestnet(): Promise<Stock[]> {
    if (!env.TESTNET_DEPLOYMENTS_PATH) return [];
    const parsed = TestnetFile.parse(JSON.parse(await readFile(env.TESTNET_DEPLOYMENTS_PATH, "utf8")));
    const list = Array.isArray(parsed) ? parsed : parsed.stocks;
    return list.map((s) => ({
      chainId: 84532 as const,
      address: getAddress(s.address),
      symbol: s.symbol,
      name: s.name ?? s.symbol,
      decimals: s.decimals,
      iconUrl: null,
      isin: null,
      multiplier: null,
      listed: true,
    }));
  }

  return {
    async list(chainId: SupportedChainId): Promise<{ data: Stock[]; fetchedAt: number; stale: boolean }> {
      const hit = cache.get(chainId);
      if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) return { ...hit, stale: false };
      try {
        const data = chainId === 8453 ? await fetchMainnet() : await readTestnet();
        const entry = { data, fetchedAt: Date.now() };
        cache.set(chainId, entry);
        return { ...entry, stale: false };
      } catch (err) {
        console.error(`[stocks] refresh failed for chain ${chainId}:`, err instanceof Error ? err.message : err);
        if (hit) return { ...hit, stale: true };
        throw new HttpError(502, "upstream_unavailable", "Stock list temporarily unavailable");
      }
    },
  };
}

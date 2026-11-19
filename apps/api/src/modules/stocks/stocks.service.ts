import { isAddress, isAddressEqual, type Address } from "viem";
import { z } from "zod";
import type { SupportedChainId } from "../../config/env";
import { getDeployment, iAggregatorV3Abi, listStocks } from "../../config/sdk";
import { BASE_MAINNET_UNIVERSE } from "../../config/universe";
import { read, type ChainClients } from "../../lib/chain";
import { HttpError } from "../../lib/errors";
import { createTtlCache } from "../../lib/ttlCache";

export const COINBASE_STOCKS_URL = "https://api.coinbase.com/v1/tokenized-stocks";
const CACHE_TTL_MS = 5 * 60_000;
/** Testnet list carries live oracle prices, so it refreshes faster. */
const TESTNET_CACHE_TTL_MS = 15_000;
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
  /** Base Sepolia only: test-world wiring and the live mock-feed price. */
  testnet?: {
    underlying: string;
    feed: Address;
    pool: Address;
    /** Allow-listed in the Alloy factory. */
    allowed: boolean;
    /** Oracle price, USD with 8 decimals, per whole token. Null if the feed read failed. */
    priceUsd8: string | null;
    price: number | null;
    priceUpdatedAt: string | null;
  };
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

type CacheEntry = { data: Stock[]; fetchedAt: number };

type CoinbaseTokenT = z.infer<typeof CoinbaseToken>;

export function createStocksService(clients: ChainClients, fetchImpl: typeof fetch) {
  const cache = new Map<SupportedChainId, CacheEntry>();
  const upstream = createTtlCache<CoinbaseTokenT[]>(CACHE_TTL_MS, 1);

  function fetchCoinbase(): Promise<CoinbaseTokenT[]> {
    return upstream.get("coinbase", async () => {
      const res = await fetchImpl(COINBASE_STOCKS_URL, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`coinbase tokenized-stocks responded ${res.status}`);
      const body = CoinbaseResponse.parse(await res.json());
      return body.tokens.flatMap((t) => {
        const p = CoinbaseToken.safeParse(t);
        return p.success && isAddress(p.data.contract_address, { strict: false }) ? [p.data] : [];
      });
    });
  }

  async function fetchMainnet(): Promise<Stock[]> {
    const tokens = await fetchCoinbase();

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

  /**
   * Base Sepolia: test stocks from @alloy/sdk deployments, live mock-feed prices, and the icon of
   * the real ticker's Coinbase stock token (tNVDAc -> NVDAc) when the upstream list is reachable.
   */
  async function readTestnet(): Promise<Stock[]> {
    const dep = getDeployment(84532);
    if (!dep) return [];
    const client = clients(84532);
    const stocks = listStocks(dep);
    const [icons, rounds] = await Promise.all([
      fetchCoinbase().catch((err) => {
        console.error("[stocks] icon lookup failed:", err instanceof Error ? err.message : err);
        return [] as CoinbaseTokenT[];
      }),
      Promise.all(
        stocks.map((s) =>
          read<readonly [bigint, bigint, bigint, bigint, bigint]>(client, s.feed, iAggregatorV3Abi, "latestRoundData").catch(
            () => null,
          ),
        ),
      ),
    ]);
    return stocks.map((s, i) => {
      const real = icons.find((t) => t.symbol.toUpperCase() === `${s.underlying}C`);
      const round = rounds[i];
      const answer = round && round[1] > 0n ? round[1] : null;
      return {
        chainId: 84532 as const,
        address: s.token,
        symbol: s.symbol,
        name: s.name,
        decimals: s.decimals,
        iconUrl: real?.icon_url ?? null,
        isin: real?.isin ?? null,
        multiplier: null,
        listed: true,
        testnet: {
          underlying: s.underlying,
          feed: s.feed,
          pool: s.pool,
          allowed: s.allowed,
          priceUsd8: answer?.toString() ?? null,
          price: answer === null ? null : Number(answer) / 1e8,
          priceUpdatedAt: round && answer !== null ? new Date(Number(round[3]) * 1000).toISOString() : null,
        },
      };
    });
  }

  return {
    async list(chainId: SupportedChainId): Promise<{ data: Stock[]; fetchedAt: number; stale: boolean }> {
      const hit = cache.get(chainId);
      const ttl = chainId === 84532 ? TESTNET_CACHE_TTL_MS : CACHE_TTL_MS;
      if (hit && Date.now() - hit.fetchedAt < ttl) return { ...hit, stale: false };
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

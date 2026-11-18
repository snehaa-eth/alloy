import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";
import { aggregatorAbi } from "./abis.js";
import { usdToAnswer } from "./math.js";

export const COINBASE_API = "https://api.coinbase.com/v1/tokenized-stocks";

export interface RealPrice {
  /** 8-dec USD per raw token (Chainlink semantics: underlying x multiplier). */
  answer: bigint;
  source: string;
  /** Unix seconds of the upstream observation. */
  observedAt: number;
  multiplier?: number;
}

interface CoinbaseToken {
  symbol: string; // NVDAc
  nav_price?: number;
  nav_price_updated_at?: string;
  multiplier?: number;
  decimals: number;
  contract_address: string;
}

/**
 * Coinbase tokenized-stocks API (no key). `nav_price` is the NAV per token. Keyed by underlying ticker
 * ("NVDAc" -> "NVDA").
 */
export async function fetchCoinbasePrices(tickers: string[]): Promise<Record<string, RealPrice>> {
  const res = await fetch(COINBASE_API, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Coinbase API ${res.status} ${res.statusText}`);
  const body = (await res.json()) as { tokens: CoinbaseToken[] };
  const out: Record<string, RealPrice> = {};
  for (const t of body.tokens) {
    const ticker = t.symbol.replace(/c$/, "");
    if (!tickers.includes(ticker) || t.nav_price === undefined || t.nav_price <= 0) continue;
    out[ticker] = {
      answer: usdToAnswer(t.nav_price),
      source: `coinbase:${t.symbol}`,
      observedAt: t.nav_price_updated_at ? Math.floor(Date.parse(t.nav_price_updated_at) / 1000) : 0,
      multiplier: t.multiplier,
    };
  }
  return out;
}

/** Base-mainnet Chainlink feeds (addresses from config/mainnet-feeds.json). Answers rescaled to 8 dec. */
export async function fetchChainlinkPrices(
  feeds: Record<string, Address>,
  tickers: string[],
  rpcUrl: string,
): Promise<Record<string, RealPrice>> {
  const client = createPublicClient({ chain: base, transport: http(rpcUrl) });
  const out: Record<string, RealPrice> = {};
  for (const ticker of tickers) {
    const feed = feeds[ticker];
    if (!feed) continue;
    const [dec, round] = await Promise.all([
      client.readContract({ address: feed, abi: aggregatorAbi, functionName: "decimals" }),
      client.readContract({ address: feed, abi: aggregatorAbi, functionName: "latestRoundData" }),
    ]);
    const [, answer, , updatedAt] = round;
    if (answer <= 0n) continue;
    const scaled = dec === 8 ? answer : dec > 8 ? answer / 10n ** BigInt(dec - 8) : answer * 10n ** BigInt(8 - dec);
    out[ticker] = { answer: scaled, source: `chainlink:${feed}`, observedAt: Number(updatedAt) };
  }
  return out;
}

export async function fetchRealPrices(opts: {
  source: "coinbase" | "chainlink";
  tickers: string[];
  mainnetFeeds: Record<string, Address>;
  mainnetRpcUrl: string;
}): Promise<Record<string, RealPrice>> {
  if (opts.source === "chainlink") {
    const cl = await fetchChainlinkPrices(opts.mainnetFeeds, opts.tickers, opts.mainnetRpcUrl);
    const missing = opts.tickers.filter((t) => !cl[t]);
    if (missing.length === 0) return cl;
    // Fill any ticker without a configured mainnet feed from Coinbase.
    const cb = await fetchCoinbasePrices(missing);
    return { ...cb, ...cl };
  }
  return fetchCoinbasePrices(opts.tickers);
}

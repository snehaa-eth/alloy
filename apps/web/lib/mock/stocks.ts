/**
 * MOCK DATA — v2 stock universe (ARCHITECTURE §1). Token addresses are the Base
 * mainnet B20 addresses from the doc; prices are illustrative, not live.
 * TODO(api): replace with GET /stocks.
 */
import type { Stock } from "@/lib/types";

const px = (dollars: number, cents = 0) => BigInt(dollars) * 10n ** 8n + BigInt(cents) * 10n ** 6n;

export const MOCK_STOCKS: Stock[] = [
  { symbol: "NVDAc", ticker: "NVDA", name: "NVIDIA", token: "0xb20000000000000000000078ee7ce2fE4908108C", price8: px(182, 41) },
  { symbol: "AMZNc", ticker: "AMZN", name: "Amazon", token: "0xb200000000000000000000d9192b6B456483C2E8", price8: px(231, 7) },
  { symbol: "SNDKc", ticker: "SNDK", name: "Sandisk", token: "0xb200000000000000000000397293Cb8cda9a10c5", price8: px(64, 12) },
  { symbol: "GOOGLc", ticker: "GOOGL", name: "Alphabet", token: "0xb2000000000000000000002D0BA3164cc74f58B7", price8: px(251, 33) },
  { symbol: "SPCXc", ticker: "SPCX", name: "SPCX", token: "0xb2000000000000000000007b9fcbd005511aCBd5", price8: px(38, 90) },
  { symbol: "METAc", ticker: "META", name: "Meta Platforms", token: "0xb2000000000000000000008bC8786B856E61707C", price8: px(712, 5) },
  { symbol: "MSTRc", ticker: "MSTR", name: "Strategy", token: "0xb2000000000000000000004884b426556b92883d", price8: px(318, 76) },
  { symbol: "TSLAc", ticker: "TSLA", name: "Tesla", token: "0xb2000000000000000000001e800a7f5189430cD0", price8: px(402, 18) },
  { symbol: "AAPLc", ticker: "AAPL", name: "Apple", token: "0xb200000000000000000000C2e324d24d7eEcd1fb", price8: px(229, 64) },
  { symbol: "MSFTc", ticker: "MSFT", name: "Microsoft", token: "0xB200000000000000000000Ab99cFa739E253872B", price8: px(497, 51) },
];

export function mockStock(ticker: string): Stock {
  const s = MOCK_STOCKS.find((x) => x.ticker === ticker);
  if (!s) throw new Error(`unknown mock stock ${ticker}`);
  return s;
}

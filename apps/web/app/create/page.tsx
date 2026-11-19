import type { Metadata } from "next";
import { getStocks } from "@/lib/data";
import { getDeployment } from "@/lib/contracts";
import { DEFAULT_CHAIN_ID } from "@/lib/chains";
import { CreateScreen, type PickStock } from "@/components/alloy/screens/CreateScreen";

export const metadata: Metadata = { title: "Cast a basket" };

/** The six Base Sepolia test stocks (packages/testnet-env). */
const TESTNET_TICKERS = ["NVDA", "MSFT", "GOOGL", "AMZN", "AAPL", "TSLA"];

export default async function CreatePage() {
  const deployed = getDeployment(DEFAULT_CHAIN_ID).stocks;
  const all = await getStocks().catch(() => []);
  // live price per token (display only); the allowed list stays the deployed stocks
  const price = (token: string) => all.find((s) => s.token.toLowerCase() === token.toLowerCase())?.price8.toString() ?? null;
  let stocks: PickStock[] = deployed.map((s) => ({ ticker: s.ticker, name: s.name, token: s.token, price8: price(s.token) }));
  if (stocks.length === 0) {
    stocks = all.filter((s) => TESTNET_TICKERS.includes(s.ticker)).map((s) => ({ ticker: s.ticker, name: s.name, token: s.token, price8: s.price8.toString() }));
  }
  return <CreateScreen stocks={stocks} />;
}

/** Live chain data: re-read at most every 30s. */
export const revalidate = 30;

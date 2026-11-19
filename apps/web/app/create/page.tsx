import type { Metadata } from "next";
import { getStocks } from "@/lib/data";
import { getDeployment } from "@/lib/contracts";
import { DEFAULT_CHAIN_ID } from "@/lib/chains";
import { CreateScreen, type PickStock } from "@/components/alloy/screens/CreateScreen";

export const metadata: Metadata = { title: "Build a basket" };

/** The six Base Sepolia test stocks (packages/testnet-env). */
const TESTNET_TICKERS = ["NVDA", "MSFT", "GOOGL", "AMZN", "AAPL", "TSLA"];

export default async function CreatePage() {
  const deployed = getDeployment(DEFAULT_CHAIN_ID).stocks;
  let stocks: PickStock[] = deployed.map((s) => ({ ticker: s.ticker, name: s.name, token: s.token }));
  if (stocks.length === 0) {
    const all = await getStocks();
    stocks = all.filter((s) => TESTNET_TICKERS.includes(s.ticker)).map((s) => ({ ticker: s.ticker, name: s.name, token: s.token }));
  }
  return <CreateScreen stocks={stocks} />;
}

/** Live chain data: re-read at most every 30s. */
export const revalidate = 30;

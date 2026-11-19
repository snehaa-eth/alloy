// Live smoke test against Base Sepolia (no Mongo, no Privy, no keys).
//   npx tsx scripts/smoke.ts [basket] [usdc]
// Hits the real services through the Express app with only the RPC live.
import request from "supertest";
import { createApp } from "../src/app";
import { loadEnv } from "../src/config/env";

const BASKET = process.argv[2] ?? "0x60B0E5813dF4D7C5e602f78743c73CC90A63d36c";
const USDC = process.argv[3] ?? "10";

async function main() {
  const env = loadEnv({
    NODE_ENV: "development",
    MONGO_URI: "mongodb://127.0.0.1:1/unused",
    CHAIN_IDS: "84532",
    ALLOWED_ORIGINS: "http://localhost:3000",
    PRIVY_APP_ID: "smoke",
    PRIVY_APP_SECRET: "smoke",
    RPC_URL_BASE_SEPOLIA: process.env.RPC_URL_BASE_SEPOLIA || "https://sepolia.base.org",
  });
  const app = createApp({
    env,
    faucet: null,
    basketMeta: { byChain: async () => null }, // on-chain only
  });

  const amount = BigInt(Math.round(Number(USDC) * 1e6)).toString();
  const t0 = Date.now();
  const buy = await request(app).get(`/quote?chainId=84532&basket=${BASKET}&side=buy&amount=${amount}`);
  const t1 = Date.now();
  console.log(`GET /quote buy $${USDC} -> ${buy.status} (${t1 - t0} ms)`);
  console.log(JSON.stringify(buy.body, null, 2));
  if (buy.status !== 200) process.exit(1);

  const q = buy.body.data;
  console.log(
    `\nsummary: $${USDC} -> ${(Number(q.expectedResult) / 1e18).toFixed(4)} shares (min ${(Number(q.minResult) / 1e18).toFixed(4)}),` +
      ` cost ${q.cost ? `${q.cost.bps} bps ($${(Number(q.cost.totalUsdc) / 1e6).toFixed(4)})` : "n/a"}`,
  );

  const cached = Date.now();
  await request(app).get(`/quote?chainId=84532&basket=${BASKET}&side=buy&amount=${amount}`);
  console.log(`repeat (cache hit): ${Date.now() - cached} ms`);

  const sellShares = (BigInt(q.expectedResult) / 2n).toString();
  const sell = await request(app).get(`/quote?chainId=84532&basket=${BASKET}&side=sell&amount=${sellShares}`);
  console.log(
    `GET /quote sell ${(Number(sellShares) / 1e18).toFixed(4)} shares -> ${sell.status}: ` +
      (sell.status === 200
        ? `${(Number(sell.body.data.expectedResult) / 1e6).toFixed(4)} tUSDC, cost ${sell.body.data.cost?.bps} bps`
        : JSON.stringify(sell.body)),
  );

  const stocks = await request(app).get("/stocks?chainId=84532");
  console.log(
    `GET /stocks -> ${stocks.status}: ` +
      (stocks.body.data ?? [])
        .map((s: { symbol: string; testnet?: { price: number | null }; iconUrl: string | null }) => `${s.symbol}=$${s.testnet?.price}${s.iconUrl ? "+icon" : ""}`)
        .join(" "),
  );

  const baskets = await request(app).get("/baskets?chainId=84532");
  console.log(
    `GET /baskets -> ${baskets.status}: ` +
      (baskets.body.data ?? [])
        .map((b: { name: string; nav: string; components: unknown[]; followers: number | null }) =>
          `${b.name} nav=$${(Number(b.nav) / 1e8).toFixed(2)} comps=${b.components.length} followers=${b.followers}`,
        )
        .join("; "),
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

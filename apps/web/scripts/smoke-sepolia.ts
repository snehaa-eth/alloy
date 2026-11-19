/**
 * Live smoke test against Base Sepolia: reads the demo basket and quotes a $10 buy and a sell.
 *   npm run smoke            (RPC: RPC_URL_84532 / NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL / https://sepolia.base.org)
 *   npm run smoke -- 0x<basket> 25   (basket, USD amount)
 */
import type { Address } from "viem";
import { DEMO_BASKET, getDeployment } from "../lib/contracts";
import { readBasket, readBasketAddresses, readNavSeries, readStocks } from "../lib/onchain";
import { quoteBuyOnchain, quoteSellOnchain } from "../lib/quote";
import { getReadClient } from "../lib/rpc";
import { formatBps, formatFixed, formatPrice8, formatShares, formatUsd6, parseUsdc } from "../lib/units";

const CHAIN = 84532 as const;

async function main() {
  const basket = (process.argv[2] as Address | undefined) ?? DEMO_BASKET;
  const usd = process.argv[3] ?? "10";
  const client = getReadClient(CHAIN);
  const d = getDeployment(CHAIN);
  console.log(`chain ${CHAIN} block ${await client.getBlockNumber()} factory ${d.factory} router ${d.router}`);

  const all = await readBasketAddresses(CHAIN);
  console.log(`factory baskets (${all.length}): ${all.join(", ")}`);

  const stocks = await readStocks(CHAIN);
  for (const s of stocks) {
    const age = s.priceUpdatedAt ? Math.round((Date.now() / 1000 - s.priceUpdatedAt) / 60) : -1;
    console.log(`  ${s.symbol.padEnd(8)} ${formatPrice8(s.price8).padStart(10)}  feed age ${age}m`);
  }

  const b = await readBasket(basket, { chainId: CHAIN });
  console.log(`\n${b.name} (${b.symbol}) creator ${b.creator.displayName} demo=${b.demo} notice=${b.noticeSeconds}s fee=${formatBps(b.feeBps)}/yr mode=${b.mode}`);
  console.log(`  NAV ${formatUsd6(b.navUsd6!)}  NAV/share ${formatUsd6(b.navPerShareUsd6!, 4)}  supply ${formatShares(b.totalSupply)}  created ${b.createdAt ? new Date(b.createdAt * 1000).toISOString() : "?"}`);
  for (const c of b.components) {
    console.log(`  ${c.stock.symbol.padEnd(8)} target ${formatBps(c.targetBps).padStart(7)}  bal ${formatFixed(c.balance8, 8, 6)}`);
  }
  console.log(`  pending recipe: ${b.pendingRecipe ? JSON.stringify(b.pendingRecipe.weightsBps) : "none"}`);
  const series = await readNavSeries(b);
  console.log(`  nav series points: ${series.length}`);

  const usdcIn = parseUsdc(usd);
  const t0 = Date.now();
  const q = await quoteBuyOnchain(client, CHAIN, basket, usdcIn, 100);
  console.log(`\nBUY ${formatUsd6(usdcIn)} (1% slippage) quoted in ${Date.now() - t0}ms`);
  for (const l of q.legs) {
    console.log(`  ${l.symbol.padEnd(8)} in ${formatUsd6(l.amountIn)}  out ${formatFixed(l.expectedOut, 8, 8)}  minOut ${formatFixed(l.minOut, 8, 8)}`);
  }
  console.log(`  shares ${formatShares(q.expectedOut, 6)}  minShares ${formatShares(q.minResult, 6)}`);
  console.log(`  oracle value ${formatUsd6(q.oracleValueUsd6, 4)}  refund ~${formatUsd6(q.refundUsd6, 4)}  dust ${formatUsd6(q.dustUsd6, 4)}  cost ${q.priceImpactBps} bps`);

  const s = await quoteSellOnchain(client, CHAIN, basket, q.expectedOut, 100);
  console.log(`\nSELL ${formatShares(q.expectedOut, 6)} shares -> ${formatUsd6(s.expectedOut, 4)} (min ${formatUsd6(s.minResult, 4)}), oracle ${formatUsd6(s.oracleValueUsd6, 4)}, cost ${s.priceImpactBps} bps`);
}

main().catch((e) => {
  console.error("SMOKE FAILED:", e);
  process.exit(1);
});

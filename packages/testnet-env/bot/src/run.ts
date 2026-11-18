/**
 * Price-sync daemon. Every INTERVAL_MIN minutes, for each test stock:
 *   1. mirror  (MODE=mirror): read the real price (Coinbase API or Base-mainnet Chainlink) and push it to the
 *      MockPriceFeed when it moved >= DEVIATION_BPS, or the round is older than HEARTBEAT_HOURS.
 *      hold   (MODE=hold):   keep the current (scenario) price; only re-push it on heartbeat.
 *      Paused feeds are never touched (they model a Chainlink pause / corporate action).
 *   2. arbitrage the Uniswap v3 pool back to the feed price (within ARB_TOLERANCE_BPS).
 *
 *   pnpm bot                 # loop
 *   pnpm bot --once          # single pass
 *   pnpm bot --dry-run       # read + simulate only (no transactions)
 *   pnpm bot --mode hold     # demo day: don't overwrite scenario prices
 */
import { arbPool, makeCtx, pushPrice, readFeed, type Ctx } from "./chain.js";
import { loadConfig } from "./config.js";
import { loadDeployments } from "./deployments.js";
import { deviationBps, fmtUsd } from "./math.js";
import { fetchRealPrices } from "./prices.js";

async function tick(ctx: Ctx) {
  const { cfg } = ctx;
  const stocks = Object.values(ctx.d.stocks);
  const real =
    cfg.mode === "mirror"
      ? await fetchRealPrices({
          source: cfg.priceSource,
          tickers: stocks.map((s) => s.underlying),
          mainnetFeeds: cfg.mainnetFeeds,
          mainnetRpcUrl: cfg.mainnetRpcUrl,
        }).catch((e: unknown) => {
          ctx.log(`price source failed (${e instanceof Error ? e.message : e}); holding current prices this tick`);
          return {} as Awaited<ReturnType<typeof fetchRealPrices>>;
        })
      : {};
  const block = await ctx.pub.getBlock();

  for (const s of stocks) {
    try {
      const f = await readFeed(ctx, s);
      const age = Number(block.timestamp - f.updatedAt);
      const heartbeatDue = cfg.heartbeatHours > 0 && age >= cfg.heartbeatHours * 3600;
      const r = real[s.underlying];
      if (f.paused) {
        ctx.log(`${s.symbol}: feed paused — skipping push`);
      } else if (r && deviationBps(r.answer, f.answer) >= cfg.deviationBps) {
        await pushPrice(ctx, s, r.answer, `mirror ${r.source}, ${deviationBps(r.answer, f.answer)} bps`);
      } else if (heartbeatDue) {
        await pushPrice(ctx, s, r?.answer ?? f.answer, `heartbeat, last round ${Math.round(age / 3600)}h old`);
      } else {
        ctx.log(`${s.symbol}: feed ${fmtUsd(f.answer)} up to date (age ${Math.round(age / 60)} min)`);
      }
      if (!cfg.noArb) await arbPool(ctx, s);
    } catch (e) {
      ctx.log(`${s.symbol}: ERROR ${e instanceof Error ? e.message.split("\n")[0] : e}`);
    }
  }
}

async function main() {
  const cfg = loadConfig();
  const d = loadDeployments(cfg.deploymentsPath);
  const ctx = await makeCtx(cfg, d);
  ctx.log(
    `alloy price-sync bot: chain ${d.chainId}, sender ${ctx.sender}, mode ${cfg.mode}/${cfg.priceSource}, ` +
      `every ${cfg.intervalMinutes} min, arb tol ${cfg.arbToleranceBps} bps`,
  );
  const once = process.argv.includes("--once") || cfg.dryRun;
  for (;;) {
    await tick(ctx);
    if (once) break;
    await new Promise((r) => setTimeout(r, cfg.intervalMinutes * 60_000));
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

/**
 * Demo scenario CLI. Sets feed prices by hand, then arbitrages the pool to match (unless --no-arb).
 *
 *   pnpm scenario status
 *   pnpm scenario google +20%        # relative move
 *   pnpm scenario nvda -7.5%
 *   pnpm scenario tsla 420.69        # absolute USD
 *   pnpm scenario all -5%            # market-wide move
 *   pnpm scenario msft x2            # multiply
 *   pnpm scenario aapl reset         # back to the real (Coinbase) price; `all reset` for everything
 *   pnpm scenario amzn pause         # freeze feed (Chainlink pause flag) -> Alloy must refuse rebalances
 *   pnpm scenario amzn unpause
 *   pnpm scenario googl stale        # new round with updatedAt = now - 26h -> fails Alloy's 25h staleness check
 *   pnpm scenario googl arb          # only re-align the pool to the current feed price
 *
 * Flags: --dry-run (simulate only), --no-arb, --deployments <file>
 */
import { arbPool, backdate, makeCtx, pushPrice, readFeed, setPaused, status } from "./chain.js";
import { loadConfig } from "./config.js";
import { loadDeployments, resolveStocks } from "./deployments.js";
import { applyChange } from "./math.js";
import { fetchRealPrices } from "./prices.js";

const USAGE = `usage: pnpm scenario <stock|all> <+N%|-N%|xN|PRICE|reset|pause|unpause|stale|arb> [--dry-run] [--no-arb]
       pnpm scenario status`;

async function main() {
  const argv = process.argv.slice(2);
  const positional = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--deployments");
  const cfg = loadConfig(argv);
  const d = loadDeployments(cfg.deploymentsPath);
  const ctx = await makeCtx(cfg, d);

  if (positional[0] === "status" || positional.length === 0) {
    await status(ctx);
    if (positional.length === 0) console.log(USAGE);
    return;
  }
  const [who, action] = positional;
  if (!who || !action) throw new Error(USAGE);
  const stocks = resolveStocks(d, who);

  const real =
    action === "reset"
      ? await fetchRealPrices({
          source: cfg.priceSource,
          tickers: stocks.map((s) => s.underlying),
          mainnetFeeds: cfg.mainnetFeeds,
          mainnetRpcUrl: cfg.mainnetRpcUrl,
        })
      : {};

  for (const s of stocks) {
    const f = await readFeed(ctx, s);
    let target: bigint | undefined; // explicit target so --dry-run arb previews the post-update price
    switch (action) {
      case "pause":
        await setPaused(ctx, s, true);
        continue; // pool left alone: a paused feed means "don't trust prices", not "move the market"
      case "unpause":
        await setPaused(ctx, s, false);
        break;
      case "stale": {
        const block = await ctx.pub.getBlock();
        await backdate(ctx, s, f.answer, block.timestamp - 26n * 3600n);
        continue;
      }
      case "arb":
        break;
      case "reset": {
        const r = real[s.underlying];
        if (!r) throw new Error(`no real price for ${s.underlying}`);
        if (await pushPrice(ctx, s, r.answer, `reset to ${r.source}`)) target = r.answer;
        break;
      }
      default: {
        const next = applyChange(f.answer, action);
        if (await pushPrice(ctx, s, next, `scenario ${action}`)) target = next;
      }
    }
    if (!cfg.noArb) await arbPool(ctx, s, target);
  }
  if (!cfg.dryRun) await status(ctx);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

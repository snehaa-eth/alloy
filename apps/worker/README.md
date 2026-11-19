# Alloy worker (`apps/worker`)

The always-on worker for Base Sepolia. It runs three processes in one container (`services/main.ts`):

| Process | What it does | Code |
|---|---|---|
| **indexer** | Ponder 0.18: indexes the factory, every basket (factory pattern) and the router from `deployedAtBlock`, and serves the read API (REST + GraphQL + SQL-over-HTTP) | `ponder.config.ts`, `ponder.schema.ts`, `src/` |
| **keeper** | 60 s loop: drift trims per strategy mode, due recipe changes, weekly `accrueFee`, alerts | `services/keeper/` |
| **price-sync** | Runs the testnet-env bot (`packages/testnet-env/bot`) every 5 min in `mirror` mode, so feeds never go stale (rebalances need rounds ≤ 25 h old) and pools stay arbed. Has a `hold` switch for demo days | `services/pricesync.ts` |

ABIs and addresses come from `packages/sdk/src` (imported by relative path via `lib/sdk.ts`).

## Why Ponder

- ARCHITECTURE §4 already plans "Ponder indexer + Postgres". The worker is a plain Node 22 service, not part of the Next app, so nothing in the Next setup gets in the way.
- Factory child indexing, block-interval handlers (the hourly NAV snapshots), reorg handling, RPC caching, and GraphQL/SQL-over-HTTP all come built in. A hand-rolled viem log indexer would have to rebuild each of these.
- Storage: PGlite (embedded) for local work. Postgres via `DATABASE_URL` on Railway.

## Run locally

```bash
cd apps/worker
pnpm install --ignore-workspace
pnpm -C ../../packages/testnet-env/bot install --ignore-workspace   # price-sync child process
pnpm typecheck && pnpm test                                       # planner + PnL unit tests
pnpm dev                       # indexer only (PGlite), http://localhost:42069
pnpm keeper --once --dry-run   # plan + simulate, no txs
pnpm start                     # everything (supervisor)
```

### Against a local Base Sepolia fork (how this was validated)

```bash
~/.foundry/bin/base-anvil --fork-url https://sepolia.base.org --port 8548 --auto-impersonate &
# 1. seed baskets on the fork (impersonating the deployer, nothing leaves the machine)
(cd packages/contracts && base-forge script script/SeedBaskets.s.sol --rpc-url http://127.0.0.1:8548 \
   --broadcast --unlocked --sender 0xcBe600349CE4cF89842Bc371E4a4062140CDCCcD --slow)
# 2. indexer (REORG_WINDOW=0 is required on an anvil fork; use a throwaway PGlite dir)
RPC_URL=http://127.0.0.1:8548 REORG_WINDOW=0 PGLITE_DIR=/tmp/pglite-fork pnpm ponder start --port 42070 --schema fork
# 3. move a price (testnet-env scenario; explicit unlocked signer, never the .env key)
(cd packages/testnet-env && RPC_URL=http://127.0.0.1:8548 DEPLOYER_PK= BOT_PK= \
   BOT_ADDRESS=0xcBe600349CE4cF89842Bc371E4a4062140CDCCcD pnpm -C bot scenario nvda +30%)
# 4. keeper
RPC_URL=http://127.0.0.1:8548 KEEPER_ADDRESS=0xcBe600349CE4cF89842Bc371E4a4062140CDCCcD pnpm keeper --once
```

## Seeding baskets (`packages/contracts/script/SeedBaskets.s.sol`)

The script creates four baskets from the six test stocks and prints their addresses as JSON (`SEED_BASKETS_JSON`).

| Basket | Weights | Mode |
|---|---|---|
| The AI Build-Out (`aAIBO`) | NVDA 40, MSFT 25, GOOGL 20, AMZN 15 | Balanced |
| Big Tech, Trimmed (`aBIGT`) | AAPL, MSFT, GOOGL, AMZN at 25 each | Balanced |
| Conviction Bets (`aCONV`) | TSLA 60, NVDA 40 | Let Winners Run |
| Alloy Demo: Judges' Basket (`aDEMO`) | NVDA 50, GOOGL 25, MSFT 25 | Balanced, `demo=true` (10-min notice) |

Notes on the baskets:
- **No META.** The real AI Build-Out theme holds META, but the testnet set has no META.
- **Conviction Bets cap is 70%, not 40%.** The factory requires every target to be ≤ cap, so a 60% TSLA target needs a cap of at least 60%.
- **Funding.** The deployer has `MINT_ROLE` on tUSDC and mints the 3,500 tUSDC of seeds. Without that role, the script falls back to one faucet drip.
- **Salts** are deterministic per (`SALT_VERSION`, symbol), so a re-run reverts instead of creating duplicates. Bump `SALT_VERSION` to create a fresh set.

To broadcast to Base Sepolia (from `packages/contracts`, with `DEPLOYER_PK` and `BASE_SEPOLIA_RPC` set in `../testnet-env/.env`):

```bash
set -a; . ../testnet-env/.env; set +a
# 1) simulate only
~/.foundry/bin/base-forge script script/SeedBaskets.s.sol --rpc-url "$BASE_SEPOLIA_RPC" --private-key "$DEPLOYER_PK"
# 2) broadcast (gas multiplier: B20 precompile gas is under-estimated)
SEED_OUT=deployments/baskets.84532.json ~/.foundry/bin/base-forge script script/SeedBaskets.s.sol \
  --rpc-url "$BASE_SEPOLIA_RPC" --private-key "$DEPLOYER_PK" --broadcast --slow --gas-estimate-multiplier 200
```

## Keeper policy

The keeper reads each basket's targets, bands, cap, pending recipe, `nextTrimAt`, balances, and feed prices. It then runs `services/keeper/planner.ts`, a pure function with unit tests. The planner follows the on-chain band rule exactly:

- `band(T) = min(abs, rel·T)`, where a setting of 10 000 disables that limb.
- Every component must end in band.
- A component that started out of band must not move away from its target and must not cross it.

| Mode | Behaviour |
|---|---|
| `balanced` | Trims each breaching component back to its band edge, minus `KEEPER_MARGIN_BPS` (20 bps) to leave room for execution cost. The freed weight goes to components below target, never past their target. |
| `let-winners-run` | Has no drift trims, because the params disable both bands. It only trades when a component is above the cap. |
| `trend` | Works like `balanced`, with three differences: <br>• It computes a 50-day MA from the daily closes in the feed's round history (`getRoundData`). <br>• It never trims an over-band winner unless the last 2 daily closes were below the MA. If such a winner is out of band, it skips the whole trim, because the band rule makes a partial rebalance revert. <br>• It avoids topping up components below their MA. <br>With fewer than `TREND_MIN_DAYS` (20) closes, which is the case on a fresh testnet feed, it falls back to `balanced`. |

**How the mode is chosen.** The mode comes from `config/modes.json`, or from the `KEEPER_MODES` env var, keyed by basket address or symbol. Prefer addresses, since symbols can repeat. If neither sets one, the default is inferred from the params: absBand = relBand = 10 000 means `let-winners-run`; anything else means `balanced`.

**Recipe changes.** When a recipe change is due (`now ≥ executableAt`), the keeper executes it with the new targets. The trim cooldown does not apply. If the basket is already in band for the new targets, it sends `executeRebalance([])`.

**Cooldowns and guards.** The keeper skips a basket in these cases:
- the trim cooldown has not passed (`nextTrimAt`);
- a feed is older than 25 h;
- the basket is empty.

**Transactions.**
- Trades go from one stock to another through USDC (`Trade{from,to,amountIn}`), with at most one trade per seller/buyer pair.
- Every transaction is simulated first (`simulateContract` as the keeper) and decoded on revert. `DRY_RUN=true` stops after simulation.
- Gas is set to the estimate × `KEEPER_GAS_MULTIPLIER` (2). Without that padding, the first fork trim ran out of gas at 1.21M against a 1.23M estimate.
- If a transaction fails with `BandViolation` or `LossTooHigh`, the keeper retries with a doubled margin (up to 3 tries).

**Fees.** The keeper calls `accrueFee()` when `lastAccrual` is 7 days or more old.

**Alerts** (Telegram and/or webhook, de-duplicated over 30 min):
- a recipe more than 30 min overdue;
- a stale feed;
- the signer is not `factory.keeper()`;
- keeper balance below 0.005 ETH;
- the indexer more than 50 blocks behind (`INDEXER_URL/status`);
- a failed transaction.

## Read API (for `apps/api`, set `PONDER_URL` to the worker URL)

Amounts are decimal strings in these units:
- `*Usdc6`: USDC, 6 decimals.
- `*Usd8`: USD, 8 decimals.
- Shares: 18 decimals.
- `navPerShare`: USD with 8 decimals, per 1e18 shares. Seed = 1e8 = $1.

| Endpoint | Returns |
|---|---|
| `GET /v1/baskets?sort=tvl\|holders\|new\|perf` | All baskets: params, `navUsd8`, `navPerShare`, `holdersCount`, `rebalanceCount`, pending recipe, `returnBps` since inception |
| `GET /v1/baskets/:a` | One basket plus its `positions` (balance, valueUsd8, weightBps, targetBps) |
| `GET /v1/baskets/:a/performance` | `{navSeries, maxDrawdownBps, creatorPnL, followerPnL, feesEarned, holdersCount}` (ARCHITECTURE §4 shape) |
| `GET /v1/baskets/:a/nav?from&to&source=hourly\|event\|all` | NAV series: hourly snapshots plus one after every issue, redeem and rebalance |
| `GET /v1/baskets/:a/holders?limit=` | Holders with per-holder PnL |
| `GET /v1/baskets/:a/rebalances?limit=` | Rebalance feed (Rebalanced, RecipeProposed/Cancelled/Executed, ComponentRemoved) plus the pending recipe |
| `GET /v1/rebalances?limit=` | Global rebalance feed |
| `GET /v1/baskets/:a/events?kind=&limit=` | Raw events (Issued, Redeemed, Bought, Sold, BuyLeftovers, FeeAccrued, OwedClaimed, …) |
| `GET /v1/accounts/:a` | An account's holdings with PnL, and the baskets it created |
| `GET /v1/worker/status` | Keeper heartbeat and its last per-basket actions; price-sync mode |
| `POST /v1/admin/price-sync` | Body `{"mode":"hold"\|"mirror"\|"off","minutes"?:n}` with `Authorization: Bearer $ADMIN_TOKEN`. This is the demo-day switch. |
| `POST /graphql`, `/sql/*` | Ponder GraphQL and SQL-over-HTTP (`@ponder/client`) over the tables `basket`, `holder`, `event`, `nav_snapshot`, `position` |
| `GET /health`, `/ready`, `/status`, `/metrics` | Built into Ponder. `/status` gives the indexed block. |

**How PnL is computed.** Each holder has an average-cost basis in USDC:
- A router buy adds the `usdcIn` actually paid.
- A direct `issue` adds the shares' value at `navPerShare`.
- The creator's seed counts the USDC seed.
- A sell or redeem removes cost at the average and books realized PnL.
- Wallet-to-wallet transfers carry their cost with them.
- Fee shares come in at zero cost, so they show up in the creator's PnL. They are also reported on their own as `feesEarned`.

`followerPnL` covers every holder except the creator, `0x…dEaD`, the router and the factory.

## Deploy on Railway (not deployed yet)

1. Create a Railway service from this repo and keep the root directory as the **repo root**. Railway picks up `apps/worker/railway.json`; point the service's config path at it. The Docker build context must be the repo root, because the image needs `packages/sdk` and `packages/testnet-env/bot`.
2. Add a Postgres plugin and set `DATABASE_URL`. Set the env vars from `.env.example`. These three are secrets: `KEEPER_PK`, `PRICE_BOT_PK`, `ADMIN_TOKEN`.
3. Use exactly one replica (one keeper). Expose the port and set `PONDER_URL` in the `crates-mantle` Vercel project.
4. To split the processes into separate services, use the same image with `RUN_INDEXER` / `RUN_KEEPER` / `RUN_PRICE_SYNC` toggles.

## Environment

See `.env.example`. The main variables:

| Variable | Purpose |
|---|---|
| `RPC_URL` | Comma-separated list of RPCs, used as a fallback list |
| `DATABASE_URL`, `DATABASE_SCHEMA` | Postgres connection and schema for the indexer |
| `KEEPER_PK` | Keeper key (or `KEEPER_ADDRESS` on an unlocked fork) |
| `DRY_RUN` | Simulate only, send nothing |
| `KEEPER_MODES` | Per-basket mode overrides |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ALERT_WEBHOOK_URL` | Alert channels |
| `PRICE_SYNC_MODE` | `mirror`, `hold` or `off` |
| `PRICE_BOT_PK` | Price-sync bot key |
| `ADMIN_TOKEN` | Bearer token for `POST /v1/admin/price-sync` |
| `NAV_SNAPSHOT_BLOCKS` | Snapshot interval in blocks |
| `REORG_WINDOW` | Set to `0` on forks only |

Keys are never logged. The price-sync child gets `BOT_PK` only from `PRICE_BOT_PK`, and the worker blanks `DEPLOYER_PK` so the bot cannot fall back to a key in `packages/testnet-env/.env`.

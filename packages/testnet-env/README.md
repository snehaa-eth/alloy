# Alloy testnet world (Base Sepolia)

Coinbase tokenized stocks exist only on Base mainnet. This package builds a stand-in on **Base Sepolia (84532)** that we fully control.

**Setup after a fresh clone.** `lib/` is gitignored. Reinstall it with:
```bash
base-forge install foundry-rs/forge-std base/base-std --no-git
```
Base-specific dependencies are documented in `packages/contracts/NOTES.md`.

The pieces:

| Piece | What it is |
|---|---|
| `tUSDC` | B20 **STABLECOIN** (6 dec). The deployer is admin and minter. |
| `tNVDAc tGOOGLc tMSFTc tTSLAc tAAPLc tAMZNc` | B20 **ASSET** (8 dec). The deployer is admin and holds `MINT_ROLE` + `OPERATOR_ROLE`. |
| `MockPriceFeed` ×6 | Chainlink `AggregatorV3Interface` (8 dec, real round history). It is seeded with the current real price, and it has a `paused` flag. |
| `MockFeedPauseRegistry` | Exposes `isOraclePaused(feed)`. `setOraclePaused(feed,bool)` uses the same selector as the mainnet Chainlink pause registry. |
| Uniswap v3 pools ×6 | `stock/tUSDC`, 0.05% fee tier (tick spacing 10). Each starts at the feed price and holds about $250k per side in a range of price/3..price×3. |
| `Faucet` | Holds `MINT_ROLE` on tUSDC. Drips 1,000 tUSDC per address per 24h. `dripTo(addr)` lets someone else pay the gas. |
| `bot/` | TypeScript + viem: price mirror, scenario CLI, and pool arbitrage. |

All addresses are written to `deployments/84532.json`, which is the file `apps/web`, `apps/api` and `packages/contracts` should read.

Feed semantics match mainnet Chainlink (ARCHITECTURE §1):
- `answer` is **USD per raw token**, i.e. the underlying price × the multiplier.
- When paused, the feed is frozen but `updatedAt` still looks fresh, so a guard must check the pause flag separately.

## Verified addresses (Base Sepolia, checked with `base-cast` on 2026-11-19)

| Contract | Address |
|---|---|
| B20 factory precompile | `0xB20f000000000000000000000000000000000000` |
| Uniswap v3 Factory | `0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24` |
| NonfungiblePositionManager | `0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2` (`factory()` matches; `WETH9()` = `0x4200…0006`) |
| SwapRouter02 | `0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4` (`positionManager()` matches) |
| QuoterV2 | `0xC5290058841028F1614F3A6F0F5816cAd0df5E27` (`factory()` matches) |

Uniswap fee tiers that are enabled: 100/1, 500/10, 3000/60.

## Setup

```bash
cd packages/testnet-env
cp .env.example .env            # DEPLOYER_PK=0x…, BASE_SEPOLIA_RPC=…   (.env is gitignored)
base-forge build && base-forge test          # 30 unit tests, offline (B20 precompiles run in-process)
FORK_TESTS=true base-forge test              # + 4 end-to-end tests on a Base Sepolia fork
pnpm -C bot install --ignore-workspace && pnpm -C bot test && pnpm -C bot typecheck
```

`base-forge` reads `.env` automatically. The bot loads `packages/testnet-env/.env` itself, and real environment variables take precedence.

## 1. Deploy

```bash
# 1) fetch CURRENT real prices -> config/prices.json (Coinbase tokenized-stocks API nav_price)
pnpm -C bot prices

# 2) dry run against real Base Sepolia state (simulation only, nothing is sent)
set -a; . ./.env; set +a
base-forge script script/DeployTestnet.s.sol --rpc-url "$BASE_SEPOLIA_RPC"

# 3) real deploy
base-forge script script/DeployTestnet.s.sol --rpc-url "$BASE_SEPOLIA_RPC" \
  --broadcast --slow --gas-estimate-multiplier 200
```

Cost and output:
- About 70 transactions and **about 40.4M gas**, measured on the fork. At Sepolia's ~0.011 gwei that is ≈0.0005 ETH; even at 1 gwei it is ≈0.04 ETH. **Have at least 0.05 ETH.**
- `--gas-estimate-multiplier 200` is a cheap safety margin. Forge simulates the B20 precompiles with Base Foundry v1.1.0, and their gas may differ from the live chain.

Optional env:

| Variable | Default | Meaning |
|---|---|---|
| `BOT_ADDRESS` | deployer | A separate bot signer. It gets MINT on all tokens, updater on all feeds, and pauser on the registry. |
| `LIQUIDITY_USD` | `250000` | USD per side, per pool |
| `RANGE_TICKS` | `11000` | Half-width of the LP range in ticks (≈ ×/÷3). `0` = full range. |
| `FEE_TIER` | `500` | Uniswap v3 fee tier |
| `SALT_VERSION` | `v1` | B20 addresses are `CREATE2`-like from (deployer, salt). Bump this to deploy a fresh set. Re-running with the same salt reverts `TokenAlreadyExists`. |
| `FAUCET_DRIP` | `1000` | Whole tUSDC per drip |
| `PRICES_FILE` | `config/prices.json` | Where to read seed prices |
| `DEPLOYMENTS_OUT` | `deployments/<chainId>.json` | Where to write addresses |

## 2. Faucet

There is nothing to fund: the faucet **mints**, using its `MINT_ROLE` on tUSDC.

```bash
base-cast send <faucet> "drip()"            --rpc-url "$BASE_SEPOLIA_RPC" --private-key …   # caller gets 1,000 tUSDC
base-cast send <faucet> "dripTo(address)" <judge> …                                         # sponsor gas for a judge
# owner knobs
base-cast send <faucet> "setDrip(address,uint256)" <tNVDAc> 100000000 …   # also drip 1 tNVDAc (grant MINT_ROLE first)
base-cast send <faucet> "setMaxDripsPerDay(uint256)" 500 …
```

Judges still need Base Sepolia ETH for gas. Point them at a public faucet, or use `dripTo` from a relayer.

## 3. Price-sync bot (`bot/`)

```bash
pnpm -C bot status                       # feed vs pool, deviation, round age, paused, multiplier
pnpm -C bot bot --dry-run                # one read + simulate pass (no txs)
pnpm -C bot bot                          # loop every INTERVAL_MIN (default 5): mirror real prices + arb
pnpm -C bot bot --mode hold              # DEMO DAY: keep scenario prices, only heartbeat + arb
pnpm -C bot once                         # single pass
```

Each tick, for each stock:
1. **Mirror** (`MODE=mirror`): read the Coinbase `nav_price` (or Base-mainnet Chainlink when `PRICE_SOURCE=chainlink` and `config/mainnet-feeds.json` is filled in). Push it when the change is ≥ `DEVIATION_BPS` (10).
   - A paused feed is never touched.
2. **Heartbeat**: re-push when the last round is older than `HEARTBEAT_HOURS` (12). This keeps Alloy's 25h staleness guard green over weekends.
3. **Arbitrage** (unless `--no-arb`):
   - compute the exact input from in-range liquidity (`math.ts`),
   - mint the tokens,
   - `exactInputSingle` with `sqrtPriceLimitX96 = target`, so it can never overshoot,
   - repeat until within `ARB_TOLERANCE_BPS` (10 = 0.1%).
   - Dry-run instead verifies the swap through QuoterV2.

**Signer:** `BOT_PK`, then `DEPLOYER_PK` from `.env`, or `BOT_ADDRESS` on an unlocked local node.

**Other env:** `RPC_URL`, falling back to `BASE_SEPOLIA_RPC`, then `DEPLOYMENTS`, `INTERVAL_MIN`, `MODE`, `PRICE_SOURCE`, `DEVIATION_BPS`, `HEARTBEAT_HOURS`, `ARB_TOLERANCE_BPS`, `NO_ARB`, `DRY_RUN`.

### Scenarios

```bash
pnpm -C bot scenario google +20%     # feed +20%, then arb the pool to match
pnpm -C bot scenario nvda -7.5%
pnpm -C bot scenario tsla 420.69     # absolute USD
pnpm -C bot scenario all -5%         # market-wide move
pnpm -C bot scenario msft x2
pnpm -C bot scenario all reset       # back to real prices
pnpm -C bot scenario amzn pause      # Chainlink-style pause -> Alloy must refuse rebalances
pnpm -C bot scenario amzn unpause
pnpm -C bot scenario googl stale     # new round with updatedAt = now-26h -> fails the 25h staleness check
pnpm -C bot scenario googl arb       # re-align pool only
# flags: --dry-run  --no-arb  --deployments <file>
```

Two things to know when running scenarios:
- **Stop the mirror daemon, or run it with `--mode hold`.** Otherwise the next tick reverts scenario prices.
- **Pool depth.** Moving a pool +20% costs ≈ $56k of minted tUSDC. A $1k user buy has ≈0.2% price impact plus the 5bp fee.

## 4. Corporate action (split) demo

A split never changes raw balances: the multiplier goes ×N and the per-share price goes ÷N. So the **feed answer (USD per raw token) does not change**. What the feed does is **pause** during the action and then post a fresh round afterwards.

```bash
# 2-for-1 split on tTSLAc, with a 10-minute pause window
SYMBOL=tTSLAc ACTION=schedule  base-forge script script/CorporateAction.s.sol --rpc-url "$BASE_SEPOLIA_RPC" --broadcast
# ...after DELAY_SECONDS (600)
SYMBOL=tTSLAc ACTION=execute   base-forge script script/CorporateAction.s.sol --rpc-url "$BASE_SEPOLIA_RPC" --broadcast
# one-shot
SYMBOL=tTSLAc ACTION=immediate base-forge script script/CorporateAction.s.sol --rpc-url "$BASE_SEPOLIA_RPC" --broadcast
# reverse split 1:10:  RATIO_NUM=1 RATIO_DEN=10
```

**Base Foundry v1.1.0 does not implement the Cobalt / ERC-8056 surface.** That covers `uiMultiplier`, `updateUIMultiplier`, `newUIMultiplier` and `effectiveAt`; those calls revert with their own selector, both in-process and on a `base-anvil` fork. Base Sepolia and mainnet **do** have them (checked by `eth_call`).
- The script feature-detects this. Because forge simulates locally, it always takes the fallback path: pause the feed, then `updateMultiplier` on execute.
- To show a **scheduled** split on Sepolia (`newUIMultiplier`/`effectiveAt` visible to Alloy's "pending multiplier" guard), use cast directly:

```bash
EFF=$(( $(date +%s) + 600 ))
base-cast send <tTSLAc> "updateUIMultiplier(uint256,uint256)" 2000000000000000000 $EFF --rpc-url "$BASE_SEPOLIA_RPC" --private-key "$DEPLOYER_PK"
base-cast send <registry> "setOraclePaused(address,bool)" <tTSLAc feed> true …
# after EFF:
base-cast send <registry> "setOraclePaused(address,bool)" <tTSLAc feed> false …
pnpm -C bot scenario tsla x1         # fresh round, same per-raw price
```

## Local fork (how this was validated)

```bash
base-anvil --fork-url https://sepolia.base.org --port 8547 --chain-id 31337 &
base-forge script script/DeployTestnet.s.sol --rpc-url http://127.0.0.1:8547 --broadcast --slow  # local only
export RPC_URL=http://127.0.0.1:8547 DEPLOYMENTS=../deployments/31337.json
pnpm -C bot bot --dry-run && pnpm -C bot scenario google +20% && pnpm -C bot once
SYMBOL=tTSLAc ACTION=schedule DEPLOYMENTS=deployments/31337.json base-forge script script/CorporateAction.s.sol --rpc-url http://127.0.0.1:8547 --broadcast
```

Notes on the fork:
- `base-anvil` already passes `--base`; passing it again fails.
- Using `--chain-id 31337` keeps local artifacts (`broadcast/*/31337`, `deployments/31337.json`, both gitignored) separate from real 84532 ones.
- The forked activation registry already has B20 ASSET and STABLECOIN active.
- B20 addresses depend only on (deployer, salt), and contract addresses on the deployer nonce. So a fork run with the real key predicts the real addresses, as long as the deployer sends nothing in between.

## Layout

```
src/        MockPriceFeed.sol  MockFeedPauseRegistry.sol  Faucet.sol  lib/PriceMath.sol  interfaces/
script/     DeployTestnet.s.sol  CorporateAction.s.sol
test/       MockPriceFeed.t.sol  PriceMath.t.sol  Faucet.t.sol  TestnetWorld.fork.t.sol (FORK_TESTS=true)
config/     prices.json (generated)  mainnet-feeds.json (optional, empty)
deployments/84532.json   (written by the real deploy)
bot/src/    config.ts deployments.ts abis.ts math.ts prices.ts chain.ts run.ts scenario.ts fetch-prices.ts math.test.ts
```

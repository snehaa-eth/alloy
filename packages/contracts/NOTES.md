# Alloy contracts — Stage 1 notes

Spec: `docs/ARCHITECTURE.md` §3. This file records how the code maps to it, every deviation (with reasons), the
frozen event ABI for the indexer, gas numbers, TODOs and open risks.

## Toolchain

- `base-forge` 1.1.0 (`~/.foundry/bin/base-forge`), solc 0.8.30, `evm_version = prague`, `via_ir = true`
  (the router's buy path hits stack-too-deep otherwise), `base = true` (B20 precompiles run in-process).
- Deps (installed with `--no-git`; `lib/` is git-ignored): forge-std 1.17.0, solady 0.1.26, base-std 1.7.1.
  **Solady instead of OpenZeppelin**: the spec asks for it (LibClone, transient reentrancy guard), it costs less gas,
  and its `ERC20` stores name/symbol the way a clone needs.
- **Smoke test** (`test/Smoke.t.sol`): create a B20 asset through `0xB20f…`, mint, transfer, `updateMultiplier`.
  It passes in-process; the token's code is `0xef`.
- **Caveat found:** the base-forge v1.1.0 precompile (and the local base-anvil Sepolia fork) does **not** serve the
  ERC-8056 scheduled-multiplier surface.
  `effectiveAt()`, `newUIMultiplier()`, `uiMultiplier()` and `updateUIMultiplier()` revert with their own selector.
  `multiplier()` and `updateMultiplier()` work. The tests therefore check the pending-multiplier guard with
  `vm.mockCall`. **Base mainnet does serve them** (lead verified on NVDAc with cast: `uiMultiplier()` =
  1000537939576369481, `effectiveAt()` = 0, `newUIMultiplier()` works). Hence the guard modes below.

## Units

| Quantity | Decimals |
|---|---|
| Stock balances | 8 |
| Feed prices | 8 (price × multiplier per raw token) |
| USD values (`nav`, caps) | 8 |
| USDC | 6 |
| Shares | 18 |

- `value = bal * px / 1e8`.
- `navPerShare` is USD (8 dec) per 1e18 shares.
- At seed, 1 share = $1.

## Decisions and deviations

0. **Keeper-only execution** (founder decision, 2026-11-19). Only `factory.keeper()` may call `executeRebalance`
   (drift trims *and* due-recipe execution) and `removeComponent`. Creators can only `proposeRecipe(w, reasonHash)`
   and `cancelRecipe()` (→ `RecipeCancelled`) before execution. Error: `NotKeeper()`. The owner rotates the keeper
   with `setKeeper` (emits `KeeperSet`); baskets read it live. The 1/day limit and all guards are unchanged.

1. **Seeding happens in the factory, not through the router.**
   - `issue` needs `ts > 0`, so the first mint has to be privileged.
   - The factory pulls USDC, splits it by `targetBps`, and swaps through the allow-listed adapters straight into the
     basket (`minOuts[i]` per leg). It then calls `Basket.seed(usdcSeed·1e12, creator)`.
   - `seed` mints 0.1% to `0x…dEaD` as dead shares. `MIN_SEED` is $10.
   - The router stays stateless and user-only.
2. **The allow-list signature changed.** It is `allow(token, feed, adapter, poolData)` instead of
   `(token, feed, pool, poolKind)`.
   - `poolData` is opaque and owner-set: `abi.encode(uint24 fee)` for Uniswap v3, and
     `abi.encode(uint8 kind, bool stable, address poolFactory, int24 tickSpacing)` for Aerodrome.
   - No caller ever supplies calldata, pools or adapters.
   - `disallow` only blocks new baskets. Existing baskets keep their route so exits keep working.
   - Keeper, treasury, guard and token configs are read **live** from the factory, so they can be rotated without
     migrating baskets.
3. **Rebalance trades go from → USDC → to.** Pools are STOCK/USDC.
   - Each hop gets an oracle-derived `minOut`, using `swapTolBps` (default 100, max 500). USDC is assumed to be $1.
   - The 150 bps NAV-loss cap is measured at the same pre-trade guarded prices, so it bounds total execution cost.
4. **Band rule, made precise:**
   - `band(T) = min(abs, rel·T)`.
   - A setting of `10_000` **disables** that limb. Without this, Let-Winners-Run (10_000/10_000/4000) would cap
     winners at 2·T instead of only at the 40% cap.
   - `band(0) = 0`, so a component being removed must be sold to exactly 0.
   - "In band" means `|w − T| ≤ band` **and** `w ≤ cap`.
   - Every component must end in band. One that started out of band must also end no farther from target and must
     not cross it.
   - Targets must be ≤ cap (at creation and on proposal). At creation each target must also be > 0.
   - Weights are computed at 1e18 precision.
5. **Fee invariant wording.**
   - The formula `ts·f·dt/(YEAR·1e4 − f·dt)` makes the dilution `minted/(ts+minted)` exactly `f·dt/YEAR`, so
     `minted` is slightly **above** `ts·f·dt/YEAR`.
   - Invariant 4 is therefore tested in its dilution-correct form:
     `minted·(YEAR·1e4 − f·dt) ≤ ts·f·dt` and `minted ≤ ts·f·dt/(YEAR·1e4 − f·dt) + 1`.
   - `dt` is capped at 1 year per accrual, which also bounds the denominator.
   - Without a treasury, the creator gets 100%.
6. **`owed` ledger.**
   - It is keyed by `msg.sender`, the account that burned the shares. `claimOwed(token, to)` lets them pick a new
     receiver.
   - `totalOwed[token]` is subtracted from every balance the vault uses, so owed tokens never count toward other
     holders.
   - The "per-component try/catch" is a low-level `call` with return-data check, because B20 is a precompile.
7. **Router `sell` reverts with `RedeemIncomplete(mask)`** if any leg would be owed. Owed tokens must never get stuck
   on a stateless router. In-kind `redeem` remains the always-available exit.
8. **The router's USDC split uses unguarded feed values** (`Basket.componentValues`). Safety comes only from the
   user's `minOuts` and `minShares`. A bad split just produces leftovers, which are refunded in kind.
9. **`issue` reads feeds** for the TVL cap, so it is not strictly oracle-free.
   - The cap is $5k by default.
   - Per-basket override: `type(uint256).max` means uncapped; `0` means use the default.
   - `redeem` reads no feeds.
10. **No re-seed path yet.** `issue` reverts with `BasketEmpty` when `ts == deadShares`.
11. **Recipe changes.**
    - A new `proposeRecipe` overwrites the pending one and restarts the notice: 24h, or 10 min if `demo`.
    - The creator can `cancelRecipe`.
    - A due recipe is applied automatically at the start of the next `executeRebalance`, which emits
      `RecipeExecuted`. The band rule then applies to the new targets.
    - Adding new components through a recipe is out of scope.
12. **Cooldown** is 24h, rolling, counted from the last successful rebalance.
13. **Loss budget.**
    - `lossUsedWad` (1e18 = 100%) decays linearly by 300 bps per 7 days.
    - Gains don't refill it.
    - `Rebalanced.lossBps` is **floored**, for display; the checks use 1e18 precision.
14. **Feed guards** (`IFeedGuard.checkedPrice(token, feed)`):
    - `FeedGuardBase` checks: `answer > 0`, `updatedAt ≤ maxAge` (25h) and not in the future, and pending multiplier
      (`effectiveAt()` within ±1 day).
    - If `effectiveAt()` is unavailable, the multiplier check fails closed only when `strictMultiplier` is set.
    - `SimpleFeedGuard` (testnet): `strictMultiplier = false`; adds an owner pause flag per feed and an optional
      pause registry (`IFeedPauseRegistry.isOraclePaused(feed)` = testnet-env `MockFeedPauseRegistry`).
    - `ChainlinkFeedGuard` (mainnet): `strictMultiplier` is **always true** (hard-coded; mainnet B20 serves
      `effectiveAt()`), plus sequencer-uptime feed + grace period and the pause registry.
    - The mainnet registry function name (`isOraclePaused` assumed, matching the testnet mock) is **unverified**.
15. **`removeComponent`**.
    - Keeper only. It requires target == 0, no pending recipe, and value < $1 at the raw feed price.
    - Dust goes to the treasury, or to the creator if there is no treasury.
    - It reorders by swap-and-pop, so the keeper must re-read `components()`.
16. Solady's implicit Permit2 infinite allowance is **disabled** on basket shares.
17. **Additive events**, beyond the §3.1 list:
    - `RecipeExecuted(uint16[])` and `OwedClaimed(...)` on Basket.
    - Admin events on the factory (`TokenAllowed`, `TokenDisallowed`, `KeeperSet`, `TreasurySet`, `FeedGuardSet`,
      `PausedSet`, `SwapTolSet`, `DefaultTvlCapSet`, `BasketTvlCapSet`).
    - None of the §3.1 events changed.
18. **Tests run on in-process precompiles**, as instructed, rather than on a pinned-block mainnet fork. Feeds are
    `MockV3Aggregator`. Policies use the **real** PolicyRegistry precompile (blocklist), plus one `vm.mockCallRevert`
    variant.

## Frozen events (indexer / Ponder)

| Contract | Event | topic0 |
|---|---|---|
| Factory | `BasketCreated(address indexed basket, address indexed creator, string name, string symbol, address[] comps, uint16[] targetBps, uint16 feeBps, uint16 absBand, uint16 relBand, uint16 cap, uint64 notice, bool demo, bytes32 salt)` | `0x334d6186…694e` |
| Basket | `Issued(address indexed to, uint256 shares, uint256[] amts)` | `0x5290853a…33b7` |
| Basket | `Redeemed(address indexed from, address indexed to, uint256 shares, uint256[] amts, uint256 owedMask)` | `0x1c6c5bbf…a1c3` |
| Router | `Bought(address indexed user, address indexed basket, uint256 usdcIn, uint256 shares)` | `0xbf77fd13…416d` |
| Router | `Sold(address indexed user, address indexed basket, uint256 shares, uint256 usdcOut)` | `0x16dd1695…822f` |
| Basket | `RecipeProposed(uint16[] w, uint64 executableAt, bytes32 reasonHash)` | `0x912be30a…baf0` |
| Basket | `RecipeCancelled()` | `0xc1298bcc…356f` |
| Basket | `Rebalanced(uint256 navBefore, uint256 navAfter, uint256 lossBps, address indexed executor)` | `0xfac8bd64…703d` |
| Basket | `FeeAccrued(uint256 creatorShares, uint256 protocolShares)` | `0xb2195cd5…f99d` |
| Basket | `ComponentRemoved(address indexed token)` | `0xc605d0bf…63df` |
| Basket (add.) | `RecipeExecuted(uint16[] w)` | `0xf07656fb…9b27` |
| Basket (add.) | `OwedClaimed(address indexed user, address indexed token, address indexed to, uint256 amount)` | `0xfd7fff93…983e` |

How to read these events:
- `Issued` at seed carries the creator's shares, i.e. without the dead shares. Dead shares appear as an ERC-20
  `Transfer` to `0x…dEaD`.
- Fee shares appear as `Transfer` from 0, plus `FeeAccrued`.
- `owedMask` bit i means `comps[i]` was credited to `owed`.
- The notice in `BasketCreated` is in seconds.

## Gas

From `base-forge test --gas-report`, with the B20 precompile gas as modelled by base-forge and a 3-component basket
(medians):

| Function | Median gas | Max gas |
|---|---|---|
| `Factory.createBasket` | 863k | — |
| `Router.buy` | 523k | 562k |
| `Router.sell` | 466k | — |
| `Basket.issue` | 229k | — |
| `Basket.redeem` | 55k | 194k |
| `Basket.executeRebalance` (1 trade, 2 hops; mock venue) | 314k | 572k |
| `executeRebalance` on Sepolia fork, real Uniswap v3 | 477k | — |
| `accrueFee` | 9k | 53k |
| `proposeRecipe` | 100k | — |
| `claimOwed` | 22k | — |

Per-test numbers are in `.gas-snapshot`.

## Base Sepolia deploy + fork validation

- `script/DeployAlloy.s.sol` (chain 84532 only). It reads `../testnet-env/deployments/84532.json` and deploys:
  - `SimpleFeedGuard`, reading `MockFeedPauseRegistry`, with max age 25h;
  - `UniswapV3Adapter`, using SwapRouter02 `0x94cC…2bc4`;
  - `BasketFactory`, with tUSDC as the quote asset, treasury = deployer, and keeper = `KEEPER_ADDRESS` or the
    deployer;
  - `AlloyRouter`.
- It allow-lists all 6 stocks with their feed and `poolData = abi.encode(uint24(500))`, then writes
  `deployments/84532.json`. The `demo` flag is per basket and always allowed.
- Validated on a local `base-anvil --fork-url https://sepolia.base.org` with `--unlocked`; nothing was broadcast to a
  public network.
- That fork run's output is `deployments/84532.fork.json` (`"network": "local-fork"`; addresses are fork-only).
  **`deployments/84532.json` does not exist yet**; it is created by the real deploy.
- `script/DemoBasket.s.sol` ran on the fork with a fresh address. All 7 txs had status 1:
  - It took the faucet drip, then created "Alloy Demo: Big Tech" (40/30/30 tGOOGLc/tMSFTc/tTSLAc, demo) with a
    100 tUSDC seed, giving 99.9 creator shares and NAV $99.944 (0.06% cost).
  - Buy: 50 tUSDC gave 49.994 shares.
  - Sell 30% (14.998 shares) gave 14.984909 tUSDC against an oracle-expected 14.989954 (3.4 bps).
  - The router ended with a zero balance.
- Follow-up calls on the same fork:
  - The creator's `executeRebalance` reverted with `NotKeeper`.
  - The keeper's 0.01 tGOOGLc→tMSFTc trade through the real pools succeeded (476k gas).
- `test/fork/UniswapFork.t.sol` repeats this flow through real Uniswap pools. It is skipped unless `FORK_RPC_URL` is
  set, and passes against the local fork.
- ABIs: `./script/export-abi.sh` writes `abi/*.json`: Factory, Basket, Router, both adapters, both guards, and the
  interfaces.

## TODO

1. **Aerodrome: verify everything on a Base fork.**
   - Run `pool.factory()` on each `<STOCK>c/USDC` pool to tell v2 from Slipstream.
   - Router addresses: v2 `0xcF77…4E43`, Slipstream `0xBE6D…18a5`. Both come from memory.
   - The `Route` struct, the Slipstream `ExactInputSingleParams` field order, and the tick spacings.
2. **Chainlink.**
   - Confirm the pause-registry function name on `0x3f3E…5CaD`; if it differs, deploy a shim.
   - Confirm the sequencer-uptime feed address.
   - Confirm all feed addresses and that each has 8 decimals.
3. ~~Confirm that mainnet B20 serves `effectiveAt()`~~. Done: it does, and `ChainlinkFeedGuard` is strict.
4. Real Uniswap v3 test: done as a fork test (opt-in via `FORK_RPC_URL`). Add it to CI with a pinned block.
5. Add the remaining pieces:
   - a mainnet deploy script (Aerodrome + `ChainlinkFeedGuard`),
   - sdk ABI codegen,
   - moving ownership to a Safe,
   - a re-seed path for baskets with `ts == dead`,
   - a USDC/USD sanity feed for the rebalance hops.
6. Optional: adding new components through a recipe; per-basket swap tolerance.

## Open risks

- **Owner trust.** The factory owner can change the adapter/pool, feed or guard for live baskets. This can't steal
  directly, because loss caps and `minOut` still apply, but a malicious guard returning fake prices could make
  value-losing rebalances pass. Mitigation: a Safe owner and a timelock on `allow` / `setFeedGuard`.
- **Keeper extraction.** The keeper is now the single executor; if its key is compromised, an attacker sandwiching
  rebalances can leak up to 150 bps per trade, and
  about 300 bps per week through the decaying budget (roughly 15%/yr worst case).
- **All-or-nothing band rule plus the 150 bps cap.** On thin pools (Aerodrome TVL $0.3–1.8M) a large recipe change may
  be impossible in one transaction, leaving it stuck until the TVL cap or the trade size shrinks.
  The $5k cap keeps this manageable.
- **Feed-based reads on issue and router buy.** The TVL cap and the USDC split mean issue/buy revert if a feed answers
  ≤ 0. Redeem and sell are unaffected.
- **Fail-open multiplier check on testnet** (`SimpleFeedGuard` is non-strict; mainnet `ChainlinkFeedGuard` is strict). An instant `updateMultiplier`
  (deprecated failsafe) cannot be detected at all, and the feed lags it. Rebalances right after an unannounced split
  could then trade on wrong prices; the loss cap bounds the damage.
- **USDC is assumed to be $1** inside rebalance hop `minOut`s.
- **Unaudited.**

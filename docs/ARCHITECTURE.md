# Alloy v2 — Architecture (Base / B20)

Status: **consolidated after senior review, 2026-11-19.** Inputs:
- the earlier design,
- 6 research passes (index protocols, competitors, creator vaults, copy-trading, rebalancing strategies, B20 docs),
- 4 reviews (backend, frontend, contracts, system).

Target: Base "Stocks Maxxing Season". Official deadline Sat **Dec 5, 2026**. We **submit Fri Dec 4**.

---

## 0. Decisions at a glance

| Topic | Decision |
|---|---|
| Product | Creator-curated baskets of Coinbase B20 stocks on Base. Each basket is an ERC-20 vault token. Creators earn a fee. Followers are auto-rebalanced. |
| Custody model | Shared vault + receipt token. **Not** per-user wallets: one-click rebalance for everyone needs a shared vault. |
| Rebalance triggers | (a) **Drift trim**, no notice, max 1/day. (b) **Recipe change**, 24h notice; has its own timing, so a trim never delays it. (c) AI proposal → creator approves → same as (b). **Only Alloy's keeper executes trades.** Creators propose or cancel, with a reason. |
| Strategy modes | Balanced (default) · Let Winners Run · Trend-aware. Modes are **parameters + keeper policy, not contract logic**. |
| Trend-aware | Computed **off-chain by the keeper** (50-day MA). The on-chain MA proof was cut as unsound and unnecessary. |
| Pricing | Mint/redeem are in-kind and oracle-free. Users trade USDC↔basket at real DEX prices with their own `minOut`, 24/7, with an off-hours warning. Chainlink is used **only** to guard rebalances and display NAV. |
| Fees | 1%/yr management fee (max 2%), minted as shares, split 80% creator / 20% protocol. Immutable per basket. No entry, exit, or performance fee in v2. |
| Chains | **Base Sepolia (84532) = main demo:** our own B20 test stocks + tUSDC via the B20 factory (verified by simulation), mock price feeds, Uniswap v3 pools (see `packages/testnet-env`). **Base mainnet (8453) = small proof** with real Coinbase stocks on Aerodrome (Coinbase's stocks exist only on 8453). Tooling: `base-forge` / `base-anvil`, because B20 tokens are precompiles (`eth_getCode` = `0xef`) and stock Foundry <1.8.4 can't run them. |
| Repo | pnpm monorepo: `apps/web`, `apps/api`, `apps/worker`, `packages/contracts`, `packages/sdk`. |
| Indexing | Ponder + Postgres on Railway (the worker). Mongo keeps only human-written text (thesis, reasons, proposals, profiles). |
| Auth | Every write goes through a Privy JWT, verified server-side. The wallet must equal the on-chain `creator`. |
| v1 code | Rebuild, don't patch. Keep the UI shells; delete Dinari, KYC, treasury, and Solana/Jupiter code. |

---

## 1. Verified facts this design relies on

**B20 tokens** (Base docs + live RPC)
- ERC-20 extension, implemented as precompiles. Coinbase stocks use **8 decimals**; assert this per token at allow-list time.
- Corporate actions change a WAD multiplier (`uiMultiplier`). Raw `balanceOf` never changes, so the vault accounts in raw balances.
- Changes are scheduled via `updateUIMultiplier(new, effectiveAt)`.
- Per-address transfer policies can make transfers revert with `PolicyForbids`. `approve` is not gated.
- Live API: `https://api.coinbase.com/v1/tokenized-stocks` lists 87 tokens. No key needed.

**Chainlink feeds** (8 decimals)
- Each feed reports **underlying price × multiplier per raw token**. Value = `bal * px / 1e8`. Never apply the multiplier again.
- Updates on 0.5% deviation or a 24h heartbeat, 24/5. Frozen off-hours and during corporate actions.
- The **registry pause flag** (`0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD`) can freeze a feed while `updatedAt` still looks fresh. Check both. The exact function name is still to verify.

**Liquidity** (DexScreener, main Aerodrome `<STOCK>c/USDC` pools)
- $0.3–1.8M TVL each, $3–28M per day of volume.
- A $10k+ rebalance can breach a 1.5% loss cap, so trades are chunked and the UI shows the max rebalance size.

**v2 universe** = stocks that have a feed *and* a pool:

| Token | Address |
|---|---|
| NVDAc | `0xb20000000000000000000078ee7ce2fE4908108C` |
| AMZNc | `0xb200000000000000000000d9192b6B456483C2E8` |
| SNDKc | `0xb200000000000000000000397293Cb8cda9a10c5` |
| GOOGLc | `0xb2000000000000000000002D0BA3164cc74f58B7` |
| SPCXc | `0xb2000000000000000000007b9fcbd005511aCBd5` |
| METAc | `0xb2000000000000000000008bC8786B856E61707C` |
| MSTRc | `0xb2000000000000000000004884b426556b92883d` |
| TSLAc | `0xb2000000000000000000001e800a7f5189430cD0` |
| AAPLc | `0xb200000000000000000000C2e324d24d7eEcd1fb` |
| MSFTc | `0xB200000000000000000000Ab99cFa739E253872B` |

Feed addresses come from docs.base.org. **Re-verify every address on-chain before mainnet.**

**Calendar**
- Nov 26 is Thanksgiving (market closed). Nov 27 is a half day.
- **Dec 5 is a Saturday** (feeds frozen).
- Mainnet rebalance demos must be recorded **Mon Dec 1 – Fri Dec 4, 9:30–16:00 ET (20:00–02:30 IST)**.

---

## 2. How it works (plain language)

1. A creator makes a recipe, e.g. 40% GOOGL / 30% MSFT / 30% TSLA, and seeds it.
2. Followers deposit USDC. The router buys the stocks and the vault issues **basket tokens**: a receipt for a share of the vault.
3. Users can sell any % at any time, or withdraw the actual stock tokens (in-kind). Exits never get stuck.
4. Prices move, so weights **drift**. The keeper trims drift according to the basket's mode.
5. The creator can change the recipe with **24h notice**. Followers who disagree can exit first.
6. Every rebalance passes the contract's checks:
   - market open and feeds healthy,
   - a loss cap,
   - weights end in band,
   - all-or-nothing.
7. The creator earns 1%/yr, paid in newly minted basket tokens.

---

## 3. Contracts (`packages/contracts`, Foundry, Solady)

### 3.1 `Basket` (EIP-1167 clone; initializer callable only by the factory)

**Storage**
```
address factory; address creator; address keeper;           // keeper set by factory
address[] comps; uint16[] targetBps;                         // ≤10 comps, Σ=10_000
uint16 absBandBps; uint16 relBandBps; uint16 capBps;         // mode = params
uint16 feeBps;  uint64 lastAccrual;                          // fee immutable
Pending { uint16[] w; uint64 executableAt; bytes32 reasonHash }
uint128 lossUsedBps; uint64 lossTs;                          // decaying weekly budget
mapping(address user => mapping(address token => uint)) owed;  // redeem never bricks
```

**Functions**
- `issue(uint shares, address to)`: pulls `mulDivUp(bal_i, shares, ts)` of each component from `msg.sender`.
  - **Never** store `unitsPerShare`. Rounding twice is exploitable.
- `redeem(uint shares, address to)`: pays `mulDiv(bal_i, shares, ts)`.
  - Each transfer runs in try/catch. A failed one (B20 policy) is credited to `owed`.
  - `claimOwed(token, to)` pays it out later.
- `accrueFee()`:
  - Mints `ts*f*dt / (YEAR*1e4 − f*dt)`.
  - Advances `lastAccrual` only if minted > 0. Skips when `ts == 0`.
  - Runs before issue, redeem, and rebalance.
- `proposeRecipe(uint16[] w, bytes32 reasonHash)`: creator only. Sets `executableAt = now + notice`.
  - Notice is ≥24h, or 10 min **only** for baskets flagged `demo` at creation; the flag is shown in the UI.
- `executeRebalance(Trade[] t)`, where `Trade {uint8 from; uint8 to; uint amountIn}`. Callable by the **keeper only** (`NotKeeper` otherwise; the creator cannot execute). Drift trims: at most 1 per day. A due recipe change executes independently of the trim cooldown.
  - The vault encodes the Aerodrome call itself: allow-listed pool, `recipient = this`, `minOut` from Chainlink × (1 − tol).
  - **No caller calldata, ever.**
- `removeComponent(uint8 i)`: only when target = 0 and value < $1. Dust is swept to treasury.
- Views: `nav()`, `navPerShare()`, `getBundle()`, `previewIssue(shares)`.

**Rebalance checks** (all must pass, all-or-nothing)
1. Every feed: `answer > 0`, `updatedAt` ≤ 25h old, registry **not paused**, no pending multiplier change within ±1 day. The sequencer-uptime feed must be up.
2. `navAfter ≥ navBefore × (1 − 150bps)`. Gains never refill the budget.
3. Decaying weekly budget: `used = max(0, used − dt·300bps/7d) + lossBps ≤ 300bps`.
4. **Band rule.** For each component, with drift `d = |w − target|`:
   - out of band before → it ends in band, `d_post ≤ d_pre`, and it never crosses target;
   - in band before → it stays in band.
   - A recipe change replaces `target` first, then applies the same rule.
5. `totalSupply` unchanged. One shared transient `nonReentrant` lock covers issue, redeem, and rebalance; that is the "rebalance lock". Approvals are exact and reset to 0.

**Strategy modes = parameters + keeper policy**

| Mode | absBand / relBand / cap | Keeper policy | One-liner |
|---|---|---|---|
| Balanced (default) | 500 / 2500 / 10_000 | Trim any breach back to the band edge (Swedroe 5/25, Vanguard "trim to edge") | "We only step in when a stock drifts far." |
| Let Winners Run | 10_000 / 10_000 / 4000 | No drift trims. Only trim above the 40% cap | "Winners keep growing; we only trim if one takes over." |
| Trend-aware | 500 / 2500 / 10_000 | Like Balanced, but skip trimming while the stock is above its 50-day MA. Trim after 2 closes below it. Don't top up components below their MA | "Let winners run while rising; trim when the trend breaks." |

- The trend is computed **off-chain** from Chainlink history plus a market-data API.
- Contract checks are what protect users, so the trend doesn't need on-chain proof.

**Events** (frozen Nov 21; consumed by Ponder)
- `BasketCreated(basket, creator, name, symbol, comps, targetBps, feeBps, absBand, relBand, cap, notice, demo, salt)`
- `Issued(to, shares, amts)`
- `Redeemed(from, to, shares, amts, owedMask)`
- `Bought(user, basket, usdcIn, shares)` (router)
- `Sold(user, basket, shares, usdcOut)` (router)
- `RecipeProposed(w, executableAt, reasonHash)`
- `RecipeCancelled()`
- `Rebalanced(navBefore, navAfter, lossBps, executor)`
- `FeeAccrued(creatorShares, protocolShares)`
- `ComponentRemoved(token)`

### 3.2 `BasketFactory`
- Owner: deployer, moved to a Safe after deploy.
- `allow(token, feed, pool, poolKind)`: asserts `decimals == 8` for both token and feed.
- `createBasket(params, usdcSeed, uint[] minOuts) returns (address)`, in one tx:
  1. clone,
  2. initialize,
  3. seed through the router,
  4. lock dead shares (≈0.1% of the seed; minimum seed $10).
  - If `ts == DEAD` later, issue reverts until the basket is re-seeded.
- **TVL cap: $5k per basket on mainnet; none on Base Sepolia.** Buy and sell read raw prices with no staleness check, so they work 24/7 (weekends too). Only keeper rebalances need fresh feeds. Global pause covers issue and rebalance only. **Redeem can never be paused.**

### 3.3 `AlloyRouter` (stateless)
- `buy(basket, usdcIn, uint[] minOuts, uint minShares)`
  1. Split USDC by current bundle ratios.
  2. Swap on allow-listed pools.
  3. `issue(max affordable shares)`.
  4. Refund leftovers.
- `sell(basket, shares, uint[] minOuts, uint minUsdc)`: redeem, swap each component to USDC, check `minUsdc`.
- The router must end every call holding zero balances and zero allowances.
- No oracle dependency. Users are protected by their own `minShares` / `minUsdc` (from `/quote` + slippage).

### 3.4 Aerodrome
- **Day 1:** confirm the pool type with `pool.factory()` on the fork. DexScreener "aerodrome" vs "aero" is likely v2 vs Slipstream.
- v2 Router `0xcF77…4E43`: `swapExactTokensForTokens(Route{from,to,stable,factory})`.
- Slipstream SwapRouter `0xBE6D…18a5`: `exactInputSingle{…tickSpacing…}`.
- Both addresses are from memory. **Verify them.**

### 3.5 Tests (base-forge fork, pinned block; handler actors issue/redeem/donate/warp/accrue/rebalance; `vm.mockCall` for feeds, pause, and policy)
1. Round-trip never profits: `redeem(issue(s)) ≤ paid`, per component.
2. `bal_i·1e18/ts` is non-decreasing across issue, redeem, and donate.
3. `ts ≥ DEAD`, and Σ balances == ts.
4. Fee mint ≤ `ts·fee·dt/YEAR + 1`. A second accrue in the same block mints 0.
5. Rebalance:
   - `ts` unchanged,
   - per-tx and weekly caps hold,
   - band rule holds,
   - no target crossing.
6. Redeem succeeds when one component's policy reverts: Σ owed + paid == pro-rata.
7. Router and Basket end with zero allowances; the router holds no tokens.
8. Rebalance reverts on a stale feed, a paused feed, or a pending multiplier change.
9. Scenarios: Asha/Ben deposit → drift → trim; recipe change with notice; split simulated via mocks.

---

## 4. System

```
apps/web (Vercel, crates-ui)   Next.js · Privy embedded wallet + @privy-io/wagmi · Base 8453
        │ REST (Privy JWT on writes)              │ txs (simulate → write → receipt)
apps/api (Vercel, crates-mantle)                   ▼
  /quote /stocks /baskets /performance      packages/contracts on Base
  /meta /reasons /proposals                  Factory · Basket clones · Router
        │ SQL-over-HTTP        Mongo (text)       ▲ executeRebalance / accrueFee
apps/worker (Railway): Ponder indexer + Postgres · keeper loop (60s) · AI agent (daily, mkt hrs)
packages/sdk: wagmi-cli ABIs, addresses.{8453,31337}.json, zod DTOs, bigint math (units.ts)
```

**Source of truth**
- Chain → Ponder (rebuildable cache) → API.
- Mongo holds only text, images, reasons (hash-anchored on-chain via `reasonHash`), AI proposals, and profiles.
- When Mongo and the chain disagree, the chain wins.

**API**
- Reads:
  - `GET /stocks`
  - `/baskets?sort=`
  - `/baskets/:a`
  - `/baskets/:a/performance` → `{navSeries, maxDD, creatorPnL, followerPnL, feesEarned}`
  - `/baskets/:a/rebalances`
  - `/quote?basket&side&amount`
  - `/creators/:a`
  - `/feelcash/:a` (read-only proxy)
  - `/health`
- Writes: `POST /baskets/:a/meta`, `/rebalance-reason`, `/proposals/:id/approve|reject`. All require a Privy JWT and wallet == creator.
- Every input is validated with zod. Mongo uses `sanitizeFilter`. Rate limits on all routes. CORS limited to the web origin.

**Keeper (Railway)**
- 60s loop:
  - drift and trend checks per the basket's mode,
  - execute due recipe changes,
  - weekly `accrueFee`,
  - NAV snapshots via Ponder block-interval.
- The keeper key has only the `keeper` role. It holds ≤0.02 ETH, with a low-balance alert.
- Alerts (Telegram):
  - pending rebalance >30 min overdue,
  - Ponder lag >50 blocks,
  - stale feed in market hours.

**AI agent (stretch)**
- Claude API with tools: prices/MA, drift, news.
- Writes `{weights, reason, model, inputsHash}` to Mongo as *pending*.
- The creator taps Approve, which calls `proposeRecipe` with the 24h notice.
- The agent **never signs**. Labelled "AI-generated, not investment advice".

**Frontend rules**
- **bigint only**, no `Number` for amounts.
  - USDC = 6, B20 = 8, price = 8, shares = 18.
  - `usd6 = bal8*px8/1e10`.
- Every write: quote → `simulate` (decode `PolicyForbids`/stale/slippage) → exact approve or USDC permit → write → check receipt `status` → invalidate queries.
- `QueryClient` created in `useState`. Privy `defaultChain: base`.
- Builder Code `dataSuffix` on all txs. Gas sponsored via the CDP paymaster.
- Basket pages are server-rendered with OG images (for sharing on X).

**Secrets**
- Nothing secret is `NEXT_PUBLIC_`.
- Vercel: `PRIVY_APP_SECRET`, `MONGO_URI`, `RPC_URL`, `PONDER_URL`.
- Railway: `KEEPER_PK`, `ANTHROPIC_API_KEY`, `DATABASE_URL`.
- RPC: Alchemy + QuickNode via viem `fallback()`.

---

## 5. Product features (MVP), driven by copy-trading research

**Must**
- Basket page:
  - thesis, bundle, NAV chart, max drawdown,
  - **follower PnL next to creator PnL** (answers "leaders win, followers lose"),
  - creator's own stake, followers, AUM, fee.
- Buy ($5 min, gasless) · Sell any % · Withdraw stocks in-kind (always available).
- Create basket: pick stocks, set weights, choose mode, seed.
- Creator dashboard: AUM, fees earned, propose recipe change **with a one-line reason**.
- Rebalance feed: what changed, cost, reason, and a countdown for pending changes.
- Seed baskets: "AI Leaders" plus one story basket. Disclosure dates shown honestly; "not affiliated".

**Nice**
- AI proposals.
- Trend-aware mode.
- Read-only feel.cash panel (their coins paired with our stocks).
- Alerts.
- Per-follower stop-loss.
- 1–5 risk score.

**Later**
- Performance fee above a high-water mark.
- Market-cap / calendar modes.
- DCA + local on-ramps.
- Self-serve meme pool (Doppler/Uni v4), or a feel.cash partnership for basket-paired coins.

---

## 6. Competitive position

| Project | Gap Alloy fills |
|---|---|
| Reserve "MAG7" DTF (Base, ~$339k) | Governance-run and institutional. **Alloy: any creator, creator fees, retail UX, explained rebalances.** |
| Bitwise ATPs via Glider (Base) | Top-down curator, no token. |
| PAIR / bskts (Robinhood Chain) | Not on Base. |
| feel.cash / Stonks / Bankr | Pair coins with single stocks. Alloy adds the basket layer. |

feel.cash facts:
- Doppler + Uni v4.
- On Base, pairs are WETH / USDC / AAPLc / NVDAc only.
- The API is read-only.

Basket-paired coins therefore need a partnership (ask in their partner Telegram) or our own pool later.

**Pitch:** "smallcase × pump.fun for stock indexes, on Base."

---

## 7. Copy and legal guardrails
- Never say "backed by / partnered with / endorsed by Coinbase or Base".
- Say "tokenized stock exposure", not "you own shares".
- Self-attest gate: "Not available to US persons".
- Story baskets: "based on public disclosures dated X; not affiliated".
- AI output: "AI-generated, not investment advice".
- No return guarantees. Past-performance disclaimers on charts. Show the market-closed state honestly.

---

## 8. Repo migration & v1 cleanup

1. **Immediately:**
   - Rotate the Dinari secret (it shipped to browsers).
   - Rotate the Alchemy key (it's in public git history).
   - Disable `POST /user/fund-wallet-from-treasury`: public and unauthenticated, it drains the testnet treasury.
2. `git mv waitlist-web-app apps/web`, `git mv backend apps/api`. **Change the Vercel Root Directories first** (crates-ui → `apps/web`, crates-mantle → `apps/api`).
3. **Delete, API:**
   - Jupiter, Solana, and Dinari code
   - user, transaction, and treasury controllers
   - `xstocks_json.json`, `merged_result.json`, `lib/sbt-deployments`, `scripts/`
   - empty files
   - deps: anchor, solana, bs58, cross-fetch, body-parser, node-cron, ethers → viem
4. **Delete, web:**
   - `services/*_order.ts`, `fee_quote`, `get_order_status`, `WalletManager`, `adapters/`, `dinari-client`, `universalWalletClient`, `chainUtils`, `client.ts`
   - `KycModal`, onboarding KYC, inline ABIs, `dummy_cratedata.json`, nested `.github/`
   - unused deps (mongodb, aws, kerberos, snappy, solana…)
   - `ignoreBuildErrors`
   - the wildcard image host
5. **Keep, web:** shadcn `ui/*`, navbar/footer, `CrateCard` → `BasketCard`, `DonutChart`, chart, stocks table, page layouts.
6. **Fix:** Next 16 + React 18 peer mismatch (move to React 19).

---

## 9. Build plan (cut-lines included)

| Date | Deliverable |
|---|---|
| Nov 19 Thu | Key rotations, disable treasury route. Monorepo + Vercel root dirs. Install base-anvil/base-forge and **prove a B20 transfer works on the fork**. Confirm the Aerodrome pool type. Foundry scaffold. |
| Nov 20–21 | Basket: issue/redeem (mulDiv), owed ledger, fee. Factory + allow-list. Fork tests. **Freeze events.** |
| Nov 22–23 | Router buy/sell on Aerodrome. Rebalance (Trade[], oracle minOut, band rule, caps, pause/staleness). Invariant suite. |
| Nov 24 Mon | Mode params, sdk codegen, Ponder schema. **Hard gate:** if core tests aren't green, drop Trend-aware and the AI agent. |
| Nov 25 Tue | Deploy to Base. $20 smoke test in market hours. `/quote` API. |
| Nov 26–27 | Worker: Ponder, keeper loop, NAV snapshots, alerts. API reads. *(Market holiday: fork only.)* |
| Nov 28–30 | Web: Base config, Explore, Basket page (NAV, PnL compare), Buy, Sell %, Withdraw, Create. |
| Dec 1 Mon | Creator dashboard, rebalance feed + reasons. Seed 2 baskets with real money. |
| Dec 2 Tue | AI proposals → approve (stretch). Trend-aware keeper policy (stretch). feel.cash read-only panel. Copy/legal pass. |
| Dec 3 Wed | E2E happy path, bug bash. **Record the demo in market hours.** |
| Dec 4 Fri | Re-record if needed. X post tagging @buildonbase. **Submit.** |

**Cut order if behind:**
1. Self-serve feel.cash pool.
2. Trend-aware.
3. AI auto-approve.
4. Leaderboard (sort by AUM instead).
5. Playwright.
6. AI agent.

**Never cut:**
- buy,
- partial sell,
- in-kind withdraw,
- recipe change with notice + reason,
- drift trim,
- follower vs creator PnL,
- creator fee.

**Demo (3 min, mainnet, market hours)**
1. Hook: "copy-traders lose while leaders win; Alloy shows both PnLs".
2. AI Leaders basket page.
3. Buy $10 gasless → sell 30%.
4. Create a basket in one click.
5. AI proposes "trim TSLA" + reason → approve → (10-min demo basket) executed with its cost.
6. Safety: market-closed in-kind exit; simulated split leaves accounting intact.
7. Close: "smallcase × pump.fun for stock indexes, on Base" + jurisdiction notice.

# Alloy v2 — Build stages

Design: [ARCHITECTURE.md](./ARCHITECTURE.md). Submit **Fri Dec 4, 2026** (Dec 5 is a Saturday).

Environments:
- **Base Sepolia** for the main demo. We run our own B20 test stocks, our own price feeds and Uniswap v3 pools, so we control prices and can demo any day.
- **Base mainnet** for a small proof with real Coinbase stocks on Aerodrome.

Toolchain:
- `base-forge` / `base-anvil` (Base Foundry v1.1.0, installed alongside stock Foundry). B20 precompiles run in-process.
- Stock `forge` 1.1.0 can't run B20.

| # | Stage | Scope | Target |
|---|---|---|---|
| 0 | Safety + setup | Monorepo move (`apps/web`, `apps/api`) ✅. Base Foundry installed ✅. Remove the treasury route (code). Rotate the Dinari + Alchemy keys (user). | Nov 19 |
| 1 | Contracts core | `packages/contracts`: Basket, Factory, Router, swap adapters (Uniswap v3 for testnet, Aerodrome for mainnet), OracleLib, full test suite | Nov 19–24 |
| 2 | Testnet world | `packages/testnet-env`: tUSDC + test stocks (B20), mock Chainlink feeds, Uniswap v3 pools, price-sync bot, faucet | Nov 20–24 |
| 3 | Backend v2 | `apps/api`: auth, validation, stocks, baskets metadata, quote, indexer (Ponder), keeper | Nov 21–27 |
| 4 | Frontend v2 | `apps/web`: Base config, bigint units, explore, basket page, buy/sell/withdraw, create | Nov 22–30 |
| 5 | Creator features + mainnet proof | Creator dashboard, rebalance feed + reasons, follower vs creator PnL. Small real-stock basket on mainnet. | Nov 28 – Dec 1 |
| 6 | Extras | Trend-aware keeper policy, AI rebalance agent | Dec 1–2 |
| 7 | feel.cash | Read-only panel first. Basket-paired coins only via partnership or our own pool. | Dec 2–3 |
| 8 | Demo + submit | Record, X post tagging @buildonbase, submission form | Dec 3–4 |

**Never cut:**
- buy
- partial sell
- in-kind withdraw
- recipe change with notice + reason
- drift trim
- follower vs creator PnL
- creator fee

**Cut order if behind:**
1. feel.cash
2. Trend-aware
3. AI agent
4. Leaderboard
5. Mainnet proof

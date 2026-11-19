# Alloy API (v2)

Express 5 + TypeScript API for Alloy: Base B20 stock list, basket metadata
(text only), rebalance reasons, AI proposals, quotes, and the legacy waitlist.
Design: [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §4.

The chain is the source of truth. Mongo stores only human-written text
(theses, reasons, proposals, waitlist). It never stores holdings or money.

## Run locally

```bash
cd apps/api
npm install
cp .env.example .env   # fill in values (see below)
npm run dev            # tsx watch, http://localhost:4000
curl localhost:4000/health
```

Other scripts:

| Script | What it does |
| --- | --- |
| `npm test` | vitest + supertest. No network, Mongo or Privy needed. |
| `npm run build` | `tsc` to `dist/` (also a full typecheck). |
| `npm start` | Runs `dist/apps/api/src/server.js`. |
| `npm run smoke` | Live check against Base Sepolia: `/quote` buy $10 + sell, `/stocks`, `/baskets`. No keys or Mongo needed. |
| `npm run seed:metadata [-- --dry-run]` | Upserts seed-basket metadata (title, thesis, `/brand/covers/*.webp`, tags). Writes only if `MONGO_URI` is reachable, otherwise it does a dry run. |

## Environment

Everything is validated by zod at startup (`src/config/env.ts`). A bad config
fails fast and names the variable, never its value. See `.env.example`.

| Name | Required | Notes |
| --- | --- | --- |
| `MONGO_URI` | yes | `mongodb://` or `mongodb+srv://` |
| `ALLOWED_ORIGINS` | yes | Comma-separated exact origins for CORS. |
| `PRIVY_APP_ID`, `PRIVY_APP_SECRET` | yes | Server-side access-token verification. |
| `CHAIN_IDS` | no | Default `8453`. Supported: `8453`, `84532`. The first one is the default `chainId`. |
| `RPC_URL_BASE`, `RPC_URL_BASE_SEPOLIA` | no | Falls back to the public RPC. |
| `INVITE_CODES` | no | Comma-separated waitlist invite codes. |
| `CRON_SECRET` | no | 32+ chars. Machine callers (AI agent, cron) send `Authorization: Bearer <CRON_SECRET>`. |
| `RELAYER_PK` | no | Base Sepolia gas-only relayer key for `POST /faucet/drip`. Unset = 501. Testnet only. |
| `RPC_LOGS_MAX_RANGE` | no | Default `200` (public RPC limit). Block range per `eth_getLogs` for follower counts. |

Addresses and ABIs come from `@alloy/sdk` (`packages/sdk/src`, imported by relative path through
`src/config/sdk.ts`). So `tsc` uses `rootDir: ../..` and the build output is `dist/apps/api/src/...`.
On Vercel, keep "Include files outside the Root Directory" on (the default) so `packages/sdk` is bundled.

## Endpoints

Every route is mounted at `/` and at the legacy `/api/v1` prefix.

`chainId` is an optional query param on every route except `POST /proposals`, which takes it in the body.

**Public reads**

| Route | Notes |
| --- | --- |
| `GET /health` | |
| `GET /stocks` | 8453: v2 universe from the Coinbase tokenized-stocks API, cached for 5 min. 84532: sdk test stocks with `testnet.{feed,pool,priceUsd8}` and the real ticker's Coinbase icon, cached for 15s. |
| `GET /baskets?tag=&limit=&offset=` | On-chain baskets (factory `basketCount`/`allBaskets`, then getBundle, nav, navPerShare, creator, fee, mode, pendingRecipe, TVL cap) merged with Mongo `meta` (title, thesis, imageUrl, tags). Cached for 15s. If Mongo is down, `meta` is null. `followers` stays null until the Transfer-log scan reaches the chain head. |
| `GET /baskets/:vault` | Same shape. 404 if the address is not a factory basket. |
| `GET /baskets/:vault/rebalance-reasons` | |
| `GET /baskets/:vault/rebalance-reasons/:hash` | |
| `GET /baskets/:vault/proposals?status=` | |
| `GET /proposals/:id` | |
| `GET /quote?basket=&side=buy\|sell&amount=<base units>&slippageBps=` | Real quotes on 84532 (501 on 8453). **buy:** `amount` is tUSDC (6 dec). It runs `router.splitUsdc`, then QuoterV2 per leg, then `router.sharesFor`. **sell:** `amount` is shares (18 dec). It runs `basket.previewRedeem`, then QuoterV2 per leg to tUSDC. Returns per-leg `minOut`, `expectedResult`/`minResult`, `cost` vs oracle (pool fee + impact), ready `tx` args, `approval` and `expiresAt` (+30s). `slippageBps` defaults to 100. Cached for 10s. |
| `GET /waitlist/check?wallet=&inviteCode=` | |
| `GET /waitlist/count` | Alias: `/waitlist/waitlist-users`. |
| `POST /waitlist/join` `{ email, wallet? }` | |
| `POST /faucet/drip` `{ address }` | Base Sepolia only. The relayer calls `Faucet.dripTo(address)` and returns `202 { txHash }`. Limits: 5/day per IP, 1 successful drip/day per address, plus the contract's 24h cooldown (429 `faucet_cooldown`). Returns 501 if `RELAYER_PK` is unset. |

**Creator writes**

These need a Privy access token (`Authorization: Bearer <token>`). One of the user's linked wallets must equal the basket's on-chain `creator()`.

| Route | Body |
| --- | --- |
| `POST /baskets/:vault/meta` | `{ title?, thesis?, imageUrl?, tags? }` |
| `POST /baskets/:vault/rebalance-reason` | `{ text }`. Returns `reasonHash = keccak256(utf8(NFC-trimmed text))` to pass to `proposeRecipe`. |
| `POST /proposals/:id/approve` | |
| `POST /proposals/:id/reject` | |

**Service writes** (`CRON_SECRET`)

| Route | Body |
| --- | --- |
| `POST /proposals` | `{ chainId, vault, weights[{token,bps}], reason, model, inputsHash }` |

Error shape: `{ "error": { "code", "message", "details"? } }`. Validation
details list only field paths and messages; internal errors return a
generic 500. The waitlist keeps the v1 `{ success, message, data }` shape.

## Layout

```
api/index.ts          Vercel handler (exports the Express app; vercel.json rewrites all paths here)
src/app.ts            createApp(deps): builds the app, never listens
src/server.ts         local listen + graceful shutdown
src/config/           env (zod), db (cached mongoose, sanitizeFilter), universe
src/lib/              auth (Privy, requireCreator, service key), chain (viem), errors, zod schemas
src/middleware/       validate, rateLimit, cors, db, errorHandler
src/modules/<name>/   health, stocks, baskets, reasons, proposals, quote, faucet, waitlist
scripts/              smoke.ts (live Base Sepolia), seed-metadata.ts
test/                 vitest + supertest
```

## Security notes

- **Auth.** Privy JWTs are verified server-side and linked wallets are resolved via the Privy API, cached for 60s per user. Creator checks read `creator()` on-chain via viem.
- **Inputs.** All inputs are zod-parsed, with strict bodies (no mass assignment). The query parser is set to `simple` (no nested objects), and mongoose `sanitizeFilter` is on.
- **Rate limits.** Global 300/min/IP, writes 30/min, waitlist 10/min. The store is **in-memory, per instance** (see TODO).
- **Signing keys.** The only key the API may hold is the optional `RELAYER_PK`: a Base Sepolia gas-only key used solely for `Faucet.dripTo`. It is zod-validated without echoing its value and never logged. The keeper key lives only on the Railway worker.

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
| `npm start` | Runs `dist/src/server.js`. |

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
| `TESTNET_DEPLOYMENTS_PATH` | no | JSON file of Base Sepolia test stocks from `packages/testnet-env`. |

## Endpoints

Every route is mounted at `/` and at the legacy `/api/v1` prefix.

`chainId` is an optional query param on every route except `POST /proposals`, which takes it in the body.

**Public reads**

| Route | Notes |
| --- | --- |
| `GET /health` | |
| `GET /stocks` | v2 universe from the Coinbase tokenized-stocks API (8453), or the testnet deployments file (84532). Cached for 5 min. |
| `GET /baskets?tag=&limit=&offset=` | Basket metadata. |
| `GET /baskets/:vault` | |
| `GET /baskets/:vault/rebalance-reasons` | |
| `GET /baskets/:vault/rebalance-reasons/:hash` | |
| `GET /baskets/:vault/proposals?status=` | |
| `GET /proposals/:id` | |
| `GET /quote?basket=&side=buy\|sell&amount=<base units>&slippageBps=` | Returns **501** until the contracts land. |
| `GET /waitlist/check?wallet=&inviteCode=` | |
| `GET /waitlist/count` | Alias: `/waitlist/waitlist-users`. |
| `POST /waitlist/join` `{ email, wallet? }` | |

**Creator writes**

These need a Privy access token (`Authorization: Bearer <token>`). One of the user's linked wallets must equal the basket's on-chain `creator()`.

| Route | Body |
| --- | --- |
| `POST /baskets/:vault/meta` | `{ thesis?, imageUrl?, tags? }` |
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
src/modules/<name>/   health, stocks, baskets, reasons, proposals, quote, waitlist
test/                 vitest + supertest
```

## Security notes

- **Auth.** Privy JWTs are verified server-side and linked wallets are resolved via the Privy API, cached for 60s per user. Creator checks read `creator()` on-chain via viem.
- **Inputs.** All inputs are zod-parsed, with strict bodies (no mass assignment). The query parser is set to `simple` (no nested objects), and mongoose `sanitizeFilter` is on.
- **Rate limits.** Global 300/min/IP, writes 30/min, waitlist 10/min. The store is **in-memory, per instance** (see TODO).
- **No server-side signing keys.** The API holds no private keys. The keeper key lives only on the Railway worker.

import { db } from "ponder:api";
import schema from "ponder:schema";
import { and, asc, client, desc, eq, gte, graphql, inArray, lte, notInArray } from "ponder";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { isAddress } from "viem";
import { DEAD, FACTORY, ROUTER, ZERO } from "../../lib/config";
import { aggregatePnl, maxDrawdownBps, valueUsdc6 } from "../../lib/pnl";
import { priceSyncMode, readState, writeState, type PriceSyncMode } from "../../lib/status";

/**
 * Read API for apps/api (documented in apps/worker/README.md). All amounts are decimal strings:
 * USDC 6 dec (`*Usdc6`), USD 8 dec (`*Usd8`), shares 18 dec, navPerShare = USD 8 dec per 1e18 shares.
 * Ponder itself serves /health, /ready, /status, /metrics.
 */
const app = new Hono();
app.use("*", cors({ origin: (process.env.CORS_ORIGINS || "*").split(",") as string[] | string }));

app.use("/sql/*", client({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

const json = (v: unknown) => JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x)));
const lc = (a: string) => a.toLowerCase() as `0x${string}`;
const NON_HOLDERS = [ZERO, DEAD, ROUTER, FACTORY].map(lc);

async function loadBasket(a: string) {
  if (!isAddress(a)) return null;
  const rows = await db.select().from(schema.basket).where(eq(schema.basket.address, lc(a)));
  return rows[0] ?? null;
}

/** GET /v1/baskets?sort=tvl|holders|new|perf */
app.get("/v1/baskets", async (c) => {
  const sort = c.req.query("sort") ?? "tvl";
  const rows = await db.select().from(schema.basket);
  const out = rows.map((b) => ({
    ...b,
    tvlUsd8: b.navUsd8,
    returnBps: b.navPerShare != null ? Number(((b.navPerShare - 10n ** 8n) * 10_000n) / 10n ** 8n) : null, // since inception ($1 seed)
  }));
  const cmp: Record<string, (x: (typeof out)[0], y: (typeof out)[0]) => number> = {
    tvl: (x, y) => Number((y.navUsd8 ?? 0n) - (x.navUsd8 ?? 0n)),
    holders: (x, y) => y.holdersCount - x.holdersCount,
    new: (x, y) => Number(y.createdAt - x.createdAt),
    perf: (x, y) => (y.returnBps ?? -1e9) - (x.returnBps ?? -1e9),
  };
  out.sort(cmp[sort] ?? cmp.tvl!);
  return c.json(json({ baskets: out }));
});

/** GET /v1/baskets/:address — basket + positions */
app.get("/v1/baskets/:address", async (c) => {
  const b = await loadBasket(c.req.param("address"));
  if (!b) return c.json({ error: "not found" }, 404);
  const positions = await db
    .select()
    .from(schema.position)
    .where(eq(schema.position.basket, b.address))
    .orderBy(asc(schema.position.idx));
  return c.json(json({ basket: b, positions }));
});

/** GET /v1/baskets/:address/nav?from=<unix>&to=<unix>&source=hourly|event|all */
app.get("/v1/baskets/:address/nav", async (c) => {
  const b = await loadBasket(c.req.param("address"));
  if (!b) return c.json({ error: "not found" }, 404);
  const from = BigInt(c.req.query("from") ?? 0);
  const to = BigInt(c.req.query("to") ?? 2n ** 40n);
  const source = c.req.query("source") ?? "all";
  const conds = [eq(schema.navSnapshot.basket, b.address), gte(schema.navSnapshot.timestamp, from), lte(schema.navSnapshot.timestamp, to)];
  if (source !== "all") conds.push(eq(schema.navSnapshot.source, source));
  const series = await db.select().from(schema.navSnapshot).where(and(...conds)).orderBy(asc(schema.navSnapshot.timestamp));
  return c.json(json({ basket: b.address, series }));
});

/**
 * GET /v1/baskets/:address/performance — ARCHITECTURE §4 shape:
 * { navSeries, maxDrawdownBps, creatorPnL, followerPnL, feesEarned, holdersCount }
 */
app.get("/v1/baskets/:address/performance", async (c) => {
  const b = await loadBasket(c.req.param("address"));
  if (!b) return c.json({ error: "not found" }, 404);
  const nps = b.navPerShare ?? 0n;
  const series = await db
    .select({ t: schema.navSnapshot.timestamp, nps: schema.navSnapshot.navPerShare, nav: schema.navSnapshot.navUsd8 })
    .from(schema.navSnapshot)
    .where(eq(schema.navSnapshot.basket, b.address))
    .orderBy(asc(schema.navSnapshot.timestamp));
  const holders = await db
    .select()
    .from(schema.holder)
    .where(and(eq(schema.holder.basket, b.address), notInArray(schema.holder.account, NON_HOLDERS)));
  const creator = holders.filter((h) => h.account === b.creator);
  const followers = holders.filter((h) => h.account !== b.creator);
  return c.json(
    json({
      basket: b.address,
      navPerShare: nps,
      navSeries: series,
      maxDrawdownBps: maxDrawdownBps(series.map((s) => s.nps)),
      creatorPnL: aggregatePnl(creator, nps),
      followerPnL: aggregatePnl(followers, nps),
      feesEarned: {
        creatorShares: b.feeCreatorShares,
        protocolShares: b.feeProtocolShares,
        creatorValueUsdc6: valueUsdc6(b.feeCreatorShares, nps),
        protocolValueUsdc6: valueUsdc6(b.feeProtocolShares, nps),
      },
      holdersCount: b.holdersCount,
    }),
  );
});

/** GET /v1/baskets/:address/holders?limit=100 */
app.get("/v1/baskets/:address/holders", async (c) => {
  const b = await loadBasket(c.req.param("address"));
  if (!b) return c.json({ error: "not found" }, 404);
  const limit = Math.min(Number(c.req.query("limit") ?? 100), 500);
  const rows = await db
    .select()
    .from(schema.holder)
    .where(and(eq(schema.holder.basket, b.address), notInArray(schema.holder.account, NON_HOLDERS)))
    .orderBy(desc(schema.holder.shares))
    .limit(limit);
  const nps = b.navPerShare ?? 0n;
  const holders = rows
    .filter((h) => h.shares > 0n)
    .map((h) => ({ ...h, pnl: aggregatePnl([h], nps) }));
  return c.json(json({ basket: b.address, holdersCount: b.holdersCount, holders }));
});

const FEED_KINDS = ["Rebalanced", "RecipeProposed", "RecipeCancelled", "RecipeExecuted", "ComponentRemoved"];

/** GET /v1/baskets/:address/rebalances?limit=50 — rebalance + recipe feed, newest first */
app.get("/v1/baskets/:address/rebalances", async (c) => {
  const b = await loadBasket(c.req.param("address"));
  if (!b) return c.json({ error: "not found" }, 404);
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 500);
  const items = await db
    .select()
    .from(schema.event)
    .where(and(eq(schema.event.basket, b.address), inArray(schema.event.kind, FEED_KINDS)))
    .orderBy(desc(schema.event.block), desc(schema.event.logIndex))
    .limit(limit);
  return c.json(json({ basket: b.address, pending: b.pendingExecutableAt ? { w: b.pendingW, executableAt: b.pendingExecutableAt, reasonHash: b.pendingReasonHash } : null, items }));
});

/** GET /v1/rebalances?limit=50 — global rebalance feed */
app.get("/v1/rebalances", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 500);
  const items = await db
    .select()
    .from(schema.event)
    .where(inArray(schema.event.kind, FEED_KINDS))
    .orderBy(desc(schema.event.block), desc(schema.event.logIndex))
    .limit(limit);
  return c.json(json({ items }));
});

/** GET /v1/baskets/:address/events?kind=Bought&limit=100 */
app.get("/v1/baskets/:address/events", async (c) => {
  const b = await loadBasket(c.req.param("address"));
  if (!b) return c.json({ error: "not found" }, 404);
  const limit = Math.min(Number(c.req.query("limit") ?? 100), 500);
  const kind = c.req.query("kind");
  const conds = [eq(schema.event.basket, b.address)];
  if (kind) conds.push(eq(schema.event.kind, kind));
  const items = await db
    .select()
    .from(schema.event)
    .where(and(...conds))
    .orderBy(desc(schema.event.block), desc(schema.event.logIndex))
    .limit(limit);
  return c.json(json({ basket: b.address, items }));
});

/** GET /v1/accounts/:address — an account's holdings across baskets with PnL */
app.get("/v1/accounts/:address", async (c) => {
  const a = c.req.param("address");
  if (!isAddress(a)) return c.json({ error: "bad address" }, 400);
  const rows = await db.select().from(schema.holder).where(eq(schema.holder.account, lc(a)));
  const baskets = rows.length
    ? await db.select().from(schema.basket).where(inArray(schema.basket.address, rows.map((r) => r.basket)))
    : [];
  const byAddr = new Map(baskets.map((b) => [b.address, b]));
  const holdings = rows.map((h) => {
    const b = byAddr.get(h.basket);
    return { ...h, name: b?.name, symbol: b?.symbol, isCreator: b?.creator === h.account, pnl: aggregatePnl([h], b?.navPerShare ?? 0n) };
  });
  const created = await db.select().from(schema.basket).where(eq(schema.basket.creator, lc(a)));
  return c.json(json({ account: lc(a), holdings, created: created.map((b) => b.address) }));
});

/** GET /v1/worker/status — keeper + price-sync heartbeat (written by those processes) */
app.get("/v1/worker/status", (c) =>
  c.json({ keeper: readState("keeper"), priceSync: { mode: priceSyncMode(), last: readState("pricesync") } }),
);

/**
 * POST /v1/admin/price-sync  {"mode":"hold"|"mirror"|"off","minutes"?:number}
 * Header: Authorization: Bearer $ADMIN_TOKEN. Demo-day switch: "hold" keeps scenario prices (heartbeat + arb only).
 */
app.post("/v1/admin/price-sync", async (c) => {
  const token = process.env.ADMIN_TOKEN;
  if (!token || c.req.header("authorization") !== `Bearer ${token}`) return c.json({ error: "unauthorized" }, 401);
  const body = (await c.req.json().catch(() => ({}))) as { mode?: PriceSyncMode; minutes?: number };
  if (!body.mode || !["mirror", "hold", "off"].includes(body.mode)) return c.json({ error: "mode must be mirror|hold|off" }, 400);
  const until = body.minutes ? new Date(Date.now() + body.minutes * 60_000).toISOString() : undefined;
  writeState("pricesync-override", { mode: body.mode, setAt: new Date().toISOString(), until });
  return c.json({ mode: priceSyncMode(), until: until ?? null });
});

export default app;

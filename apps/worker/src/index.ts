import { ponder, type Context } from "ponder:registry";
import { basket, event as eventTable, holder, navSnapshot, pendingIssue, position } from "ponder:schema";
import { replaceBigInts } from "ponder";
import { getAddress, type Address, type Hex } from "viem";
import { DEAD, FACTORY, ROUTER, STOCK_SYMBOLS, ZERO } from "../lib/config";
import { basketAbi } from "../lib/sdk";

/* ------------------------------------------------------------------ helpers */

type Ctx = Context;
type Ev = { id: string; block: { number: bigint; timestamp: bigint }; transaction: { hash: Hex }; log: { logIndex: number; address: Address } };

const lc = (a: string) => a.toLowerCase() as Hex;
const SPECIAL = new Set([lc(ZERO), lc(DEAD), lc(ROUTER), lc(FACTORY)]);
const isSpecial = (a: string) => SPECIAL.has(lc(a));

/** USDC (6 dec) value of `shares` (18 dec) at `nps` (USD 8 dec per 1e18 shares). */
const sharesToUsdc6 = (shares: bigint, nps: bigint) => (shares * nps) / 10n ** 20n;

async function logEvent(context: Ctx, e: Ev, b: string, kind: string, account: string | null, args: unknown) {
  await context.db
    .insert(eventTable)
    .values({
      id: e.id,
      basket: lc(b),
      kind,
      account: account ? lc(account) : null,
      block: e.block.number,
      timestamp: e.block.timestamp,
      txHash: e.transaction.hash,
      logIndex: e.log.logIndex,
      data: replaceBigInts(args as object, (v) => String(v)),
    })
    .onConflictDoNothing();
}

async function getHolder(context: Ctx, b: string, account: string, e: Ev) {
  const key = { basket: lc(b), account: lc(account) };
  const row = await context.db.find(holder, key);
  if (row) return row;
  return context.db
    .insert(holder)
    .values({ ...key, firstBlock: e.block.number, lastActiveAt: e.block.timestamp })
    .onConflictDoNothing()
    .then(async () => (await context.db.find(holder, key))!);
}

async function navPerShareAt(context: Ctx, b: string): Promise<bigint> {
  try {
    return await context.client.readContract({ abi: basketAbi, address: getAddress(b), functionName: "navPerShare" });
  } catch {
    return 0n;
  }
}

/** Re-read NAV + bundle + targets from chain at the current block and store positions + a NAV snapshot. */
async function refresh(context: Ctx, b: string, e: { block: { number: bigint; timestamp: bigint } }, source: string) {
  const address = getAddress(b);
  const read = <T>(functionName: string) =>
    context.client.readContract({ abi: basketAbi, address, functionName } as never) as Promise<T>;
  let nav: bigint, nps: bigint, ts: bigint, comps: readonly Address[], targets: readonly number[], vals: readonly bigint[], bundle: readonly [readonly Address[], readonly bigint[]];
  try {
    [nav, nps, ts, comps, targets, vals, bundle] = await Promise.all([
      read<bigint>("nav"),
      read<bigint>("navPerShare"),
      read<bigint>("totalSupply"),
      read<readonly Address[]>("components"),
      read<readonly number[]>("targets"),
      read<readonly bigint[]>("componentValues"),
      read<readonly [readonly Address[], readonly bigint[]]>("getBundle"),
    ]);
  } catch (err) {
    console.warn(`refresh ${address} @${e.block.number} failed: ${(err as Error).message.split("\n")[0]}`);
    return;
  }
  for (let i = 0; i < comps.length; i++) {
    const token = lc(comps[i]!);
    const row = {
      idx: i,
      symbol: STOCK_SYMBOLS[token] ?? null,
      balance: bundle[1][i] ?? 0n,
      valueUsd8: vals[i] ?? 0n,
      weightBps: nav > 0n ? Number(((vals[i] ?? 0n) * 10_000n) / nav) : 0,
      targetBps: Number(targets[i] ?? 0),
      updatedAt: e.block.timestamp,
      removed: false,
    };
    await context.db.insert(position).values({ basket: lc(b), token, ...row }).onConflictDoUpdate(row);
  }
  const existing = await context.db.find(basket, { address: lc(b) });
  if (existing) {
    await context.db.update(basket, { address: lc(b) }).set({
      navUsd8: nav,
      navPerShare: nps,
      navUpdatedAt: e.block.timestamp,
      totalSupply: ts,
      comps: comps.map(lc),
      targetBps: targets.map(Number),
    });
  }
  const snap = { timestamp: e.block.timestamp, navUsd8: nav, navPerShare: nps, totalSupply: ts, source };
  await context.db
    .insert(navSnapshot)
    .values({ basket: lc(b), block: e.block.number, ...snap })
    .onConflictDoUpdate(snap);
}

async function bumpHolders(context: Ctx, b: string, delta: number) {
  if (delta === 0) return;
  const row = await context.db.find(basket, { address: lc(b) });
  if (!row) return; // seed-time transfers: BasketCreated sets absolute values
  await context.db.update(basket, { address: lc(b) }).set({ holdersCount: Math.max(0, row.holdersCount + delta) });
}

/* ------------------------------------------------------------------ factory */

ponder.on("BasketFactory:BasketCreated", async ({ event, context }) => {
  const a = event.args;
  const b = a.basket;
  const address = getAddress(b);
  const [ts, dead, creatorBal] = await Promise.all([
    context.client.readContract({ abi: basketAbi, address, functionName: "totalSupply" }),
    context.client.readContract({ abi: basketAbi, address, functionName: "deadShares" }),
    context.client.readContract({ abi: basketAbi, address, functionName: "balanceOf", args: [a.creator] }),
  ]);
  await context.db
    .insert(basket)
    .values({
      address: lc(b),
      creator: lc(a.creator),
      name: a.name,
      symbol: a.symbol,
      comps: a.comps.map(lc),
      targetBps: a.targetBps.map(Number),
      feeBps: a.feeBps,
      absBandBps: a.absBand,
      relBandBps: a.relBand,
      capBps: a.cap,
      noticeSec: Number(a.notice),
      demo: a.demo,
      createdBlock: event.block.number,
      createdAt: event.block.timestamp,
      createdTx: event.transaction.hash,
      totalSupply: ts,
      holdersCount: creatorBal > 0n ? 1 : 0,
    })
    .onConflictDoNothing();
  // Seed: creator paid usdcSeed = (creatorShares + deadShares) / 1e12 (1 share = $1 at seed). Absolute values, so
  // this is correct whether or not the seed Transfer/Issued logs (same tx, earlier log index) were delivered.
  const seedUsdc6 = (creatorBal + dead) / 10n ** 12n;
  const h = { shares: creatorBal, costUsdc6: seedUsdc6, depositedUsdc6: seedUsdc6, isCreator: true, lastActiveAt: event.block.timestamp };
  await context.db
    .insert(holder)
    .values({ basket: lc(b), account: lc(a.creator), firstBlock: event.block.number, ...h })
    .onConflictDoUpdate(h);
  await context.db.delete(pendingIssue, { id: `${event.transaction.hash}:${lc(b)}:${lc(a.creator)}` });
  await logEvent(context, event, b, "BasketCreated", a.creator, a);
  await refresh(context, b, event, "event");
});

/* ------------------------------------------------------------------ basket */

ponder.on("Basket:Transfer", async ({ event, context }) => {
  const b = event.log.address;
  const { from, to, amount } = event.args as { from: Address; to: Address; amount: bigint };
  const peer = !isSpecial(from) && !isSpecial(to);
  let movedCost = 0n;
  if (!isSpecial(from)) {
    const h = await getHolder(context, b, from, event);
    if (peer && h.shares > 0n) movedCost = (h.costUsdc6 * amount) / h.shares;
    const shares = h.shares - amount;
    await context.db
      .update(holder, { basket: lc(b), account: lc(from) })
      .set({ shares, costUsdc6: h.costUsdc6 - movedCost, lastActiveAt: event.block.timestamp });
    if (h.shares > 0n && shares === 0n) await bumpHolders(context, b, -1);
  }
  if (!isSpecial(to)) {
    const h = await getHolder(context, b, to, event);
    await context.db
      .update(holder, { basket: lc(b), account: lc(to) })
      .set({ shares: h.shares + amount, costUsdc6: h.costUsdc6 + movedCost, lastActiveAt: event.block.timestamp });
    if (h.shares === 0n && amount > 0n) await bumpHolders(context, b, +1);
  }
  const row = await context.db.find(basket, { address: lc(b) });
  if (row && (lc(from) === lc(ZERO) || lc(to) === lc(ZERO))) {
    const ts = lc(from) === lc(ZERO) ? row.totalSupply + amount : row.totalSupply - amount;
    await context.db.update(basket, { address: lc(b) }).set({ totalSupply: ts });
  }
});

ponder.on("Basket:Issued", async ({ event, context }) => {
  const b = event.log.address;
  const { to, shares } = event.args;
  await logEvent(context, event, b, "Issued", to, event.args);
  const row = await context.db.find(basket, { address: lc(b) });
  if (!row || isSpecial(to)) return; // seed: BasketCreated books the cost
  // Book fair value now; a router Bought in the same tx replaces it with the real USDC paid.
  const fair = sharesToUsdc6(shares, await navPerShareAt(context, b));
  const h = await getHolder(context, b, to, event);
  await context.db
    .update(holder, { basket: lc(b), account: lc(to) })
    .set({ costUsdc6: h.costUsdc6 + fair, depositedUsdc6: h.depositedUsdc6 + fair });
  await context.db
    .insert(pendingIssue)
    .values({ id: `${event.transaction.hash}:${lc(b)}:${lc(to)}`, shares, bookedUsdc6: fair })
    .onConflictDoUpdate((r) => ({ shares: r.shares + shares, bookedUsdc6: r.bookedUsdc6 + fair }));
  await refresh(context, b, event, "event");
});

ponder.on("Basket:Redeemed", async ({ event, context }) => {
  const b = event.log.address;
  const { from, shares } = event.args;
  await logEvent(context, event, b, "Redeemed", from, event.args);
  if (!isSpecial(from)) {
    // In-kind redeem by the holder (router sells are booked in AlloyRouter:Sold). Transfer already burned the shares.
    const h = await getHolder(context, b, from, event);
    const pre = h.shares + shares;
    const removed = pre > 0n ? (h.costUsdc6 * shares) / pre : 0n;
    const proceeds = sharesToUsdc6(shares, await navPerShareAt(context, b));
    await context.db.update(holder, { basket: lc(b), account: lc(from) }).set({
      costUsdc6: h.costUsdc6 - removed,
      realizedUsdc6: h.realizedUsdc6 + proceeds - removed,
      withdrawnUsdc6: h.withdrawnUsdc6 + proceeds,
    });
  }
  await refresh(context, b, event, "event");
});

ponder.on("Basket:RecipeProposed", async ({ event, context }) => {
  const b = event.log.address;
  const row = await context.db.find(basket, { address: lc(b) });
  await logEvent(context, event, b, "RecipeProposed", row?.creator ?? null, event.args);
  if (row)
    await context.db.update(basket, { address: lc(b) }).set({
      pendingW: event.args.w.map(Number),
      pendingExecutableAt: event.args.executableAt,
      pendingReasonHash: event.args.reasonHash,
    });
});

ponder.on("Basket:RecipeCancelled", async ({ event, context }) => {
  const b = event.log.address;
  const row = await context.db.find(basket, { address: lc(b) });
  await logEvent(context, event, b, "RecipeCancelled", row?.creator ?? null, {});
  if (row)
    await context.db
      .update(basket, { address: lc(b) })
      .set({ pendingW: null, pendingExecutableAt: null, pendingReasonHash: null });
});

ponder.on("Basket:RecipeExecuted", async ({ event, context }) => {
  const b = event.log.address;
  await logEvent(context, event, b, "RecipeExecuted", null, event.args);
  if (await context.db.find(basket, { address: lc(b) }))
    await context.db.update(basket, { address: lc(b) }).set({
      targetBps: event.args.w.map(Number),
      pendingW: null,
      pendingExecutableAt: null,
      pendingReasonHash: null,
    });
});

ponder.on("Basket:Rebalanced", async ({ event, context }) => {
  const b = event.log.address;
  await logEvent(context, event, b, "Rebalanced", event.args.executor, event.args);
  const row = await context.db.find(basket, { address: lc(b) });
  if (row)
    await context.db
      .update(basket, { address: lc(b) })
      .set({ rebalanceCount: row.rebalanceCount + 1, lastRebalanceAt: event.block.timestamp });
  await refresh(context, b, event, "event");
});

ponder.on("Basket:FeeAccrued", async ({ event, context }) => {
  const b = event.log.address;
  await logEvent(context, event, b, "FeeAccrued", null, event.args);
  const row = await context.db.find(basket, { address: lc(b) });
  if (row)
    await context.db.update(basket, { address: lc(b) }).set({
      feeCreatorShares: row.feeCreatorShares + event.args.creatorShares,
      feeProtocolShares: row.feeProtocolShares + event.args.protocolShares,
    });
});

ponder.on("Basket:OwedClaimed", async ({ event, context }) => {
  await logEvent(context, event, event.log.address, "OwedClaimed", event.args.user, event.args);
});

ponder.on("Basket:ComponentRemoved", async ({ event, context }) => {
  const b = event.log.address;
  await logEvent(context, event, b, "ComponentRemoved", null, event.args);
  const key = { basket: lc(b), token: lc(event.args.token) };
  if (await context.db.find(position, key)) await context.db.update(position, key).set({ removed: true, balance: 0n, valueUsd8: 0n, weightBps: 0 });
  await refresh(context, b, event, "event");
});

/* ------------------------------------------------------------------ router */

ponder.on("AlloyRouter:Bought", async ({ event, context }) => {
  const { user, basket: b, usdcIn } = event.args;
  await logEvent(context, event, b, "Bought", user, event.args);
  const id = `${event.transaction.hash}:${lc(b)}:${lc(user)}`;
  const pending = await context.db.find(pendingIssue, { id });
  const booked = pending?.bookedUsdc6 ?? 0n;
  const h = await getHolder(context, b, user, event);
  await context.db.update(holder, { basket: lc(b), account: lc(user) }).set({
    costUsdc6: h.costUsdc6 + usdcIn - booked,
    depositedUsdc6: h.depositedUsdc6 + usdcIn - booked,
    lastActiveAt: event.block.timestamp,
  });
  if (pending) await context.db.delete(pendingIssue, { id });
  const row = await context.db.find(basket, { address: lc(b) });
  if (row) await context.db.update(basket, { address: lc(b) }).set({ volumeUsdc6: row.volumeUsdc6 + usdcIn });
});

ponder.on("AlloyRouter:Sold", async ({ event, context }) => {
  const { user, basket: b, shares, usdcOut } = event.args;
  await logEvent(context, event, b, "Sold", user, event.args);
  const h = await getHolder(context, b, user, event);
  const pre = h.shares + shares; // user -> router Transfer already ran
  const removed = pre > 0n ? (h.costUsdc6 * shares) / pre : 0n;
  await context.db.update(holder, { basket: lc(b), account: lc(user) }).set({
    costUsdc6: h.costUsdc6 - removed,
    realizedUsdc6: h.realizedUsdc6 + usdcOut - removed,
    withdrawnUsdc6: h.withdrawnUsdc6 + usdcOut,
    lastActiveAt: event.block.timestamp,
  });
  const row = await context.db.find(basket, { address: lc(b) });
  if (row) await context.db.update(basket, { address: lc(b) }).set({ volumeUsdc6: row.volumeUsdc6 + usdcOut });
});

ponder.on("AlloyRouter:BuyLeftovers", async ({ event, context }) => {
  await logEvent(context, event, event.args.basket, "BuyLeftovers", event.args.user, event.args);
});

/* ------------------------------------------------------------------ hourly NAV */

ponder.on("NavSnapshot:block", async ({ event, context }) => {
  const rows = await context.db.sql.select({ address: basket.address, createdBlock: basket.createdBlock }).from(basket);
  for (const r of rows) {
    if (r.createdBlock <= event.block.number) await refresh(context, r.address, event, "hourly");
  }
});


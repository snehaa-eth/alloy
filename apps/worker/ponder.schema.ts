import { index, onchainTable, primaryKey, relations } from "ponder";

/** One row per basket (from BasketFactory.BasketCreated), plus latest derived state. */
export const basket = onchainTable("basket", (t) => ({
  address: t.hex().primaryKey(),
  creator: t.hex().notNull(),
  name: t.text().notNull(),
  symbol: t.text().notNull(),
  comps: t.hex().array().notNull(),
  targetBps: t.integer().array().notNull(),
  feeBps: t.integer().notNull(),
  absBandBps: t.integer().notNull(),
  relBandBps: t.integer().notNull(),
  capBps: t.integer().notNull(),
  noticeSec: t.integer().notNull(),
  demo: t.boolean().notNull(),
  createdBlock: t.bigint().notNull(),
  createdAt: t.bigint().notNull(),
  createdTx: t.hex().notNull(),
  // Rolling state
  totalSupply: t.bigint().notNull().default(0n),
  holdersCount: t.integer().notNull().default(0),
  navUsd8: t.bigint(), // latest known NAV (USD, 8 dec)
  navPerShare: t.bigint(), // USD 8 dec per 1e18 shares
  navUpdatedAt: t.bigint(),
  pendingW: t.integer().array(),
  pendingExecutableAt: t.bigint(),
  pendingReasonHash: t.hex(),
  rebalanceCount: t.integer().notNull().default(0),
  lastRebalanceAt: t.bigint(),
  feeCreatorShares: t.bigint().notNull().default(0n),
  feeProtocolShares: t.bigint().notNull().default(0n),
  volumeUsdc6: t.bigint().notNull().default(0n), // router buys + sells
}));

/**
 * Share holders with average-cost basis (USDC, 6 dec) for PnL.
 * - router buy: cost += usdcIn;  direct issue: cost += fair value (shares x navPerShare);  factory seed: cost = USDC seed
 * - router sell / direct redeem: cost -= avgCost x shares, realized += proceeds - removed cost
 * - wallet-to-wallet transfer: avg cost moves with the shares; fee mints come in at zero cost
 */
export const holder = onchainTable(
  "holder",
  (t) => ({
    basket: t.hex().notNull(),
    account: t.hex().notNull(),
    shares: t.bigint().notNull().default(0n),
    costUsdc6: t.bigint().notNull().default(0n),
    realizedUsdc6: t.bigint().notNull().default(0n), // signed
    depositedUsdc6: t.bigint().notNull().default(0n),
    withdrawnUsdc6: t.bigint().notNull().default(0n),
    isCreator: t.boolean().notNull().default(false),
    firstBlock: t.bigint().notNull(),
    lastActiveAt: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.basket, table.account] }),
    accountIdx: index().on(table.account),
  }),
);

/** Every protocol event, normalised (data = event args, bigints as strings). */
export const event = onchainTable(
  "event",
  (t) => ({
    id: t.text().primaryKey(),
    basket: t.hex().notNull(),
    kind: t.text().notNull(), // BasketCreated|Issued|Redeemed|Bought|Sold|BuyLeftovers|RecipeProposed|RecipeCancelled|RecipeExecuted|Rebalanced|FeeAccrued|OwedClaimed|ComponentRemoved
    account: t.hex(),
    block: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
    data: t.json().notNull(),
  }),
  (table) => ({
    basketIdx: index().on(table.basket, table.timestamp),
    kindIdx: index().on(table.kind),
  }),
);

/** NAV series: hourly block-interval snapshots + one after every rebalance / issue / redeem block. */
export const navSnapshot = onchainTable(
  "nav_snapshot",
  (t) => ({
    basket: t.hex().notNull(),
    block: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    navUsd8: t.bigint().notNull(),
    navPerShare: t.bigint().notNull(),
    totalSupply: t.bigint().notNull(),
    source: t.text().notNull(), // hourly | event
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.basket, table.block] }),
    tsIdx: index().on(table.basket, table.timestamp),
  }),
);

/** Current component positions of each basket. */
export const position = onchainTable(
  "position",
  (t) => ({
    basket: t.hex().notNull(),
    token: t.hex().notNull(),
    idx: t.integer().notNull(),
    symbol: t.text(),
    balance: t.bigint().notNull(),
    valueUsd8: t.bigint().notNull(),
    weightBps: t.integer().notNull(),
    targetBps: t.integer().notNull(),
    updatedAt: t.bigint().notNull(),
    removed: t.boolean().notNull().default(false),
  }),
  (table) => ({ pk: primaryKey({ columns: [table.basket, table.token] }) }),
);

/** Fair value booked by an Issued event, so a later Bought / BasketCreated in the same tx can true it up. */
export const pendingIssue = onchainTable("pending_issue", (t) => ({
  id: t.text().primaryKey(), // txHash:basket:account
  shares: t.bigint().notNull(),
  bookedUsdc6: t.bigint().notNull(),
}));

export const basketRelations = relations(basket, ({ many }) => ({
  holders: many(holder),
  positions: many(position),
}));
export const holderRelations = relations(holder, ({ one }) => ({
  basketRef: one(basket, { fields: [holder.basket], references: [basket.address] }),
}));
export const positionRelations = relations(position, ({ one }) => ({
  basketRef: one(basket, { fields: [position.basket], references: [basket.address] }),
}));

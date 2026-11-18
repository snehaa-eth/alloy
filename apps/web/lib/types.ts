/**
 * Domain types for the web app. All money/amount fields are bigint
 * (see lib/units.ts for decimals). bps fields are integer numbers.
 *
 * TODO(sdk): replace with zod DTOs from packages/sdk once published.
 */
export type Address = `0x${string}`;

export type StrategyMode = "balanced" | "let-winners-run" | "trend-aware";

export type Stock = {
  /** Token symbol, e.g. "NVDAc" */
  symbol: string;
  /** Underlying ticker, e.g. "NVDA" */
  ticker: string;
  name: string;
  token: Address;
  /** Chainlink price, 8 decimals (underlying x multiplier, per raw token). */
  price8: bigint;
};

export type BasketComponent = {
  stock: Stock;
  targetBps: number;
  /** Raw B20 balance held by the vault, 8 decimals. */
  balance8: bigint;
};

export type Creator = { address: Address; handle: string; displayName: string };

export type Basket = {
  address: Address;
  name: string;
  symbol: string;
  thesis: string;
  category: "ai" | "story" | "momentum" | "other";
  creator: Creator;
  mode: StrategyMode;
  /** Management fee, bps per year (immutable per basket). */
  feeBps: number;
  /** Notice before a recipe change executes, seconds. */
  noticeSeconds: number;
  /** Demo baskets use a 10-minute notice; always flagged in the UI. */
  demo: boolean;
  components: BasketComponent[];
  /** Basket token supply, 18 decimals. */
  totalSupply: bigint;
  /** Creator's own stake, 18 decimals. */
  creatorShares: bigint;
  followers: number;
  createdAt: number;
  /** Story baskets: where the idea comes from (shown with "not affiliated"). */
  story?: { source: string; disclosureDate: string };
};

export type NavPoint = { t: number; navPerShareUsd6: bigint };

export type Performance = {
  navSeries: NavPoint[];
  maxDrawdownBps: number;
  creatorPnl: { usd6: bigint; bps: number };
  followerPnl: { usd6: bigint; bps: number };
  feesEarnedUsd6: bigint;
};

export type RebalanceKind = "drift-trim" | "recipe-change";
export type RebalanceStatus = "executed" | "pending" | "cancelled";

export type RebalanceEvent = {
  id: string;
  kind: RebalanceKind;
  status: RebalanceStatus;
  /** Unix seconds: execution time, or proposal time when pending. */
  at: number;
  executableAt?: number;
  changes: { symbol: string; fromBps: number; toBps: number }[];
  /** Realised loss vs oracle NAV, bps. */
  costBps?: number;
  reason?: string;
  aiGenerated?: boolean;
  txHash?: `0x${string}`;
};

export type Position = {
  basket: Address;
  shares: bigint;
  /** Net USDC put in (buys - sells), 6 decimals. */
  costUsd6: bigint;
};

import type { StrategyMode } from "./types";

/** ARCHITECTURE §3.1: modes are parameters + keeper policy, not contract logic. */
export const STRATEGY_MODES: Record<
  StrategyMode,
  { label: string; oneLiner: string; absBandBps: number; relBandBps: number; capBps: number }
> = {
  balanced: {
    label: "Balanced",
    oneLiner: "We only step in when a stock drifts far.",
    absBandBps: 500,
    relBandBps: 2500,
    capBps: 10_000,
  },
  "let-winners-run": {
    label: "Let Winners Run",
    oneLiner: "Winners keep growing; we only trim if one takes over.",
    absBandBps: 10_000,
    relBandBps: 10_000,
    capBps: 4000,
  },
  "trend-aware": {
    label: "Trend-aware",
    oneLiner: "Let winners run while rising; trim when the trend breaks.",
    absBandBps: 500,
    relBandBps: 2500,
    capBps: 10_000,
  },
};

export const STRATEGY_MODE_LIST = Object.keys(STRATEGY_MODES) as StrategyMode[];

export const DEFAULT_FEE_BPS = 100; // 1%/yr
export const MAX_FEE_BPS = 200; // 2%/yr
export const MIN_SEED_USDC = 10n * 10n ** 6n; // $10
export const MIN_BUY_USDC = 5n * 10n ** 6n; // $5
export const DEFAULT_SLIPPAGE_BPS = 100; // 1%
export const RECIPE_NOTICE_SECONDS = 24 * 60 * 60;
export const DEMO_NOTICE_SECONDS = 10 * 60;

/**
 * Creator "styles" (user-facing names for the on-chain strategy modes). Plain words only:
 * say "take some profit", never "trim" / "band" / "rebalance" in headlines.
 * Order is the display order everywhere (Let winners run first, and the default in /create).
 */
import type { LucideIcon } from "lucide-react";
import { Rocket, Target, TrendingUp } from "lucide-react";
import type { StrategyMode } from "@/lib/types";

export const STYLES: Record<StrategyMode, { icon: LucideIcon; label: string; line: string }> = {
  "let-winners-run": { icon: Rocket, label: "Let winners run", line: "Rising stocks keep growing. We only step in if one takes over." },
  "trend-aware": { icon: TrendingUp, label: "Ride the trend", line: "We hold winners while they rise, then take some profit when they turn." },
  balanced: { icon: Target, label: "Keep the mix", line: "When one stock jumps, we take some profit and spread it to the others." },
};

export const STYLE_ORDER: StrategyMode[] = ["let-winners-run", "trend-aware", "balanced"];

/**
 * The style a basket actually runs. On-chain bands are the source of truth when present:
 * no drift selling (abs+rel bands ≥ 100%) = 🚀 Let winners run, whatever the stored mode label says.
 */
export function styleOf(b: { mode: StrategyMode; bands?: { absBandBps: number; relBandBps: number; capBps: number } }): StrategyMode {
  if (b.bands && b.bands.absBandBps >= 10_000 && b.bands.relBandBps >= 10_000) return "let-winners-run";
  return b.mode;
}

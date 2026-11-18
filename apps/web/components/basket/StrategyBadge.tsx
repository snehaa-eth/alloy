import { STRATEGY_MODES } from "@/lib/strategy";
import type { StrategyMode } from "@/lib/types";

export function StrategyBadge({ mode }: { mode: StrategyMode }) {
  return (
    <span
      title={STRATEGY_MODES[mode].oneLiner}
      className="rounded border border-[#2a2a2a] bg-[#1b1b1b] px-2 py-0.5 text-xs text-gray-300"
    >
      {STRATEGY_MODES[mode].label}
    </span>
  );
}

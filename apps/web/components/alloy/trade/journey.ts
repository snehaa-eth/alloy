/**
 * Real transaction steps (lib/tx.ts TxStep) → the visual journey of the buy / sell sheets. PURE.
 *
 * Buy:  Approving → Pouring → Settling
 *   switch | quote | approve | simulate  → "approve"  step 0  (drop trembles above the basket, shimmer)
 *   write                                → "sign"     step 1  (drop lowers, waits for the wallet signature)
 *   confirm                              → "wait"     step 1  (drop hangs low, its tail reaching; NOT merging yet)
 *   done (receipt.status === success)    → "pour"     step 1  (the drop falls in: teardrop, bridge, absorbed)
 *   … pour animation ends                → "settle"   step 2  (ripple, lobe labels "+$x"), then the success pane
 *   error                                → "bounce"   (the drop springs back up), then the error pane
 * The drop only merges after the real receipt: nothing on screen claims money moved before the chain says so.
 *
 * Sell: Selling → Converting → Sending
 *   switch | quote | approve | simulate | write | confirm → "hold" step 0 (the bud swells out and strains, still attached)
 *   done                                                  → "pinch" step 0 (thread thins and lets go)
 *   … then "convert" step 1 (bud turns USDC blue) → "send" step 2 (rolls into the wallet chip) → success pane
 */
import type { TxStep } from "@/lib/tx";

export type BuyVisual = "amount" | "approve" | "sign" | "wait" | "pour" | "settle" | "done" | "bounce" | "err";
export type SellVisual = "pick" | "hold" | "pinch" | "convert" | "send" | "done" | "err";

/** Visual phase for a running buy, from the real tx step. */
export function buyVisualFor(step: TxStep): BuyVisual {
  switch (step) {
    case "switch":
    case "quote":
    case "approve":
    case "simulate":
      return "approve";
    case "write":
      return "sign";
    case "confirm":
      return "wait";
    case "done":
      return "pour";
    case "error":
      return "bounce";
    default:
      return "approve"; // idle while the mutation spins up
  }
}

/** Which of the three step bars is lit (0 Approving, 1 Pouring, 2 Settling). */
export function buyStepIndex(v: BuyVisual): number {
  return v === "approve" ? 0 : v === "sign" || v === "wait" || v === "pour" ? 1 : v === "settle" || v === "done" ? 2 : -1;
}

export const BUY_STEPS = ["Approving", "Pouring", "Settling"] as const;

/** Status line under the step title. Plain words; amount and company count come from the real basket. */
export function buyStatus(v: BuyVisual, step: TxStep, amount: string, companies: number): { title: string; line: string } {
  const n = companies === 1 ? "one company" : `${NUM[companies] ?? companies} companies`;
  if (v === "approve") {
    const line =
      step === "switch"
        ? "Switching your wallet to Base Sepolia."
        : step === "quote"
          ? `Getting a price for ${amount}.`
          : step === "simulate"
            ? "Checking it will go through."
            : `Letting Alloy use ${amount} of your USDC.`;
    return { title: "Approving", line };
  }
  if (v === "sign") return { title: "Pouring", line: "Confirm in your wallet." };
  if (v === "wait" || v === "pour") return { title: "Pouring", line: `Splitting it across ${n}.` };
  return { title: "Settling", line: "Your basket token is landing in your wallet." };
}

/** Visual phase for a running sell, from the real tx step. */
export function sellVisualFor(step: TxStep): SellVisual {
  if (step === "done") return "pinch";
  if (step === "error") return "err";
  return "hold";
}

export function sellStepIndex(v: SellVisual): number {
  return v === "hold" || v === "pinch" ? 0 : v === "convert" ? 1 : v === "send" || v === "done" ? 2 : -1;
}

export const SELL_STEPS = ["Selling", "Converting", "Sending"] as const;

export function sellStatus(v: SellVisual, step: TxStep, stocks: boolean): { title: string; line: string } {
  if (v === "hold" || v === "pinch") {
    const line =
      step === "switch"
        ? "Switching your wallet to Base Sepolia."
        : step === "approve"
          ? "Letting Alloy move your basket token."
          : step === "write"
            ? "Confirm in your wallet."
            : "Taking your share out of the basket.";
    return { title: "Selling", line };
  }
  if (v === "convert") return { title: "Converting", line: stocks ? "Splitting it back into its stocks." : "Turning the stocks into USDC." };
  return { title: "Sending", line: "On its way to your wallet." };
}

const NUM: Record<number, string> = { 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten" };

/** Animation lengths (seconds), from the approved mockups. */
export const DUR = { pour: 1.7, settle: 1.9, bounce: 1.4, pinch: 0.9, convert: 1.3, send: 1.6 } as const;

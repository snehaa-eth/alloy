import { describe, expect, it } from "vitest";
import type { TxStep } from "@/lib/tx";
import { buyStatus, buyStepIndex, buyVisualFor, sellStepIndex, sellVisualFor } from "./journey";

describe("buy journey", () => {
  it("maps every real step onto Approving → Pouring → Settling", () => {
    const steps: TxStep[] = ["switch", "quote", "approve", "simulate", "write", "confirm", "done", "error"];
    expect(steps.map(buyVisualFor)).toEqual(["approve", "approve", "approve", "approve", "sign", "wait", "pour", "bounce"]);
    expect(steps.map((s) => buyStepIndex(buyVisualFor(s)))).toEqual([0, 0, 0, 0, 1, 1, 1, -1]);
    expect(buyStepIndex("settle")).toBe(2);
  });
  it("only pours after the receipt (done), never on write or confirm", () => {
    expect(buyVisualFor("write")).not.toBe("pour");
    expect(buyVisualFor("confirm")).not.toBe("pour");
    expect(buyVisualFor("done")).toBe("pour");
  });
  it("says what is happening", () => {
    expect(buyStatus("approve", "approve", "$25.00", 4).line).toBe("Letting Alloy use $25.00 of your USDC.");
    expect(buyStatus("wait", "confirm", "$25.00", 4).line).toBe("Splitting it across four companies.");
  });
});

describe("sell journey", () => {
  it("holds the bud until the receipt, then pinches", () => {
    expect((["quote", "approve", "simulate", "write", "confirm"] as TxStep[]).map(sellVisualFor).every((v) => v === "hold")).toBe(true);
    expect(sellVisualFor("done")).toBe("pinch");
    expect(sellStepIndex("convert")).toBe(1);
  });
});

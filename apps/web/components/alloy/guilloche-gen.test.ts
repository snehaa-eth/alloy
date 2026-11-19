import { describe, expect, it } from "vitest";
import { guillocheShapes, hash32, seedOf } from "./guilloche-gen";
import { basketCode, basketIdentity } from "./identity";
import { clock, compactUsd6 } from "./basket-view";

const input = { series: [10, 10.2, 9.9, 10.4, 10.1, 9.6, 9.8], weightsBps: [3500, 2500, 2000, 1200, 800], seed: "0xabc" };

describe("guilloche generator (port of system_v4.py)", () => {
  it("derives parameters from the recipe like the Python seed_of", () => {
    const s = seedOf(input);
    expect(s.petals).toBe(15); // 5 + 2 × 5 stocks
    expect(s.lines).toBe(19); // 9 + 2 × 5
    expect(s.k2).toBe(6); // round(35 / 6)
    expect(s.freq).toBeCloseTo(2 + 35 / 18);
    expect(s.vol).toBeGreaterThan(0);
  });

  it("is deterministic and seed-sensitive", () => {
    const a = guillocheShapes(input);
    expect(guillocheShapes(input)).toEqual(a);
    expect(guillocheShapes({ ...input, seed: "0xdef" })).not.toEqual(a);
  });

  it("draws lattice + rosette + frame", () => {
    const shapes = guillocheShapes(input);
    expect(shapes.filter((s) => s.kind === "path")).toHaveLength(19 * 2 + 5 + 3);
    expect(shapes.filter((s) => s.kind === "rect")).toHaveLength(2);
    expect(shapes.filter((s) => s.kind === "circle")).toHaveLength(4);
    expect(guillocheShapes(input, { frame: false, rosette: false }).every((s) => s.kind === "path")).toBe(true);
  });

  it("keeps lattice points inside the engraving band", () => {
    for (const s of guillocheShapes(input, { rosette: false, frame: false })) {
      if (s.kind !== "path") continue;
      for (const pt of s.d.replace("M", "").split(" L")) {
        const y = Number(pt.split(",")[1]);
        expect(y).toBeGreaterThanOrEqual(14);
        expect(y).toBeLessThanOrEqual(90);
      }
    }
  });

  it("handles flat and tiny series", () => {
    expect(() => guillocheShapes({ ...input, series: [5] })).not.toThrow();
    expect(() => guillocheShapes({ ...input, series: [] })).not.toThrow();
  });
});

describe("identity + formatting", () => {
  it("hash32 is stable", () => expect(hash32("alloy")).toBe(hash32("alloy")));
  it("codes", () => {
    expect(basketCode("The AI Build-Out")).toBe("TAB");
    expect(basketCode("Capitol Tech")).toBe("CTE");
    expect(basketCode("Momentum")).toBe("MOM");
  });
  it("identity maps to a cover + tone", () => {
    const id = basketIdentity({ address: "0xA110000000000000000000000000000000000001", category: "ai", name: "AI Leaders" });
    expect(id.cover).toBe("ai-build-out");
    expect(id.tone).toBe("sapp");
    expect(id.serial).toMatch(/^No\. \d{4} · ALE$/);
  });
  it("clock + compact", () => {
    expect(clock(3725)).toBe("01:02:05");
    expect(clock(3 * 86_400 + 7200)).toBe("3d 2h");
    expect(compactUsd6(1_234_000_000n)).toBe("$1.2k");
    expect(compactUsd6(-5_500_000n)).toBe("−$5.50");
  });
});

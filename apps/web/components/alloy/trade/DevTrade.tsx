"use client";

/**
 * DEV ONLY (app/dev-trade): the buy / sell flows with a mocked tx that walks the REAL step sequence of
 * lib/hooks/use-basket-tx (quote → approve → simulate → write → confirm → done | error), plus frame probes of the
 * teardrop pour and the sell pinch at fixed times. Query: ?view=buy|sell|panel|strip &fail=<step> &ms=<time scale>.
 */
import { useMemo, useRef, useState } from "react";
import type { TxStep } from "@/lib/tx";
import type { V3 } from "../metal/math";
import { pourFrame, pinchTail, surfaceTop } from "../metal/actions";
import { useMetalRegion } from "../metal/MetalCanvas";
import { posedDrops, shapeFromRecipe } from "../metal/shape";
import type { BasketView } from "../basket-view";
import { BuyFlow, recipeFor, type BuyTx } from "./BuyFlow";
import { dropR, hoverY } from "./BuyStage";
import { SellFlow, type SellTx } from "./SellFlow";
import { DUR } from "./journey";
import { TradePanel, TradeSheet } from "./ui";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function useMockLeg(seq: [TxStep, number][], fail: string | undefined, scale: number) {
  const [step, setStep] = useState<TxStep>("idle");
  const run = async () => {
    for (const [s, ms] of seq) {
      setStep(s);
      (window as unknown as { __step: string }).__step = s;
      await wait(ms * scale);
      if (fail === s) {
        setStep("error");
        (window as unknown as { __step: string }).__step = "error";
        throw new Error(s === "write" ? "User rejected the request." : "Not enough tUSDC: you have $3.00. Use the faucet to get test USDC.");
      }
    }
    setStep("confirm");
    (window as unknown as { __step: string }).__step = "confirm";
    await wait(1800 * scale);
    setStep("done");
    (window as unknown as { __step: string }).__step = "done";
    return "0xmock";
  };
  return { step, run, reset: () => setStep("idle") };
}

const BUY_SEQ: [TxStep, number][] = [["quote", 700], ["approve", 1800], ["simulate", 500], ["write", 1500]];

export function DevTrade({ v, view, fail, scale }: { v: BasketView; view: string; fail?: string; scale: number }) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("alloy.attest.non-us.v1", "1");
      sessionStorage.setItem("alloy.preview", "1");
    } catch {
      /* ignore */
    }
  }
  const b = useMockLeg(BUY_SEQ, fail, scale);
  const buyTx: BuyTx = { step: b.step, run: b.run, reset: b.reset, shares: b.step === "done" ? v.basket.totalSupply / 40n : null };
  const s = useMockLeg(BUY_SEQ, fail, scale);
  const w = useMockLeg([["simulate", 500], ["write", 1200]], fail, scale);
  const sellTx: SellTx = {
    sell: { step: s.step, run: s.run, reset: s.reset, out: s.step === "done" ? 13_460_000n : null },
    withdraw: { step: w.step, run: w.run, reset: w.reset, heldMask: w.step === "done" ? 0n : null },
  };
  const [amount, setAmount] = useState("25");
  const [open, setOpen] = useState(true);
  const [pane, setPane] = useState("compose");

  if (view === "strip") return <Strip v={v} />;
  if (view === "panel")
    return (
      <div className="mx-auto grid max-w-[1200px] grid-cols-[1fr_380px] gap-10 px-8 pt-6">
        <div className="h-[1400px] rounded-[24px] border border-white/10" />
        <aside className="sticky top-[116px] self-start">
          <TradePanel eyebrow="Buy" title={v.basket.name} scrollKey={pane}>
            <BuyFlow v={v} tx={buyTx} amount={amount} setAmount={setAmount} onDone={() => undefined} marketOpen={true} panel onSell={() => undefined} onStage={setPane} />
          </TradePanel>
        </aside>
      </div>
    );
  return (
    <div className="px-8 pt-6">
      <button type="button" className="a-btn a-btn--line" onClick={() => setOpen(true)}>
        Open {view}
      </button>
      {view === "sell" ? (
        <TradeSheet open={open} onOpenChange={setOpen} eyebrow="Sell" title={v.basket.name} scrollKey={pane}>
          <SellFlow v={v} shares={v.basket.totalSupply / 20n} tx={sellTx} open={open} onDone={() => setOpen(false)} marketOpen={true} onStage={setPane} />
        </TradeSheet>
      ) : (
        <TradeSheet open={open} onOpenChange={setOpen} eyebrow="Buy" title={v.basket.name} scrollKey={pane}>
          <BuyFlow v={v} tx={buyTx} amount={amount} setAmount={setAmount} onDone={() => setOpen(false)} marketOpen={true} onStage={setPane} />
        </TradeSheet>
      )}
    </div>
  );
}

/** Fixed-time probes: the exact pour / pinch geometry BuyStage and SellStage use, every 80 ms. */
function Strip({ v }: { v: BasketView }) {
  const pour = Array.from({ length: Math.ceil((DUR.pour * 1000) / 80) + 1 }, (_, i) => Math.min(1, (i * 80) / (DUR.pour * 1000)));
  const pinch = Array.from({ length: 12 }, (_, i) => i / 11);
  return (
    <div className="px-6 pt-4">
      <p className="mb-2 text-[13px] text-mute">Buy pour ($25), every 80 ms</p>
      <div className="grid grid-cols-6 gap-2">
        {pour.map((u, i) => (
          <div key={i} className="relative rounded-[12px] border border-white/10">
            <span className="absolute left-2 top-1 text-[11px] text-mute">{i * 80}ms</span>
            <Probe v={v} kind="pour" u={u} />
          </div>
        ))}
      </div>
      <p className="mb-2 mt-6 text-[13px] text-mute">First contact, close up (every 20 ms)</p>
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 12 }, (_, i) => 0.24 + (i * 0.02) / DUR.pour).map((u, i) => (
          <div key={i} className="relative rounded-[12px] border border-white/10">
            <span className="absolute left-2 top-1 text-[11px] text-mute">{Math.round(u * DUR.pour * 1000)}ms</span>
            <Probe v={v} kind="pour" u={u} zoom={2.6} />
          </div>
        ))}
      </div>
      <p className="mb-2 mt-6 text-[13px] text-mute">Sell pinch (50%)</p>
      <div className="grid grid-cols-6 gap-2">
        {pinch.map((q, i) => (
          <div key={i} className="relative rounded-[12px] border border-white/10">
            <span className="absolute left-2 top-1 text-[11px] text-mute">q {q.toFixed(2)}</span>
            <Probe v={v} kind="pinch" u={q} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Probe({ v, kind, u, zoom = 4.9 }: { v: BasketView; kind: "pour" | "pinch"; u: number; zoom?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const recipe = useMemo(() => recipeFor(v), [v]);
  const shape = useMemo(() => shapeFromRecipe(recipe), [recipe]);
  useMetalRegion(ref, () => {
    if (kind === "pour") {
      const posed = posedDrops(shape, { ang: 0.35, t: 0, off: [0, -0.5, 0] });
      const top = surfaceTop(posed.drops);
      const r = dropR(25);
      const f = pourFrame(u, { y0: hoverY(top, r, "wait"), top, yc: top - 0.5, r, swell: 0.08 });
      const posed2 = posedDrops(shape, { ang: 0.35, t: 0, rs: 1 + f.swell, off: [0, -0.5, 0] });
      return {
        cam: { ro: [0, 0.35, zoom] as V3, ta: [0, zoom < 4 ? top : -0.12, 0] as V3, tan: 0.42 },
        drops: [...posed2.drops, { p: f.drop.p, r: f.drop.r, c: [0.92, 0.9, 0.88] as V3 }],
        o: { t: 0, zone: posed2.zone, k2: f.k2, rip: f.rip * 0.8, tail: f.tail ? { i: 4, ...f.tail } : null },
      };
    }
    const cx = -1.55;
    const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    const rest = Math.cbrt(1 - 0.5 * 0.7);
    const posed = posedDrops(shape, { ang: 0.3, t: 0, rs: rest + (1 - rest) * 0.65 * (1 - e), off: [cx, 0, 0] });
    const br = 0.95 * 0.72 * Math.cbrt(0.5);
    const bud = { p: [cx + 0.89 + (2.15 - 0.89) * e, -0.1, 0.15] as [number, number, number], r: br, c: [0.9, 0.92, 0.95] as V3 };
    let edge = -1e3;
    for (const d of posed.drops) if (d.r > 0.01) edge = Math.max(edge, d.p[0] + d.r);
    const tl = pinchTail(u, bud, edge);
    const k2 = 0.9 + (0.26 - 0.9) * Math.min(1, Math.max(0, (u - 0.1) / 0.75));
    return { cam: { ro: [0, 0.3, 5.6] as V3, ta: [0, 0, 0] as V3, tan: 0.42 }, drops: [...posed.drops, bud], o: { t: 0, zone: posed.zone, k2, tail: tl ? { i: 4, ...tl } : null } };
  });
  return <div ref={ref} className="h-[150px]" />;
}

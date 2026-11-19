"use client";

/**
 * Test money card: the wallet's real test-USDC balance as a cream pool, wired to the real faucet (useFaucet).
 * While the faucet runs, cream drops keep pouring in; on success the pool swells with a ripple + shimmer.
 * useFaucet itself shows the success / error toast.
 */
import { useEffect, useRef } from "react";
import { useFaucet } from "@/lib/hooks/use-basket-tx";
import { useFaucetStatus } from "@/lib/hooks/use-reads";
import { DEFAULT_CHAIN } from "@/lib/chains";
import { formatUsd6, usd6ToChartNumber } from "@/lib/units";
import { useMetalRegion } from "../metal/MetalCanvas";
import { clamp, damp, lerp, ss } from "../metal/math";
import { Odometer } from "../motion/alloy-motion";
import { cam, CREAM, drop, looseSpec } from "../states/kit";

const DRIP = 0.75; // seconds for one drop to fall

function wait(s: number) {
  if (s <= 0) return "";
  const h = Math.floor(s / 3600), m = Math.ceil((s % 3600) / 60);
  return h ? `Next refill in ${h}h ${m}m` : `Next refill in ${m}m`;
}

export function MoneyCard({ address, id }: { address?: `0x${string}`; id?: string }) {
  const status = useFaucetStatus();
  const faucet = useFaucet();
  const bal = status.data?.usdcBalance;
  const dripUsd6 = status.data?.dripUsd6;
  const cooldown = status.data?.availableInSeconds ?? 0;
  const pending = faucet.isPending;

  // pool size follows the real balance (log scale, display only)
  const target = clamp(0.5 + 0.075 * Math.log10(1 + (bal !== undefined ? usd6ToChartNumber(bal) : 0)), 0.5, 0.92);
  const st = useRef({ r: target, tgt: target, t: -1, rip: 0, shim: 0, pending: false, done: false });
  st.current.tgt = target;
  st.current.pending = pending;
  const prevPending = useRef(false);
  useEffect(() => {
    if (prevPending.current && !pending && faucet.isSuccess) {
      st.current.rip = 1;
      st.current.shim = 1;
    }
    prevPending.current = pending;
  }, [pending, faucet.isSuccess]);

  const ref = useRef<HTMLDivElement>(null);
  useMetalRegion(ref, ({ T, dt, reduced }) => {
    const s = st.current;
    s.r = damp(s.r, s.tgt, 0.08, dt);
    s.rip = damp(s.rip, 0, 0.3, dt);
    s.shim = damp(s.shim, 0, 0.25, dt);
    const ds = [drop([0, -0.42 + (reduced ? 0 : Math.sin(T) * 0.03), 0], s.r, CREAM)];
    // a drop keeps falling while the faucet runs
    if (s.pending && !reduced) {
      if (s.t < 0) s.t = 0;
      s.t += dt;
      const u = (s.t % (DRIP * 1.6)) / DRIP;
      if (u <= 1) {
        ds.push(drop([0.04, lerp(1.45, -0.3, u * u), 0.1], 0.22 * (1 - ss(0.85, 1, u)), CREAM));
        if (u > 0.85) s.rip = Math.max(s.rip, 0.6);
      }
    } else s.t = -1;
    return looseSpec(cam(3.6, 0.25, -0.1), ds, { t: T, k: 0.42, tint: 0.1, rip: s.rip * 0.9, shim: s.shim, shimPos: lerp(2.4, -2.4, s.shim) });
  });

  const run = () => faucet.mutateAsync().catch(() => undefined);
  const amt = dripUsd6 ? formatUsd6(dripUsd6, 0) : null;

  return (
    <aside id={id} className="pf-money st-panel">
      <div className="a-eyebrow flex justify-between">
        <span>Test money</span>
        <span>Wallet</span>
      </div>
      <div ref={ref} className="pf-pool" aria-hidden />
      <div className="pf-money__bal">{bal !== undefined ? <Odometer value={formatUsd6(bal)} /> : <span className="text-dim">$—</span>}</div>
      <p>Free to use in Test mode. Prices are real, this money is pretend.</p>
      <button type="button" className="a-btn a-btn--cream mt-[18px] w-full" onClick={run} disabled={pending || cooldown > 0 || !address}>
        {pending ? "Pouring…" : cooldown > 0 ? wait(cooldown) : amt ? `Add ${amt} test money` : "Add test money"}
      </button>
      <div className="mt-3 flex justify-between text-[12px] text-dim">
        <span>{DEFAULT_CHAIN.name}</span>
        {address && (
          <span className="num">
            {address.slice(0, 6)}…{address.slice(-4)}
          </span>
        )}
      </div>
    </aside>
  );
}

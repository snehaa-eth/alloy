/** Pure PnL / drawdown math shared by the API and tests. All amounts bigint; USDC 6 dec, shares 18, nps USD 8/1e18. */

export interface HolderLike {
  shares: bigint;
  costUsdc6: bigint;
  realizedUsdc6: bigint;
  depositedUsdc6: bigint;
  withdrawnUsdc6: bigint;
}

export interface Pnl {
  holders: number;
  shares: string;
  valueUsdc6: string;
  costUsdc6: string;
  depositedUsdc6: string;
  withdrawnUsdc6: string;
  realizedUsdc6: string;
  unrealizedUsdc6: string;
  totalPnlUsdc6: string;
  /** total PnL / deposited, in bps (null when nothing deposited) */
  returnBps: number | null;
}

export const valueUsdc6 = (shares: bigint, nps: bigint) => (shares * nps) / 10n ** 20n;

export function aggregatePnl(rows: HolderLike[], nps: bigint): Pnl {
  let shares = 0n, cost = 0n, realized = 0n, dep = 0n, wd = 0n, n = 0;
  for (const r of rows) {
    if (r.shares > 0n) n++;
    shares += r.shares;
    cost += r.costUsdc6;
    realized += r.realizedUsdc6;
    dep += r.depositedUsdc6;
    wd += r.withdrawnUsdc6;
  }
  const value = valueUsdc6(shares, nps);
  const unrealized = value - cost;
  const total = unrealized + realized;
  return {
    holders: n,
    shares: shares.toString(),
    valueUsdc6: value.toString(),
    costUsdc6: cost.toString(),
    depositedUsdc6: dep.toString(),
    withdrawnUsdc6: wd.toString(),
    realizedUsdc6: realized.toString(),
    unrealizedUsdc6: unrealized.toString(),
    totalPnlUsdc6: total.toString(),
    returnBps: dep > 0n ? Number((total * 10_000n) / dep) : null,
  };
}

/** Max drawdown of a NAV-per-share series, in bps (peak-to-trough). */
export function maxDrawdownBps(series: bigint[]): number {
  let peak = 0n, worst = 0n;
  for (const v of series) {
    if (v > peak) peak = v;
    if (peak > 0n) {
      const dd = ((peak - v) * 10_000n) / peak;
      if (dd > worst) worst = dd;
    }
  }
  return Number(worst);
}

/**
 * Buy / sell quotes for a basket, computed on-chain (packages/contracts/NOTES.md "Frontend quoting"):
 *
 *   buy : router.splitUsdc(basket, usdcIn) -> QuoterV2.quoteExactInputSingle(USDC -> stock_i) per leg
 *         -> router.sharesFor(basket, got) -> (shares, used); leftovers = got - used
 *   sell: basket.previewRedeem(shares) -> QuoterV2(stock_i -> USDC) per leg -> sum
 *
 * Slippage is applied per leg (minOuts) and to the total (minShares / minUsdc).
 * The pure builders (buildBuyQuote / buildSellQuote) hold all the math and are unit-tested.
 */
import type { Address, PublicClient } from "viem";
import { alloyRouterAbi, basketAbi, quoterV2Abi } from "./abis";
import type { SupportedChainId } from "./chains";
import { getDeployment, stockByToken } from "./contracts";
import { usMarketStatus } from "./market";
import { minOutWithSlippage, mulDiv, valueUsd6 } from "./units";

/** Router: leftovers worth less than this (usd6) are donated to the basket instead of refunded. */
export const DUST_USDC = 50_000n;
const E18 = 10n ** 18n;
const BPS = 10_000n;

export type QuoteSide = "buy" | "sell";

export type QuoteLeg = {
  token: Address;
  symbol: string;
  /** buy: USDC slice in (6dp). sell: stock amount in (8dp). */
  amountIn: bigint;
  /** buy: stock out (8dp). sell: USDC out (6dp). */
  expectedOut: bigint;
  /** expectedOut after slippage: pass as minOuts[i]. */
  minOut: bigint;
};

export type BasketQuote = {
  basket: Address;
  side: QuoteSide;
  /** buy: USDC in (6dp). sell: shares in (18dp). */
  amountIn: bigint;
  /** buy: shares out (18dp). sell: USDC out (6dp). */
  expectedOut: bigint;
  /** expectedOut after slippage: minShares (buy) / minUsdc (sell). */
  minResult: bigint;
  /** Per-leg *expected* outputs (legacy field: hooks used to apply slippage to these). */
  minOuts: bigint[];
  legs: QuoteLeg[];
  slippageBps: number;
  /** Execution cost vs oracle value, bps (>= 0 means you get less than fair value). */
  priceImpactBps: number;
  /** Oracle (feed) value of what you get, usd6. */
  oracleValueUsd6: bigint;
  /** buy: estimated USDC refunded from leftovers (usd6). */
  refundUsd6: bigint;
  /** buy: leftover value donated to the basket as dust (usd6). */
  dustUsd6: bigint;
  marketOpen: boolean;
  source: "api" | "onchain";
  /** Unix seconds. */
  quotedAt: number;
};

export class QuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteError";
  }
}

type Comp = { token: Address; symbol: string; price8: bigint };

function impactBps(paid: bigint, fair: bigint): number {
  if (paid === 0n) return 0;
  return Number(((paid - fair) * BPS) / paid);
}

// ---------------------------------------------------------------------------
// Pure builders
// ---------------------------------------------------------------------------

export type BuyQuoteInput = {
  basket: Address;
  usdcIn: bigint;
  comps: Comp[];
  /** router.splitUsdc */
  slices: bigint[];
  /** QuoterV2 out per leg (8dp) */
  got: bigint[];
  /** router.sharesFor(basket, got) */
  shares: bigint;
  used: bigint[];
  /** Basket state before the buy (for the fee-accrual adjustment). */
  totalSupply: bigint;
  pendingFee: bigint;
  /** basket.navPerShare(): USD 8dp per 1e18 shares */
  navPerShare8: bigint;
  slippageBps: number;
  marketOpen: boolean;
  now?: number;
};

export function buildBuyQuote(i: BuyQuoteInput): BasketQuote {
  const n = i.comps.length;
  if (i.slices.length !== n || i.got.length !== n || i.used.length !== n) throw new QuoteError("leg count mismatch");
  // router.sharesFor already uses ts + pendingFee (buy() accrues the fee first). After that accrual each
  // share is worth navPerShare * ts / (ts + pendingFee).
  const shares = i.shares;
  const navPerShare8 =
    i.pendingFee > 0n && i.totalSupply > 0n
      ? mulDiv(i.navPerShare8, i.totalSupply, i.totalSupply + i.pendingFee)
      : i.navPerShare8;

  let refundUsd6 = 0n;
  let dustUsd6 = 0n;
  i.comps.forEach((c, k) => {
    const left = i.got[k] > i.used[k] ? i.got[k] - i.used[k] : 0n;
    if (left === 0n) return;
    const v = valueUsd6(left, c.price8);
    if (v < DUST_USDC) dustUsd6 += v;
    else refundUsd6 += v;
  });

  const legs: QuoteLeg[] = i.comps.map((c, k) => ({
    token: c.token,
    symbol: c.symbol,
    amountIn: i.slices[k],
    expectedOut: i.got[k],
    minOut: minOutWithSlippage(i.got[k], i.slippageBps),
  }));
  // shares (18dp) * navPerShare (8dp per 1e18) -> usd8 -> usd6
  const oracleValueUsd6 = mulDiv(shares, navPerShare8, E18) / 100n;
  const paid = i.usdcIn - (refundUsd6 < i.usdcIn ? refundUsd6 : i.usdcIn);
  return {
    basket: i.basket,
    side: "buy",
    amountIn: i.usdcIn,
    expectedOut: shares,
    minResult: minOutWithSlippage(shares, i.slippageBps),
    minOuts: legs.map((l) => l.expectedOut),
    legs,
    slippageBps: i.slippageBps,
    priceImpactBps: impactBps(paid, oracleValueUsd6),
    oracleValueUsd6,
    refundUsd6,
    dustUsd6,
    marketOpen: i.marketOpen,
    source: "onchain",
    quotedAt: i.now ?? Math.floor(Date.now() / 1000),
  };
}

export type SellQuoteInput = {
  basket: Address;
  shares: bigint;
  comps: Comp[];
  /** basket.previewRedeem(shares) (8dp) */
  amounts: bigint[];
  /** QuoterV2 USDC out per leg (6dp); 0 for legs with amount 0 */
  usdcOuts: bigint[];
  navPerShare8: bigint;
  slippageBps: number;
  marketOpen: boolean;
  now?: number;
};

export function buildSellQuote(i: SellQuoteInput): BasketQuote {
  const n = i.comps.length;
  if (i.amounts.length !== n || i.usdcOuts.length !== n) throw new QuoteError("leg count mismatch");
  const legs: QuoteLeg[] = i.comps.map((c, k) => ({
    token: c.token,
    symbol: c.symbol,
    amountIn: i.amounts[k],
    expectedOut: i.usdcOuts[k],
    minOut: minOutWithSlippage(i.usdcOuts[k], i.slippageBps),
  }));
  const expected = i.usdcOuts.reduce((a, b) => a + b, 0n);
  // minUsdc = sum of per-leg mins, so a fill exactly at every leg's floor still passes the total check.
  const minUsdc = legs.reduce((a, l) => a + l.minOut, 0n);
  // Fair value = what the legs are worth at oracle prices.
  const oracleValueUsd6 = i.comps.reduce((a, c, k) => a + valueUsd6(i.amounts[k], c.price8), 0n);
  return {
    basket: i.basket,
    side: "sell",
    amountIn: i.shares,
    expectedOut: expected,
    minResult: minUsdc,
    minOuts: legs.map((l) => l.expectedOut),
    legs,
    slippageBps: i.slippageBps,
    priceImpactBps: impactBps(oracleValueUsd6, expected),
    oracleValueUsd6,
    refundUsd6: 0n,
    dustUsd6: 0n,
    marketOpen: i.marketOpen,
    source: "onchain",
    quotedAt: i.now ?? Math.floor(Date.now() / 1000),
  };
}

// ---------------------------------------------------------------------------
// On-chain quoting
// ---------------------------------------------------------------------------

async function basketComps(client: PublicClient, chainId: SupportedChainId, basket: Address) {
  const [[tokens, balances], values, totalSupply, pendingFee, navPerShare8] = await Promise.all([
    client.readContract({ address: basket, abi: basketAbi, functionName: "getBundle" }),
    client.readContract({ address: basket, abi: basketAbi, functionName: "componentValues" }),
    client.readContract({ address: basket, abi: basketAbi, functionName: "totalSupply" }),
    client.readContract({ address: basket, abi: basketAbi, functionName: "pendingFee" }),
    client.readContract({ address: basket, abi: basketAbi, functionName: "navPerShare" }),
  ]);
  const comps: (Comp & { fee: number })[] = tokens.map((token, k) => {
    const s = stockByToken(chainId, token);
    // componentValues is USD 8dp: value8 = bal8 * px8 / 1e8  =>  px8 = value8 * 1e8 / bal8
    const price8 = balances[k] > 0n ? mulDiv(values[k], 10n ** 8n, balances[k]) : 0n;
    return { token, symbol: s?.symbol ?? token.slice(0, 8), price8, fee: s?.fee ?? 500 };
  });
  return { comps, balances, totalSupply, pendingFee, navPerShare8 };
}

async function quoteLegs(
  client: PublicClient,
  quoter: Address,
  legs: { tokenIn: Address; tokenOut: Address; amountIn: bigint; fee: number; label: string }[],
): Promise<bigint[]> {
  const live = legs.map((l, k) => ({ l, k })).filter((x) => x.l.amountIn > 0n);
  const res = await client.multicall({
    allowFailure: true,
    contracts: live.map(({ l }) => ({
      address: quoter,
      abi: quoterV2Abi,
      functionName: "quoteExactInputSingle" as const,
      args: [{ tokenIn: l.tokenIn, tokenOut: l.tokenOut, amountIn: l.amountIn, fee: l.fee, sqrtPriceLimitX96: 0n }] as const,
    })),
  });
  const out = legs.map(() => 0n);
  res.forEach((r, j) => {
    const { l, k } = live[j];
    if (r.status !== "success") throw new QuoteError(`No liquidity to quote ${l.label} right now.`);
    out[k] = (r.result as readonly [bigint, bigint, number, bigint])[0];
  });
  return out;
}

export async function quoteBuyOnchain(
  client: PublicClient,
  chainId: SupportedChainId,
  basket: Address,
  usdcIn: bigint,
  slippageBps: number,
): Promise<BasketQuote> {
  if (usdcIn <= 0n) throw new QuoteError("Enter an amount greater than zero.");
  const d = getDeployment(chainId);
  if (!d.quoterV2) throw new QuoteError("No DEX quoter on this network.");
  const [b, slices] = await Promise.all([
    basketComps(client, chainId, basket),
    client.readContract({ address: d.router, abi: alloyRouterAbi, functionName: "splitUsdc", args: [basket, usdcIn] }),
  ]);
  const got = await quoteLegs(
    client,
    d.quoterV2,
    b.comps.map((c, k) => ({ tokenIn: d.usdc, tokenOut: c.token, amountIn: slices[k], fee: c.fee, label: c.symbol })),
  );
  const [shares, used] = await client.readContract({
    address: d.router,
    abi: alloyRouterAbi,
    functionName: "sharesFor",
    args: [basket, got],
  });
  return buildBuyQuote({
    basket,
    usdcIn,
    comps: b.comps,
    slices: [...slices],
    got,
    shares,
    used: [...used],
    totalSupply: b.totalSupply,
    pendingFee: b.pendingFee,
    navPerShare8: b.navPerShare8,
    slippageBps,
    marketOpen: usMarketStatus().open,
  });
}

export async function quoteSellOnchain(
  client: PublicClient,
  chainId: SupportedChainId,
  basket: Address,
  shares: bigint,
  slippageBps: number,
): Promise<BasketQuote> {
  if (shares <= 0n) throw new QuoteError("Enter an amount greater than zero.");
  const d = getDeployment(chainId);
  if (!d.quoterV2) throw new QuoteError("No DEX quoter on this network.");
  const [b, amounts] = await Promise.all([
    basketComps(client, chainId, basket),
    client.readContract({ address: basket, abi: basketAbi, functionName: "previewRedeem", args: [shares] }),
  ]);
  const usdcOuts = await quoteLegs(
    client,
    d.quoterV2,
    b.comps.map((c, k) => ({ tokenIn: c.token, tokenOut: d.usdc, amountIn: amounts[k], fee: c.fee, label: c.symbol })),
  );
  return buildSellQuote({
    basket,
    shares,
    comps: b.comps,
    amounts: [...amounts],
    usdcOuts,
    navPerShare8: b.navPerShare8,
    slippageBps,
    marketOpen: usMarketStatus().open,
  });
}

export function quoteOnchain(
  client: PublicClient,
  chainId: SupportedChainId,
  basket: Address,
  side: QuoteSide,
  amount: bigint,
  slippageBps: number,
): Promise<BasketQuote> {
  return side === "buy"
    ? quoteBuyOnchain(client, chainId, basket, amount, slippageBps)
    : quoteSellOnchain(client, chainId, basket, amount, slippageBps);
}

/**
 * Seed quote for createBasket: the factory splits usdcSeed by targetBps (remainder to the last
 * leg is not guaranteed, so we mirror splitByBps) and swaps each slice; minOuts[i] per leg.
 */
export async function quoteSeedOnchain(
  client: PublicClient,
  chainId: SupportedChainId,
  components: Address[],
  targetBps: number[],
  usdcSeed: bigint,
  slippageBps: number,
): Promise<{ legs: QuoteLeg[]; minOuts: bigint[] }> {
  const d = getDeployment(chainId);
  if (!d.quoterV2) throw new QuoteError("No DEX quoter on this network.");
  // BasketFactory: slice_i = seed * w_i / 1e4, last leg takes the remainder.
  let spent = 0n;
  const slices = targetBps.map((w, k) => {
    const s = k === targetBps.length - 1 ? usdcSeed - spent : mulDiv(usdcSeed, BigInt(w), BPS);
    spent += s;
    return s;
  });
  const got = await quoteLegs(
    client,
    d.quoterV2,
    components.map((t, k) => {
      const s = stockByToken(chainId, t);
      return { tokenIn: d.usdc, tokenOut: t, amountIn: slices[k], fee: s?.fee ?? 500, label: s?.symbol ?? t };
    }),
  );
  const legs = components.map((t, k) => ({
    token: t,
    symbol: stockByToken(chainId, t)?.symbol ?? t,
    amountIn: slices[k],
    expectedOut: got[k],
    minOut: minOutWithSlippage(got[k], slippageBps),
  }));
  return { legs, minOuts: legs.map((l) => l.minOut) };
}

import { getAddress, type Address } from "viem";
import type { SupportedChainId } from "../../config/env";
import { alloyRouterAbi, basketAbi, basketFactoryAbi, findStock, getDeployment, iAggregatorV3Abi } from "../../config/sdk";
import { isRevert, quoterV2Abi, read, revertName, type ChainClient, type ChainClients } from "../../lib/chain";
import { HttpError } from "../../lib/errors";
import { createTtlCache } from "../../lib/ttlCache";

export type QuoteSide = "buy" | "sell";

export interface QuoteRequest {
  chainId: SupportedChainId;
  basket: Address;
  side: QuoteSide;
  /** buy: USDC in (6 decimals, base units). sell: basket shares (18 decimals, base units). */
  amount: bigint;
  /** Slippage tolerance applied to minOuts / minShares / minUsdc. */
  slippageBps: number;
}

/** All amounts are base-unit integers as decimal strings. */
export interface QuoteLeg {
  token: Address;
  symbol: string | null;
  /** buy: USDC slice swapped into this stock. sell: stock amount redeemed and swapped to USDC. */
  amountIn: string;
  /** QuoterV2 output: stock (buy) or USDC (sell). */
  expectedOut: string;
  /** expectedOut * (1 - slippage): pass as minOuts[i]. */
  minOut: string;
  /** buy only: stock the basket will take (router.sharesFor). */
  used?: string;
  /** buy only: expectedOut - used, refunded as USDC (or donated if dust). */
  leftover?: string;
  /** Oracle price, USD 8 decimals per whole token. */
  priceUsd8: string | null;
  poolFeeBps: number;
  /** Execution cost vs the oracle price, in bps of this leg (fee + impact). */
  costBps: number | null;
}

export interface Quote {
  chainId: SupportedChainId;
  basket: Address;
  side: QuoteSide;
  amount: string;
  slippageBps: number;
  legs: QuoteLeg[];
  /** buy: expected shares (18 dec). sell: expected USDC (6 dec). */
  expectedResult: string;
  /** buy: minShares for AlloyRouter.buy. sell: minUsdc for AlloyRouter.sell. */
  minResult: string;
  /** Estimated execution cost vs oracle prices, in USDC base units and bps of the trade. */
  cost: { totalUsdc: string; poolFeeUsdc: string; impactUsdc: string; bps: number } | null;
  /** Ready-to-send call: AlloyRouter.buy(basket, usdcIn, minOuts, minShares) / sell(basket, shares, minOuts, minUsdc). */
  tx: { to: Address; functionName: "buy" | "sell"; args: [Address, string, string[], string] };
  /** buy: the user must approve `spender` for `amount` of tUSDC first. sell: no approval needed (router burns). */
  approval: { token: Address; spender: Address; amount: string } | null;
  quotedAt: string;
  expiresAt: string;
}

export interface QuoteService {
  quote(req: QuoteRequest): Promise<Quote>;
}

const QUOTE_CACHE_MS = 10_000;
const QUOTE_VALID_MS = 30_000;
const BPS = 10_000n;

const applySlippage = (x: bigint, bps: number) => (x * (BPS - BigInt(bps))) / BPS;
const toBps = (part: bigint, whole: bigint) => (whole === 0n ? 0 : Number((part * BPS) / whole));
/** USD (8 dec) value of a stock amount (8 dec) at an 8-dec price, expressed in USDC base units (6 dec). */
const stockToUsdc = (amount: bigint, priceUsd8: bigint) => (amount * priceUsd8) / 10n ** 8n / 100n;

export function createChainQuoteService(clients: ChainClients, now: () => number = Date.now): QuoteService {
  const cache = createTtlCache<Quote>(QUOTE_CACHE_MS);

  async function compute(req: QuoteRequest): Promise<Quote> {
    const dep = getDeployment(req.chainId);
    if (!dep) throw new HttpError(501, "not_deployed", `Alloy is not deployed on chain ${req.chainId} yet`);
    const client = clients(req.chainId);
    const c = dep.contracts;
    const router = getAddress(c.router);
    const usdc = getAddress(c.usdc);
    const quoter = getAddress(dep.testnetEnv.uniswap.quoterV2);
    const fee = c.feeTier;
    const poolFeeBps = fee / 100;

    const isBasket = await read<boolean>(client, getAddress(c.factory), basketFactoryAbi, "isBasket", [req.basket]);
    if (!isBasket) throw HttpError.notFound("Not an Alloy basket on this chain");

    const comps = await read<readonly Address[]>(client, req.basket, basketAbi, "components");
    const prices = await Promise.all(comps.map((t) => oraclePrice(client, dep, t)));
    const quoteLeg = async (tokenIn: Address, tokenOut: Address, amountIn: bigint) => {
      if (amountIn === 0n) return 0n;
      const [out] = await read<readonly [bigint, bigint, number, bigint]>(client, quoter, quoterV2Abi, "quoteExactInputSingle", [
        { tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n },
      ]);
      return out;
    };
    const ts = now();
    const base = {
      chainId: req.chainId,
      basket: req.basket,
      side: req.side,
      amount: req.amount.toString(),
      slippageBps: req.slippageBps,
      quotedAt: new Date(ts).toISOString(),
      expiresAt: new Date(ts + QUOTE_VALID_MS).toISOString(),
    };
    const symbolOf = (t: Address) => findStock(dep, t)?.symbol ?? null;

    if (req.side === "buy") {
      const slices = await read<readonly bigint[]>(client, router, alloyRouterAbi, "splitUsdc", [req.basket, req.amount]);
      const got = await Promise.all(comps.map((t, i) => quoteLeg(usdc, t, slices[i] ?? 0n)));
      const [shares, used] = await read<readonly [bigint, readonly bigint[]]>(client, router, alloyRouterAbi, "sharesFor", [
        req.basket,
        got,
      ]);

      let costKnown = true;
      let totalCost = 0n;
      let feeCost = 0n;
      const legs: QuoteLeg[] = comps.map((token, i) => {
        const slice = slices[i] ?? 0n;
        const out = got[i] ?? 0n;
        const px = prices[i];
        const legFee = (slice * BigInt(fee)) / 1_000_000n;
        let costBps: number | null = null;
        if (px && slice > 0n) {
          const legCost = slice - stockToUsdc(out, px);
          totalCost += legCost;
          costBps = toBps(legCost, slice);
        } else if (slice > 0n) costKnown = false;
        feeCost += legFee;
        return {
          token,
          symbol: symbolOf(token),
          amountIn: slice.toString(),
          expectedOut: out.toString(),
          minOut: applySlippage(out, req.slippageBps).toString(),
          used: (used[i] ?? 0n).toString(),
          leftover: (out - (used[i] ?? 0n)).toString(),
          priceUsd8: px?.toString() ?? null,
          poolFeeBps,
          costBps,
        };
      });
      const minShares = applySlippage(shares, req.slippageBps);
      return {
        ...base,
        legs,
        expectedResult: shares.toString(),
        minResult: minShares.toString(),
        cost: costKnown ? costSummary(totalCost, feeCost, req.amount) : null,
        tx: {
          to: router,
          functionName: "buy",
          args: [req.basket, req.amount.toString(), legs.map((l) => l.minOut), minShares.toString()],
        },
        approval: { token: usdc, spender: router, amount: req.amount.toString() },
      };
    }

    // sell: previewRedeem is fee-accrual aware; each leg is then swapped stock -> tUSDC.
    const amts = await read<readonly bigint[]>(client, req.basket, basketAbi, "previewRedeem", [req.amount]);
    const outs = await Promise.all(comps.map((t, i) => quoteLeg(t, usdc, amts[i] ?? 0n)));
    let costKnown = true;
    let oracleTotal = 0n;
    let feeCost = 0n;
    const legs: QuoteLeg[] = comps.map((token, i) => {
      const amt = amts[i] ?? 0n;
      const out = outs[i] ?? 0n;
      const px = prices[i];
      let costBps: number | null = null;
      if (px && amt > 0n) {
        const oracleUsdc = stockToUsdc(amt, px);
        oracleTotal += oracleUsdc;
        feeCost += (oracleUsdc * BigInt(fee)) / 1_000_000n;
        costBps = toBps(oracleUsdc - out, oracleUsdc);
      } else if (amt > 0n) costKnown = false;
      return {
        token,
        symbol: symbolOf(token),
        amountIn: amt.toString(),
        expectedOut: out.toString(),
        minOut: applySlippage(out, req.slippageBps).toString(),
        priceUsd8: px?.toString() ?? null,
        poolFeeBps,
        costBps,
      };
    });
    const usdcOut = outs.reduce((a, b) => a + b, 0n);
    const minUsdc = applySlippage(usdcOut, req.slippageBps);
    return {
      ...base,
      legs,
      expectedResult: usdcOut.toString(),
      minResult: minUsdc.toString(),
      cost: costKnown ? costSummary(oracleTotal - usdcOut, feeCost, oracleTotal) : null,
      tx: {
        to: router,
        functionName: "sell",
        args: [req.basket, req.amount.toString(), legs.map((l) => l.minOut), minUsdc.toString()],
      },
      approval: null,
    };
  }

  return {
    async quote(req) {
      const key = [req.chainId, req.basket.toLowerCase(), req.side, req.amount, req.slippageBps].join(":");
      try {
        return await cache.get(key, () => compute(req));
      } catch (err) {
        if (err instanceof HttpError) throw err;
        if (isRevert(err)) {
          const name = revertName(err);
          throw new HttpError(422, "quote_reverted", `The contracts rejected this quote${name ? ` (${name})` : ""}`);
        }
        console.error("[quote] rpc failure:", err instanceof Error ? err.message.split("\n")[0] : err);
        throw new HttpError(502, "rpc_unavailable", "Chain RPC temporarily unavailable");
      }
    },
  };
}

function costSummary(total: bigint, poolFee: bigint, notional: bigint) {
  return {
    totalUsdc: total.toString(),
    poolFeeUsdc: poolFee.toString(),
    impactUsdc: (total - poolFee).toString(),
    bps: toBps(total, notional),
  };
}

async function oraclePrice(
  client: ChainClient,
  dep: NonNullable<ReturnType<typeof getDeployment>>,
  token: Address,
): Promise<bigint | null> {
  const stock = findStock(dep, token);
  if (!stock) return null;
  try {
    const [, answer] = await read<readonly [bigint, bigint, bigint, bigint, bigint]>(
      client,
      stock.feed,
      iAggregatorV3Abi,
      "latestRoundData",
    );
    return answer > 0n ? answer : null;
  } catch {
    return null;
  }
}

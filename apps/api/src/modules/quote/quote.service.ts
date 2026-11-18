import type { Address } from "viem";
import type { SupportedChainId } from "../../config/env";
import { HttpError } from "../../lib/errors";

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

export interface QuoteLeg {
  token: Address;
  /** Amount routed into / out of this component (base units, decimal string). */
  amountIn: string;
  expectedOut: string;
  minOut: string;
}

export interface Quote {
  chainId: SupportedChainId;
  basket: Address;
  side: QuoteSide;
  amount: string;
  legs: QuoteLeg[];
  /** buy: minShares for AlloyRouter.buy. sell: minUsdc for AlloyRouter.sell. */
  minResult: string;
  expectedResult: string;
  marketOpen: boolean;
  validUntil: string;
}

export interface QuoteService {
  quote(req: QuoteRequest): Promise<Quote>;
}

/**
 * Placeholder until packages/contracts lands Basket.previewIssue/getBundle and the
 * router/pool addresses. TODO(contracts): implement with viem multicall:
 * getBundle() + pool quotes (Aerodrome on 8453, Uniswap v3 QuoterV2 on 84532).
 */
export const notImplementedQuoteService: QuoteService = {
  async quote() {
    throw new HttpError(501, "not_implemented", "Quotes are not available until the contracts are deployed");
  },
};

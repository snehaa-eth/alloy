/**
 * Contract addresses per chain (zod-validated) + placeholders for ABIs.
 *
 * TODO(contracts): replace lib/addresses.json with packages/sdk addresses.{84532,8453}.json
 * and import the wagmi-cli generated ABIs (Basket, BasketFactory, AlloyRouter).
 * Until then every router/factory/basket call goes through `contractCalls`, which
 * throws NotWiredError, so the UI structure is ready but cannot send transactions.
 */
import { z } from "zod";
import { getAddress, zeroAddress, type Address } from "viem";
import type { Config } from "wagmi";
import addressesJson from "./addresses.json";
import { SUPPORTED_CHAINS, type SupportedChainId } from "./chains";
import type { StrategyMode } from "./types";

const zAddr = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "invalid address")
  .transform((a) => getAddress(a));

const deploymentSchema = z.object({ factory: zAddr, router: zAddr, usdc: zAddr });
const addressesSchema = z.record(z.string().regex(/^\d+$/), deploymentSchema);

export type Deployment = z.infer<typeof deploymentSchema>;

const ADDRESSES = addressesSchema.parse(addressesJson);
for (const c of SUPPORTED_CHAINS) {
  if (!ADDRESSES[String(c.id)]) throw new Error(`lib/addresses.json is missing chain ${c.id}`);
}

export function getDeployment(chainId: SupportedChainId): Deployment {
  return ADDRESSES[String(chainId)];
}

/** True once factory + router + USDC are deployed (non-zero) on this chain. */
export function isDeployed(chainId: SupportedChainId): boolean {
  const d = getDeployment(chainId);
  return d.factory !== zeroAddress && d.router !== zeroAddress && d.usdc !== zeroAddress;
}

export class NotWiredError extends Error {
  constructor(what: string) {
    super(`${what} is not wired yet (waiting for contract ABIs / deployment).`);
    this.name = "NotWiredError";
  }
}

// ---------------------------------------------------------------------------
// Contract call stubs. Each returns the hash of a *simulated then sent* tx.
// Fill these in with simulateContract + writeContract once ABIs land.
// ---------------------------------------------------------------------------

export type BuyArgs = { basket: Address; usdcIn: bigint; minOuts: bigint[]; minShares: bigint };
export type SellArgs = { basket: Address; shares: bigint; minOuts: bigint[]; minUsdc: bigint };
export type RedeemArgs = { basket: Address; shares: bigint; to: Address };
export type CreateArgs = {
  name: string;
  symbol: string;
  components: Address[];
  targetBps: number[];
  mode: StrategyMode;
  feeBps: number;
  demo: boolean;
  usdcSeed: bigint;
  minOuts: bigint[];
};
export type ProposeArgs = { basket: Address; weightsBps: number[]; reasonHash: `0x${string}` };

type Ctx = { config: Config; chainId: SupportedChainId; account: Address };

export const contractCalls = {
  /** AlloyRouter.buy(basket, usdcIn, minOuts, minShares) */
  async simulateBuy(_ctx: Ctx, _a: BuyArgs): Promise<unknown> {
    throw new NotWiredError("AlloyRouter.buy");
  },
  async writeBuy(_ctx: Ctx, _request: unknown): Promise<`0x${string}`> {
    throw new NotWiredError("AlloyRouter.buy");
  },
  /** AlloyRouter.sell(basket, shares, minOuts, minUsdc) */
  async simulateSell(_ctx: Ctx, _a: SellArgs): Promise<unknown> {
    throw new NotWiredError("AlloyRouter.sell");
  },
  async writeSell(_ctx: Ctx, _request: unknown): Promise<`0x${string}`> {
    throw new NotWiredError("AlloyRouter.sell");
  },
  /** Basket.redeem(shares, to) — in-kind withdraw, never pausable. */
  async simulateRedeem(_ctx: Ctx, _a: RedeemArgs): Promise<unknown> {
    throw new NotWiredError("Basket.redeem");
  },
  async writeRedeem(_ctx: Ctx, _request: unknown): Promise<`0x${string}`> {
    throw new NotWiredError("Basket.redeem");
  },
  /** BasketFactory.createBasket(params, usdcSeed, minOuts) */
  async simulateCreate(_ctx: Ctx, _a: CreateArgs): Promise<unknown> {
    throw new NotWiredError("BasketFactory.createBasket");
  },
  async writeCreate(_ctx: Ctx, _request: unknown): Promise<`0x${string}`> {
    throw new NotWiredError("BasketFactory.createBasket");
  },
  /** Basket.proposeRecipe(w, reasonHash) — creator only, 24h notice. */
  async simulatePropose(_ctx: Ctx, _a: ProposeArgs): Promise<unknown> {
    throw new NotWiredError("Basket.proposeRecipe");
  },
  async writePropose(_ctx: Ctx, _request: unknown): Promise<`0x${string}`> {
    throw new NotWiredError("Basket.proposeRecipe");
  },
};

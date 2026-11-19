/** viem helpers for the e2e suite (Base Sepolia). The private key only ever comes from process.env.E2E_PK. */
import { createPublicClient, erc20Abi, formatUnits, http, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { deployments } from "../../../packages/sdk/src/generated";

const d = deployments["84532"];
export const ROUTER = d.contracts.router as Address;
export const USDC = d.contracts.usdc as Address;
export const AI_BUILD_OUT = "0xA6665F87702Ba1cDeF544E890147B2b5d305Cec3" as Address;
export const RPC = process.env.E2E_RPC || "https://sepolia.base.org";

export const pub = createPublicClient({ chain: baseSepolia, transport: http(RPC, { retryCount: 4, retryDelay: 800 }) });

export async function balances(addr: Address, basket: Address = AI_BUILD_OUT) {
  const [eth, usdc, shares] = await Promise.all([
    pub.getBalance({ address: addr }),
    pub.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [addr] }),
    pub.readContract({ address: basket, abi: erc20Abi, functionName: "balanceOf", args: [addr] }),
  ]);
  return { eth, usdc, shares, fmt: { eth: formatUnits(eth, 18), usdc: formatUnits(usdc, 6), shares: formatUnits(shares, 18) } };
}

import { createPublicClient, createWalletClient, fallback, getAddress, http, type Address, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import type { Env } from "../../config/env";
import { getDeployment } from "../../config/sdk";
import { faucetAbi } from "../../lib/chain";

/** Sponsors Faucet.dripTo on Base Sepolia so a judge's fresh wallet needs no test ETH. */
export interface FaucetRelayer {
  /** Seconds until `recipient` can drip again (0 = now), per the contract's own cooldown. */
  availableIn(recipient: Address): Promise<number>;
  /** Simulates then broadcasts dripTo(recipient). Resolves with the tx hash (not waiting for inclusion). */
  drip(recipient: Address): Promise<Hash>;
  faucet: Address;
  relayer: Address;
}

/** Null when RELAYER_PK is unset (the route then answers 501). The key never leaves this closure. */
export function createFaucetRelayer(env: Env): FaucetRelayer | null {
  const dep = getDeployment(84532);
  if (!env.RELAYER_PK || !dep) return null;
  const account = privateKeyToAccount(env.RELAYER_PK);
  const transport = env.RPC_URL_BASE_SEPOLIA ? fallback([http(env.RPC_URL_BASE_SEPOLIA), http()]) : http();
  const pub = createPublicClient({ chain: baseSepolia, transport });
  const wallet = createWalletClient({ account, chain: baseSepolia, transport });
  const faucet = getAddress(dep.testnetEnv.faucet);

  return {
    faucet,
    relayer: account.address,
    async availableIn(recipient) {
      const s = await pub.readContract({ address: faucet, abi: faucetAbi, functionName: "availableIn", args: [recipient] });
      return Number(s);
    },
    async drip(recipient) {
      const { request } = await pub.simulateContract({
        account,
        address: faucet,
        abi: faucetAbi,
        functionName: "dripTo",
        args: [recipient],
      });
      return wallet.writeContract(request);
    },
  };
}

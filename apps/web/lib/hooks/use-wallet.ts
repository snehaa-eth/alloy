"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { DEFAULT_CHAIN_ID, isSupportedChainId } from "@/lib/chains";

/** "eip155:84532" → 84532. Privy reports wallet chains as CAIP-2 strings. */
function parseCaip2(chainId: string | undefined): number | undefined {
  const n = Number(chainId?.split(":")[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Single source for "who is connected, on which chain". */
export function useWallet() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { address } = useAccount();
  const configChainId = useChainId();
  const { switchChainAsync, isPending: switching } = useSwitchChain();

  // Read the chain from the signing wallet itself. wagmi's useChainId falls back to the configured default when
  // the wallet sits on a chain wagmi doesn't know (e.g. Monad testnet 10143), which hid wrong-network states.
  const active = address ? wallets.find((w) => w.address.toLowerCase() === address.toLowerCase()) : undefined;
  const walletChainId = parseCaip2(active?.chainId);
  const chainId = walletChainId ?? configChainId;

  return {
    ready,
    authenticated,
    address: authenticated ? address : undefined,
    chainId,
    wrongChain: authenticated && !!address && chainId !== DEFAULT_CHAIN_ID,
    supportedChain: isSupportedChainId(chainId),
    login,
    logout,
    switchToDefault: async () => {
      if (active) await active.switchChain(DEFAULT_CHAIN_ID);
      else await switchChainAsync({ chainId: DEFAULT_CHAIN_ID });
    },
    switching,
  };
}

"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { DEFAULT_CHAIN_ID, isSupportedChainId } from "@/lib/chains";

/** Single source for "who is connected, on which chain". */
export function useWallet() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: switching } = useSwitchChain();

  return {
    ready,
    authenticated,
    address: authenticated ? address : undefined,
    chainId,
    wrongChain: authenticated && !!address && chainId !== DEFAULT_CHAIN_ID,
    supportedChain: isSupportedChainId(chainId),
    login,
    logout,
    switchToDefault: () => switchChainAsync({ chainId: DEFAULT_CHAIN_ID }),
    switching,
  };
}

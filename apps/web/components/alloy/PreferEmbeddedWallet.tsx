"use client";

/**
 * After sign-in, make the built-in Privy wallet the signer for every transaction.
 * Without this, wagmi picks up any browser extension (MetaMask etc.) and every buy opens a popup.
 * Runs once per embedded-wallet address, so it doesn't fight a later manual choice.
 */
import { useEffect, useRef } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { useAccount } from "wagmi";

export function PreferEmbeddedWallet() {
  const { authenticated } = usePrivy();
  const { wallets, ready } = useWallets();
  const { address } = useAccount();
  const { setActiveWallet } = useSetActiveWallet();
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (!authenticated || !ready) {
      done.current = null;
      return;
    }
    const embedded = wallets.find((w) => w.walletClientType === "privy");
    if (!embedded || done.current === embedded.address) return;
    done.current = embedded.address;
    if (address?.toLowerCase() !== embedded.address.toLowerCase()) {
      setActiveWallet(embedded).catch(() => {
        done.current = null;
      });
    }
  }, [authenticated, ready, wallets, address, setActiveWallet]);

  return null;
}

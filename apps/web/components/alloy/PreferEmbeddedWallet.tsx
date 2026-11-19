"use client";

/**
 * Picks the wallet that signs every transaction, based on how the user signed in:
 * - Email / Google / X / passkey → the built-in Privy wallet (no extension popups).
 * - "Continue with a wallet" (MetaMask, Coinbase Wallet…) → that wallet.
 * Without this, wagmi grabs whatever browser extension is connected, even after a Google sign-in.
 * The choice is remembered per browser so a page reload keeps it.
 */
import { useEffect, useRef } from "react";
import { useLogin, usePrivy, useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { useAccount } from "wagmi";

const KEY = "alloy:signer";

function readPref(): string {
  try {
    return localStorage.getItem(KEY) ?? "embedded";
  } catch {
    return "embedded";
  }
}
function writePref(v: string | null) {
  try {
    if (v) localStorage.setItem(KEY, v);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: default to embedded */
  }
}

export function PreferEmbeddedWallet() {
  const { ready: privyReady, authenticated } = usePrivy();
  const { wallets, ready } = useWallets();
  const { address } = useAccount();
  const { setActiveWallet } = useSetActiveWallet();
  const done = useRef<string | null>(null);

  useLogin({
    onComplete: ({ loginMethod, loginAccount, wasAlreadyAuthenticated }) => {
      if (wasAlreadyAuthenticated) return;
      const ext = loginMethod === "siwe" && loginAccount?.type === "wallet" ? loginAccount.address : null;
      writePref(ext ? `external:${ext.toLowerCase()}` : "embedded");
      done.current = null;
    },
  });

  useEffect(() => {
    if (!authenticated) {
      done.current = null;
      return;
    }
    if (!ready) return;
    const pref = readPref();
    const target = pref.startsWith("external:")
      ? wallets.find((w) => w.address.toLowerCase() === pref.slice(9))
      : wallets.find((w) => w.walletClientType === "privy");
    if (!target || done.current === target.address) return;
    done.current = target.address;
    if (address?.toLowerCase() !== target.address.toLowerCase()) {
      setActiveWallet(target).catch(() => {
        done.current = null;
      });
    }
  }, [authenticated, ready, wallets, address, setActiveWallet]);

  // Clear the choice on sign-out so the next person on this browser starts fresh.
  useEffect(() => {
    if (privyReady && !authenticated) writePref(null);
  }, [privyReady, authenticated]);

  return null;
}

"use client";

/**
 * Picks the wallet that signs every transaction, based on how the user signed in:
 * - Email / Google / X / passkey → the built-in Privy wallet (no extension popups).
 * - "Continue with a wallet" (MetaMask, Coinbase Wallet…) → that wallet.
 * Without this, wagmi grabs whatever wallet connected last (e.g. the embedded wallet Privy creates right
 * after a wallet login), so a MetaMask user would end up signing with an empty built-in wallet.
 * The choice is remembered per browser so a page reload keeps it, and it is re-applied whenever the
 * active wallet drifts away from it.
 */
import { useEffect, useRef, useState } from "react";
import { useLogin, usePrivy, useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { useAccount } from "wagmi";

const KEY = "alloy:signer";
type Pref = "embedded" | "external" | `external:${string}`;

function readPref(): Pref {
  try {
    return (localStorage.getItem(KEY) as Pref | null) ?? "embedded";
  } catch {
    return "embedded";
  }
}
function writePref(v: Pref | null) {
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
  // State (not just storage) so a login that completes after the first pass re-runs the effect.
  const [pref, setPref] = useState<Pref>("embedded");
  const switching = useRef<string | null>(null);

  useEffect(() => setPref(readPref()), []);

  useLogin({
    onComplete: ({ loginMethod, loginAccount, wasAlreadyAuthenticated }) => {
      if (wasAlreadyAuthenticated) return;
      let next: Pref = "embedded";
      if (loginMethod === "siwe") {
        const addr = loginAccount?.type === "wallet" ? loginAccount.address : undefined;
        next = addr ? `external:${addr.toLowerCase()}` : "external";
      }
      writePref(next);
      setPref(next);
    },
  });

  useEffect(() => {
    if (!authenticated || !ready) return;
    const target =
      pref === "embedded"
        ? wallets.find((w) => w.walletClientType === "privy")
        : pref === "external"
          ? wallets.find((w) => w.walletClientType !== "privy")
          : wallets.find((w) => w.address.toLowerCase() === pref.slice(9));
    if (!target) return; // the chosen wallet isn't connected yet; try again when the list changes
    if (address?.toLowerCase() === target.address.toLowerCase()) {
      switching.current = null;
      return;
    }
    if (switching.current === target.address) return; // a switch to it is already in flight
    switching.current = target.address;
    setActiveWallet(target)
      .catch(() => {})
      .finally(() => {
        switching.current = null;
      });
  }, [authenticated, ready, wallets, address, pref, setActiveWallet]);

  // Clear the choice on sign-out so the next person on this browser starts fresh.
  useEffect(() => {
    if (privyReady && !authenticated) {
      writePref(null);
      setPref("embedded");
    }
  }, [privyReady, authenticated]);

  return null;
}

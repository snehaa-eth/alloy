"use client";

/**
 * UI-side hooks that adapt lib interfaces for the screens. They never write to lib.
 * TODO(lib) items are listed where the data layer still needs a dedicated hook.
 */
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useQuote } from "@/lib/hooks/use-reads";
import { DEFAULT_SLIPPAGE_BPS } from "@/lib/strategy";
import { useBasketPosition } from "@/lib/hooks/use-position";
import { useWallet } from "@/lib/hooks/use-wallet";
import { sharesToUsd6, usd6ToShares } from "@/lib/units";

// ---------------------------------------------------------------------------
// Preview mode (dev only): `?preview=holder` renders signed-in, holding states without Privy,
// so screens can be reviewed and screenshotted. Never active in production builds.
// ---------------------------------------------------------------------------
const PREVIEW_KEY = "alloy.preview";
export function usePreview(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    try {
      const p = new URLSearchParams(window.location.search).get("preview");
      if (p === "holder") sessionStorage.setItem(PREVIEW_KEY, "1");
      if (p === "off") sessionStorage.removeItem(PREVIEW_KEY);
      setOn(sessionStorage.getItem(PREVIEW_KEY) === "1");
    } catch {
      /* storage blocked */
    }
  }, []);
  return on;
}

/** Signed-in state, honouring preview mode. */
export function useAccount() {
  const w = useWallet();
  const preview = usePreview();
  const signedIn = preview || (w.authenticated && !!w.address);
  return { ...w, preview, signedIn, handle: preview ? "asha" : w.address ? `${w.address.slice(0, 6)}…` : "" };
}

/** Position for one basket (shares + cost), honouring preview mode. */
export function usePosition(basket: Address, totalSupply = 0n) {
  const p = useBasketPosition(basket);
  const preview = usePreview();
  if (preview && p.shares === 0n) return { shares: totalSupply / 20n, costUsd6: null, mock: true, loading: false };
  return p;
}

// ---------------------------------------------------------------------------
// Quote: live quote (lib useQuote) with an oracle-NAV fallback, labelled by source.
// ---------------------------------------------------------------------------
export type QuoteView = {
  /** buy: shares out (18dp); sell: usdc out (6dp) */
  out: bigint;
  impactBps: number | null;
  /** Pool fees + impact vs oracle value, usd6 (null when only an estimate). */
  costUsd6: bigint | null;
  refundUsd6: bigint;
  /** "quote" = live router quote; "estimate" = oracle NAV (no pool cost known) */
  source: "quote" | "estimate";
  marketOpen: boolean | null;
  updatedAt: number;
  loading: boolean;
  error: string | null;
};

export function useQuoteView(
  basket: Address,
  side: "buy" | "sell",
  amount: bigint,
  nav: bigint,
  totalSupply: bigint,
): QuoteView {
  const q = useQuote(basket, side, amount, DEFAULT_SLIPPAGE_BPS);
  const d = q.data;
  if (d) {
    const cost =
      side === "buy"
        ? d.amountIn > d.oracleValueUsd6
          ? d.amountIn - d.oracleValueUsd6
          : 0n
        : (d.expectedOut * BigInt(Math.max(0, d.priceImpactBps))) / 10_000n;
    return {
      out: d.expectedOut,
      impactBps: d.priceImpactBps,
      costUsd6: cost,
      refundUsd6: d.refundUsd6,
      source: "quote",
      marketOpen: d.marketOpen,
      updatedAt: d.quotedAt * 1000,
      loading: false,
      error: null,
    };
  }
  const out = side === "buy" ? usd6ToShares(amount, nav, totalSupply) : sharesToUsd6(amount, nav, totalSupply);
  return {
    out,
    impactBps: null,
    costUsd6: null,
    refundUsd6: 0n,
    source: "estimate",
    marketOpen: null,
    updatedAt: q.dataUpdatedAt || 0,
    loading: q.isLoading && amount > 0n,
    error: q.error ? (q.error instanceof Error ? q.error.message : "Quote failed") : null,
  };
}

/** Seconds since a timestamp, ticking. */
export function useAge(since: number): number {
  const [now, setNow] = useState(() => since);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [since]);
  return Math.max(0, Math.floor((now - since) / 1000));
}

// ---------------------------------------------------------------------------
// Not-for-US-persons self-attestation (ARCHITECTURE §7), before the first money action.
// ---------------------------------------------------------------------------
const ATTEST_KEY = "alloy.attest.non-us.v1";
export function useAttestation() {
  const [attested, setAttested] = useState(false);
  useEffect(() => {
    try {
      setAttested(localStorage.getItem(ATTEST_KEY) === "1");
    } catch {
      /* storage blocked */
    }
  }, []);
  return {
    attested,
    confirm: () => {
      try {
        localStorage.setItem(ATTEST_KEY, "1");
      } catch {
        /* session only */
      }
      setAttested(true);
    },
  };
}

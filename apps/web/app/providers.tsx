"use client";

import { useState, type ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { DEFAULT_CHAIN, SUPPORTED_CHAINS } from "@/lib/chains";
import { wagmiConfig } from "@/lib/wagmi";
import { MotionRoot } from "@/components/alloy/motion/MotionRoot";
import { PreferEmbeddedWallet } from "@/components/alloy/PreferEmbeddedWallet";

export function Providers({ children }: { children: ReactNode }) {
  // One QueryClient per browser session (not per render).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
      }),
  );

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not set");

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "#0C0A0A",
          accentColor: "#F2EDE8", // cream: copper is reserved for Buy, so nothing in sign-in is copper
          logo: PRIVY_LOGO,
          landingHeader: "Sign in to Alloy",
          walletChainType: "ethereum-only",
          showWalletLoginFirst: false,
        },
        loginMethods: ["email", "google", "twitter", "passkey", "wallet"],
        defaultChain: DEFAULT_CHAIN,
        supportedChains: [...SUPPORTED_CHAINS],
        embeddedWallets: { ethereum: { createOnLogin: "all-users" } },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <PreferEmbeddedWallet />
          <MotionRoot>{children}</MotionRoot>
          <Toaster position="bottom-right" richColors closeButton visibleToasts={3} />
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}


/** Alloy mark for the Privy login modal (the header already says "Sign in to Alloy"). A bare <svg>: Privy clones it and sets its style. */
const PRIVY_LOGO = (
  <svg width="40" height="40" viewBox="0 0 28 28" role="img" aria-label="Alloy">
    <rect width="28" height="28" rx="8" fill="#8A1A32" />
    <rect x="6" y="10.5" width="16" height="2.5" rx="1.25" fill="#E8DCC8" />
    <rect x="6" y="15.5" width="11" height="2.5" rx="1.25" fill="#E8DCC8" opacity="0.6" />
  </svg>
);

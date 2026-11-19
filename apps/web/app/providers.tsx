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
        appearance: { theme: "dark", walletChainType: "ethereum-only", showWalletLoginFirst: false },
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

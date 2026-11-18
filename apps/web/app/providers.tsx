"use client";

import { useState, type ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { DEFAULT_CHAIN, SUPPORTED_CHAINS } from "@/lib/chains";
import { wagmiConfig } from "@/lib/wagmi";

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
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

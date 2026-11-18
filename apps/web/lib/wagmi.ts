"use client";

import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { base, baseSepolia } from "viem/chains";
import { DEFAULT_CHAIN_ID, rpcUrlFor } from "./chains";

// Default chain first so wagmi picks it before a wallet connects.
const chains =
  DEFAULT_CHAIN_ID === base.id ? ([base, baseSepolia] as const) : ([baseSepolia, base] as const);

export const wagmiConfig = createConfig({
  chains,
  transports: {
    [baseSepolia.id]: http(rpcUrlFor(baseSepolia.id)),
    [base.id]: http(rpcUrlFor(base.id)),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}

import type { Env } from "./config/env";
import type { AuthVerifier } from "./lib/auth";
import type { ChainClients, CreatorReader } from "./lib/chain";
import type { RateLimitConfig } from "./middleware/rateLimit";
import type { BasketMetaStore } from "./modules/baskets/basketMeta.store";
import type { FaucetRelayer } from "./modules/faucet/faucet.service";
import type { QuoteService } from "./modules/quote/quote.service";

export interface AppDeps {
  env: Env;
  auth: AuthVerifier;
  creators: CreatorReader;
  /** viem read clients per chain (stubbed in tests). */
  chain: ChainClients;
  quotes: QuoteService;
  /** Null when RELAYER_PK is unset: /faucet/drip answers 501. */
  faucet: FaucetRelayer | null;
  basketMeta: BasketMetaStore;
  fetch: typeof fetch;
  /** Resolves once Mongo is connected (cached across invocations). */
  connectDb: () => Promise<unknown>;
  rateLimits: RateLimitConfig;
}

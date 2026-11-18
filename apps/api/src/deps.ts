import type { Env } from "./config/env";
import type { AuthVerifier } from "./lib/auth";
import type { CreatorReader } from "./lib/chain";
import type { RateLimitConfig } from "./middleware/rateLimit";
import type { QuoteService } from "./modules/quote/quote.service";

export interface AppDeps {
  env: Env;
  auth: AuthVerifier;
  creators: CreatorReader;
  quotes: QuoteService;
  fetch: typeof fetch;
  /** Resolves once Mongo is connected (cached across invocations). */
  connectDb: () => Promise<unknown>;
  rateLimits: RateLimitConfig;
}

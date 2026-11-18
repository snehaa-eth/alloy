import express, { Router, type Express } from "express";
import helmet from "helmet";
import { loadEnv } from "./config/env";
import { connectDb } from "./config/db";
import type { AppDeps } from "./deps";
import { createPrivyVerifier } from "./lib/auth";
import { createViemCreatorReader } from "./lib/chain";
import { strictCors } from "./middleware/cors";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { DEFAULT_RATE_LIMITS, createLimiters } from "./middleware/rateLimit";
import { basketsRouter } from "./modules/baskets/baskets.routes";
import { healthRouter } from "./modules/health/health.routes";
import { proposalsRouter } from "./modules/proposals/proposals.routes";
import { notImplementedQuoteService } from "./modules/quote/quote.service";
import { quoteRouter } from "./modules/quote/quote.routes";
import { reasonsRouter } from "./modules/reasons/reasons.routes";
import { stocksRouter } from "./modules/stocks/stocks.routes";
import { waitlistRouter } from "./modules/waitlist/waitlist.routes";

/**
 * Builds the Express app. Never listens and never exits the process, so the
 * same app runs on Vercel (api/index.ts) and locally (src/server.ts).
 * Every dependency can be overridden for tests.
 */
export function createApp(overrides: Partial<AppDeps> = {}): Express {
  const env = overrides.env ?? loadEnv();
  const deps: AppDeps = {
    env,
    auth: overrides.auth ?? createPrivyVerifier(env),
    creators: overrides.creators ?? createViemCreatorReader(env),
    quotes: overrides.quotes ?? notImplementedQuoteService,
    fetch: overrides.fetch ?? globalThis.fetch,
    connectDb: overrides.connectDb ?? (() => connectDb(env.MONGO_URI)),
    rateLimits: overrides.rateLimits ?? DEFAULT_RATE_LIMITS,
  };

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // Vercel / one proxy hop: req.ip is the client, for rate limiting
  app.set("query parser", "simple"); // no nested objects from ?a[b]=c

  app.use(helmet());
  app.use(strictCors(env.ALLOWED_ORIGINS));
  app.use(express.json({ limit: "32kb" }));

  const limiters = createLimiters(deps.rateLimits);
  app.use(limiters.global);

  const api = Router();
  api.use(healthRouter(deps));
  api.use(stocksRouter(deps));
  api.use(basketsRouter(deps, limiters));
  api.use(reasonsRouter(deps, limiters));
  api.use(proposalsRouter(deps, limiters));
  api.use(quoteRouter(deps));
  api.use(waitlistRouter(deps, limiters));

  app.use("/api/v1", api); // legacy prefix the web app already uses
  app.use("/", api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

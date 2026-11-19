import { Router } from "express";
import { z } from "zod";
import type { AppDeps } from "../../deps";
import { zAddress, zChainId } from "../../lib/schemas";
import { getValid, validate } from "../../middleware/validate";

export function quoteRouter(deps: AppDeps) {
  const router = Router();
  const schemas = {
    query: z.object({
      chainId: zChainId(deps.env),
      basket: zAddress,
      side: z.enum(["buy", "sell"]),
      // Integer base units as a decimal string: never parse money into a JS number.
      amount: z
        .string()
        .regex(/^[1-9][0-9]{0,77}$/, "amount must be a positive integer in base units")
        .transform((s) => BigInt(s)),
      slippageBps: z.coerce.number().int().min(1).max(500).default(100),
    }),
  };

  router.get("/quote", validate(schemas), async (_req, res) => {
    const { query } = getValid(res, schemas);
    const quote = await deps.quotes.quote(query);
    res.set("Cache-Control", "public, max-age=5, s-maxage=10");
    res.json({ data: quote });
  });
  return router;
}

import { Router } from "express";
import { z } from "zod";
import type { AppDeps } from "../../deps";
import { zChainId } from "../../lib/schemas";
import { getValid, validate } from "../../middleware/validate";
import { createStocksService } from "./stocks.service";

export function stocksRouter(deps: AppDeps) {
  const router = Router();
  const service = createStocksService(deps.chain, deps.fetch);
  const listSchemas = { query: z.object({ chainId: zChainId(deps.env) }) };

  router.get("/stocks", validate(listSchemas), async (_req, res) => {
    const { query } = getValid(res, listSchemas);
    const result = await service.list(query.chainId);
    res.set(
      "Cache-Control",
      query.chainId === 84532 ? "public, s-maxage=15, stale-while-revalidate=30" : "public, s-maxage=300, stale-while-revalidate=600",
    );
    res.json({
      data: result.data,
      meta: { chainId: query.chainId, fetchedAt: new Date(result.fetchedAt).toISOString(), stale: result.stale },
    });
  });

  return router;
}

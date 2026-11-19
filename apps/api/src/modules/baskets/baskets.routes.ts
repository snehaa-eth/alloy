import { Router } from "express";
import { z } from "zod";
import type { AppDeps } from "../../deps";
import { requireAuth, requireCreator } from "../../lib/auth";
import { HttpError } from "../../lib/errors";
import { zAddress, zChainId } from "../../lib/schemas";
import { requireDb } from "../../middleware/db";
import type { createLimiters } from "../../middleware/rateLimit";
import { getValid, validate } from "../../middleware/validate";
import { BasketMeta, toBasketMetaDto } from "./basketMeta.model";
import { createBasketsService } from "./baskets.service";

const zTag = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,32}$/, "tags are 1-32 chars of a-z, 0-9, -");

export const MetaBody = z
  .strictObject({
    title: z.string().trim().min(1).max(80).optional(),
    thesis: z.string().trim().min(1).max(2000).optional(),
    imageUrl: z
      .url({ protocol: /^https$/ })
      .max(2048)
      .optional(),
    tags: z
      .array(zTag)
      .max(8)
      .transform((t) => [...new Set(t)])
      .optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: "provide at least one of title, thesis, imageUrl, tags" });

export function basketsRouter(deps: AppDeps, limiters: ReturnType<typeof createLimiters>) {
  const router = Router();
  const db = requireDb(deps.connectDb);
  const chainId = zChainId(deps.env);

  const baskets = createBasketsService(deps.chain, { logsMaxRange: deps.env.RPC_LOGS_MAX_RANGE });

  // On-chain state (factory enumeration + basket reads, cached 15s) merged with Mongo text metadata.
  // Mongo being down degrades to meta: null instead of failing the request.
  // TODO(indexer): replace factory enumeration + Transfer-log followers with Ponder; add ?sort=aum|perf.
  const listSchemas = {
    query: z.object({
      chainId,
      tag: zTag.optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).max(10_000).default(0),
    }),
  };
  router.get("/baskets", validate(listSchemas), async (_req, res) => {
    const { query } = getValid(res, listSchemas);
    const [onchain, meta] = await Promise.all([
      baskets.list(query.chainId).catch(rpcError),
      deps.basketMeta.byChain(query.chainId),
    ]);
    let merged = onchain.map((b) => ({ ...b, meta: meta?.get(b.vault.toLowerCase()) ?? null }));
    if (query.tag) merged = merged.filter((b) => b.meta?.tags.includes(query.tag!));
    res.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");
    res.json({
      data: merged.slice(query.offset, query.offset + query.limit),
      meta: { limit: query.limit, offset: query.offset, total: merged.length, metadata: meta ? "ok" : "unavailable" },
    });
  });

  const detailSchemas = { params: z.object({ vault: zAddress }), query: z.object({ chainId }) };
  router.get("/baskets/:vault", validate(detailSchemas), async (_req, res) => {
    const { params, query } = getValid(res, detailSchemas);
    const [b, meta] = await Promise.all([
      baskets.get(query.chainId, params.vault).catch(rpcError),
      deps.basketMeta.byChain(query.chainId),
    ]);
    if (!b) throw HttpError.notFound("Not an Alloy basket on this chain");
    res.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");
    res.json({
      data: { ...b, meta: meta?.get(b.vault.toLowerCase()) ?? null },
      meta: { metadata: meta ? "ok" : "unavailable" },
    });
  });

  const metaSchemas = { params: z.object({ vault: zAddress }), query: z.object({ chainId }), body: MetaBody };
  router.post(
    "/baskets/:vault/meta",
    limiters.write,
    validate(metaSchemas),
    requireAuth(deps.auth),
    requireCreator(deps.creators, (_req, res) => {
      const v = getValid(res, metaSchemas);
      return { chainId: v.query.chainId, vault: v.params.vault };
    }),
    db,
    async (_req, res) => {
      const { params, query, body } = getValid(res, metaSchemas);
      // Only whitelisted fields from the strict zod schema are written (no mass assignment).
      const set: Record<string, unknown> = { updatedBy: res.locals.creator };
      if (body.title !== undefined) set.title = body.title;
      if (body.thesis !== undefined) set.thesis = body.thesis;
      if (body.imageUrl !== undefined) set.imageUrl = body.imageUrl;
      if (body.tags !== undefined) set.tags = body.tags;
      const doc = await BasketMeta.findOneAndUpdate(
        { chainId: query.chainId, vault: params.vault },
        { $set: set, $setOnInsert: { chainId: query.chainId, vault: params.vault } },
        { upsert: true, new: true, runValidators: true, lean: true },
      );
      res.status(200).json({ data: toBasketMetaDto(doc!) });
    },
  );

  return router;
}

function rpcError(err: unknown): never {
  console.error("[baskets] chain read failed:", err instanceof Error ? err.message.split("\n")[0] : err);
  throw new HttpError(502, "rpc_unavailable", "Chain RPC temporarily unavailable");
}

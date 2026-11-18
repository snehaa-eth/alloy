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

const zTag = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,32}$/, "tags are 1-32 chars of a-z, 0-9, -");

export const MetaBody = z
  .strictObject({
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
  .refine((b) => Object.keys(b).length > 0, { message: "provide at least one of thesis, imageUrl, tags" });

export function basketsRouter(deps: AppDeps, limiters: ReturnType<typeof createLimiters>) {
  const router = Router();
  const db = requireDb(deps.connectDb);
  const chainId = zChainId(deps.env);

  // TODO(indexer): merge on-chain data (comps, weights, NAV, AUM, followers, fee) from Ponder,
  // support ?sort=aum|perf, and only list baskets the indexer knows (BasketCreated events).
  const listSchemas = {
    query: z.object({
      chainId,
      tag: zTag.optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).max(10_000).default(0),
    }),
  };
  router.get("/baskets", validate(listSchemas), db, async (_req, res) => {
    const { query } = getValid(res, listSchemas);
    const filter: Record<string, unknown> = { chainId: query.chainId };
    if (query.tag) filter.tags = query.tag;
    const docs = await BasketMeta.find(filter).sort({ updatedAt: -1 }).skip(query.offset).limit(query.limit).lean();
    res.json({ data: docs.map(toBasketMetaDto), meta: { limit: query.limit, offset: query.offset } });
  });

  const detailSchemas = { params: z.object({ vault: zAddress }), query: z.object({ chainId }) };
  router.get("/baskets/:vault", validate(detailSchemas), db, async (_req, res) => {
    const { params, query } = getValid(res, detailSchemas);
    const doc = await BasketMeta.findOne({ chainId: query.chainId, vault: params.vault }).lean();
    if (!doc) throw HttpError.notFound("No metadata for this basket");
    res.json({ data: toBasketMetaDto(doc) });
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

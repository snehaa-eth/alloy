import { Router } from "express";
import { z } from "zod";
import type { AppDeps } from "../../deps";
import { requireAuth, requireCreator } from "../../lib/auth";
import { HttpError } from "../../lib/errors";
import { zAddress, zBytes32, zChainId } from "../../lib/schemas";
import { requireDb } from "../../middleware/db";
import type { createLimiters } from "../../middleware/rateLimit";
import { getValid, validate } from "../../middleware/validate";
import { RebalanceReason, toReasonDto } from "./reason.model";
import { normalizeReason, reasonHash } from "./reasonHash";

export const ReasonBody = z.strictObject({
  text: z.string().transform(normalizeReason).pipe(z.string().min(1).max(500)),
});

export function reasonsRouter(deps: AppDeps, limiters: ReturnType<typeof createLimiters>) {
  const router = Router();
  const db = requireDb(deps.connectDb);
  const chainId = zChainId(deps.env);

  const postSchemas = { params: z.object({ vault: zAddress }), query: z.object({ chainId }), body: ReasonBody };
  router.post(
    "/baskets/:vault/rebalance-reason",
    limiters.write,
    validate(postSchemas),
    requireAuth(deps.auth),
    requireCreator(deps.creators, (_req, res) => {
      const v = getValid(res, postSchemas);
      return { chainId: v.query.chainId, vault: v.params.vault };
    }),
    db,
    async (_req, res) => {
      const { params, query, body } = getValid(res, postSchemas);
      const hash = reasonHash(body.text);
      // Idempotent: the same text for the same basket maps to the same hash/doc.
      const doc = await RebalanceReason.findOneAndUpdate(
        { chainId: query.chainId, vault: params.vault, reasonHash: hash },
        {
          $setOnInsert: {
            chainId: query.chainId,
            vault: params.vault,
            reasonHash: hash,
            text: body.text,
            author: res.locals.creator,
          },
        },
        { upsert: true, new: true, lean: true },
      );
      res.status(201).json({ data: toReasonDto(doc!) });
    },
  );

  // TODO(indexer): join with RecipeProposed/Rebalanced events so the feed only shows reasons anchored on-chain.
  const listSchemas = {
    params: z.object({ vault: zAddress }),
    query: z.object({ chainId, limit: z.coerce.number().int().min(1).max(100).default(20) }),
  };
  router.get("/baskets/:vault/rebalance-reasons", validate(listSchemas), db, async (_req, res) => {
    const { params, query } = getValid(res, listSchemas);
    const docs = await RebalanceReason.find({ chainId: query.chainId, vault: params.vault })
      .sort({ createdAt: -1 })
      .limit(query.limit)
      .lean();
    res.json({ data: docs.map(toReasonDto) });
  });

  const byHashSchemas = {
    params: z.object({ vault: zAddress, hash: zBytes32 }),
    query: z.object({ chainId }),
  };
  router.get("/baskets/:vault/rebalance-reasons/:hash", validate(byHashSchemas), db, async (_req, res) => {
    const { params, query } = getValid(res, byHashSchemas);
    const doc = await RebalanceReason.findOne({
      chainId: query.chainId,
      vault: params.vault,
      reasonHash: params.hash,
    }).lean();
    if (!doc) throw HttpError.notFound("Unknown reason hash");
    res.json({ data: toReasonDto(doc) });
  });

  return router;
}

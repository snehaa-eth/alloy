import { Router } from "express";
import { z } from "zod";
import type { AppDeps } from "../../deps";
import { assertCreator, requireAuth, requireServiceKey } from "../../lib/auth";
import { HttpError } from "../../lib/errors";
import { zAddress, zBytes32, zChainId, zObjectId } from "../../lib/schemas";
import { requireDb } from "../../middleware/db";
import type { createLimiters } from "../../middleware/rateLimit";
import { getValid, validate } from "../../middleware/validate";
import { normalizeReason, reasonHash } from "../reasons/reasonHash";
import { PROPOSAL_STATUSES, Proposal, toProposalDto } from "./proposal.model";

export const Weights = z
  .array(z.strictObject({ token: zAddress, bps: z.number().int().min(0).max(10_000) }))
  .min(1)
  .max(10)
  .refine((w) => w.reduce((s, x) => s + x.bps, 0) === 10_000, { message: "weights must sum to 10000 bps" })
  .refine((w) => new Set(w.map((x) => x.token)).size === w.length, { message: "duplicate token" });

export function proposalsRouter(deps: AppDeps, limiters: ReturnType<typeof createLimiters>) {
  const router = Router();
  const db = requireDb(deps.connectDb);
  const chainId = zChainId(deps.env);

  // Create: AI agent only (service key). TODO(contracts): validate tokens against the basket's comps.
  const createSchemas = {
    body: z.strictObject({
      chainId,
      vault: zAddress,
      weights: Weights,
      reason: z.string().transform(normalizeReason).pipe(z.string().min(1).max(500)),
      model: z.string().trim().min(1).max(100),
      inputsHash: zBytes32,
    }),
  };
  router.post("/proposals", limiters.write, requireServiceKey(deps.env), validate(createSchemas), db, async (_req, res) => {
    const { body } = getValid(res, createSchemas);
    const doc = await Proposal.create({ ...body, reasonHash: reasonHash(body.reason), status: "pending" });
    res.status(201).json({ data: toProposalDto(doc.toObject()) });
  });

  const listSchemas = {
    params: z.object({ vault: zAddress }),
    query: z.object({
      chainId,
      status: z.enum(PROPOSAL_STATUSES).optional(),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    }),
  };
  router.get("/baskets/:vault/proposals", validate(listSchemas), db, async (_req, res) => {
    const { params, query } = getValid(res, listSchemas);
    const filter: Record<string, unknown> = { chainId: query.chainId, vault: params.vault };
    if (query.status) filter.status = query.status;
    const docs = await Proposal.find(filter).sort({ createdAt: -1 }).limit(query.limit).lean();
    res.json({ data: docs.map(toProposalDto) });
  });

  const idSchemas = { params: z.object({ id: zObjectId }) };
  router.get("/proposals/:id", validate(idSchemas), db, async (_req, res) => {
    const { params } = getValid(res, idSchemas);
    const doc = await Proposal.findById(params.id).lean();
    if (!doc) throw HttpError.notFound("Proposal not found");
    res.json({ data: toProposalDto(doc) });
  });

  // Approve / reject: the basket's on-chain creator only. Approving does NOT touch the chain;
  // the web client then calls proposeRecipe(weights, reasonHash) from the creator's wallet.
  // TODO(indexer): mark proposals "executed" when a matching RecipeProposed(reasonHash) is indexed,
  // and expire stale pending proposals (cron with CRON_SECRET).
  for (const action of ["approve", "reject"] as const) {
    router.post(
      `/proposals/:id/${action}`,
      limiters.write,
      validate(idSchemas),
      requireAuth(deps.auth),
      db,
      async (req, res) => {
        const { params } = getValid(res, idSchemas);
        const existing = await Proposal.findById(params.id).lean();
        if (!existing) throw HttpError.notFound("Proposal not found");
        const chain = chainId.parse(existing.chainId);
        const vault = zAddress.parse(existing.vault);
        const creator = await assertCreator(deps.creators, req.user, chain, vault);

        const updated = await Proposal.findOneAndUpdate(
          { _id: params.id, status: "pending" },
          { $set: { status: action === "approve" ? "approved" : "rejected", decidedBy: creator, decidedAt: new Date() } },
          { new: true, lean: true },
        );
        if (!updated) throw HttpError.conflict(`Proposal is already ${existing.status}`);
        res.json({ data: toProposalDto(updated) });
      },
    );
  }

  return router;
}

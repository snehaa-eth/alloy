import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AppDeps } from "../../deps";
import { HttpError } from "../../lib/errors";
import { zAddress } from "../../lib/schemas";
import { requireDb } from "../../middleware/db";
import type { createLimiters } from "../../middleware/rateLimit";
import { getValid, validate } from "../../middleware/validate";
import { Waitlist } from "./waitlist.model";

function codeMatches(candidate: string, codes: string[]): boolean {
  const c = Buffer.from(candidate);
  let ok = false;
  for (const code of codes) {
    const b = Buffer.from(code);
    if (b.length === c.length && timingSafeEqual(b, c)) ok = true;
  }
  return ok;
}

/** v1 waitlist, kept with the legacy `{ success, message, data }` response shape the web app uses. */
export function waitlistRouter(deps: AppDeps, limiters: ReturnType<typeof createLimiters>) {
  const router = Router();
  const db = requireDb(deps.connectDb);

  const joinSchemas = {
    body: z.strictObject({
      email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
      wallet: zAddress.optional(),
    }),
  };
  router.post("/waitlist/join", limiters.waitlist, validate(joinSchemas), db, async (_req, res) => {
    const { body } = getValid(res, joinSchemas);
    const existing = await Waitlist.findOne({ email: body.email }).lean();
    if (existing) {
      res.status(200).json({
        success: true,
        message: "You are already on the waitlist!",
        data: { isVerified: Boolean(existing.isVerified) },
      });
      return;
    }
    await Waitlist.create({ email: body.email, ...(body.wallet ? { wallet: body.wallet } : {}) });
    res.status(201).json({ success: true, message: "Successfully joined the waitlist!", data: { isVerified: false } });
  });

  const checkSchemas = {
    query: z.object({
      wallet: zAddress,
      inviteCode: z.string().trim().min(1).max(64).optional(),
    }),
  };
  router.get("/waitlist/check", limiters.waitlist, validate(checkSchemas), db, async (_req, res) => {
    const { query } = getValid(res, checkSchemas);
    // v1 stored wallets un-normalised; match both checksum and lowercase forms.
    const user = await Waitlist.findOne({
      wallet: mongoose.trusted({ $in: [query.wallet, query.wallet.toLowerCase()] }),
    });
    if (!user) throw HttpError.notFound("User not found");

    if (!query.inviteCode) {
      if (user.isVerified) {
        res.json({ success: true, message: "You are already a subscribed user", data: { isVerified: true } });
        return;
      }
      throw HttpError.badRequest("Invite code required for unverified user");
    }
    if (!codeMatches(query.inviteCode, deps.env.INVITE_CODES)) throw HttpError.badRequest("Invalid invite code");

    user.inviteCode = query.inviteCode;
    user.isVerified = true;
    await user.save();
    res.json({ success: true, message: "Invite code accepted", data: { isVerified: true } });
  });

  const countHandler = async (_req: unknown, res: import("express").Response) => {
    const count = await Waitlist.estimatedDocumentCount();
    res.set("Cache-Control", "public, s-maxage=60");
    res.json({ success: true, message: "Number of users retrieved successfully", data: { count } });
  };
  router.get("/waitlist/waitlist-users", db, countHandler);
  router.get("/waitlist/count", db, countHandler);

  return router;
}

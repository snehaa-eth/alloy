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

  /**
   * v2 sign-up (the /waitlist page): email + optional X handle, deduped by email. Returns the place in line
   * (1-based, by created time). A repeat email is not an error: it returns the existing place and fills in
   * the X handle if it was missing.
   */
  const createSchemas = {
    body: z.strictObject({
      email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
      xHandle: z
        .string()
        .trim()
        .transform((h) => h.replace(/^@/, ""))
        .pipe(z.string().regex(/^[A-Za-z0-9_]{1,15}$/, "Invalid X handle"))
        .optional()
        .or(z.literal("").transform(() => undefined)),
      source: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{1,40}$/).optional(),
      referrer: z.string().trim().max(500).optional(),
    }),
  };
  const placeOf = (createdAt: Date | undefined) =>
    createdAt ? Waitlist.countDocuments({ createdAt: mongoose.trusted({ $lte: createdAt }) }) : Promise.resolve(null);
  router.post("/waitlist", limiters.waitlist, validate(createSchemas), db, async (_req, res) => {
    const { body } = getValid(res, createSchemas);
    let doc = await Waitlist.findOne({ email: body.email });
    let alreadyJoined = Boolean(doc);
    if (doc) {
      if (body.xHandle && !doc.xHandle) {
        doc.xHandle = body.xHandle;
        await doc.save();
      }
    } else {
      try {
        doc = await Waitlist.create({
          email: body.email,
          ...(body.xHandle ? { xHandle: body.xHandle } : {}),
          source: body.source ?? "waitlist",
          ...(body.referrer ? { referrer: body.referrer } : {}),
        });
      } catch (err) {
        // lost a race with the same email: treat as already joined
        if ((err as { code?: number }).code !== 11000) throw err;
        doc = await Waitlist.findOne({ email: body.email });
        alreadyJoined = true;
      }
    }
    const position = await placeOf(doc?.createdAt as Date | undefined);
    res.status(alreadyJoined ? 200 : 201).json({
      success: true,
      message: alreadyJoined ? "You are already on the waitlist!" : "Successfully joined the waitlist!",
      data: { position, alreadyJoined },
    });
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

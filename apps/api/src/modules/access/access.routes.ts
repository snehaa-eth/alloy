import { Router } from "express";
import { z } from "zod";
import type { AppDeps } from "../../deps";
import { requireAdminKey, requireAuth } from "../../lib/auth";
import { requireDb } from "../../middleware/db";
import type { createLimiters } from "../../middleware/rateLimit";
import { getValid, validate } from "../../middleware/validate";
import { checkAccess, exportWaitlist, getAllowList, toCsv, updateAllowList } from "./access.service";

const zEmail = z.string().trim().toLowerCase().pipe(z.email().max(254));

export function accessRouter(deps: AppDeps, limiters: ReturnType<typeof createLimiters>) {
  const router = Router();
  const db = requireDb(deps.connectDb);
  const admin = requireAdminKey(deps.env);

  /**
   * Early-access check for the signed-in Privy user (Authorization: Bearer <access token>).
   * Allowed when one of the user's verified emails is on the waitlist or the allow list.
   * Wallet-only users get { allowed:false, reason:"email-needed" }.
   */
  router.post("/access/check", requireAuth(deps.auth), limiters.access, db, async (req, res) => {
    const result = await checkAccess(req.user!.emails);
    res.set("Cache-Control", "no-store");
    res.json(result);
  });

  /** Admin: edit the allow list. */
  const accessSchemas = {
    body: z.strictObject({
      allowAdd: z.array(zEmail).max(500).optional(),
      allowRemove: z.array(zEmail).max(500).optional(),
    }),
  };
  router.post("/admin/access", admin, validate(accessSchemas), db, async (_req, res) => {
    const { body } = getValid(res, accessSchemas);
    const allow = await updateAllowList(body.allowAdd, body.allowRemove);
    res.set("Cache-Control", "no-store");
    res.json({ allow });
  });

  router.get("/admin/access", admin, db, async (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ allow: await getAllowList() });
  });

  /** Admin: every waitlist entry in sign-up order. `?format=csv` for a spreadsheet. */
  const exportSchemas = { query: z.object({ format: z.enum(["json", "csv"]).default("json") }) };
  router.get("/admin/waitlist", admin, validate(exportSchemas), db, async (_req, res) => {
    const { query } = getValid(res, exportSchemas);
    const rows = await exportWaitlist();
    res.set("Cache-Control", "no-store");
    if (query.format === "csv") {
      res.type("text/csv").set("Content-Disposition", 'attachment; filename="waitlist.csv"').send(toCsv(rows));
      return;
    }
    res.json({ count: rows.length, entries: rows });
  });

  return router;
}

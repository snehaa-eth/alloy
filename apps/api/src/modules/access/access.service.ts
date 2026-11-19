/**
 * Early access ("waitlisters first"): a signed-in email gets in when it is on the waitlist (any place in line)
 * or on the allow list. Shared by the API routes and scripts/access.ts.
 */
import mongoose from "mongoose";
import { Waitlist } from "../waitlist/waitlist.model";
import { ACCESS_KEY, Settings } from "./settings.model";

export const normEmail = (e: string) => e.trim().toLowerCase();

export async function getAllowList(): Promise<string[]> {
  const doc = await Settings.findOne({ key: ACCESS_KEY }).lean();
  return (doc?.allow ?? []).map(normEmail);
}

/** Adds/removes allow-list emails atomically; returns the new list. */
export async function updateAllowList(add: string[] = [], remove: string[] = []): Promise<string[]> {
  const a = [...new Set(add.map(normEmail))];
  const r = [...new Set(remove.map(normEmail))];
  if (a.length) {
    await Settings.updateOne({ key: ACCESS_KEY }, { $addToSet: { allow: mongoose.trusted({ $each: a }) } }, { upsert: true });
  }
  if (r.length) {
    await Settings.updateOne({ key: ACCESS_KEY }, { $pull: { allow: mongoose.trusted({ $in: r }) } }, { upsert: true });
  }
  return getAllowList();
}

/** 1-based place in line by sign-up time (ties broken by _id). */
async function placeOf(doc: { _id: unknown; createdAt?: Date | null }): Promise<number | null> {
  if (!doc.createdAt) return null;
  // sanitizeFilter is on: every operator object must be marked trusted individually (nested ones aren't covered).
  const earlier = await Waitlist.countDocuments(
    mongoose.trusted({
      $or: [
        { createdAt: mongoose.trusted({ $lt: doc.createdAt }) },
        { createdAt: doc.createdAt, _id: mongoose.trusted({ $lte: doc._id }) },
      ],
    }),
  );
  return earlier;
}

export type AccessResult =
  | { allowed: true; email: string; onList: boolean; position: number | null }
  | { allowed: false; email: string; onList: false; position: null; reason: "not-on-list" }
  | { allowed: false; reason: "email-needed"; onList: false; position: null };

/** Decides access for a set of verified emails (a Privy user may have an email login and a Google account). */
export async function checkAccess(emails: string[]): Promise<AccessResult> {
  const list = [...new Set(emails.map(normEmail).filter(Boolean))];
  if (!list.length) return { allowed: false, reason: "email-needed", onList: false, position: null };

  const entry = await Waitlist.findOne({ email: mongoose.trusted({ $in: list }) })
    .sort({ createdAt: 1 })
    .lean();
  if (entry) {
    return { allowed: true, email: entry.email, onList: true, position: await placeOf(entry) };
  }
  const allow = new Set(await getAllowList());
  const allowed = list.find((e) => allow.has(e));
  if (allowed) return { allowed: true, email: allowed, onList: false, position: null };
  return { allowed: false, email: list[0]!, onList: false, position: null, reason: "not-on-list" };
}

export type ExportRow = { email: string; xHandle: string | null; position: number; createdAt: string | null; source: string | null };

/** Every waitlist entry in sign-up order, with its place in line. */
export async function exportWaitlist(): Promise<ExportRow[]> {
  const docs = await Waitlist.find({}, { email: 1, xHandle: 1, createdAt: 1, source: 1 }).sort({ createdAt: 1, _id: 1 }).lean();
  return docs.map((d, i) => ({
    email: d.email,
    xHandle: d.xHandle ?? null,
    position: i + 1,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
    source: d.source ?? null,
  }));
}

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // quote, and neutralise spreadsheet formulas
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(rows: ExportRow[]): string {
  const head = ["position", "email", "xHandle", "createdAt", "source"];
  return [head.join(","), ...rows.map((r) => [r.position, r.email, r.xHandle, r.createdAt, r.source].map(csvCell).join(","))].join("\n") + "\n";
}

// Launch announcement: one email to every waitlister who hasn't had it yet (no `announcedAt`), via Gmail SMTP.
//
//   npx tsx scripts/announce.ts                         # dry run (default): recipients + a rendered preview
//   npx tsx scripts/announce.ts --to me@example.com     # send ONE test email to that address (marks nothing)
//   npx tsx scripts/announce.ts --send                  # send for real, ~1 email / 2s, marks announcedAt per success
//   npx tsx scripts/announce.ts --send --limit 300      # cap this run (Gmail allows ~500/day on a normal account)
//
// Resume-safe: re-running skips everyone already marked. Stops on auth or Gmail sending-limit errors.
// Env (apps/api/.env): MONGO_URI, GMAIL_USER, GMAIL_APP_PASSWORD (a Google App Password, not the account password).
import "dotenv/config";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { z } from "zod";
import { Waitlist } from "../src/modules/waitlist/waitlist.model";

const SITE = "https://alloyfi.vercel.app";
/** Opens the waitlist page with the sign-in bar already showing. */
const SIGN_IN = `${SITE}/waitlist?invited=1`;
const FROM_NAME = "Snehaa from Alloy";
const SUBJECT = "Alloy is open. You're in.";
const GAP_MS = 2_000;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function render(email: string) {
  const text = [
    "Hi,",
    "",
    "You joined the Alloy waitlist. Alloy is live now, and you're in.",
    "",
    `Sign in here: ${SIGN_IN}`,
    `Use this email: ${email}`,
    "",
    "We'll send you a sign-in code. That's it.",
    "",
    "Baskets of US stocks around one idea, from $5.",
    "",
    "See you inside,",
    "Snehaa",
    "Alloy",
  ].join("\n");

  const e = esc(email);
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#ffffff;color:#141212;font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<div style="max-width:520px">
<p style="margin:0 0 16px">Hi,</p>
<p style="margin:0 0 16px">You joined the Alloy waitlist. Alloy is live now, and you're in.</p>
<p style="margin:24px 0"><a href="${SIGN_IN}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#E39B6E;color:#141212;font-weight:600;text-decoration:none">Sign in to Alloy &rarr;</a></p>
<p style="margin:0 0 16px">Use this email: <strong style="color:#141212;text-decoration:none">${e}</strong>. We'll send you a sign-in code. That's it.</p>
<p style="margin:0 0 16px;color:#5c5856">Baskets of US stocks around one idea, from $5.</p>
<p style="margin:0">See you inside,<br>Snehaa<br>Alloy</p>
</div></body></html>`;
  return { subject: SUBJECT, text, html };
}

function parseArgs(argv: string[]) {
  const out = { send: false, to: undefined as string | undefined, limit: Infinity };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--send") out.send = true;
    else if (a === "--dry-run") out.send = false;
    else if (a === "--to") out.to = z.string().trim().toLowerCase().pipe(z.email()).parse(argv[++i]);
    else if (a === "--limit") out.limit = z.coerce.number().int().positive().parse(argv[++i]);
    else throw new Error(`unknown option: ${a}`);
  }
  return out;
}

function transport() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set (apps/api/.env)");
  return { from: { name: FROM_NAME, address: user }, mailer: nodemailer.createTransport({ service: "gmail", auth: { user, pass } }) };
}

/** Errors that mean "stop the run" (bad credentials, Gmail daily/rate limits) rather than "skip this address". */
const isFatal = (err: unknown) => {
  const e = err as { code?: string; responseCode?: number; message?: string };
  return e.code === "EAUTH" || e.code === "ECONNECTION" || e.responseCode === 421 || e.responseCode === 454 || /5\.4\.5|limit/i.test(e.message ?? "");
};

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.to) {
    const { from, mailer } = transport();
    const m = render(args.to);
    await mailer.sendMail({ from, to: args.to, ...m });
    console.log(`test email sent to ${args.to} (nothing marked)`);
    return;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set (apps/api/.env)");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  try {
    const pending = await Waitlist.find({ announcedAt: mongoose.trusted({ $exists: false }) }, { email: 1 })
      .sort({ createdAt: 1, _id: 1 })
      .lean();
    const batch = pending.slice(0, args.limit);
    console.log(`${pending.length} waitlister(s) not yet announced${batch.length < pending.length ? `, this run: ${batch.length}` : ""}`);

    if (!args.send) {
      for (const d of batch) console.log(`  ${d.email}`);
      const sample = render(batch[0]?.email ?? "you@example.com");
      console.log(`\n--- preview (From: ${FROM_NAME} <GMAIL_USER>) ---\nSubject: ${sample.subject}\n\n${sample.text}\n---`);
      console.log("\nDry run: nothing sent. Add --send to send, or --to you@x.com for a single test.");
      return;
    }

    const { from, mailer } = transport();
    await mailer.verify();
    let sent = 0;
    let failed = 0;
    for (const [i, d] of batch.entries()) {
      try {
        await mailer.sendMail({ from, to: d.email, ...render(d.email) });
        await Waitlist.updateOne({ _id: d._id }, { $set: { announcedAt: new Date() } });
        sent++;
        console.log(`[${i + 1}/${batch.length}] sent  ${d.email}`);
      } catch (err) {
        failed++;
        console.error(`[${i + 1}/${batch.length}] FAIL  ${d.email}: ${(err as Error).message}`);
        if (isFatal(err)) {
          console.error("Stopping (auth or Gmail sending limit). Re-run later; sent addresses are skipped.");
          break;
        }
      }
      if (i < batch.length - 1) await new Promise((r) => setTimeout(r, GAP_MS));
    }
    console.log(`done: ${sent} sent, ${failed} failed, ${pending.length - sent} still pending`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

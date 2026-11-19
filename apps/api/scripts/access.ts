// Early-access admin from the terminal (talks to Mongo directly via MONGO_URI in .env).
// Access rule: a signed-in email gets in if it is on the waitlist (any place in line) or on the allow list.
//
//   npx tsx scripts/access.ts allow judge@x.com friend@y.com   # add to the allow list
//   npx tsx scripts/access.ts disallow friend@y.com            # remove from the allow list
//   npx tsx scripts/access.ts list                             # show the allow list + waitlist size
//   npx tsx scripts/access.ts check someone@x.com              # would this email get in?
//   npx tsx scripts/access.ts export > waitlist.csv            # every waitlist entry, in sign-up order
import "dotenv/config";
import mongoose from "mongoose";
import { z } from "zod";
import { checkAccess, exportWaitlist, getAllowList, toCsv, updateAllowList } from "../src/modules/access/access.service";
import { Waitlist } from "../src/modules/waitlist/waitlist.model";

const zEmail = z.string().trim().toLowerCase().pipe(z.email().max(254));
const USAGE = "usage: access.ts allow <email…> | disallow <email…> | list | check <email> | export";

function emails(args: string[]): string[] {
  if (!args.length) throw new Error("give at least one email");
  return args.map((a) => {
    const r = zEmail.safeParse(a);
    if (!r.success) throw new Error(`not an email: ${a}`);
    return r.data;
  });
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd || !["allow", "disallow", "list", "check", "export"].includes(cmd)) {
    console.error(USAGE);
    process.exit(1);
  }
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set (apps/api/.env)");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  try {
    if (cmd === "allow" || cmd === "disallow") {
      const list = emails(args);
      const allow = cmd === "allow" ? await updateAllowList(list, []) : await updateAllowList([], list);
      console.error(`allow list (${allow.length}): ${allow.join(", ") || "(empty)"}`);
    } else if (cmd === "list") {
      const allow = await getAllowList();
      console.error(`waitlist: ${await Waitlist.countDocuments()} entries`);
      console.error(`allow list (${allow.length}): ${allow.join(", ") || "(empty)"}`);
    } else if (cmd === "check") {
      console.error(JSON.stringify(await checkAccess(emails(args))));
    } else {
      const rows = await exportWaitlist();
      process.stdout.write(toCsv(rows));
      console.error(`exported ${rows.length} entries`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

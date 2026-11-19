// Upserts text metadata (title, thesis, cover, tags) for the seed baskets.
//
//   npx tsx scripts/seed-metadata.ts            # write if MONGO_URI is set and reachable, else dry-run
//   npx tsx scripts/seed-metadata.ts --dry-run  # never write
//
// Seeds are matched to live baskets on Base Sepolia by explicit `vault` or by on-chain name().
// Seeds with no basket on-chain yet are listed and skipped (re-run after creating them).
// Writes go straight to the collection (same schema as POST /baskets/:vault/meta) with
// updatedBy = "seed-script"; cover paths are web-app relative (/brand/covers/*.webp).
import "dotenv/config";
import mongoose from "mongoose";
import { getAddress, isAddressEqual, type Address } from "viem";
import { basketAbi, basketFactoryAbi, getDeployment } from "../src/config/sdk";
import { createPublicClients, read, toChainClient } from "../src/lib/chain";
import { BasketMeta } from "../src/modules/baskets/basketMeta.model";

const CHAIN_ID = 84532 as const;

interface Seed {
  slug: string;
  title: string;
  /** ≤ 280 chars (COPY.md). */
  thesis: string;
  imageUrl: string;
  tags: string[];
  /** Pin to a known vault; otherwise matched by on-chain name. */
  vault?: Address;
  /** Lowercased substrings of the on-chain name() that identify this seed. */
  match: string[];
}

const SEEDS: Seed[] = [
  {
    slug: "big-tech",
    title: "Big Tech",
    thesis:
      "The largest US tech companies in one token, each capped so no single name runs the basket. Trimmed back to recipe when one runs ahead.",
    imageUrl: "/brand/covers/big-tech.webp",
    tags: ["big-tech", "demo"],
    vault: "0x60B0E5813dF4D7C5e602f78743c73CC90A63d36c", // "Alloy Demo: Big Tech"
    match: ["big tech"],
  },
  {
    slug: "ai-build-out",
    title: "The AI Build-Out",
    thesis:
      "Every AI model runs on someone's chips and someone's cloud. This basket owns both sides: the chip makers and the three clouds renting them out.",
    imageUrl: "/brand/covers/ai-build-out.webp",
    tags: ["ai-chips", "big-tech"],
    match: ["ai build", "build-out"],
  },
  {
    slug: "capitol-tech",
    title: "Capitol Tech",
    thesis:
      "Tech stocks that show up most in recent congressional disclosures. Built from public filings; not affiliated with any member of Congress.",
    imageUrl: "/brand/covers/capitol-tech.webp",
    tags: ["story", "big-tech"],
    match: ["capitol"],
  },
  {
    slug: "picks-shovels",
    title: "Picks & Shovels",
    thesis: "In a gold rush, sell the shovels. The chips, clouds and infrastructure every AI company has to pay for.",
    imageUrl: "/brand/covers/picks-shovels.webp",
    tags: ["ai-chips"],
    match: ["picks", "shovels"],
  },
  {
    slug: "space-race",
    title: "Space Race",
    thesis: "The companies building the rockets, satellites and networks of the new space economy.",
    imageUrl: "/brand/covers/space-race.webp",
    tags: ["space"],
    match: ["space"],
  },
];

async function onchainBaskets(): Promise<Array<{ vault: Address; name: string }>> {
  const dep = getDeployment(CHAIN_ID)!;
  const client = toChainClient(
    createPublicClients({ RPC_URL_BASE_SEPOLIA: process.env.RPC_URL_BASE_SEPOLIA || undefined } as never)[CHAIN_ID],
  );
  const factory = getAddress(dep.contracts.factory);
  const n = await read<bigint>(client, factory, basketFactoryAbi, "basketCount");
  const vaults = await Promise.all(
    Array.from({ length: Number(n) }, (_, i) => read<Address>(client, factory, basketFactoryAbi, "allBaskets", [BigInt(i)])),
  );
  return Promise.all(vaults.map(async (vault) => ({ vault, name: await read<string>(client, vault, basketAbi, "name") })));
}

async function mongoReachable(uri: string | undefined): Promise<boolean> {
  if (!uri || !/^mongodb(\+srv)?:\/\//.test(uri)) return false;
  try {
    mongoose.set("sanitizeFilter", true);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000, bufferCommands: false });
    return true;
  } catch (err) {
    // Never print the URI (it carries credentials).
    console.warn(`Mongo not reachable (${err instanceof Error ? err.name : "error"}); falling back to dry-run.`);
    return false;
  }
}

async function main() {
  const forceDry = process.argv.includes("--dry-run");
  const live = await onchainBaskets();
  console.log(`On-chain baskets (${CHAIN_ID}): ${live.map((b) => `${b.name} ${b.vault}`).join("; ") || "none"}`);

  const plan = SEEDS.map((s) => {
    const hit = s.vault
      ? live.find((b) => isAddressEqual(b.vault, s.vault!))
      : live.find((b) => s.match.some((m) => b.name.toLowerCase().includes(m)));
    return { seed: s, vault: hit?.vault ?? null };
  });

  const dry = forceDry || !(await mongoReachable(process.env.MONGO_URI));
  console.log(dry ? "Mode: DRY-RUN (nothing written)" : "Mode: WRITE");

  for (const { seed, vault } of plan) {
    if (!vault) {
      console.log(`- ${seed.slug}: no on-chain basket yet, skipped`);
      continue;
    }
    const doc = { title: seed.title, thesis: seed.thesis, imageUrl: seed.imageUrl, tags: seed.tags, updatedBy: "seed-script" };
    if (dry) {
      console.log(`- ${seed.slug}: would upsert ${vault}`, JSON.stringify(doc));
      continue;
    }
    await BasketMeta.updateOne(
      { chainId: CHAIN_ID, vault: getAddress(vault) },
      { $set: doc, $setOnInsert: { chainId: CHAIN_ID, vault: getAddress(vault) } },
      { upsert: true, runValidators: true },
    );
    console.log(`- ${seed.slug}: upserted ${vault}`);
  }
  if (!dry) await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});

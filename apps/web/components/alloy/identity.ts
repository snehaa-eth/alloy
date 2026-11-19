/**
 * Visual identity derived from a basket: jewel tone, cover image, serial and short code.
 * TOKENS §10.1: tone defaults to a hash of the basket address.
 * TODO(lib): add `tone` and `cover` to `Basket` (creator picks them at create time); until then they are derived here.
 */
import type { Basket } from "@/lib/types";
import { hash32 } from "./guilloche-gen";

export type Tone = "sapp" | "emer" | "burg" | "amb" | "plum";
export const TONES: Tone[] = ["sapp", "emer", "burg", "amb", "plum"];

export const TONE_HEX: Record<Tone, { mid: string; deep: string }> = {
  sapp: { mid: "#3E6FB8", deep: "#10223F" },
  emer: { mid: "#2E8B6A", deep: "#0F2E24" },
  burg: { mid: "#B5304F", deep: "#3A0010" },
  amb: { mid: "#C98A2E", deep: "#3A2A08" },
  plum: { mid: "#8E5BA6", deep: "#2A1433" },
};

const COVERS = ["ai-build-out", "big-tech", "capitol-tech", "picks-shovels", "space-race"] as const;
export type Cover = (typeof COVERS)[number];

const COVER_TONE: Record<Cover, Tone> = {
  "ai-build-out": "sapp",
  "big-tech": "emer",
  "capitol-tech": "burg",
  "picks-shovels": "amb",
  "space-race": "plum",
};

function coverFor(b: Pick<Basket, "address" | "category" | "name">): Cover {
  const n = b.name.toLowerCase();
  if (n.includes("capitol") || b.category === "story") return "capitol-tech";
  if (n.includes("big tech")) return "big-tech";
  if (n.includes("shovel")) return "picks-shovels";
  if (n.includes("space") || n.includes("momentum") || n.includes("conviction") || b.category === "momentum") return "space-race";
  if (n.includes("ai") || b.category === "ai") return "ai-build-out";
  return COVERS[hash32(b.address.toLowerCase()) % COVERS.length];
}

export type BasketIdentity = {
  tone: Tone;
  cover: Cover;
  coverSrc: string;
  coverSrcLg: string;
  /** "No. 1591 · AIB" */
  serial: string;
  /** 3-letter code from the name ("AIB") */
  code: string;
  serialNo: number;
};

export function basketCode(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const code =
    words.length >= 3 ? words.slice(0, 3).map((w) => w[0]) : words.length === 2 ? [words[0][0], words[1][0], words[1][1] ?? ""] : [...(words[0] ?? "ALY").slice(0, 3)];
  return code.join("").toUpperCase();
}

export function basketIdentity(b: Pick<Basket, "address" | "category" | "name">): BasketIdentity {
  const cover = coverFor(b);
  const serialNo = hash32(b.address.toLowerCase()) % 10000;
  const code = basketCode(b.name);
  return {
    tone: COVER_TONE[cover],
    cover,
    coverSrc: `/brand/covers/${cover}-800.webp`,
    coverSrcLg: `/brand/covers/${cover}.webp`,
    serial: `No. ${String(serialNo).padStart(4, "0")} · ${code}`,
    code,
    serialNo,
  };
}

/** Stock monogram colour (TOKENS §10.3 placeholder until real logos land). */
const LOGO_VAR: Record<string, string> = {
  NVDA: "var(--l-nvda)",
  MSFT: "var(--l-msft)",
  GOOGL: "var(--l-googl)",
  AMZN: "var(--l-amzn)",
  META: "var(--l-meta)",
  TSLA: "var(--l-tsla)",
  AAPL: "var(--l-aapl)",
  MSTR: "var(--l-mstr)",
  USDC: "var(--l-usdc)",
};
export function logoColor(ticker: string): string {
  return LOGO_VAR[ticker.toUpperCase()] ?? "var(--s2)";
}

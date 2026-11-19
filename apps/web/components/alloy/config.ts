/**
 * UI config the team swaps without touching lib/.
 * - FEATURED_BASKET: the landing "Featured story" basket. null → first "AI Build-Out" by name, else most followed.
 * - HIDDEN_BASKETS: kept on-chain but hidden from Explore / landing lists (lowercase addresses).
 */
export const FEATURED_BASKET: `0x${string}` | null = "0xA6665F87702Ba1cDeF544E890147B2b5d305Cec3"; // The AI Build-Out · 🚀 Let winners run (cap 60%)

export const HIDDEN_BASKETS: readonly string[] = [
  // Old "The AI Build-Out" (balanced). Replaced by a let-winners-run version.
  "0x708fe03f9829023edf000ff47482d784bed7f9e4",
];

export const isHidden = (address: string) => HIDDEN_BASKETS.includes(address.toLowerCase());

/** Public lists (landing, Explore): no retired, demo or judge baskets. Those stay reachable by link and on /try. */
export const isPublic = (b: { address: string; name: string; demo?: boolean }) => !isHidden(b.address) && !b.demo && !/judge/i.test(b.name);

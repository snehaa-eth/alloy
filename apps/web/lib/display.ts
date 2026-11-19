/**
 * Display-only overrides for basket names (and copy) shown in the app. Nothing on-chain changes:
 * the contract name / API title stays as is; every screen reads the overridden value because it is
 * applied where a Basket object is built (lib/onchain basketFromState, mock fallback).
 */
const NAME_OVERRIDES: Record<string, string> = {
  "big tech, trimmed": "Big Tech, Balanced",
};

/** Words we never show in copy, mapped to plain replacements (case kept for the first letter). */
const COPY_FIXES: [RegExp, string][] = [
  [/\btrimmed back to (the )?recipe\b/gi, "brought back to plan"],
  [/\btrimmed\b/gi, "rebalanced"],
];

export function displayBasketName(name: string): string {
  return NAME_OVERRIDES[name.trim().toLowerCase()] ?? name;
}

export function displayCopy(text: string): string {
  let out = text;
  for (const [re, rep] of COPY_FIXES)
    out = out.replace(re, (m) => (m[0] === m[0].toUpperCase() ? rep[0].toUpperCase() + rep.slice(1) : rep));
  return out;
}

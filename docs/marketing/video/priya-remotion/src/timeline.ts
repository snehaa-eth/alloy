// Locked script: SCRIPTS.md → "Recommended script, on-screen text only (C short cut, 50.0 s)".
// Times in seconds; every hold is exact. Never shorten a hold.
export type Caption = {
  id: string;
  from: number; // s
  to: number; // s
  lines: { text: string; dim?: boolean }[];
  micro?: string[];
};

export const FPS = 30;
export const DURATION_S = 50;

export const CUT = {
  c1: 0,
  c2: 3.5,
  fold: 7.5,
  c3: 8.5,
  c4: 12.5,
  c6: 16.5,
  c7: 23.5,
  c8: 26.5,
  c9: 30.5,
  c11: 34.5,
  c12: 37.5,
  c13: 41.0,
  end: 50.0,
} as const;

export const CAPTIONS: Caption[] = [
  { id: "C1", from: CUT.c1, to: CUT.c2, lines: [{ text: "Priya wants to" }, { text: "invest in AI." }] },
  { id: "C2", from: CUT.c2, to: CUT.fold, lines: [{ text: "But which stocks?" }, { text: "She has no idea.", dim: true }] },
  { id: "C3", from: CUT.c3, to: CUT.c4, lines: [{ text: "On Alloy, she buys" }, { text: "the whole idea." }] },
  { id: "C4", from: CUT.c4, to: CUT.c6, lines: [{ text: "A basket:" }, { text: "5 US stocks," }, { text: "one idea." }] },
  {
    id: "C6",
    from: CUT.c6,
    to: CUT.c7,
    lines: [{ text: "She checks:" }, { text: "did followers" }, { text: "make money too?" }],
    micro: ["Example basket.", "Past results aren't a promise."],
  },
  { id: "C7", from: CUT.c7, to: CUT.c8, lines: [{ text: "She starts" }, { text: "with $5." }] },
  { id: "C8", from: CUT.c8, to: CUT.c9, lines: [{ text: "Weeks later," }, { text: "one stock grows" }, { text: "too big." }] },
  { id: "C9", from: CUT.c9, to: CUT.c11, lines: [{ text: "Alloy trims it back." }, { text: "She does nothing.", dim: true }] },
  { id: "C11", from: CUT.c11, to: CUT.c12, lines: [{ text: "She can sell" }, { text: "anytime." }] },
  { id: "C12", from: CUT.c12, to: CUT.c13, lines: [{ text: "Invest in stories," }, { text: "not symbols." }] },
  {
    id: "C13",
    from: CUT.c13,
    to: CUT.end,
    lines: [{ text: "Follow @alloy_fi" }, { text: "for early access." }],
    micro: ["Tokenized stock exposure, not shares.", "Not available to US persons.", "You can lose money."],
  },
];

// alloy-bar sweeps (big chapter turns) and light sheens (soft turns), in seconds at the cut
export const SWEEPS = [CUT.c2, CUT.c6, CUT.c8, CUT.c11, CUT.c12];
export const SHEENS = [CUT.c4, CUT.c7, CUT.c13];

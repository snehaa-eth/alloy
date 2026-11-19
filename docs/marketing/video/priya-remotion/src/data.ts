// Real data: The AI Build-Out weighted index, Base mainnet Chainlink daily closes, Aug 21 → Nov 18 2026
// (docs/design/cards-data/baskets.json). Used only as engraving texture (no numbers shown).
export const AIB_SERIES = [
  100.0, 99.46, 100.12, 101.74, 103.07, 102.71, 102.25, 101.06, 102.22, 104.08, 104.64, 102.93, 102.21, 101.05, 102.03,
  102.27, 101.48, 101.3, 102.89, 102.72, 105.31, 105.65, 104.61, 104.03, 105.56, 104.92, 105.63, 106.41, 105.78, 107.27,
  108.58, 109.18, 108.65, 107.01, 108.08, 108.3, 108.82, 106.36, 105.8, 103.72, 105.48, 105.0, 105.01, 101.2, 101.07,
  101.48, 102.22, 100.66, 97.7, 96.39, 96.13, 97.9, 99.89, 93.43, 95.54, 95.94, 93.61, 91.63, 93.08, 92.27, 90.09, 89.94,
  88.62,
];

export const norm = (series: number[], n: number) => {
  const lo = Math.min(...series),
    hi = Math.max(...series),
    sp = hi - lo || 1;
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    const t = (k / (n - 1)) * (series.length - 1);
    const i = Math.floor(t),
      f = t - i;
    const v = i + 1 >= series.length ? series[i] : series[i] * (1 - f) + series[i + 1] * f;
    out.push((v - lo) / sp);
  }
  return out;
};

const rets = AIB_SERIES.slice(1).map((v, i) => v / AIB_SERIES[i] - 1);
export const AIB_SEED = {
  petals: 15,
  k2: 6,
  vol: Math.sqrt(rets.reduce((a, r) => a + r * r, 0) / rets.length),
  lines: 19,
  freq: 2 + 35 / 18,
  phase: 1.3,
};

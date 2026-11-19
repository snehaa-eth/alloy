import { interpolate } from "remotion";
import { theme } from "./theme";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
// clamped, eased 0→1 progress between two frames
export const prog = (f: number, a: number, b: number, ease: (t: number) => number = theme.ease.out) =>
  interpolate(f, [a, b], [0, 1], { ...C, easing: ease });
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const easeInOut = theme.ease.inOut;
// deterministic PRNG
export const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

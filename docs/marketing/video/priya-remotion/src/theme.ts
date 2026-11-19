// theme.ts — single source of truth (Alloy TOKENS.md v0.3 + v4 certificate system).
// Never inline a colour, easing or spring config in a component.
import { Easing } from "remotion";

export const theme = {
  colors: {
    bg: "#0A0A0A",
    ink950: "#0F0F10",
    s1: "#141416",
    s2: "#1C1C1F",
    hair: "#26262A",
    divider: "#3A3A40",
    border: "#6B6B70",
    text: "#F2F0ED", // paper
    text2: "#9A9894",
    text3: "#C9C7C3",
    accent: "#C41A42", // burgundy accent — ≤10% of any frame
    brand: "#6D001A",
    gold: "#C9A96E", // ≤3% of any frame, one element max
    gold2: "#E3CC9C",
    gold6: "#A07D3E",
    // jewel tones (deep = cover base, mid = art only)
    sapphireDeep: "#10223F",
    sapphireMid: "#3E6FB8",
    sapphireLo: "#1D3B6E", // engraving shadow line
    sapphireHi: "#A9C3EC", // engraving highlight line
    sapphireInk: "#6E95D2", // engraved type
    emeraldDeep: "#0F2E24",
    emeraldMid: "#2E8B6A",
    plumDeep: "#2A1433",
    plumMid: "#8E5BA6",
    amberDeep: "#3A2A08",
    amberMid: "#C98A2E",
    burgDeep: "#3A0010",
    burgMid: "#B5304F",
    sheen: "rgba(242,240,237,0.28)",
  },
  fonts: {
    display: "Anton", // wordmark + hero figures only
    body: "Inter",
    mono: "JetBrains Mono",
  },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1), // entrances
    inOut: Easing.bezier(0.83, 0, 0.17, 1), // moves, camera
    soft: Easing.bezier(0.45, 0, 0.2, 1), // slow camera drifts
    in: Easing.bezier(0.7, 0, 0.84, 0), // exits only
  },
  spring: {
    snappy: { damping: 14, stiffness: 160, mass: 0.6 },
    smooth: { damping: 20, stiffness: 90, mass: 1 },
    calm: { damping: 200 },
  },
} as const;

// AI Build-Out recipe: band thickness = weight
export const RECIPE = [
  { t: "NVDA", w: 35 },
  { t: "MSFT", w: 25 },
  { t: "GOOGL", w: 20 },
  { t: "AMZN", w: 12 },
  { t: "META", w: 8 },
] as const;

// the five jewel bands used for the metallic "alloy bar" transitions
export const JEWELS = [
  { deep: theme.colors.sapphireDeep, mid: theme.colors.sapphireMid },
  { deep: theme.colors.emeraldDeep, mid: theme.colors.emeraldMid },
  { deep: theme.colors.plumDeep, mid: theme.colors.plumMid },
  { deep: theme.colors.amberDeep, mid: theme.colors.amberMid },
  { deep: theme.colors.burgDeep, mid: theme.colors.burgMid },
] as const;

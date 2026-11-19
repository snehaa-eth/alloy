import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { useLayout } from "../layout";
import { CUT } from "../timeline";

const c = theme.colors;
// Jewel light per chapter (colour comes from content): sapphire → emerald (followers) → plum (weeks) → sapphire.
const KEYS: [number, string, string][] = [
  [CUT.c1, c.sapphireMid, c.plumMid],
  [CUT.c6, c.emeraldMid, c.sapphireMid],
  [CUT.c7, c.sapphireMid, c.amberMid],
  [CUT.c8, c.plumMid, c.sapphireMid],
  [CUT.c11, c.emeraldMid, c.sapphireMid],
  [CUT.c12, c.sapphireMid, c.burgMid],
];
const mix = (a: string, b: string, t: number) => {
  const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t)).join(",")})`;
};

// Layer 1: never flat — two soft jewel lights that drift and change hue with the story.
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const t = frame / fps;
  let i = 0;
  KEYS.forEach((k, j) => {
    if (t >= k[0]) i = j;
  });
  const next = KEYS[Math.min(KEYS.length - 1, i + 1)];
  const blend = i + 1 < KEYS.length ? interpolate(t, [next[0] - 0.6, next[0] + 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const a = mix(KEYS[i][1], next[1], blend);
  const b = mix(KEYS[i][2], next[2], blend);
  const cy = L.zone.top + L.zone.height * 0.45;
  const d1 = Math.sin(frame / 70) * 40,
    d2 = Math.cos(frame / 85) * 50;
  const coverK = interpolate(frame, [0, 12, CUT.c2 * fps - 4, CUT.c2 * fps + 6], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: c.bg, overflow: "hidden" }}>
      {/* the AI Build-Out cover as a dim plate behind the opening chip (real imagery) */}
      {coverK > 0 ? (
        <Img
          src={staticFile("covers/ai-build-out.png")}
          style={{
            position: "absolute",
            left: L.W / 2 - 0.7 * (((L.zone.height + 120) * 16) / 9),
            top: L.zone.top - 60,
            height: L.zone.height + 120,
            width: ((L.zone.height + 120) * 16) / 9,
            objectFit: "cover",
            opacity: 0.42 * coverK,
            scale: String(1.05 + frame * 0.0006),
            maskImage: "radial-gradient(closest-side, #000 40%, transparent 100%)",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: L.W * 0.2 - 700 + d1,
          top: cy - 760,
          width: 1400,
          height: 1400,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${a}, transparent 75%)`,
          opacity: 0.32,
          filter: "blur(30px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: L.W * 0.85 - 600 - d2,
          top: cy - 200,
          width: 1200,
          height: 1200,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${b}, transparent 75%)`,
          opacity: 0.2,
          filter: "blur(40px)",
        }}
      />
      {/* keep the text band calm and dark for contrast */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, transparent ${(L.text.top / L.H) * 100 - 8}%, rgba(10,10,10,0.55) ${(L.text.top / L.H) * 100 + 4}%)` }} />
    </AbsoluteFill>
  );
};

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

// Layers 4–5: grade, grain, vignette. Always on top.
export const Finish: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ backgroundColor: c.sapphireDeep, mixBlendMode: "soft-light", opacity: 0.15 }} />
      <AbsoluteFill
        style={{
          backgroundImage: NOISE,
          backgroundSize: "220px",
          backgroundPosition: `${(frame * 7) % 220}px ${(frame * 13) % 220}px`,
          opacity: 0.06,
          mixBlendMode: "overlay",
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.32) 100%)" }} />
    </AbsoluteFill>
  );
};

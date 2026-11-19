import { Img, staticFile, useCurrentFrame } from "remotion";
import { RECIPE, theme } from "../theme";

// v5 app language: rounded cards, friendly Inter, real imagery (covers, stock logos, initial avatars),
// the alloy bar kept as the signature. Minimal mono.
const c = theme.colors;
export const PHONE_SCALE = 1.12;
export const R = { card: 20, inner: 14, pill: 999 } as const;
export const mono: React.CSSProperties = { fontFamily: theme.fonts.mono, letterSpacing: "0.06em" };
export const inter: React.CSSProperties = { fontFamily: theme.fonts.body };

// Stock marks: simplified monograms in each company's brand colour (24/32 px circles in product).
const LOGOS: Record<string, { bg: string; fg: string; mark: React.ReactNode }> = {
  NVDA: { bg: "#76B900", fg: "#0A0A0A", mark: "N" },
  MSFT: {
    bg: "#F2F0ED",
    fg: "#0A0A0A",
    mark: (
      <svg viewBox="0 0 20 20" width="52%" height="52%">
        <rect x="0" y="0" width="9" height="9" fill="#F25022" />
        <rect x="11" y="0" width="9" height="9" fill="#7FBA00" />
        <rect x="0" y="11" width="9" height="9" fill="#00A4EF" />
        <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
      </svg>
    ),
  },
  GOOGL: { bg: "#F2F0ED", fg: "#4285F4", mark: "G" },
  AMZN: { bg: "#232F3E", fg: "#FF9900", mark: "a" },
  META: { bg: "#0866FF", fg: "#FFFFFF", mark: "M" },
};
export const StockLogo: React.FC<{ t: string; size?: number; ring?: string }> = ({ t, size = 40, ring }) => {
  const l = LOGOS[t] ?? { bg: c.s2, fg: c.text, mark: t[0] };
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: l.bg,
        color: l.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: theme.fonts.body,
        fontWeight: 700,
        fontSize: size * 0.5,
        boxShadow: ring ? `0 0 0 3px ${ring}` : undefined,
        flex: "none",
      }}
    >
      {l.mark}
    </div>
  );
};
export const LogoStack: React.FC<{ size?: number; ring?: string }> = ({ size = 36, ring = c.s1 }) => (
  <div style={{ display: "flex" }}>
    {RECIPE.map((r, i) => (
      <div key={r.t} style={{ marginLeft: i ? -size * 0.22 : 0 }}>
        <StockLogo t={r.t} size={size} ring={ring} />
      </div>
    ))}
  </div>
);

export const Avatar: React.FC<{ letter: string; size?: number; gold?: boolean; tone?: string }> = ({ letter, size = 36, gold, tone = c.plumMid }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: `linear-gradient(135deg, ${tone}, ${c.plumDeep})`,
      color: c.text,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...inter,
      fontWeight: 600,
      fontSize: size * 0.46,
      boxShadow: gold ? `0 0 0 2px ${c.gold}` : undefined,
      flex: "none",
    }}
  >
    {letter}
  </div>
);

// Alloy bar: stacked bands, thickness = weight, sapphire fading by rank, moving metal sheen.
export const AlloyBar: React.FC<{
  height: number;
  weights?: number[];
  grow?: number;
  sheenAt?: number;
  gap?: number;
  radius?: number;
}> = ({ height, weights = RECIPE.map((r) => r.w), grow = 1, sheenAt = 0.4, gap = 1, radius = 6 }) => {
  const tot = weights.reduce((a, b) => a + b, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, height, borderRadius: radius, overflow: "hidden" }}>
      {weights.map((w, k) => {
        const g = Math.min(1, Math.max(0, grow * 1.4 - k * 0.1));
        return (
          <div
            key={k}
            style={{
              flex: w / tot,
              position: "relative",
              width: `${g * 100}%`,
              background: `linear-gradient(180deg, ${c.sapphireHi}, ${c.sapphireMid} 45%, ${c.sapphireLo})`,
              opacity: 1 - (0.55 * k) / Math.max(1, weights.length - 1),
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(90deg, transparent ${(sheenAt - 0.3) * 100}%, ${c.sheen} ${sheenAt * 100}%, transparent ${(sheenAt + 0.25) * 100}%)`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export const Pill: React.FC<{ children: React.ReactNode; tone?: "neutral" | "accent"; size?: number }> = ({ children, tone = "neutral", size = 18 }) => (
  <div
    style={{
      ...inter,
      fontWeight: 600,
      fontSize: size,
      padding: `${size * 0.35}px ${size * 0.8}px`,
      borderRadius: R.pill,
      background: tone === "accent" ? "rgba(196,26,66,0.16)" : "rgba(242,240,237,0.08)",
      color: tone === "accent" ? "#F08AA2" : c.text3,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    }}
  >
    {children}
  </div>
);

// Cover image with a slow Ken Burns (every still moves).
export const Cover: React.FC<{ src: string; height: number; zoom?: number; children?: React.ReactNode; radius?: number }> = ({
  src,
  height,
  zoom = 1.08,
  children,
  radius = 0,
}) => {
  const frame = useCurrentFrame();
  const k = Math.min(1, frame / 150);
  const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  return (
    <div style={{ position: "relative", height, overflow: "hidden", borderRadius: radius }}>
      <Img
        src={staticFile(src)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", scale: String(1 + (zoom - 1) * e), translate: `${-14 * e}px 0px` }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,10,10,0) 35%, rgba(10,10,10,0.85) 100%)" }} />
      {children}
    </div>
  );
};

// v5 basket card (Holding), sized for a phone screen 440 px wide.
export const BasketCard: React.FC<{
  width?: number;
  barGrow?: number;
  sheenAt?: number;
  coverIn?: number;
  coverH?: number;
}> = ({ width = 440, barGrow = 1, sheenAt = 0.4, coverIn = 1, coverH = 230 }) => {
  const s = width / 440;
  return (
    <div style={{ width, background: c.s1, borderRadius: R.card, overflow: "hidden", color: c.text, boxShadow: "0 30px 80px -30px rgba(62,111,184,0.45)" }}>
      <div style={{ opacity: coverIn }}>
        <Cover src="covers/ai-build-out.png" height={coverH * s}>
          <div style={{ position: "absolute", left: 20 * s, bottom: 16 * s, ...inter, fontWeight: 700, fontSize: 32 * s, letterSpacing: "-0.01em" }}>
            The AI Build-Out
          </div>
        </Cover>
      </div>
      <div style={{ padding: `${18 * s}px ${20 * s}px ${20 * s}px` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 * s }}>
          <Avatar letter="K" size={34 * s} gold />
          <span style={{ ...inter, fontWeight: 500, fontSize: 19 * s, color: c.text3 }}>by Kavya</span>
          <div style={{ marginLeft: "auto" }}>
            <LogoStack size={30 * s} />
          </div>
        </div>
        <div style={{ marginTop: 20 * s }}>
          <AlloyBar height={38 * s} grow={barGrow} sheenAt={sheenAt} />
        </div>
        <div
          style={{
            marginTop: 20 * s,
            height: 58 * s,
            background: c.text,
            color: c.bg,
            borderRadius: R.inner,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...inter,
            fontWeight: 600,
            fontSize: 21 * s,
          }}
        >
          Buy
        </div>
      </div>
    </div>
  );
};

// A clean phone silhouette. Children = screen content.
export const Phone: React.FC<{
  width?: number;
  height?: number;
  draw?: number;
  children?: React.ReactNode;
  logo?: boolean;
  logoIn?: number;
}> = ({ width = 520, height = 990, draw = 1, children, logo = true, logoIn = 1 }) => {
  const r = 70;
  const per = 2 * (width + height);
  return (
    <div style={{ position: "relative", width, height }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id="screenG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#121a2b" />
            <stop offset="0.5" stopColor="#0d0f14" />
            <stop offset="1" stopColor="#0b0b0d" />
          </linearGradient>
        </defs>
        <rect x={1} y={1} width={width - 2} height={height - 2} rx={r} fill="url(#screenG)" fillOpacity={Math.min(1, draw * 1.3)} stroke={c.text3} strokeOpacity={0.5} strokeWidth={2.5} strokeDasharray={`${per} ${per}`} strokeDashoffset={per * (1 - draw)} />
        <rect x={10} y={10} width={width - 20} height={height - 20} rx={r - 10} fill="none" stroke={c.text} strokeOpacity={0.1 * draw} strokeWidth={1} />
        <rect x={width - 1} y={210} width={4} height={90} rx={2} fill={c.text3} opacity={0.35 * draw} />
        <rect x={-3} y={190} width={4} height={60} rx={2} fill={c.text3} opacity={0.35 * draw} />
        <rect x={width / 2 - 52} y={28} width={104} height={32} rx={16} fill="#000" opacity={draw} />
      </svg>
      {logo ? (
        <div style={{ position: "absolute", top: 84, left: 40, right: 40, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: logoIn }}>
          <div style={{ fontFamily: theme.fonts.display, fontSize: 38, letterSpacing: "0.02em", color: c.text }}>ALLOY</div>
          <Avatar letter="P" size={40} tone={c.sapphireMid} />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 40, right: 40, top: 150, bottom: 40 }}>{children}</div>
    </div>
  );
};

export const TapRing: React.FC<{ at: number; x: number; y: number; hold?: number }> = ({ at, x, y, hold = 0 }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 22 + hold) return null;
  const k = Math.min(1, t / 16);
  const e = 1 - Math.pow(1 - k, 3);
  const holding = hold > 0 && t < hold;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 40,
        top: y - 40,
        width: 80,
        height: 80,
        borderRadius: "50%",
        background: "rgba(242,240,237,0.12)",
        border: `2px solid ${c.text}`,
        opacity: holding ? 0.75 : 0.75 * (1 - e),
        scale: String(holding ? 0.7 + 0.05 * Math.sin(t / 3) : 0.5 + e * 0.9),
      }}
    />
  );
};

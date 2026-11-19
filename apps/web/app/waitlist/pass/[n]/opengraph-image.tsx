import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Alloy early pass";

const INK = "#F3F1EE";
const COPPER = "#E39B6E";

/** Sora from Google Fonts; falls back to the default font if the fetch fails. */
async function sora(weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Sora:wght@${weight}`, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
    const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const v = Number.parseInt(n, 10);
  const num = Number.isFinite(v) && v > 0 && v < 10_000_000 ? String(v).padStart(4, "0") : "····";
  const [thin, light] = await Promise.all([sora(200), sora(300)]);
  const fonts = [thin && { name: "Sora", data: thin, weight: 200 as const }, light && { name: "Sora", data: light, weight: 300 as const }].filter(Boolean) as {
    name: string;
    data: ArrayBuffer;
    weight: 200 | 300;
  }[];
  const label = { fontSize: 15, letterSpacing: 5, color: "#8a8580", textTransform: "uppercase" as const };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(60% 70% at 50% 45%, rgba(227,155,110,0.16), #000 70%)",
          fontFamily: fonts.length ? "Sora" : undefined,
        }}
      >
        <div
          style={{
            width: 760,
            height: 480,
            display: "flex",
            flexDirection: "column",
            padding: "40px 46px 36px",
            borderRadius: 34,
            border: "1.5px solid rgba(243,241,238,0.18)",
            borderTop: `1.5px solid ${COPPER}`,
            background: "linear-gradient(135deg, #2c2a29 0%, #151413 40%, #211f1e 64%, #0d0c0c 100%)",
            boxShadow: "0 60px 120px -30px rgba(0,0,0,1)",
            color: INK,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9.2" stroke={INK} strokeWidth="1.3" strokeDasharray="20.7 1.6 12.8 1.6 10.1 1.6 7.4 1.6" transform="rotate(-90 12 12)" />
                <circle cx="12" cy="12" r="3.2" fill={COPPER} />
              </svg>
              <span style={{ fontSize: 22, letterSpacing: 11, fontWeight: 300 }}>ALLOY</span>
            </div>
            <span style={label}>Early pass</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
            <span style={{ ...label, fontSize: 14 }}>No.</span>
            <span style={{ fontSize: 172, fontWeight: 200, lineHeight: 1, letterSpacing: -6, color: "#ece8e3" }}>{num}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 28, paddingTop: 22, borderTop: "1px solid rgba(243,241,238,0.12)" }}>
            <span style={{ fontSize: 22, fontWeight: 300, color: "#b9b4ae" }}>Baskets of US stocks, from $5</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: 300 }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: "#0000FF" }} />
              Base
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

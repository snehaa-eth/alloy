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
  const [thin, light] = await Promise.all([sora(300), sora(400)]);
  const fonts = [thin && { name: "Sora", data: thin, weight: 300 as const }, light && { name: "Sora", data: light, weight: 400 as const }].filter(Boolean) as {
    name: string;
    data: ArrayBuffer;
    weight: 300 | 400;
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

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "auto" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ ...label, fontSize: 14 }}>No.</span>
              <span style={{ fontSize: 150, fontWeight: 300, lineHeight: 1, letterSpacing: -6, color: "#ece8e3" }}>{num}</span>
            </div>
            <svg width="190" height="190" viewBox="0 0 120 120" style={{ marginBottom: 6 }}>
              <defs>
                <linearGradient id="st" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#fbf9f6" />
                  <stop offset="0.45" stopColor="#8f8a85" />
                  <stop offset="0.7" stopColor="#e6e2dd" />
                  <stop offset="1" stopColor="#6f6a66" />
                </linearGradient>
                <radialGradient id="cu" cx="0.38" cy="0.32" r="0.8">
                  <stop offset="0" stopColor="#ffd2b3" />
                  <stop offset="0.45" stopColor={COPPER} />
                  <stop offset="1" stopColor="#8a4f2c" />
                </radialGradient>
              </defs>
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(243,241,238,0.08)" strokeWidth="1" />
              <circle cx="60" cy="60" r="44" fill="none" stroke="url(#st)" strokeWidth="7" strokeDasharray="99.5 7.7 61.5 7.7 48.6 7.7 35.6 7.7" transform="rotate(-90 60 60)" />
              <circle cx="60" cy="60" r="15" fill="url(#cu)" />
            </svg>
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

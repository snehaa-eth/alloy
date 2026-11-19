import { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Stage } from "../components/Stage";
import { theme } from "../theme";
import { prog, rng } from "../util";

// C2 · "But which stocks? She has no idea." — a calm, growing cloud of engraved tickers on a search screen.
// Then (7.5–8.5 s, no text) the cloud folds into one line, which becomes the certificate (see S03).
const c = theme.colors;
const TIERS = [
  { names: ["NVDA", "MSFT", "GOOGL", "AMZN", "META"], size: 76, z: 0, color: c.text, op: 0.95 },
  { names: ["TSLA", "AAPL", "AMD", "AVGO", "TSM", "ORCL", "PLTR", "ASML", "ARM"], size: 54, z: -260, color: c.sapphireInk, op: 0.9 },
  { names: ["SMCI", "INTC", "CRM", "MU", "QCOM", "IBM", "SNOW", "NOW", "DELL", "ANET", "MRVL", "ADBE"], size: 40, z: -520, color: c.sapphireInk, op: 0.55 },
];
export const FOLD_AT = 120; // local frame where the fold starts (7.5 s)
// stage y of the certificate centre in S03 (phone top 8, scaled from its top edge)
const FOLD_Y = 8 + (150 + 269) * 1.12;

type Tk = { txt: string; x: number; y: number; size: number; z: number; color: string; op: number; delay: number; tier: number };

export const S02Tickers: React.FC = () => {
  const frame = useCurrentFrame();
  const tks = useMemo(() => {
    const r = rng(2026);
    const boxes: { x: number; y: number; w: number; h: number }[] = [];
    const free = (x: number, y: number, w: number, h: number) =>
      boxes.every((b) => x + w / 2 + 30 < b.x - b.w / 2 || x - w / 2 - 30 > b.x + b.w / 2 || y + h / 2 + 26 < b.y - b.h / 2 || y - h / 2 - 26 > b.y + b.h / 2);
    const out: Tk[] = [];
    // interleave tiers so the list "grows" evenly
    const order: [number, string][] = [];
    const maxLen = Math.max(...TIERS.map((t) => t.names.length));
    for (let i = 0; i < maxLen; i++) TIERS.forEach((t, ti) => t.names[i] && order.push([ti, t.names[i]]));
    const P = 1100,
      OX = 540,
      OY = 520;
    order.forEach(([ti, txt], k) => {
      const t = TIERS[ti];
      // place on SCREEN (non-overlapping, inside safe margins), then invert the CSS perspective
      const zEff = t.z + 90;
      const m = P / (P - zEff);
      const w = txt.length * t.size * 0.62 * m,
        h = t.size * m;
      let x = 540,
        y = 500,
        tries = 0;
      do {
        x = 130 + w / 2 + r() * (820 - w);
        y = 200 + h / 2 + r() * (840 - h);
        tries++;
      } while (!free(x, y, w, h) && tries < 4000);
      boxes.push({ x, y, w, h });
      const x3 = OX + (x - OX) / m,
        y3 = OY + (y - OY) / m;
      out.push({ txt, x: x3, y: y3, size: t.size, z: t.z, color: t.color, op: t.op, delay: 6 + k * 2.6, tier: ti });
    });
    return out;
  }, []);

  const fold = prog(frame, FOLD_AT, FOLD_AT + 15, theme.ease.inOut);
  const flat = prog(frame, FOLD_AT + 8, FOLD_AT + 15, theme.ease.in);
  const gone = prog(frame, FOLD_AT + 13, FOLD_AT + 17, theme.ease.in);
  const typed = "AI stocks";
  const nTyped = Math.floor(prog(frame, 4, 16, theme.ease.out) * typed.length + 0.001);
  const shown = tks.filter((k) => frame >= k.delay).length;
  const results = Math.round(interpolate(shown, [0, tks.length], [0, 412], { extrapolateRight: "clamp" }));
  const searchIn = prog(frame, 0, 10);
  // the whole cloud drifts toward the viewer, decelerating (camera push on a CSS 3D stage)
  const dolly = interpolate(frame, [0, FOLD_AT], [0, 120], { extrapolateRight: "clamp", easing: theme.ease.soft });
  return (
    <AbsoluteFill>
      <Stage focusY={560}>
        <div
          style={{
            position: "absolute",
            left: 110,
            top: 70,
            width: 860,
            height: 76,
            border: `1px solid ${c.divider}`,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "0 24px",
            opacity: searchIn * (1 - fold),
            translate: `0px ${(1 - searchIn) * 12}px`,
            background: "rgba(20,20,22,0.85)",
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={c.text2} strokeWidth="1.75" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span style={{ fontFamily: theme.fonts.body, fontWeight: 500, fontSize: 36, color: c.text }}>
            {typed.slice(0, nTyped)}
            <span style={{ opacity: frame % 16 < 8 && frame < 40 ? 1 : 0, color: c.text2 }}>|</span>
          </span>
          <span style={{ fontFamily: theme.fonts.body, fontWeight: 500, marginLeft: "auto", fontSize: 24, color: c.text2, fontVariantNumeric: "tabular-nums" }}>
            {results} results
          </span>
        </div>
        <div style={{ position: "absolute", inset: 0, perspective: 1100, perspectiveOrigin: "540px 520px" }}>
          {tks.map((k, i) => {
            const lt = frame - k.delay;
            if (lt < 0) return null;
            const a = prog(lt, 0, 12);
            // calm drift, upward, nearer = faster
            const drift = interpolate(frame, [k.delay, FOLD_AT], [0, -26 - (2 - k.tier) * 14], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: theme.ease.soft,
            });
            // fold: everything converges onto one horizontal line at the certificate's centre
            const fx = 540 + (k.x - 540) * 0.35;
            const x = k.x + (fx - k.x) * fold;
            const y = k.y + drift + (FOLD_Y - (k.y + drift)) * fold;
            const z = k.z + dolly + (0 - k.z - dolly) * fold;
            const stripe = Math.max(2, Math.round(k.size / 26));
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  translate: `-50% -50%`,
                  transform: `translateZ(${z}px) scale(${(0.9 + 0.1 * a) * (1 - 0.3 * fold)}, ${(0.9 + 0.1 * a) * (1 - 0.92 * flat)})`,
                  opacity: a * k.op * (1 - gone),
                  fontFamily: theme.fonts.mono,
                  fontWeight: 600,
                  fontSize: k.size,
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                  color: "transparent",
                  backgroundImage: `repeating-linear-gradient(180deg, ${k.color} 0px, ${k.color} ${stripe}px, transparent ${stripe}px, transparent ${stripe * 2 - 0.5}px)`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  filter: `blur(${(1 - a) * 4 + fold * (1 - fold) * 6}px)`,
                }}
              >
                {k.txt}
              </div>
            );
          })}
        </div>
        {/* the fold line: a hot engraved rule where the cloud collapses */}
        <div
          style={{
            position: "absolute",
            left: 540 - 230,
            top: FOLD_Y - 1,
            width: 460,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${c.text} 20%, ${c.gold2} 50%, ${c.text} 80%, transparent)`,
            opacity: prog(frame, FOLD_AT + 10, FOLD_AT + 14) * (1 - prog(frame, FOLD_AT + 18, FOLD_AT + 24)),
            scale: `${prog(frame, FOLD_AT + 8, FOLD_AT + 15, theme.ease.out)} 1`,
            boxShadow: `0 0 24px ${c.sapphireHi}`,
          }}
        />
      </Stage>
    </AbsoluteFill>
  );
};

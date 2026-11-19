import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Stage } from "../components/Stage";
import { AlloyBar, Cover } from "../components/UI";
import { theme } from "../theme";
import { prog, lerp } from "../util";

// C12 · "Alloy. Invest in stories, not symbols." + C13 end card (static).
// The wordmark is engraved line by line (fine horizontal rules clipped to Anton), a sheen crosses it,
// then it settles up into the end-card position and holds still.
const c = theme.colors;

export const S12Wordmark: React.FC<{ endAt: number }> = ({ endAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tilt = prog(frame, 0, 26, theme.ease.out);
  const wipe = prog(frame, 6, 30, theme.ease.inOut);
  const solid = prog(frame, 30, 50, theme.ease.soft);
  const sheen = prog(frame, 1.5 * fps, 2.5 * fps, theme.ease.inOut);
  const bar = prog(frame, 22, 40, theme.ease.out);
  const toEnd = prog(frame, endAt, endAt + 16, theme.ease.inOut);
  const W = 860,
    H = 300;
  const y = lerp(300, 250, toEnd);
  const s = lerp(1, 0.78, toEnd);
  const sx = lerp(-0.4, 1.4, sheen);
  return (
    <AbsoluteFill>
      <Stage>
        <div
          style={{
            position: "absolute",
            left: 540 - W / 2,
            top: y,
            width: W,
            perspective: 1400,
            scale: String(s),
            transformOrigin: "50% 0%",
          }}
        >
          <div style={{ transform: `rotateX(${(1 - tilt) * 18}deg)`, transformOrigin: "50% 100%", opacity: Math.min(1, tilt * 2) }}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
              <defs>
                <pattern id="engr" width="4" height="5" patternUnits="userSpaceOnUse">
                  <rect width="4" height="2.6" fill={c.text} />
                </pattern>
                <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={c.text} />
                  <stop offset="0.55" stopColor={c.sapphireHi} />
                  <stop offset="1" stopColor={c.sapphireMid} />
                </linearGradient>
                <linearGradient id="sheenG" x1="0" y1="0" x2="1" y2="0.3">
                  <stop offset={Math.max(0, sx - 0.12)} stopColor="#fff" stopOpacity="0" />
                  <stop offset={Math.min(1, Math.max(0, sx))} stopColor={c.gold2} stopOpacity="0.85" />
                  <stop offset={Math.min(1, sx + 0.12)} stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <mask id="lines">
                  <rect width={W} height={H} fill="url(#engr)" />
                </mask>
                <clipPath id="wipe">
                  <rect x={0} y={0} width={wipe * W} height={H} />
                </clipPath>
              </defs>
              <g clipPath="url(#wipe)">
                {/* engraved: metal gradient seen only through the line mask; fills in to solid as it settles */}
                <text
                  x={W / 2}
                  y={H - 22}
                  textAnchor="middle"
                  style={{ fontFamily: theme.fonts.display, fontSize: 300, letterSpacing: "0.02em" }}
                  fill="url(#metal)"
                  mask="url(#lines)"
                >
                  ALLOY
                </text>
                <text
                  x={W / 2}
                  y={H - 22}
                  textAnchor="middle"
                  style={{ fontFamily: theme.fonts.display, fontSize: 300, letterSpacing: "0.02em" }}
                  fill={c.text}
                  opacity={solid * 0.92}
                >
                  ALLOY
                </text>
                <text
                  x={W / 2}
                  y={H - 22}
                  textAnchor="middle"
                  style={{ fontFamily: theme.fonts.display, fontSize: 300, letterSpacing: "0.02em" }}
                  fill="url(#sheenG)"
                  opacity={sheen > 0 && sheen < 1 ? 1 : 0}
                >
                  ALLOY
                </text>
              </g>
              {/* hot engraving edge */}
              {wipe > 0 && wipe < 1 ? (
                <rect x={wipe * W - 2} y={10} width={3} height={H - 20} fill={c.gold2} opacity={0.9} style={{ filter: `drop-shadow(0 0 10px ${c.sapphireHi})` }} />
              ) : null}
            </svg>
          </div>
          <div style={{ width: 600, margin: "26px auto 0" }}>
            <AlloyBar height={34} grow={bar} sheenAt={lerp(-0.4, 1.4, sheen)} />
          </div>
        </div>
        {/* end card: the shelf of baskets (real covers), static once settled */}
        <div style={{ position: "absolute", left: 90, right: 90, top: 700, display: "flex", gap: 18 }}>
          {["ai-build-out", "big-tech", "picks-shovels", "space-race"].map((n, i) => {
            const k = prog(frame, endAt + 6 + i * 4, endAt + 22 + i * 4, theme.ease.out);
            return (
              <div
                key={n}
                style={{
                  flex: 1,
                  borderRadius: 18,
                  overflow: "hidden",
                  opacity: k,
                  translate: `0px ${(1 - k) * 24}px`,
                  boxShadow: "0 24px 60px -24px rgba(62,111,184,0.5)",
                }}
              >
                <Cover src={`covers/${n}.png`} height={260} zoom={1.04} />
              </div>
            );
          })}
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

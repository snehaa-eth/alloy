import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Stage } from "../components/Stage";
import { Cover, inter, Pill } from "../components/UI";
import { theme } from "../theme";
import { prog, rng } from "../util";

// C6 · "She checks: did followers make money too?" — two engraved lines draw slowly. No numbers, no axis values.
const c = theme.colors;
const CW = 780,
  CH = 520;

const makeLine = (seed: number, y0: number, y1: number, wob: number) => {
  const r = rng(seed);
  const pts: [number, number][] = [];
  let walk = 0;
  for (let i = 0; i <= 90; i++) {
    const t = i / 90;
    walk = walk * 0.86 + (r() - 0.5) * wob;
    const trend = y0 + (y1 - y0) * (t * 0.85 + 0.15 * t * t);
    pts.push([t * CW, trend + walk + Math.sin(t * 9 + seed) * wob * 0.25]);
  }
  return pts;
};
const toD = (pts: [number, number][]) => "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L");
const lenOf = (pts: [number, number][]) => pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

export const S06Chart: React.FC<{ dur: number; exitAt: number }> = ({ dur, exitAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { fol, cre } = useMemo(() => ({ fol: makeLine(11, 470, 170, 36), cre: makeLine(29, 450, 120, 32) }), []);
  const fl = lenOf(fol);
  const panel = prog(frame, 2, 16, theme.ease.out);
  const draw = prog(frame, 0.45 * fps, 4.6 * fps, theme.ease.soft);
  const tipI = Math.min(fol.length - 1, Math.floor(draw * (fol.length - 1)));
  const tip = fol[tipI];
  const ctip = cre[Math.min(cre.length - 1, Math.floor(draw * (cre.length - 1)))];
  const labF = prog(frame, 0.3 * fps, 0.3 * fps + 10);
  const labC = prog(frame, 0.45 * fps, 0.45 * fps + 10);
  const breathe = Math.sin(frame / 22) * 0.004;
  const exit = prog(frame, exitAt, exitAt + 8, theme.ease.in);
  return (
    <AbsoluteFill>
      <Stage focusY={470}>
        <div
          style={{
            position: "absolute",
            left: 90,
            top: 110,
            width: 900,
            height: 780,
            borderRadius: 28,
            background: "linear-gradient(180deg, rgba(28,30,36,0.92), rgba(18,18,20,0.92))",
            boxShadow: "0 40px 100px -40px rgba(46,139,106,0.35)",
            opacity: panel * (1 - exit),
            translate: `0px ${(1 - panel) * 16 - exit * 10}px`,
            scale: String(0.97 + 0.03 * panel + breathe - exit * 0.03),
          }}
        >
          <div
            style={{
              height: 70,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 28px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden" }}>
                <Cover src="covers/ai-build-out.png" height={52} />
              </div>
              <span style={{ ...inter, fontWeight: 600, fontSize: 28, color: c.text }}>The AI Build-Out</span>
            </div>
            <div style={{ paddingTop: 20 }}>
              <Pill size={18}>Example</Pill>
            </div>
          </div>
          <div style={{ position: "absolute", left: 40, top: 112, display: "flex", gap: 34, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: labF, translate: `0px ${(1 - labF) * 8}px` }}>
              <div style={{ width: 34, height: 5, borderRadius: 3, background: c.text }} />
              <span style={{ ...inter, fontWeight: 600, fontSize: 30, color: c.text }}>Followers</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: labC, translate: `0px ${(1 - labC) * 8}px` }}>
              <svg width="34" height="6"><line x1="1" y1="3" x2="33" y2="3" stroke={c.text2} strokeWidth="3" strokeDasharray="8 6" strokeLinecap="round" /></svg>
              <span style={{ ...inter, fontWeight: 500, fontSize: 30, color: c.text2 }}>Creator</span>
            </div>
          </div>
          <svg width={CW + 40} height={CH + 60} style={{ position: "absolute", left: 40, top: 200, overflow: "visible" }}>
            <defs>
              <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3DBE8B" stopOpacity="0.38" />
                <stop offset="1" stopColor="#3DBE8B" stopOpacity="0" />
              </linearGradient>
              <clipPath id="drawn">
                <rect x={0} y={-40} width={draw * CW} height={CH + 80} />
              </clipPath>
            </defs>
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1={0} x2={CW} y1={40 + i * 140} y2={40 + i * 140} stroke={c.hair} strokeWidth={1} strokeDasharray="2 8" strokeLinecap="round" />
            ))}
            <path d={`${toD(fol)} L${CW},${CH} L0,${CH} Z`} fill="url(#area)" opacity={1} clipPath="url(#drawn)" />
            <path
              d={toD(cre)}
              fill="none"
              stroke={c.text2}
              strokeWidth={3}
              strokeDasharray="10 9"
              clipPath="url(#drawn)"
            />
            <path
              d={toD(fol)}
              fill="none"
              stroke={c.text}
              strokeWidth={4.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={`${fl} ${fl}`}
              strokeDashoffset={fl * (1 - draw)}
            />
            {draw > 0 && draw < 1 ? (
              <>
                <circle cx={tip[0]} cy={tip[1]} r={16} fill="#3DBE8B" opacity={0.3} />
                <circle cx={tip[0]} cy={tip[1]} r={6} fill={c.text} />
                <circle cx={ctip[0]} cy={ctip[1]} r={4} fill={c.text2} />
              </>
            ) : null}
            <line x1={0} x2={CW} y1={CH} y2={CH} stroke={c.border} strokeWidth={1} />
          </svg>
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

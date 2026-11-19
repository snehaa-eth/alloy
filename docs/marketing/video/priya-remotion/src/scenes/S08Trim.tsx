import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeZone, Stage } from "../components/Stage";
import { Bars3D, BAR } from "../three/Bars3D";
import { RECIPE, theme } from "../theme";
import { prog, lerp } from "../util";
import { useLayout } from "../layout";
import { barsCam, BarLabels } from "./S04Bars";
import { inter } from "../components/UI";

// C8 · "Weeks later, one stock grows too big." + C9 · "Alloy trims it back. She does nothing."
// Local frame 0 = 26.5 s; the trim starts at `trimAt` (30.5 s).
const c = theme.colors;

const Flip: React.FC<{ from: string; to: string; at: number }> = ({ from, to, at }) => {
  const frame = useCurrentFrame();
  const k = prog(frame, at, at + 10, theme.ease.inOut);
  const top = k < 0.5;
  return (
    <div style={{ position: "relative", width: 76, height: 92, perspective: 400 }}>
      {[0, 1].map((half) => (
        <div
          key={half}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: half ? 46 : 0,
            height: 46,
            overflow: "hidden",
            background: c.s1,
            border: `1px solid ${c.hair}`,
            borderRadius: half ? "0 0 12px 12px" : "12px 12px 0 0",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: half ? -46 : 0,
              height: 92,
              lineHeight: "92px",
              textAlign: "center",
              fontFamily: theme.fonts.body,
              fontWeight: 700,
              fontSize: 60,
              color: c.text,
            }}
          >
            {half ? (k > 0.5 ? to : from) : k > 0 ? to : from}
          </div>
        </div>
      ))}
      {/* the flap */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: top ? 0 : 46,
          height: 46,
          overflow: "hidden",
          background: c.s2,
          border: `1px solid ${c.hair}`,
          transformOrigin: top ? "50% 100%" : "50% 0%",
          transform: `rotateX(${top ? -k * 180 : (1 - k) * 180}deg)`,
          opacity: k > 0 && k < 1 ? 1 : 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: top ? 0 : -46,
            height: 92,
            lineHeight: "92px",
            textAlign: "center",
            fontFamily: theme.fonts.body,
            fontWeight: 700,
            fontSize: 60,
            color: c.text,
          }}
        >
          {top ? from : to}
        </div>
      </div>
    </div>
  );
};

export const S08Trim: React.FC<{ trimAt: number; dur: number }> = ({ trimAt, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const intro = prog(frame, 0, 14, theme.ease.out);
  const grow = RECIPE.map(() => 1);
  // C8: NVDA runs ahead past the dotted target, the others dim
  const run = prog(frame, 0.9 * fps, 2.7 * fps, theme.ease.inOut);
  const target = prog(frame, 0.55 * fps, 0.9 * fps);
  // C9: eases back; the sliver peels off as flakes
  const back = prog(frame, trimAt + 0.25 * fps, trimAt + 1.35 * fps, theme.ease.inOut);
  const excess = run * (1 - back);
  const flakeT = frame >= trimAt + 0.25 * fps ? (frame - trimAt - 0.25 * fps) / fps : -1;
  const dim = lerp(run, 0, prog(frame, trimAt + 1.2 * fps, trimAt + 1.8 * fps));
  const push = prog(frame, 0, dur, theme.ease.soft);
  const cam = barsCam(L, 0.6 + push * 0.4, 0.6 + push * 0.4, 1);
  const sh = prog(frame, trimAt + 1.4 * fps, trimAt + 2.3 * fps, theme.ease.inOut);
  const sheen = sh > 0 && sh < 1 ? lerp(-3.5, 3.5, sh) : -99;
  const extra = BAR.excessW * excess;
  const receipt = prog(frame, trimAt + 1.55 * fps, trimAt + 1.55 * fps + 10, theme.ease.out);
  const weekK = prog(frame, 0, 10, theme.ease.out);
  return (
    <AbsoluteFill style={{ opacity: intro }}>
      <ThreeZone>
        <Bars3D cam={cam} grow={grow} reveal={1.2} sheen={sheen} excess={excess} dim={dim} target={target} flakeT={flakeT} />
      </ThreeZone>
      <BarLabels cam={cam} grow={grow} extra={extra} dim={dim} alpha={1} />
      <Stage focusY={520}>
        {/* calendar: WEEK 1 → WEEK 6 */}
        <div
          style={{
            position: "absolute",
            left: L.square ? -40 : 110,
            top: L.square ? 770 : 30,
            display: "flex",
            alignItems: "center",
            gap: 18,
            opacity: weekK,
            translate: `0px ${(1 - weekK) * 10}px`,
          }}
        >
          <span style={{ ...inter, fontWeight: 600, fontSize: 30, color: c.text2 }}>Week</span>
          <Flip from="1" to="6" at={0.3 * fps} />
        </div>
        {/* trim receipt (I-05) */}
        <div
          style={{
            position: "absolute",
            left: 110,
            top: 950,
            width: 860,
            opacity: receipt,
            translate: `0px ${(1 - receipt) * 12}px`,
            display: "flex",
            alignItems: "center",
            gap: 22,
            padding: "20px 24px",
            borderRadius: 20,
            background: "rgba(28,28,31,0.92)",
            boxShadow: "0 20px 60px -20px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(196,26,66,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F08AA2" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3" />
              <path d="M8.12 8.12 12 12" />
              <path d="M20 4 8.12 15.88" />
              <circle cx="6" cy="18" r="3" />
              <path d="M14.8 14.8 20 20" />
            </svg>
          </div>
          <span style={{ ...inter, fontWeight: 600, fontSize: 38, color: c.text }}>Reason: NVDA ran ahead.</span>
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

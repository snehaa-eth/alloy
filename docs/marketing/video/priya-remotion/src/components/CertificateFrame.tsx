import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { useLayout } from "../layout";
import { prog } from "../util";

// The persistent motif, kept quiet: one rounded hairline frame that draws on once, and a small serial.
export const CertificateFrame: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const { W, H, O } = L;
  const draw = prog(frame, 0, 0.7 * fps, theme.ease.inOut);
  const per = 2 * (W - 2 * O + H - 2 * O);
  const serialIn = prog(frame, 0.4 * fps, 0.9 * fps);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="frameG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={theme.colors.sapphireHi} stopOpacity="0.35" />
            <stop offset="0.5" stopColor={theme.colors.text} stopOpacity="0.12" />
            <stop offset="1" stopColor={theme.colors.gold2} stopOpacity="0.28" />
          </linearGradient>
        </defs>
        <rect
          x={O}
          y={O}
          width={W - 2 * O}
          height={H - 2 * O}
          rx={34}
          fill="none"
          stroke="url(#frameG)"
          strokeWidth={1.5}
          strokeDasharray={`${per} ${per}`}
          strokeDashoffset={per * (1 - draw)}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: W / 2,
          bottom: O - 9,
          translate: "-50% 0",
          padding: "0 14px",
          background: theme.colors.bg,
          fontFamily: theme.fonts.mono,
          fontSize: L.footSize,
          letterSpacing: "0.18em",
          color: theme.colors.text2,
          opacity: serialIn * 0.8,
        }}
      >
        No. 0001
      </div>
    </AbsoluteFill>
  );
};

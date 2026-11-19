import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { useLayout } from "../layout";
import type { Caption as CaptionT } from "../timeline";

const GLYPHS = "0123456789$§#%&¤+=<>/";
export const EXIT_FRAMES = 5;

// One script card. Arrives by decoding (≤0.4 s from the cut), then holds perfectly still for the whole hold.
// The Sequence that hosts it runs EXIT_FRAMES past the hold, so the exit overlaps the next card's arrival only.
export const Caption: React.FC<{ c: CaptionT; holdFrames: number; startAt?: number; isLast?: boolean }> = ({
  c,
  holdFrames,
  startAt = 4,
  isLast = false,
}) => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const T = L.text;
  const all = c.lines.map((l) => l.text).join("");
  const n = all.length;
  // exit: only after the hold is over
  const ex = isLast
    ? 0
    : interpolate(frame, [holdFrames, holdFrames + EXIT_FRAMES - 1], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: theme.ease.in,
      });
  // entrance: decode + rise + fade (three properties), done 8 frames after startAt
  const enter = interpolate(frame, [startAt, startAt + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: theme.ease.out,
  });
  let ci = 0;
  const lineH = T.size * T.line;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 84,
          top: L.text.top,
          width: T.maxWidth,
          opacity: (0.35 + 0.65 * enter) * (1 - ex),
          translate: `0px ${(1 - enter) * 10 - ex * 10}px`,
          filter: ex > 0 ? `blur(${ex * 6}px)` : undefined,
        }}
      >
        {c.lines.map((ln, li) => (
          <div
            key={li}
            style={{
              fontFamily: theme.fonts.body,
              fontWeight: 600,
              fontSize: T.size,
              lineHeight: `${lineH}px`,
              letterSpacing: "-0.025em",
              color: ln.dim ? theme.colors.text2 : theme.colors.text,
              whiteSpace: "nowrap",
            }}
          >
            {[...ln.text].map((ch) => {
              const i = ci++;
              const appear = startAt + (i / n) * 3;
              const settle = startAt + 2 + (i / n) * 6;
              const visible = frame >= appear;
              const settled = frame >= settle;
              const k = Math.floor(frame / 2) * 7 + i * 13;
              const g = GLYPHS[((k * 2654435761) >>> 0) % GLYPHS.length];
              return (
                <span key={i} style={{ position: "relative", display: "inline-block", whiteSpace: "pre" }}>
                  <span style={{ visibility: settled ? "visible" : "hidden" }}>{ch}</span>
                  {visible && !settled && ch !== " " ? (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 0,
                        textAlign: "center",
                        fontFamily: theme.fonts.mono,
                        fontWeight: 400,
                        color: theme.colors.sapphireHi,
                      }}
                    >
                      {g}
                    </span>
                  ) : null}
                </span>
              );
            })}
          </div>
        ))}
        {c.micro ? (
          <div style={{ marginTop: T.gap }}>
            {c.micro.map((m, mi) => {
              const k = interpolate(frame, [startAt + 3 + mi * 2, startAt + 11 + mi * 2], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: theme.ease.out,
              });
              return (
                <div
                  key={mi}
                  style={{
                    fontFamily: theme.fonts.body,
                    fontWeight: 500,
                    fontSize: T.micro,
                    lineHeight: 1.32,
                    color: theme.colors.text3,
                    opacity: k,
                    translate: `0px ${(1 - k) * 8}px`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {m}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

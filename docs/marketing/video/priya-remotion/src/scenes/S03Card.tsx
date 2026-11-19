import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Stage } from "../components/Stage";
import { BasketCard, Phone, PHONE_SCALE } from "../components/UI";
import { theme } from "../theme";
import { prog, lerp } from "../util";

// Fold (7.5–8.5 s) + C3 · "On Alloy, she buys the whole idea." The folded line opens into the certificate,
// then her phone draws around it with the Alloy wordmark on top.
// Local frame 0 = 7.5 s. Card unfolds 13→30, phone draws 30→50, exit into C4 at 150.
export const S03Card: React.FC<{ exitAt: number }> = ({ exitAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const unfold = prog(frame, 13, 31, theme.ease.out);
  const phone = prog(frame, 28, 52, theme.ease.inOut);
  const logo = prog(frame, 44, 56);
  const engrave = prog(frame, 16, 16 + 1.6 * fps, theme.ease.soft);
  const sheen = prog(frame, 2.6 * fps, 3.6 * fps, theme.ease.inOut);
  const push = prog(frame, 30, exitAt, theme.ease.soft);
  const exit = prog(frame, exitAt, exitAt + 9, theme.ease.in);
  return (
    <AbsoluteFill>
      <Stage focusY={430}>
        <div
          style={{
            position: "absolute",
            left: 280,
            top: 8,
            scale: String(PHONE_SCALE * lerp(1, 1.035, push) * (1 + exit * 0.08)),
            opacity: 1 - exit,
            filter: exit > 0 ? `blur(${exit * 8}px)` : undefined,
            transformOrigin: "260px 0px",
          }}
        >
          <Phone width={520} height={990} draw={phone} logoIn={logo}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                perspective: 1200,
                width: 440,
              }}
            >
              <div
                style={{
                  transformOrigin: "50% 269px",
                  transform: `rotateX(${(1 - unfold) * 88}deg)`,
                  opacity: Math.min(1, unfold * 3),
                }}
              >
                <BasketCard coverH={330} coverIn={0.3 + 0.7 * engrave} sheenAt={lerp(-0.3, 1.4, sheen)} barGrow={prog(frame, 22, 44)} />
              </div>
            </div>
          </Phone>
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

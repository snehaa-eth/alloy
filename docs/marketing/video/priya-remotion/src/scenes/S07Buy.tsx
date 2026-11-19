import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Stage } from "../components/Stage";
import { Cover, inter, Phone, PHONE_SCALE, R as RAD, TapRing } from "../components/UI";
import { theme } from "../theme";
import { prog } from "../util";

// C7 · "She starts with $5." — tap $5, press Buy, a gold check ring (the film's only gold).
const c = theme.colors;
export const BUY = { tap5: 12, press: 36, pressEnd: 52, check: 55 };

export const S07Buy: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = prog(frame, 0, 12, theme.ease.out);
  const sel = prog(frame, BUY.tap5 + 2, BUY.tap5 + 6);
  const amt = frame >= BUY.tap5 + 3 ? "$5" : "$0";
  const amtK = prog(frame, BUY.tap5 + 3, BUY.tap5 + 11, theme.ease.out);
  const fill = prog(frame, BUY.press, BUY.pressEnd, theme.ease.inOut);
  const done = prog(frame, BUY.check, BUY.check + 8, theme.ease.out);
  const ring = prog(frame, BUY.check, BUY.check + 16, theme.ease.inOut);
  const tick = prog(frame, BUY.check + 8, BUY.check + 16, theme.ease.out);
  const R = 92,
    per = 2 * Math.PI * R;
  return (
    <AbsoluteFill>
      <Stage focusY={560}>
        <div
          style={{
            position: "absolute",
            left: 280,
            top: 8,
            opacity: enter,
            translate: `0px ${(1 - enter) * 24}px`,
            scale: String(PHONE_SCALE * (0.97 + 0.03 * enter)),
            transformOrigin: "260px 0px",
          }}
        >
          <Phone width={520} height={990}>
            <div style={{ position: "absolute", inset: 0, opacity: 1 - done * 0.82 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: 14, overflow: "hidden" }}>
                  <Cover src="covers/ai-build-out.png" height={64} />
                </div>
                <span style={{ ...inter, fontWeight: 600, fontSize: 28, color: c.text }}>The AI Build-Out</span>
              </div>
              <div style={{ ...inter, fontWeight: 500, fontSize: 24, color: c.text2, marginTop: 34 }}>You pay</div>
              <div
                style={{
                  fontFamily: theme.fonts.display,
                  fontSize: 210,
                  lineHeight: 1,
                  marginTop: 14,
                  color: frame >= BUY.tap5 + 3 ? c.text : c.divider,
                  translate: `0px ${(1 - amtK) * (frame >= BUY.tap5 + 3 ? 10 : 0)}px`,
                }}
              >
                {amt}
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
                {["$5", "$25", "$100"].map((p, i) => {
                  const on = i === 0 ? sel : 0;
                  return (
                    <div
                      key={p}
                      style={{
                        flex: 1,
                        height: 76,
                        borderRadius: RAD.pill,
                        border: `1.5px solid ${on > 0.5 ? c.text : c.divider}`,
                        background: `rgba(242,240,237,${0.06 + 0.94 * on})`,
                        color: on > 0.5 ? c.bg : c.text,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        ...inter,
                        fontSize: 28,
                        fontWeight: 600,
                        scale: String(i === 0 ? 1 - 0.04 * Math.sin(Math.PI * prog(frame, BUY.tap5, BUY.tap5 + 6)) : 1),
                      }}
                    >
                      {p}
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 580,
                  height: 84,
                  borderRadius: RAD.inner,
                  background: c.text,
                  overflow: "hidden",
                  scale: String(frame >= BUY.press && frame < BUY.pressEnd + 2 ? 0.98 : 1),
                }}
              >
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: c.text3 }} />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...inter,
                    fontWeight: 600,
                    fontSize: 30,
                    color: c.bg,
                  }}
                >
                  Buy $5
                </div>
              </div>
              <TapRing at={BUY.tap5} x={70} y={404} />
              <TapRing at={BUY.press} x={220} y={622} hold={BUY.pressEnd - BUY.press} />
            </div>
            {/* success: gold check ring */}
            <svg
              width={260}
              height={260}
              style={{ position: "absolute", left: 220 - 130, top: 300 - 130, opacity: done, scale: String(0.9 + 0.1 * done) }}
            >
              <circle
                cx={130}
                cy={130}
                r={R}
                fill="none"
                stroke={c.gold}
                strokeWidth={4}
                strokeDasharray={`${per} ${per}`}
                strokeDashoffset={per * (1 - ring)}
                transform="rotate(-90 130 130)"
              />
              <path
                d="M92 132 L120 160 L172 104"
                fill="none"
                stroke={c.text}
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="120 120"
                strokeDashoffset={interpolate(tick, [0, 1], [120, 0])}
              />
            </svg>
          </Phone>
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../components/Stage";
import { AlloyBar, BasketCard, Cover, inter, Phone, PHONE_SCALE } from "../components/UI";
import { theme } from "../theme";
import { prog, lerp } from "../util";

// C11 · "She can sell anytime." — the sell slider runs to the end, then back to the home screen.
const c = theme.colors;
export const SELL = { start: 10, end: 40, home: 52 };

const Row: React.FC<{ name: string; cover: string; weights: number[]; k: number }> = ({ name, cover, weights, k }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "76px 1fr",
      gap: 18,
      alignItems: "center",
      padding: "14px",
      marginBottom: 14,
      borderRadius: 20,
      background: "rgba(28,28,31,0.9)",
      opacity: k,
      translate: `0px ${(1 - k) * 12}px`,
    }}
  >
    <div style={{ width: 76, height: 76, borderRadius: 14, overflow: "hidden" }}>
      <Cover src={cover} height={76} />
    </div>
    <div>
      <div style={{ ...inter, fontWeight: 600, fontSize: 26, color: c.text }}>{name}</div>
      <div style={{ marginTop: 12, width: 270 }}>
        <AlloyBar height={12} weights={weights} gap={0} radius={4} />
      </div>
    </div>
  </div>
);
export const S11Sell: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = prog(frame, 0, 10, theme.ease.out);
  const slide = prog(frame, SELL.start, SELL.end, theme.ease.inOut);
  const sold = prog(frame, SELL.end, SELL.end + 6);
  const home = prog(frame, SELL.home, SELL.home + 14, theme.ease.out);
  const trackW = 440,
    thumb = 84;
  return (
    <AbsoluteFill>
      <Stage focusY={520}>
        <div
          style={{
            position: "absolute",
            left: 280,
            top: 8,
            opacity: enter,
            translate: `0px ${(1 - enter) * 20}px`,
            scale: String(PHONE_SCALE),
            transformOrigin: "260px 0px",
          }}
        >
          <Phone width={520} height={990}>
            {/* holding + slider */}
            <div style={{ position: "absolute", inset: 0, opacity: 1 - home, translate: `${-home * 40}px 0px` }}>
              <BasketCard sheenAt={lerp(-0.3, 1.3, slide)} />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 580,
                  width: trackW,
                  height: thumb,
                  background: "rgba(28,28,31,0.95)",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: thumb + slide * (trackW - thumb), background: "rgba(61,190,139,0.22)", borderRadius: 999 }} />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...inter,
                    fontWeight: 500,
                    fontSize: 26,
                    color: c.text2,
                    opacity: 1 - slide * 1.4,
                  }}
                >
                  Slide to sell
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 6 + slide * (trackW - thumb),
                    top: 6,
                    width: thumb - 12,
                    height: thumb - 12,
                    background: c.text,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={c.bg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {sold > 0.5 ? <path d="M5 12l5 5L20 7" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
                  </svg>
                </div>
              </div>
            </div>
            {/* home */}
            <div style={{ position: "absolute", inset: 0, opacity: home, translate: `${(1 - home) * 40}px 0px` }}>
              <div style={{ ...inter, fontWeight: 700, fontSize: 34, color: c.text, marginBottom: 22 }}>Explore</div>
              <Row name="The AI Build-Out" cover="covers/ai-build-out.png" weights={[35, 25, 20, 12, 8]} k={prog(frame, SELL.home + 4, SELL.home + 16)} />
              <Row name="Big Tech, Trimmed" cover="covers/big-tech.png" weights={[20, 20, 20, 20, 20]} k={prog(frame, SELL.home + 8, SELL.home + 20)} />
              <Row name="Picks & Shovels" cover="covers/picks-shovels.png" weights={[40, 30, 30]} k={prog(frame, SELL.home + 12, SELL.home + 24)} />
              <Row name="Space Race" cover="covers/space-race.png" weights={[30, 30, 25, 15]} k={prog(frame, SELL.home + 16, SELL.home + 28)} />
            </div>
          </Phone>
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

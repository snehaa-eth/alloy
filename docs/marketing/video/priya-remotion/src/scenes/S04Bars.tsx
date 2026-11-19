import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeZone } from "../components/Stage";
import { BAR, Bars3D, barEnd, barY } from "../three/Bars3D";
import { projector, type CamSpec } from "../three/rig";
import { RECIPE, theme } from "../theme";
import { prog, lerp } from "../util";
import { useLayout, type Layout } from "../layout";
import { StockLogo } from "../components/UI";

export const barsCam = (L: Layout, push: number, orbit: number, wide = 0): CamSpec => {
  const dist = (L.square ? lerp(7.8, 7.3, push) : lerp(10.6, 9.9, push)) + wide * 0.9;
  const az = lerp(0.2, 0.08, orbit);
  const el = L.square ? 0.16 : 0.2;
  const tx = (L.square ? -0.3 : -0.5) + wide * 0.45;
  return {
    pos: [tx + Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist],
    target: [tx, -0.02, 0],
    fov: L.square ? 22 : 26,
  };
};

// DOM labels pinned to the bar ends (projected with the same camera, so they stay crisp)
export const BarLabels: React.FC<{
  cam: CamSpec;
  grow: number[];
  extra: number; // extra NVDA weight
  dim: number;
  alpha: number;
}> = ({ cam, grow, extra, dim, alpha }) => {
  const L = useLayout();
  const proj = projector(cam, L.W, L.zone.height);
  const s = L.square ? 0.62 : 1;
  return (
    <div style={{ position: "absolute", left: 0, top: L.zone.top, width: L.W, height: L.zone.height }}>
      {RECIPE.map((r, k) => {
        const w = r.w + (k === 0 ? extra : 0);
        const xEnd = BAR.x0 + (w * BAR.u) * Math.max(0.0001, grow[k]);
        const p = proj(xEnd + 0.1, barY(k), BAR.d / 2);
        const a = alpha * prog(grow[k], 0.6, 1, theme.ease.out);
        return (
          <div
            key={r.t}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              translate: `0px -50%`,
              display: "flex",
              alignItems: "baseline",
              gap: 12 * s,
              opacity: a * (k === 0 ? 1 : 1 - 0.55 * dim),
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ alignSelf: "center" }}>
              <StockLogo t={r.t} size={40 * s} />
            </div>
            <span style={{ fontFamily: theme.fonts.body, fontWeight: 600, fontSize: 32 * s, color: theme.colors.text }}>
              {r.t}
            </span>
            <span style={{ fontFamily: theme.fonts.body, fontWeight: 500, fontSize: 28 * s, color: theme.colors.text2, fontVariantNumeric: "tabular-nums" }}>
              {Math.round(w)}%
            </span>
          </div>
        );
      })}
    </div>
  );
};

// C4 · "A basket: 5 US stocks, one idea." — the certificate's alloy bar opens into five engraved ingots.
export const S04Bars: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const grow = RECIPE.map((_, k) => prog(frame, 4 + k * 4, 26 + k * 4, theme.ease.out));
  const reveal = prog(frame, 2, 2 + 1.5 * fps, theme.ease.soft) * 1.15;
  const push = prog(frame, 0, dur, theme.ease.soft);
  const cam = barsCam(L, push, push);
  const sh = prog(frame, 1.9 * fps, 2.9 * fps, theme.ease.inOut);
  const sheen = sh > 0 && sh < 1 ? lerp(-3.5, 3.5, sh) : -99;
  const labels = interpolate(frame, [18, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: theme.ease.out });
  return (
    <AbsoluteFill>
      <ThreeZone>
        <Bars3D cam={cam} grow={grow} reveal={reveal} sheen={sheen} excess={0} dim={0} target={0} flakeT={-1} />
      </ThreeZone>
      <BarLabels cam={cam} grow={grow} extra={0} dim={0} alpha={labels} />
    </AbsoluteFill>
  );
};

export { barEnd };

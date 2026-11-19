import { useMemo } from "react";
import { AIB_SEED, AIB_SERIES, norm } from "../data";

type Path = { d: string; len: number; o: number; w: number };

// Port of guilloche() in docs/design/cards-data/system_v4.py: wave lattice whose centre line follows the
// REAL price path + epitrochoid rosette (petals = 5 + 2 × stocks) + double hairline frame.
const build = (w: number, h: number, rosette: boolean): Path[] => {
  const s = AIB_SEED;
  const env = norm(AIB_SERIES, 121);
  const P: Path[] = [];
  const amp = 3 + Math.min(6, s.vol * 400);
  const top = 14,
    bot = h - 14;
  const push = (pts: [number, number][], o: number, wdt: number, close = false) => {
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    P.push({ d: "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L") + (close ? "Z" : ""), len, o, w: wdt });
  };
  const latticeW = rosette ? w - 96 : w;
  for (const fam of [1, -1]) {
    for (let i = 0; i < s.lines; i++) {
      const ph = s.phase + (i * Math.PI) / s.lines;
      const pts: [number, number][] = [];
      for (let k = 0; k < 121; k++) {
        const x = 10 + (k / 120) * (latticeW - 20);
        let y = bot - 10 - env[k] * (bot - top - 20) + fam * amp * Math.sin((2 * Math.PI * s.freq * x) / w + ph) + (i - s.lines / 2) * 0.8;
        y = Math.min(bot, Math.max(top, y));
        pts.push([x, y]);
      }
      push(pts, 0.42, 0.5);
    }
  }
  if (rosette) {
    const cx = w - 50,
      cy = h / 2,
      R = 34;
    const p = s.petals;
    for (let j = 0; j < 5; j++) {
      const d = (p + 1) * (0.16 + 0.07 * j),
        rot = (j * Math.PI) / p / 2.5,
        k = p + 1;
      const scale = R / (p + 1 + d);
      const pts: [number, number][] = [];
      for (let q = 0; q <= 720; q++) {
        const t = (q / 720) * 2 * Math.PI;
        const x = (p + 1) * Math.cos(t) - d * Math.cos(k * t),
          y = (p + 1) * Math.sin(t) - d * Math.sin(k * t);
        pts.push([cx + (x * Math.cos(rot) - y * Math.sin(rot)) * scale, cy + (x * Math.sin(rot) + y * Math.cos(rot)) * scale]);
      }
      push(pts, 0.3 + 0.12 * (j % 3), 0.5, true);
    }
    for (let j = 0; j < 3; j++) {
      const m = s.k2 + 3,
        rr = R * (0.28 + 0.08 * j);
      const pts: [number, number][] = [];
      for (let q = 0; q <= 360; q++) {
        const t = (q / 360) * 2 * Math.PI;
        const r = rr * (1 + 0.18 * Math.cos(m * t + j));
        pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
      }
      push(pts, 0.45, 0.5, true);
    }
  }
  return P;
};

// progress 0→1 draws every line on (staggered), like a plate being engraved.
export const Guilloche: React.FC<{
  w: number;
  h: number;
  color: string;
  progress?: number;
  rosette?: boolean;
  frame?: boolean;
  stroke?: number;
  style?: React.CSSProperties;
}> = ({ w, h, color, progress = 1, rosette = true, frame = true, stroke = 1, style }) => {
  const paths = useMemo(() => build(w, h, rosette), [w, h, rosette]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={style}>
      <g fill="none" stroke={color} strokeLinecap="round">
        {paths.map((p, i) => {
          const a = (i / paths.length) * 0.45;
          const k = Math.min(1, Math.max(0, (progress - a) / 0.55));
          const e = 1 - Math.pow(1 - k, 3);
          return (
            <path
              key={i}
              d={p.d}
              strokeWidth={p.w * stroke}
              opacity={p.o}
              strokeDasharray={`${p.len} ${p.len}`}
              strokeDashoffset={p.len * (1 - e)}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {frame ? (
          <g opacity={Math.min(1, progress * 1.5)}>
            <rect x={5} y={5} width={w - 10} height={h - 10} strokeWidth={0.6 * stroke} opacity={0.55} vectorEffect="non-scaling-stroke" />
            <rect x={9} y={9} width={w - 18} height={h - 18} strokeWidth={0.4 * stroke} opacity={0.35} vectorEffect="non-scaling-stroke" />
            {[
              [5, 5],
              [w - 5, 5],
              [5, h - 5],
              [w - 5, h - 5],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={2.5} strokeWidth={0.6 * stroke} opacity={0.6} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        ) : null}
      </g>
    </svg>
  );
};

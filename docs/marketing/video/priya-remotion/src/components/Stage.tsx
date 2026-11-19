import { ThreeCanvas } from "@remotion/three";
import { useLayout } from "../layout";

// Visual zone: content is designed on a 1080 × 1050 stage and scaled into the zone for each aspect.
export const STAGE_W = 1080;
export const STAGE_H = 1050;

// focusY: the stage row kept centred when the zone is shorter than the stage (1:1 crops around it).
export const Stage: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; focusY?: number }> = ({
  children,
  style,
  focusY = 525,
}) => {
  const L = useLayout();
  const s = L.stageScale;
  const top = L.square ? L.zone.height / 2 - focusY * s : (L.zone.height - STAGE_H) / 2;
  const fade = L.square
    ? "linear-gradient(180deg, transparent 0%, #000 7%, #000 90%, transparent 100%)"
    : "linear-gradient(180deg, #000 0%, #000 90%, transparent 100%)";
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: L.zone.top,
        width: L.W,
        height: L.zone.height,
        overflow: "hidden",
        maskImage: fade,
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: (L.W - STAGE_W * s) / 2,
          top,
          width: STAGE_W,
          height: STAGE_H,
          scale: String(s),
          transformOrigin: "0 0",
        }}
      >
        {children}
      </div>
    </div>
  );
};

// 3D content for the visual zone. Rendered at 2× and composited with `screen`, so the black body
// vanishes and only the engraved lines add light over the background (an intaglio print).
export const ThreeZone: React.FC<{ children: React.ReactNode; opacity?: number }> = ({ children, opacity = 1 }) => {
  const L = useLayout();
  return (
    <ThreeCanvas
      width={L.W}
      height={L.zone.height}
      dpr={2}
      linear
      flat
      gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 1)}
      style={{ position: "absolute", left: 0, top: L.zone.top, mixBlendMode: "screen", opacity }}
    >
      {children}
    </ThreeCanvas>
  );
};

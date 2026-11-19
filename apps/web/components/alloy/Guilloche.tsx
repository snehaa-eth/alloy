"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { guillocheShapes, type GuillocheInput } from "./guilloche-gen";
import type { Tone } from "./identity";

type Props = GuillocheInput & {
  tone: Tone;
  /** Initial (SSR) width; re-drawn at the real width on the client so the rosette never stretches. */
  width?: number;
  height?: number;
  rosette?: boolean;
  frame?: boolean;
  detail?: number;
  /** Measure the container and redraw at its true width. */
  fluid?: boolean;
  label?: string;
  className?: string;
};

/** Guilloche engraving drawn from a basket's real value series + recipe. Strokes use currentColor (jewel tone). */
export function Guilloche({
  series,
  weightsBps,
  seed,
  tone,
  width = 358,
  height = 104,
  rosette = true,
  frame = true,
  detail = 1,
  fluid = true,
  label,
  className,
}: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [w, setW] = useState(width);

  useEffect(() => {
    if (!fluid || !ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setW((prev) => (Math.abs(prev - next) > 4 ? next : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fluid]);

  const shapes = useMemo(
    () => guillocheShapes({ series, weightsBps, seed }, { width: w, height, rosette, frame, detail }),
    [series, weightsBps, seed, w, height, rosette, frame, detail],
  );

  return (
    <svg
      ref={ref}
      className={cn("c-guil", `t-${tone}`, className)}
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {shapes.map((s, i) =>
        s.kind === "path" ? (
          <path key={i} d={s.d} strokeWidth={s.strokeWidth} opacity={s.opacity} />
        ) : s.kind === "rect" ? (
          <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} strokeWidth={s.strokeWidth} opacity={s.opacity} />
        ) : (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} strokeWidth={s.strokeWidth} opacity={s.opacity} />
        ),
      )}
    </svg>
  );
}

/** 44px rosette tile used in list rows. */
export function RosetteTile({ series, weightsBps, seed, tone }: GuillocheInput & { tone: Tone }) {
  return (
    <div className="c-mini__art">
      <Guilloche series={series} weightsBps={weightsBps} seed={seed} tone={tone} width={44} height={44} frame={false} detail={0.35} fluid={false} />
    </div>
  );
}

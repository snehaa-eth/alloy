"use client";

/** Pointer parallax for the landing featured card (transform only; off for reduced motion / low power / touch). */
import { m, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { useLowPower } from "./MotionRoot";

export function HeroParallax({ children, depth = 10 }: { children: ReactNode; depth?: number }) {
  const reduced = useReducedMotion();
  const low = useLowPower();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 120, damping: 20 });
  const sy = useSpring(y, { stiffness: 120, damping: 20 });
  const rx = useTransform(sy, (v) => -v / 3);
  const ry = useTransform(sx, (v) => v / 3);
  const off = reduced || low;

  useEffect(() => {
    if (off || !window.matchMedia("(hover: hover)").matches) return;
    const onMove = (e: PointerEvent) => {
      x.set(((e.clientX / window.innerWidth) * 2 - 1) * depth);
      y.set(((e.clientY / window.innerHeight) * 2 - 1) * depth);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [off, depth, x, y]);

  if (off) return <>{children}</>;
  return <m.div style={{ x: sx, y: sy, rotateX: rx, rotateY: ry, transformPerspective: 1200 }}>{children}</m.div>;
}

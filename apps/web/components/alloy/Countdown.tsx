"use client";

import { useEffect, useState } from "react";
import { clock } from "./basket-view";

/** Ticking mono countdown to an exact unix time. Ticks, never pulses. Shows `dueLabel` once due. */
export function Countdown({ to, dueLabel = "due" }: { to: number; dueLabel?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return <span className="t-mono" suppressHydrationWarning>--:--:--</span>;
  const left = to - now;
  return (
    <span className="t-mono" aria-live="off">
      {left > 0 ? clock(left) : dueLabel}
    </span>
  );
}

/** Local-time label for an exact unix time ("Fri 9:45 PM"). Client-only to use the viewer's zone. */
export function LocalTime({ at }: { at: number }) {
  const [label, setLabel] = useState<string>("");
  useEffect(() => {
    setLabel(new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(at * 1000)));
  }, [at]);
  return <span suppressHydrationWarning>{label || "—"}</span>;
}

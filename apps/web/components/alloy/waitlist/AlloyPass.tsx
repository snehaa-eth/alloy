"use client";

/**
 * The waitlist "Alloy pass": a brushed-metal card with the holder's number on it and a live liquid-metal basket
 * (passed in as `art`) sitting on its right edge. Tilts toward the pointer and a light sweep follows it
 * (static under reduced motion). Made to be screenshotted and shared.
 */
import { useRef, type PointerEvent, type ReactNode } from "react";
import { BaseLogo } from "../brand/ChainLogos";
import { RingMark } from "../v5/parts";
import { cn } from "@/lib/utils";

/** "snehagupta98930@gmail.com" → "sneh•••@gmail.com", so a shared screenshot doesn't leak the address. */
export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "";
  return `${user.slice(0, Math.min(4, Math.max(1, user.length - 2)))}•••@${domain}`;
}

/** The basket ring (40/25/20/15) as a stamped metal seal: crisp vector, brushed-steel stroke, copper core. */
function PassSeal() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full">
      <defs>
        <linearGradient id="pass-steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbf9f6" />
          <stop offset="0.45" stopColor="#8f8a85" />
          <stop offset="0.7" stopColor="#e6e2dd" />
          <stop offset="1" stopColor="#6f6a66" />
        </linearGradient>
        <radialGradient id="pass-copper" cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#ffd2b3" />
          <stop offset="0.45" stopColor="#E39B6E" />
          <stop offset="1" stopColor="#8a4f2c" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(243,241,238,0.08)" strokeWidth="1" />
      <circle
        cx="60"
        cy="60"
        r="44"
        fill="none"
        stroke="url(#pass-steel)"
        strokeWidth="7"
        strokeDasharray="99.5 7.7 61.5 7.7 48.6 7.7 35.6 7.7"
        transform="rotate(-90 60 60)"
      />
      <circle cx="60" cy="60" r="15" fill="url(#pass-copper)" />
      <circle cx="60" cy="60" r="15" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.75" />
    </svg>
  );
}

export function AlloyPass({ position, holder, art, className }: { position: number | null; holder: string; art?: ReactNode; className?: string }) {
  const card = useRef<HTMLDivElement>(null);
  const num = position ? String(position).padStart(4, "0") : "····";
  const month = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();

  function move(e: PointerEvent<HTMLDivElement>) {
    const el = card.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.dataset.tilt = "1";
    el.style.setProperty("--rx", `${(0.5 - y) * 8}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 12}deg`);
    el.style.setProperty("--lx", `${x * 100}%`);
    el.style.setProperty("--ly", `${y * 100}%`);
  }
  function leave() {
    const el = card.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--lx", "30%");
    el.style.setProperty("--ly", "20%");
    window.setTimeout(() => delete el.dataset.tilt, 520); // after it settles flat, drop the 3D layer (sharp text)
  }

  return (
    <div className={cn("wl-pass-stage", className)} onPointerMove={move} onPointerLeave={leave}>
      <div ref={card} className="wl-pass" data-testid="alloy-pass" aria-label={position ? `Alloy early pass number ${position}` : "Alloy early pass"} role="img">
        <div className="wl-pass__sheen" aria-hidden />
        <div className="wl-pass__art" aria-hidden>
          {art ?? <PassSeal />}
        </div>
        <div className="relative flex items-center justify-between">
          <span className="flex items-center gap-2.5 text-[12.5px] font-medium tracking-[0.42em] text-ink antialiased">
            <RingMark size={20} />
            ALLOY
          </span>
          <span className="wl-pass__pill">Early pass</span>
        </div>

        <div className="relative mt-auto">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.28em] text-dim">No.</div>
          <div className="wl-pass__num font-display leading-none">{num}</div>
        </div>

        <div className="relative mt-4 flex items-end justify-between gap-4 border-t border-dashed border-[rgba(243,241,238,0.14)] pt-3.5">
          <div className="min-w-0">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-dim">Holder</div>
            <div className="mt-1 truncate font-mono text-[12.5px] text-ink">{holder || "Early member"}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-dim">Issued</div>
            <div className="mt-1 flex items-center justify-end gap-1.5 font-mono text-[12.5px] text-ink">
              {month}
              <span className="text-dim">·</span>
              <BaseLogo size="xs" className="rounded-[2px]" />
              Base
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * The waitlist "Alloy pass": a brushed-metal card with the holder's number engraved on it. Tilts toward the
 * pointer and a light sweep follows it (static under reduced motion). Made to be screenshotted and shared.
 */
import { useRef, type PointerEvent } from "react";
import { BaseLogo } from "../brand/ChainLogos";
import { RingMark } from "../v5/parts";
import { cn } from "@/lib/utils";

/** "snehagupta98930@gmail.com" → "sneh•••@gmail.com", so a shared screenshot doesn't leak the address. */
export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "";
  return `${user.slice(0, Math.min(4, Math.max(1, user.length - 2)))}•••@${domain}`;
}

export function AlloyPass({ position, holder, className }: { position: number | null; holder: string; className?: string }) {
  const card = useRef<HTMLDivElement>(null);
  const num = position ? String(position).padStart(4, "0") : "····";
  const month = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();

  function move(e: PointerEvent<HTMLDivElement>) {
    const el = card.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
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
  }

  return (
    <div className={cn("wl-pass-stage", className)} onPointerMove={move} onPointerLeave={leave}>
      <div ref={card} className="wl-pass" data-testid="alloy-pass" aria-label={position ? `Alloy early pass number ${position}` : "Alloy early pass"} role="img">
        <div className="wl-pass__sheen" aria-hidden />
        <div className="relative flex items-start justify-between">
          <span className="flex items-center gap-2.5 text-[11px] tracking-[0.46em] text-ink">
            <RingMark size={20} />
            ALLOY
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-mute">Early pass</span>
        </div>

        <div className="relative mt-auto">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.28em] text-dim">No.</div>
          <div className="wl-pass__num font-display font-extralight leading-none tracking-[-0.04em]">{num}</div>
        </div>

        <div className="relative mt-5 flex items-end justify-between gap-4 border-t border-[rgba(243,241,238,0.1)] pt-3.5">
          <div className="min-w-0">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-dim">Holder</div>
            <div className="mt-1 truncate text-[13px] text-ink">{holder || "Early member"}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-dim">Issued</div>
            <div className="mt-1 flex items-center justify-end gap-1.5 text-[13px] text-ink">
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

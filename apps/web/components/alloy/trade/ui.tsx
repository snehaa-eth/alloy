"use client";

/**
 * Trade sheet building blocks (docs/design/artdir/wow/app/buy.html, sell.html):
 * TradeSheet (right-side sheet on desktop, bottom sheet on phones, metal drawn over it via the modal layer),
 * TradePanel (the same frame inline: the sticky desktop buy panel), Chips (sliding highlight), Steps, share marks.
 */
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { MetalLayer, useMetalModal } from "../metal/MetalCanvas";
import { cn } from "@/lib/utils";

type Rect = [number, number, number, number];
const rectOf = (el: HTMLElement | null): Rect | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return [r.left, r.top, r.right, r.bottom];
};

function Head({ eyebrow, title, close }: { eyebrow: string; title: ReactNode; close?: ReactNode }) {
  return (
    <div className="tr-head">
      <div className="min-w-0">
        <div className="tr-eyebrow">{eyebrow}</div>
        <div className="a-h3 truncate">{title}</div>
      </div>
      {close}
    </div>
  );
}

/** Modal sheet: desktop slides in at the right (500px), phones get a bottom sheet. */
export function TradeSheet({
  open,
  onOpenChange,
  eyebrow,
  title,
  children,
  className,
  scrollKey,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  eyebrow: string;
  title: string;
  children: ReactNode;
  className?: string;
  /** changing this scrolls the sheet back to the top (pane changes) */
  scrollKey?: string;
}) {
  const content = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useMetalModal(content, open);
  const clip = useCallback(() => rectOf(scroll.current), []);
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [scrollKey]);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="tr-scrim" />
        <Dialog.Content
          ref={content}
          aria-describedby={undefined}
          className={cn("tr-sheet", className)}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            closeRef.current?.focus({ preventScroll: true });
          }}
        >
          <Dialog.Title className="sr-only">
            {eyebrow} {title}
          </Dialog.Title>
          <Head
            eyebrow={eyebrow}
            title={title}
            close={
              <Dialog.Close ref={closeRef} className="tr-close" aria-label="Close">
                <X size={16} strokeWidth={1.5} />
              </Dialog.Close>
            }
          />
          <div ref={scroll} className="tr-scroll">
            <MetalLayer modal clip={clip}>
              {children}
            </MetalLayer>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** The same frame inline (desktop sticky buy panel). Metal draws under it, so its background stays see-through. */
export function TradePanel({ eyebrow, title, children, id, className, scrollKey }: { eyebrow: string; title: ReactNode; children: ReactNode; id?: string; className?: string; scrollKey?: string }) {
  const scroll = useRef<HTMLDivElement>(null);
  const clip = useCallback(() => rectOf(scroll.current), []);
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [scrollKey]);
  return (
    <section id={id} className={cn("tr-panel", className)} aria-label={`${eyebrow} ${typeof title === "string" ? title : ""}`}>
      <Head eyebrow={eyebrow} title={title} />
      <div ref={scroll} className="tr-scroll">
        <MetalLayer clip={clip}>{children}</MetalLayer>
      </div>
    </section>
  );
}

/** Pill chip group with a sliding cream highlight (designer A.chips). `value` may match none (highlight hides). */
export function Chips<T extends string>({ options, value, onPick, label, disabled }: { options: { v: T; label: string }[]; value: T | null; onPick: (v: T) => void; label: string; disabled?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [hl, setHl] = useState<{ x: number; w: number; on: boolean; inst: boolean }>({ x: 0, w: 0, on: false, inst: true });
  const first = useRef(true);
  const place = useCallback(() => {
    const el = wrap.current;
    if (!el) return;
    const i = options.findIndex((o) => o.v === value);
    const b = i >= 0 ? (el.querySelectorAll("button")[i] as HTMLButtonElement | undefined) : undefined;
    setHl((h) => (b ? { x: b.offsetLeft, w: b.offsetWidth, on: true, inst: first.current } : { ...h, on: false, inst: false }));
    first.current = false;
  }, [options, value]);
  useLayoutEffect(place, [place]);
  useEffect(() => {
    window.addEventListener("resize", place);
    document.fonts?.ready.then(place).catch(() => undefined);
    return () => window.removeEventListener("resize", place);
  }, [place]);
  return (
    <div ref={wrap} className="tr-chips" role="group" aria-label={label}>
      <i className="hl" aria-hidden style={{ width: hl.w, transform: `translateX(${hl.x}px)`, opacity: hl.on ? 1 : 0, transition: hl.inst ? "none" : undefined }} />
      {options.map((o) => (
        <button key={o.v} type="button" aria-pressed={o.v === value} disabled={disabled} onClick={() => onPick(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Three step bars. `at` = lit step; `timed` gives the lit bar a known duration (animation-driven steps). */
export function Steps({ labels, at, timed }: { labels: readonly string[]; at: number; timed?: number }) {
  return (
    <div className="tr-steps" aria-hidden>
      {labels.map((l, i) => (
        <div key={l} className={cn("tr-st", i < at && "done", i === at && "on", i === at && timed && "timed")} style={i === at && timed ? ({ "--d": `${timed}s` } as React.CSSProperties) : undefined}>
          <i>
            <u />
          </i>
          {l}
        </div>
      ))}
    </div>
  );
}

/** Step title + line; the title re-animates when it changes. */
export function Status({ title, line }: { title: string; line: string }) {
  return (
    <div className="tr-status" role="status" aria-live="polite">
      <div key={title} className="tr-disp">
        {title}
      </div>
      <p>{line}</p>
    </div>
  );
}

export function RingMarkSmall() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9.2" stroke="#F3F1EE" strokeOpacity=".9" strokeWidth="1.4" strokeDasharray="20.7 1.6 12.8 1.6 10.1 1.6 7.4 1.6" transform="rotate(-90 12 12)" />
      <circle cx="12" cy="12" r="3.2" fill="#E39B6E" />
    </svg>
  );
}

export function XLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
    </svg>
  );
}

/** usd6 → "$25.00" (always two decimals, for the share and summary lines). */
export function usd(usd6: bigint): string {
  const neg = usd6 < 0n;
  const a = neg ? -usd6 : usd6;
  const cents = a / 10_000n;
  const s = `$${(cents / 100n).toLocaleString("en-US")}.${String(cents % 100n).padStart(2, "0")}`;
  return neg ? `−${s}` : s;
}

/** Split `usd6` by weights (bps) into whole cents; the remainder goes to the largest so rows add up. */
export function splitCents(usd6: bigint, bps: number[]): bigint[] {
  const total = bps.reduce((a, b) => a + b, 0) || 1;
  const cents = usd6 / 10_000n;
  const each = bps.map((b) => (cents * BigInt(b)) / BigInt(total));
  let big = 0;
  bps.forEach((b, i) => (b > bps[big] ? (big = i) : 0));
  if (each.length) each[big] += cents - each.reduce((a, c) => a + c, 0n);
  return each.map((c) => c * 10_000n);
}

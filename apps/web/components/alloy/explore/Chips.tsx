"use client";

/** Pill segmented control with a sliding ink highlight (designer core.css `.chips`). */
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ChipOpt<T extends string> = { v: T; label: string; disabled?: boolean; title?: string };

export function Chips<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  size = "md",
}: {
  options: ChipOpt<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
  size?: "md" | "sm";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hl, setHl] = useState<{ x: number; w: number } | null>(null);
  const key = options.map((o) => o.v).join("|");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const place = () => {
      const b = el.querySelector<HTMLElement>(`[data-v="${CSS.escape(value)}"]`);
      if (b) setHl({ x: b.offsetLeft, w: b.offsetWidth });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value, key]);
  return (
    <div ref={ref} role="radiogroup" aria-label={label} className={cn("a-chips", size === "sm" && "a-chips--sm", className)}>
      {hl && <i className="a-chips__hl" style={{ transform: `translateX(${hl.x - 4}px)`, width: hl.w }} aria-hidden />}
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          data-v={o.v}
          aria-checked={o.v === value}
          disabled={o.disabled}
          title={o.title}
          className={cn(o.v === value && "on")}
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

"use client";

/** Segmented control with a sliding cream indicator (designer .seg). */
import { useLayoutEffect, useRef, useState } from "react";

export function Seg<T extends string>({ options, value, onChange, label, className }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => {
      const on = el.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
      if (on) setInd({ left: on.offsetLeft, width: on.offsetWidth });
    };
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    document.fonts?.ready.then(upd).catch(() => {});
    return () => ro.disconnect();
  }, [value]);
  return (
    <div ref={ref} className={`st-seg ${className ?? ""}`} role="group" aria-label={label}>
      {ind && <i className="ind" style={{ left: ind.left, width: ind.width }} aria-hidden />}
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

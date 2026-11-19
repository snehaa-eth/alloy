"use client";

import type { ReactNode } from "react";
import { Delete, ShieldCheck } from "lucide-react";
import type { TxStep } from "@/lib/tx";
import { cn } from "@/lib/utils";
import { Button, StepList } from "../primitives";

/**
 * One anatomy for every money/percent chip: Inter 600 with tabular figures (never mono), 44px tap
 * target. Selected = brand burgundy outline + tint (the brand touch; filled buttons stay the CTA).
 */
export const CHIP =
  "inline-flex h-11 min-w-[64px] flex-1 items-center justify-center rounded-full border border-white/[0.12] bg-transparent px-4 font-sans text-[15px] font-semibold tabular-nums text-tx transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:border-[var(--acc)] aria-pressed:bg-[var(--tint)]";

/** Amount first: big "$ 25" input (Inter 600, tabular) + $10 · $25 · $100 chips. No keypad, no Max. */
export function AmountField({
  value,
  onChange,
  disabled,
  presets = ["10", "25", "100"],
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  presets?: string[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 border-b border-white/[0.08] pb-3">
        <span className="text-[13px] text-tx2">You pay</span>
        <span className="flex items-baseline gap-0.5">
          <span className="text-[40px] font-semibold leading-none tabular-nums text-tx2">$</span>
          <input
            inputMode="decimal"
            aria-label="Amount in dollars"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, "").slice(0, 9))}
            className="w-full min-w-0 bg-transparent text-[40px] font-semibold leading-none tracking-tight tabular-nums text-tx outline-none"
          />
        </span>
      </label>
      <div className="flex gap-2" role="group" aria-label="Preset amounts">
        {presets.map((p) => (
          <button key={p} type="button" className={CHIP} aria-pressed={value === p} onClick={() => onChange(p)} disabled={disabled}>
            ${p}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Quote rows under the amount: label left, figure right (Inter, tabular). */
export function QuoteRows({ rows, className }: { rows: { k: ReactNode; v: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("flex flex-col gap-2 text-[14px]", className)}>
      {rows.map((r, i) => (
        <div key={i} className="flex items-baseline justify-between gap-3">
          <dt className="text-tx2">{r.k}</dt>
          <dd className="text-right font-medium tabular-nums text-tx">{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Presets $10 · $25 · $100 (no Max) + 44px keypad. Never animates money while deciding. */
export function AmountPad({ value, onChange, presets = [10, 25, 100], showKeys = true }: { value: string; onChange: (v: string) => void; presets?: number[]; showKeys?: boolean }) {
  function press(k: string) {
    if (k === "del") return onChange(value.length <= 1 ? "0" : value.slice(0, -1));
    if (k === ".") return value.includes(".") ? undefined : onChange(value + ".");
    const [, frac] = value.split(".");
    if (frac !== undefined && frac.length >= 2) return;
    const next = value === "0" ? k : value + k;
    if (Number(next) > 1_000_000) return;
    onChange(next);
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2" role="group" aria-label="Preset amounts">
        {presets.map((p) => (
          <button key={p} type="button" className={CHIP} aria-pressed={value === String(p)} onClick={() => onChange(String(p))}>
            ${p}
          </button>
        ))}
      </div>
      {showKeys && (
        <div className="c-keypad" role="group" aria-label="Keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map((k) => (
            <button key={k} type="button" onClick={() => press(k)} aria-label={k === "del" ? "Delete" : k}>
              {k === "del" ? <Delete size={18} strokeWidth={1.75} /> : k}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const ORDER: TxStep[] = ["quote", "approve", "simulate", "write", "confirm", "done"];
const LABEL: Partial<Record<TxStep, string>> = {
  quote: "Quote",
  approve: "Approve exact amount",
  simulate: "Check it will work",
  write: "Confirm",
  confirm: "On Base",
};

/** Step states for a running write (from lib's TxStep). */
export function TxProgress({ step, skip = [] }: { step: TxStep; skip?: TxStep[] }) {
  if (step === "idle" || step === "error" || step === "done") return null;
  const steps = ORDER.filter((s) => s !== "done" && !skip.includes(s));
  const at = ORDER.indexOf(step);
  return (
    <StepList
      steps={steps.map((s) => ({
        label: LABEL[s] ?? s,
        state: ORDER.indexOf(s) < at ? "done" : ORDER.indexOf(s) === at ? "on" : "todo",
      }))}
    />
  );
}

/** One-sentence not-for-US-persons attestation, shown before the first money action. */
export function AttestBlock({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <ShieldCheck size={20} strokeWidth={1.75} className="mt-0.5 flex-none c2" aria-hidden />
        <p className="t-body">I&apos;m not a US person, and this is allowed where I live.</p>
      </div>
      <p className="t-mono c2">Tokenized stock exposure, not shares.</p>
      <Button onClick={onConfirm}>I confirm</Button>
      <button type="button" className="c-link self-center" onClick={onCancel}>
        Not now
      </button>
    </div>
  );
}

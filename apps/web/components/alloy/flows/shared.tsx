"use client";

import { Delete, ShieldCheck } from "lucide-react";
import type { TxStep } from "@/lib/tx";
import { Button, StepList } from "../primitives";

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
      <div className="c-presets" role="group" aria-label="Preset amounts">
        {presets.map((p) => (
          <button key={p} type="button" className="c-preset" aria-pressed={value === String(p)} onClick={() => onChange(String(p))}>
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

/**
 * The certificate (CARDS.md §2). Fixed order:
 * head (serial + stamp) → guilloche from real data + 2px burgundy rule → title → mono label + Anton figure
 * → alloy bar → two-field ledger → one action → foot (link + mono meta).
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Guilloche } from "./Guilloche";
import type { Tone } from "./identity";
import { Figure, Ledger, type LedgerCell } from "./primitives";

export type CertArt = { series: readonly number[]; weightsBps: readonly number[]; seed: string; tone: Tone; label?: string };

type Props = {
  serial: string;
  stamp: ReactNode;
  art?: CertArt;
  watermark?: ReactNode;
  title: ReactNode;
  label?: ReactNode;
  figure?: ReactNode;
  unit?: ReactNode;
  bar?: ReactNode;
  ledger?: [LedgerCell, LedgerCell];
  action?: ReactNode;
  footLink?: ReactNode;
  footMeta?: ReactNode;
  /** Inside sheets: drop the box. */
  flat?: boolean;
  /** Extra content between ledger and action (e.g. presets). */
  children?: ReactNode;
  className?: string;
  as?: "div" | "article";
};

export function Certificate({
  serial,
  stamp,
  art,
  watermark,
  title,
  label,
  figure,
  unit,
  bar,
  ledger,
  action,
  footLink,
  footMeta,
  flat,
  children,
  className,
  as: As = "article",
}: Props) {
  return (
    <As className={cn("c-cert", flat && "c-cert--flat", className)}>
      <div className="c-cert__head">
        <span className="c-cert__serial">{serial}</span>
        {stamp}
      </div>
      {art && (
        <div className="c-cert__art">
          <Guilloche
            series={art.series}
            weightsBps={art.weightsBps}
            seed={art.seed}
            tone={art.tone}
            label={art.label}
          />
          {watermark ? <span className="c-cert__wm">{watermark}</span> : null}
        </div>
      )}
      <div className="c-cert__body">
        <div className="t-body t-strong">{title}</div>
        {figure !== undefined && <Figure label={label} figure={figure} unit={unit} />}
        {bar}
        {ledger && <Ledger cells={ledger} />}
        {children}
        {action}
      </div>
      {(footLink || footMeta) && (
        <div className="c-cert__foot">
          {footLink ?? <span />}
          <span className="t-mono c2">{footMeta}</span>
        </div>
      )}
    </As>
  );
}

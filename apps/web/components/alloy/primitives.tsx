/**
 * Alloy v4 primitives (COMPONENTS.md §v4). One anatomy per element.
 * Server-safe (no hooks) unless noted.
 */
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentType, ReactNode, SVGProps } from "react";
import { AlertTriangle, ArrowRight, Check, Circle, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { STOCK_ICONS } from "@/lib/contracts";
import { logoColor, type Tone } from "./identity";

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }>;

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  loading?: boolean;
  size?: "md" | "sm";
  auto?: boolean;
  icon?: Icon;
};

/** Square-edged 48px button. One primary per surface; the label carries the amount ("Buy $25"). */
export function Button({ variant = "primary", loading, size = "md", auto, icon: I, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn("c-btn", `c-btn--${variant}`, size === "sm" && "c-btn--sm", auto && "c-btn--auto", loading && "is-loading", className)}
    >
      {I && <I size={16} strokeWidth={1.75} aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  auto,
  className,
  children,
}: {
  href: string;
  variant?: "primary" | "secondary";
  auto?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn("c-btn", `c-btn--${variant}`, auto && "c-btn--auto", className)}>
      {children}
    </Link>
  );
}

/** Underlined quiet link with → (certificate foot). */
export function QuietLink({ href, onClick, children, className, external }: { href?: string; onClick?: () => void; children: ReactNode; className?: string; external?: boolean }) {
  const body = (
    <>
      {children} <ArrowRight size={12} strokeWidth={1.75} aria-hidden />
    </>
  );
  if (href && external)
    return (
      <a className={cn("c-link", className)} href={href} target="_blank" rel="noreferrer">
        {body}
      </a>
    );
  if (href)
    return (
      <Link className={cn("c-link", className)} href={href}>
        {body}
      </Link>
    );
  return (
    <button type="button" className={cn("c-link", className)} onClick={onClick}>
      {body}
    </button>
  );
}

export function IconButton({ label, icon: I, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: Icon }) {
  return (
    <button type="button" aria-label={label} className={cn("c-iconbtn", className)} {...rest}>
      <I size={20} strokeWidth={1.75} aria-hidden />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Stamps, badges
// ---------------------------------------------------------------------------

export type StampIntent = "neutral" | "accent" | "warn" | "gold" | "test";

/** Hairline-outlined 22px rectangle, mono uppercase + Lucide icon, no fill. */
export function Stamp({ children, icon: I, intent = "neutral", className }: { children: ReactNode; icon?: Icon; intent?: StampIntent; className?: string }) {
  return (
    <span className={cn("c-stamp", intent !== "neutral" && `c-stamp--${intent}`, className)}>
      {I && <I strokeWidth={1.75} aria-hidden />}
      {children}
    </span>
  );
}

/** Gold badge (Founding / Verified). Rare: one per viewport. */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("c-badge", className)}>{children}</span>;
}

// ---------------------------------------------------------------------------
// Avatars, stock logos
// ---------------------------------------------------------------------------

export function Avatar({ creator, size = "md", seed }: { creator?: boolean; size?: "md" | "lg"; seed?: string }) {
  const hue = seed ? [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 0;
  return (
    <span
      aria-hidden
      className={cn("c-avatar", creator && "c-avatar--creator", size === "lg" && "c-avatar--lg")}
      style={seed ? { filter: `hue-rotate(${hue}deg)` } : undefined}
    />
  );
}

/** Stock logo (Coinbase equity icon from lib/contracts STOCK_ICONS), monogram fallback in its brand colour. */
export function StockLogo({ ticker, size = "md" }: { ticker: string; size?: "md" | "lg" }) {
  const src = STOCK_ICONS[ticker.toUpperCase()];
  if (src)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" aria-hidden className={cn("c-logo bg-s2 object-cover", size === "lg" && "c-logo--lg")} loading="lazy" />
    );
  return (
    <span className={cn("c-logo", size === "lg" && "c-logo--lg")} style={{ background: logoColor(ticker) }} aria-hidden>
      {ticker.slice(0, 1)}
    </span>
  );
}

export function LogoStack({ tickers, max = 5 }: { tickers: string[]; max?: number }) {
  return (
    <span className="c-stack" aria-label={tickers.join(", ")}>
      {tickers.slice(0, max).map((t) => (
        <StockLogo key={t} ticker={t} />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

/** Signed % with arrow, never colour alone: ▲ +3.3% / ▼ −11.4%. */
export function Signed({ bps, className, suffix }: { bps: number; className?: string; suffix?: string }) {
  const up = bps >= 0;
  const abs = Math.abs(bps) / 100;
  return (
    <span className={cn(up ? "up" : "down", "whitespace-nowrap", className)}>
      {up ? "▲ +" : "▼ −"}
      {abs.toFixed(1)}%{suffix ? <span className="c2"> {suffix}</span> : null}
    </span>
  );
}

/** Mono label over an Anton figure + mono unit. The ONE Anton element on a screen. */
export function Figure({ label, figure, unit, className }: { label: ReactNode; figure: ReactNode; unit?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="c-cert__label">{label}</span>
      <div className="c-cert__figure">
        <span className="t-display">{figure}</span>
        {unit ? <span className="t-mono c2">{unit}</span> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

export type LedgerCell = { k: ReactNode; v: ReactNode };

/** Exactly two engraved fields side by side. */
export function Ledger({ cells, className }: { cells: [LedgerCell, LedgerCell]; className?: string }) {
  return (
    <div className={cn("c-ledger", className)}>
      {cells.map((c, i) => (
        <div className="c-ledger__cell" key={i}>
          <span className="c-ledger__k">{c.k}</span>
          <span className="c-ledger__v">{c.v}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alloy bar
// ---------------------------------------------------------------------------

export type RecipePart = { ticker: string; bps: number };

/** Layered recipe bands: thickness = weight, jewel tone fading by rank, metallic sheen. */
export function AlloyBar({
  parts,
  tone,
  size = "md",
  legend = true,
  order,
  label,
}: {
  parts: RecipePart[];
  tone: Tone;
  size?: "sm" | "md" | "lg";
  legend?: boolean;
  /** Fixed band order (tickers) so before → after pairs line up. */
  order?: string[];
  label?: string;
}) {
  const items = order ? order.map((t) => ({ ticker: t, bps: parts.find((p) => p.ticker === t)?.bps ?? 0 })) : [...parts].sort((a, b) => b.bps - a.bps);
  const total = items.reduce((a, p) => a + p.bps, 0) || 1;
  const n = items.length;
  const aria = label ?? `Recipe: ${items.map((p) => `${p.ticker} ${fmtPct(p.bps)}%`).join(", ")}`;
  return (
    <div className="flex flex-col gap-2">
      <div className={cn("c-alloy", `t-${tone}`, size === "lg" && "c-alloy--lg", size === "sm" && "c-alloy--sm")} role="img" aria-label={aria}>
        {items.map((p, k) => (
          <i key={p.ticker} style={{ flexGrow: p.bps / total, flexBasis: 0, opacity: Math.max(0.15, 1 - (0.55 * k) / Math.max(n - 1, 1)) }} />
        ))}
      </div>
      {legend && (
        <div className="c-alloy__legend">
          {items.map((p) => (
            <span key={p.ticker}>
              {p.ticker} {fmtPct(p.bps)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** now → after pair with a diff legend (amendments, receipts). */
export function AlloyBarPair({ before, after, tone }: { before: RecipePart[]; after: RecipePart[]; tone: Tone }) {
  const order = [...before].sort((a, b) => b.bps - a.bps).map((p) => p.ticker);
  for (const p of after) if (!order.includes(p.ticker)) order.push(p.ticker);
  const diff = order
    .map((t) => ({ t, a: before.find((p) => p.ticker === t)?.bps ?? 0, b: after.find((p) => p.ticker === t)?.bps ?? 0 }))
    .filter((d) => d.a !== d.b);
  return (
    <div className="flex flex-col gap-2">
      <div className="c-alloy-pair">
        <AlloyBar parts={before} tone={tone} legend={false} order={order} label="Recipe now" />
        <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
        <AlloyBar parts={after} tone={tone} legend={false} order={order} label="Recipe after" />
      </div>
      <div className="c-alloy__legend">
        {diff.map((d) => (
          <span key={d.t}>
            {d.t} {fmtPct(d.a)}→{fmtPct(d.b)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function fmtPct(bps: number): string {
  const v = bps / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

// ---------------------------------------------------------------------------
// Tabs (underline)
// ---------------------------------------------------------------------------

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="c-tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={t.id === value} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Banner, toast-like inline notes
// ---------------------------------------------------------------------------

export function Banner({ intent = "info", icon: I = Info, children, action }: { intent?: "info" | "notice" | "closed" | "test" | "error"; icon?: Icon; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={cn("c-banner", intent !== "info" && `c-banner--${intent}`)} role={intent === "error" ? "alert" : "status"}>
      <I strokeWidth={1.75} aria-hidden />
      <span className="flex-1">{children}</span>
      {action}
    </div>
  );
}

export function InlineToast({ children, error }: { children: ReactNode; error?: boolean }) {
  return (
    <div className={cn("c-toast", error && "c-toast--error")} role="status">
      {error ? <AlertTriangle size={16} strokeWidth={1.75} aria-hidden /> : <Check size={16} strokeWidth={1.75} aria-hidden />}
      <span>{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("c-skel", className)} style={style} aria-hidden />;
}

/** Icon + one line (≤ 10 words) + one button. */
export function EmptyState({ icon: I, line, action }: { icon: Icon; line: string; action?: ReactNode }) {
  return (
    <div className="c-empty">
      <I strokeWidth={1.75} aria-hidden />
      <p className="t-body c3">{line}</p>
      {action ? <div className="w-full max-w-[280px]">{action}</div> : null}
    </div>
  );
}

/** Icon + "what happened. Nothing spent." + one fix. */
export function ErrorState({ line, action }: { line: string; action?: ReactNode }) {
  return (
    <div className="c-error" role="alert">
      <AlertTriangle strokeWidth={1.75} aria-hidden />
      <p className="t-body c3">{line}</p>
      {action ? <div className="w-full max-w-[280px]">{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  help,
  error,
  children,
  htmlFor,
}: {
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className={cn("c-field", error && "is-error")}>
      <label className="c-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {(error || help) && <span className="c-field__help">{error ?? help}</span>}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="c-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Hr() {
  return <hr className="c-hr" />;
}

/** Section title (Inter, ≤ 4 words) with optional trailing meta. */
export function SectionTitle({ children, meta }: { children: ReactNode; meta?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="t-body t-strong">{children}</h2>
      {meta ? <span className="t-mono c2">{meta}</span> : null}
    </div>
  );
}

export function StepList({ steps }: { steps: { label: string; state: "todo" | "on" | "done" }[] }) {
  return (
    <ol className="c-steps" aria-label="Progress">
      {steps.map((s) => (
        <li key={s.label} className={cn("c-step", s.state === "on" && "is-on", s.state === "done" && "is-done")}>
          {s.state === "done" ? (
            <Check strokeWidth={2} aria-hidden />
          ) : s.state === "on" ? (
            <Loader2 strokeWidth={2} className="animate-spin" aria-hidden />
          ) : (
            <Circle strokeWidth={1.5} aria-hidden />
          )}
          {s.label}
        </li>
      ))}
    </ol>
  );
}

"use client";

/** Shared /waitlist pieces: sign-up (card + bar), facts, price strip, counter, metal vignettes, footer. */
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, AtSign, Check, Mail } from "lucide-react";
import { API_BASE_URL } from "@/lib/api/client";
import { BaseLogo, UsdcLogo, UsdtLogo } from "../brand/ChainLogos";
import { TickerMark } from "../brand/StockMark";
import { MetalBasket, type MetalState } from "../metal/MetalBasket";
import { tintCss } from "../metal/palette";
import type { Recipe } from "../metal/shape";
import { OdometerOnView, WordReveal } from "../motion/alloy-motion";
import { checkInput, joinWaitlist, warmWaitlistApi } from "./api";
import { cn } from "@/lib/utils";

export const X_URL = "https://x.com/alloy_fi";
const SHARE_URL = `https://x.com/intent/post?text=${encodeURIComponent("I'm on the list for @alloy_fi: baskets of US stocks around one idea, from $5.")}&url=${encodeURIComponent("https://crates-ui.vercel.app/waitlist")}`;
export const SUBLINE = "Baskets of US stocks around one idea, from $5, built by creators you follow. Real money on Base is coming. Get in first.";
export const FACTS = ["From $5", "1% a year, nothing else", "Sell anytime"];
/** Show the public counter only once the list is big enough to be a signal, not a weakness. */
const MIN_PUBLIC_COUNT = 100;

/* ------------------------------------------------------------------ small bits */

export function EarlyPill({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <span className="a-eyebrow !text-mute">Early access</span>
      <span className="inline-flex h-7 items-center gap-2 rounded-full border border-line2 px-3 text-[11.5px] font-medium tracking-[0.02em] text-ink">
        <i className="a-test-dot h-1.5 w-1.5 rounded-full bg-ink" aria-hidden />
        Live on Base soon
      </span>
    </div>
  );
}

export function FactChips({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {FACTS.map((c) => (
        <span key={c} className="inline-flex h-8 items-center rounded-full border border-line px-3.5 text-[12.5px] text-ink">
          {c}
        </span>
      ))}
    </div>
  );
}

export function BuiltRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px] text-mute", className)}>
      <span className="inline-flex items-center gap-1.5">
        Built on <BaseLogo size="sm" className="rounded-[3px]" /> <span className="text-ink">Base</span>
      </span>
      <i className="h-3.5 w-px bg-line2" aria-hidden />
      <span className="inline-flex flex-wrap items-center gap-1.5">
        Fund with <UsdcLogo size="sm" /> <span className="text-ink">USDC</span> or <UsdtLogo size="sm" /> <span className="text-ink">USDT</span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ sign-up */

type Done = { position: number | null; already: boolean };

function useJoin() {
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ field: "email" | "handle" | "form"; msg: string } | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  useEffect(() => warmWaitlistApi(), []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const bad = checkInput(email, handle);
    if (bad) return setErr(bad);
    setErr(null);
    setBusy(true);
    const r = await joinWaitlist(email, handle);
    setBusy(false);
    if (r.ok) setDone({ position: r.position, already: r.already });
    else setErr({ field: "form", msg: r.error });
  }
  const onEmail = (v: string) => {
    setEmail(v);
    if (err) setErr(null);
  };
  const onHandle = (v: string) => {
    setHandle(v);
    if (err) setErr(null);
  };
  return { email, handle, onEmail, onHandle, busy, err, done, submit };
}

function Field({ icon, error, className, children }: { icon: ReactNode; error?: boolean; className?: string; children: ReactNode }) {
  return (
    <label className={cn("wl-field", className)} data-error={error ? "true" : undefined}>
      <span className="wl-field__icon" aria-hidden>
        {icon}
      </span>
      {children}
    </label>
  );
}

function Inputs({ j }: { j: ReturnType<typeof useJoin> }) {
  return (
    <>
      <Field icon={<Mail size={16} strokeWidth={1.6} />} error={j.err?.field === "email"} className="wl-grow">
        <input
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@email.com"
          aria-label="Email"
          aria-invalid={j.err?.field === "email" || undefined}
          value={j.email}
          onChange={(e) => j.onEmail(e.target.value)}
        />
      </Field>
      <Field icon={<AtSign size={16} strokeWidth={1.6} />} error={j.err?.field === "handle"} className="wl-grow">
        <input
          type="text"
          name="x"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="your X handle (optional)"
          aria-label="X handle (optional)"
          aria-invalid={j.err?.field === "handle" || undefined}
          value={j.handle}
          onChange={(e) => j.onHandle(e.target.value)}
        />
      </Field>
    </>
  );
}

function JoinButton({ busy, className }: { busy: boolean; className?: string }) {
  return (
    <button type="submit" className={cn("a-btn a-btn--buy a-btn--lg wl-join", className)} disabled={busy} aria-busy={busy || undefined}>
      {busy ? (
        "Joining…"
      ) : (
        <>
          Join the waitlist <ArrowRight size={16} strokeWidth={1.8} aria-hidden />
        </>
      )}
    </button>
  );
}

function Note({ err, className }: { err: { msg: string } | null; className?: string }) {
  return (
    <p className={cn("min-h-[18px] text-[12px]", err ? "text-loss" : "font-mono tracking-[0.01em] text-dim", className)} role={err ? "alert" : undefined} data-testid="join-note">
      {err ? err.msg : "One email when your spot opens. No spam, ever."}
    </p>
  );
}

function Success({ done, center }: { done: Done; center?: boolean }) {
  return (
    <div className={cn("flex flex-col", center ? "items-center text-center" : "items-start")} role="status" aria-live="polite" data-testid="join-success">
      <span className="wl-check flex h-11 w-11 items-center justify-center rounded-full text-ink">
        <Check size={18} strokeWidth={1.75} aria-hidden />
      </span>
      <h2 className="mt-4 font-display text-[26px] font-light tracking-[-0.02em]">{done.already ? "You're already on the list." : "You're on the list."}</h2>
      <p className="mt-1.5 text-[14px] text-mute">
        {done.position ? (
          <>
            You&apos;re <span className="num text-ink">#{done.position.toLocaleString("en-US")}</span> in line. We&apos;ll email you when your spot opens.
          </>
        ) : (
          "We'll email you when your spot opens."
        )}
      </p>
      <div className="mt-5 flex flex-wrap gap-2.5">
        <a href={SHARE_URL} target="_blank" rel="noreferrer" className="a-btn a-btn--line a-btn--sm">
          Share on X
        </a>
        <a href={X_URL} target="_blank" rel="noreferrer" className="a-btn a-btn--sm text-mute hover:text-ink">
          Follow @alloy_fi
        </a>
      </div>
    </div>
  );
}

/** Card: label, two stacked pill fields, full-width Join, note. */
export function JoinCard({ className }: { className?: string }) {
  const j = useJoin();
  return (
    <div className={cn("wl-card w-full", className)} data-testid="join-card">
      {j.done ? (
        <Success done={j.done} />
      ) : (
        <form onSubmit={j.submit} noValidate aria-label="Join the waitlist">
          <div className="text-[11px] font-medium uppercase tracking-[0.3em] text-mute">Get on the list</div>
          <div className="mt-4 flex flex-col gap-2.5">
            <Inputs j={j} />
          </div>
          <JoinButton busy={j.busy} className="mt-3.5 w-full" />
          <Note err={j.err} className="mt-3" />
        </form>
      )}
    </div>
  );
}

/** Single-row glass bar (email | X | Join), stacks on phone. */
export function JoinBar({ className }: { className?: string }) {
  const j = useJoin();
  return (
    <div className={cn("w-full", className)} data-testid="join-card">
      {j.done ? (
        <div className="wl-bar wl-bar--done">
          <Success done={j.done} center />
        </div>
      ) : (
        <form onSubmit={j.submit} noValidate aria-label="Join the waitlist">
          <div className="wl-bar">
            <span className="wl-bar__label">Get on the list</span>
            <Inputs j={j} />
            <JoinButton busy={j.busy} className="shrink-0" />
          </div>
          <Note err={j.err} className="mt-3.5 text-center" />
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ live prices */

type Px = { t: string; price: number };

function usePrices(): Px[] | null {
  const [rows, setRows] = useState<Px[] | null>(null);
  useEffect(() => {
    let off = false;
    fetch(`${API_BASE_URL}/stocks`, { signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data?: { symbol?: string; testnet?: { underlying?: string; price?: number } | null }[] } | null) => {
        if (off || !j?.data) return;
        const seen = new Set<string>();
        const out: Px[] = [];
        for (const s of j.data) {
          const t = s.testnet?.underlying ?? s.symbol?.replace(/^t/, "").replace(/c$/, "");
          const p = s.testnet?.price;
          if (!t || typeof p !== "number" || !(p > 0) || seen.has(t)) continue;
          seen.add(t);
          out.push({ t, price: p });
        }
        setRows(out.length >= 3 ? out : null);
      })
      .catch(() => undefined);
    return () => {
      off = true;
    };
  }, []);
  return rows;
}

/** Marquee of real stock prices (same feeds as the test app). Hidden if the API is unreachable. */
export function PriceStrip({ className }: { className?: string }) {
  const rows = usePrices();
  if (!rows) return null;
  const item = (r: Px, k: string) => (
    <span key={k} className="inline-flex items-center gap-2.5 pr-10">
      <TickerMark ticker={r.t} px={20} tint={tintCss(r.t)} />
      <b className="font-medium tracking-[0.08em] text-ink">{r.t}</b>
      <span className="num text-mute">${r.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </span>
  );
  return (
    <div className={cn("wl-strip relative flex items-center overflow-hidden border-y border-line text-[13px]", className)} aria-label="Live stock prices">
      <span className="wl-strip__tag">
        <i className="a-test-dot h-1.5 w-1.5 rounded-full bg-ink" aria-hidden /> Live prices
      </span>
      <div className="wl-strip__track" aria-hidden>
        <div className="wl-strip__run">{rows.map((r) => item(r, "a" + r.t))}</div>
        <div className="wl-strip__run">{rows.map((r) => item(r, "b" + r.t))}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ counter */

export function useWaitlistCount(): number | null {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let off = false;
    fetch(`${API_BASE_URL}/waitlist/count`, { signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data?: { count?: number } } | null) => {
        if (!off && typeof j?.data?.count === "number") setN(j.data.count);
      })
      .catch(() => undefined);
    return () => {
      off = true;
    };
  }, []);
  return n;
}

export function ListCounter({ className }: { className?: string }) {
  const n = useWaitlistCount();
  if (n == null || n < MIN_PUBLIC_COUNT) return null;
  return (
    <div className={cn("flex flex-col items-center text-center", className)} data-testid="list-counter">
      <div className="font-display text-[clamp(56px,9vw,128px)] font-extralight leading-none tracking-[-0.04em]">
        <OdometerOnView value={n.toLocaleString("en-US")} />
      </div>
      <div className="mt-3 text-[11px] uppercase tracking-[0.32em] text-dim">
        people on the list. <span className="text-mute">Get in line.</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ metal vignettes (why cards) */

const rec = (w: [string, number][], seed: string, style: Recipe["style"] = "balanced"): Recipe => ({ weights: w.map(([ticker, x]) => ({ ticker, w: x })), seed, style });

/** Cycles through states / weights on a timer (paused under reduced motion: first value). */
function useCycle<T>(items: T[], ms: number): T {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setI((k) => (k + 1) % items.length), ms);
    return () => window.clearInterval(id);
  }, [items.length, ms]);
  return items[i];
}

/** First baskets: money pours into a basket. */
export function PourVignette({ className }: { className?: string }) {
  const r = useMemo(() => rec([["NVDA", 0.4], ["MSFT", 0.32], ["GOOGL", 0.28]], "first-baskets", "let-winners-run"), []);
  return <MetalBasket recipe={r} state="pour" pourLogo="USDC" zoom={4.2} className={className} />;
}

/** Creator spots: a creator's basket forming from its drops. */
export function FormVignette({ className }: { className?: string }) {
  const r = useMemo(() => rec([["META", 0.36], ["AMZN", 0.34], ["NFLX", 0.3]], "creator-spot", "trend-aware"), []);
  const state = useCycle<MetalState>(["split", "idle", "idle"], 2400);
  return <MetalBasket recipe={r} state={state} zoom={4.4} lean className={className} />;
}

/** Shape what ships: the shape re-forms as the mix changes. */
export function ReshapeVignette({ className }: { className?: string }) {
  const r = useMemo(() => rec([["AAPL", 0.34], ["TSLA", 0.33], ["AMD", 0.33]], "shape-ships"), []);
  const sets = useMemo(() => [[0.34, 0.33, 0.33], [0.6, 0.2, 0.2], [0.2, 0.55, 0.25], [0.25, 0.2, 0.55]], []);
  const w = useCycle(sets, 2600);
  return <MetalBasket recipe={r} state="reshape" weights={w} zoom={4.3} className={className} />;
}

export const WHY: { n: string; t: string; b: string }[] = [
  { n: "01", t: "First baskets", b: "Your spot opens before the doors do. Be in the first baskets the day real money goes live." },
  { n: "02", t: "Early creator spots", b: "Want to build your own? Early names get first pick of creator spots, and creators keep 80% of the fee." },
  { n: "03", t: "Shape what ships", b: "Tell us the ideas you want to own. Early users pick the next baskets and what we build next." },
];
export const VIGNETTES = [PourVignette, FormVignette, ReshapeVignette];

export function WhyHeading({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="a-eyebrow">Why get in line</div>
      <WordReveal as="h2" className="a-h2 mt-[18px] block">
        Early gets <em>more.</em>
      </WordReveal>
    </div>
  );
}

/* ------------------------------------------------------------------ footer */

export function GiantFooter() {
  return (
    <footer className="relative px-[clamp(16px,6vw,96px)] pb-10 pt-[clamp(40px,8vh,90px)]">
      <div aria-hidden className="mr-[-0.32em] select-none text-center font-display text-[clamp(72px,17vw,260px)] font-extralight leading-none tracking-[0.32em]">
        <span className="bg-gradient-to-b from-[rgba(243,241,238,.5)] to-[rgba(243,241,238,0)] to-[88%] bg-clip-text text-transparent">ALLOY</span>
      </div>
      <div className="mx-auto mt-10 flex max-w-[1320px] flex-col justify-between gap-4 border-t border-line pt-[22px] text-[12px] text-dim md:flex-row md:items-center">
        <span className="text-mute">Private preview. Not investment advice.</span>
        <div className="flex flex-wrap items-center gap-[22px]">
          <a href={X_URL} target="_blank" rel="noreferrer" className="no-underline hover:text-ink">
            X @alloy_fi
          </a>
          <span className="inline-flex items-center gap-1.5">
            Built on <BaseLogo size="xs" className="rounded-[2px]" /> Base
          </span>
          <span>© 2026 Alloy</span>
        </div>
      </div>
    </footer>
  );
}

"use client";

/**
 * ONE status strip (UX_MAP §3.2). Priority: recipe change < 24h on a basket you hold → held for you
 * → US market closed → test network. Pages raise signals with <StatusSignal/>; the highest priority wins.
 */
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, FlaskConical, Moon, RefreshCw } from "lucide-react";
import { usMarketStatus } from "@/lib/market";
import { DEFAULT_CHAIN } from "@/lib/chains";

export type Signal =
  | { kind: "change"; text: string; href: string }
  | { kind: "held"; text: string; href: string }
  | { kind: "closed"; text: string };

const PRIORITY: Record<Signal["kind"], number> = { change: 3, held: 2, closed: 1 };

type Ctx = { add: (id: string, s: Signal) => void; remove: (id: string) => void };
const StatusCtx = createContext<Ctx | null>(null);

export function StatusProvider({ children }: { children: ReactNode }) {
  const [signals, setSignals] = useState<Record<string, Signal>>({});
  const add = useCallback((id: string, s: Signal) => setSignals((p) => ({ ...p, [id]: s })), []);
  const remove = useCallback(
    (id: string) =>
      setSignals((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      }),
    [],
  );
  const ctx = useMemo(() => ({ add, remove }), [add, remove]);
  return (
    <StatusCtx.Provider value={ctx}>
      <SignalsView.Provider value={signals}>{children}</SignalsView.Provider>
    </StatusCtx.Provider>
  );
}
const SignalsView = createContext<Record<string, Signal>>({});

/** Raise a status signal while mounted. */
export function StatusSignal({ id, signal }: { id: string; signal: Signal }) {
  const ctx = useContext(StatusCtx);
  const key = JSON.stringify(signal);
  useEffect(() => {
    ctx?.add(id, JSON.parse(key) as Signal);
    return () => ctx?.remove(id);
  }, [ctx, id, key]);
  return null;
}

function useMarket() {
  const [m, setM] = useState<{ open: boolean; label: string } | null>(null);
  useEffect(() => {
    setM(usMarketStatus());
    const t = setInterval(() => setM(usMarketStatus()), 60_000);
    return () => clearInterval(t);
  }, []);
  return m;
}

export function StatusStrip() {
  const signals = useContext(SignalsView);
  const market = useMarket();
  const top = Object.values(signals).sort((a, b) => PRIORITY[b.kind] - PRIORITY[a.kind])[0];
  const isTest = DEFAULT_CHAIN.testnet === true;

  if (top?.kind === "change")
    return (
      <div className="c-strip c-strip--change" role="status">
        <RefreshCw strokeWidth={1.75} aria-hidden />
        <span className="truncate">{top.text}</span>
        <Link className="c-strip__act" href={top.href}>
          See
        </Link>
      </div>
    );
  if (top?.kind === "held")
    return (
      <div className="c-strip c-strip--held" role="status">
        <Download strokeWidth={1.75} aria-hidden />
        <span className="truncate">{top.text}</span>
        <Link className="c-strip__act" href={top.href}>
          Claim
        </Link>
      </div>
    );
  if (top?.kind === "closed" || (market && !market.open))
    return (
      <div className="c-strip c-strip--closed" role="status">
        <Moon strokeWidth={1.75} aria-hidden />
        <span className="truncate">{top?.kind === "closed" ? top.text : "US market closed · buy and sell still work"}</span>
      </div>
    );
  if (isTest)
    return (
      <div className="c-strip c-strip--test" role="status">
        <FlaskConical strokeWidth={1.75} aria-hidden />
        <span className="truncate">Test network · test dollars</span>
        <span className="ml-auto t-mono">{DEFAULT_CHAIN.name}</span>
      </div>
    );
  return null;
}

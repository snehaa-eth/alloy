"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, Compass, PieChart, User, X } from "lucide-react";
import { useWallet } from "@/lib/hooks/use-wallet";
import { StatusProvider, StatusStrip } from "./status";

const TABS = [
  { href: "/", label: "Explore", icon: Compass, match: (p: string) => p === "/" || p.startsWith("/b/") },
  { href: "/portfolio", label: "Portfolio", icon: PieChart, match: (p: string) => p.startsWith("/portfolio") },
  { href: "/activity", label: "Activity", icon: Activity, match: (p: string) => p.startsWith("/activity") },
  { href: "/me", label: "Me", icon: User, match: (p: string) => p.startsWith("/me") || p.startsWith("/create") },
];

/** Full-screen flows hide the nav (create, try). */
const FULLSCREEN = ["/create"];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "/";
  const full = FULLSCREEN.some((p) => path.startsWith(p));
  return (
    <StatusProvider>
      <InAppBar />
      <header className="sticky top-0 z-40 border-b border-bd bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
        <div className="mx-auto flex h-14 max-w-app items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/" className="t-body t-strong tracking-tight no-underline" aria-label="Alloy home">
            Alloy
          </Link>
          <nav className="c-topnav hidden flex-1 items-center md:flex" aria-label="Main">
            {TABS.map((t) => (
              <Link key={t.href} href={t.href} aria-current={t.match(path) ? "page" : undefined}>
                {t.label}
              </Link>
            ))}
          </nav>
          <AccountButton />
        </div>
        <StatusStrip />
      </header>
      <main className={full ? "min-h-[calc(100dvh-56px)]" : "min-h-[calc(100dvh-56px)] pb-24 md:pb-16"}>{children}</main>
      {!full && (
        <nav className="c-nav fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
          {TABS.map((t) => {
            const I = t.icon;
            return (
              <Link key={t.href} href={t.href} aria-current={t.match(path) ? "page" : undefined}>
                <I size={20} strokeWidth={1.75} aria-hidden />
                {t.label}
              </Link>
            );
          })}
        </nav>
      )}
      <footer className="mx-auto hidden max-w-app px-6 pb-8 md:block">
        <p className="t-mono c2">Tokenized stock exposure, not shares. Not for US persons. Not investment advice.</p>
      </footer>
    </StatusProvider>
  );
}

function AccountButton() {
  const w = useWallet();
  if (!w.ready) return <span className="h-9 w-20" aria-hidden />;
  if (!w.authenticated || !w.address)
    return (
      <button type="button" className="c-btn c-btn--secondary c-btn--auto c-btn--sm" onClick={() => w.login()}>
        Sign in
      </button>
    );
  return (
    <Link href="/me" className="t-mono c2 no-underline hover:text-tx" aria-label="Your account">
      {w.address.slice(0, 6)}…{w.address.slice(-4)}
    </Link>
  );
}

/** "Open in browser" bar, only inside X / Instagram / Telegram / Facebook webviews. */
function InAppBar() {
  const [show, setShow] = useState(false);
  const [href, setHref] = useState("");
  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/Twitter|Instagram|FBAN|FBAV|Telegram|Line\/|; wv\)/i.test(ua)) {
      setShow(true);
      setHref(window.location.href);
    }
  }, []);
  if (!show) return null;
  return (
    <div className="c-inapp">
      <button type="button" aria-label="Dismiss" className="c2" onClick={() => setShow(false)}>
        <X size={14} strokeWidth={1.75} />
      </button>
      <span className="truncate">{href.replace(/^https?:\/\//, "").slice(0, 28)}…</span>
      <b>
        <a href={href} target="_blank" rel="noreferrer" className="no-underline">
          Open in browser
        </a>
      </b>
    </div>
  );
}

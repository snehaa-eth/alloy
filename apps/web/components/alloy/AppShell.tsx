"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, Compass, PieChart, User, X } from "lucide-react";
import { useWallet } from "@/lib/hooks/use-wallet";
import { DEFAULT_CHAIN } from "@/lib/chains";
import { StatusProvider, StatusStrip } from "./status";
import { BrandMark, SiteFooter } from "./v5/parts";

const TABS = [
  { href: "/explore", label: "Explore", icon: Compass, match: (p: string) => p.startsWith("/explore") || p.startsWith("/b/") },
  { href: "/portfolio", label: "Portfolio", icon: PieChart, match: (p: string) => p.startsWith("/portfolio") },
  { href: "/activity", label: "Activity", icon: Activity, match: (p: string) => p.startsWith("/activity") },
  { href: "/me", label: "Me", icon: User, match: (p: string) => p.startsWith("/me") || p.startsWith("/create") },
];

/** Full-screen flows hide the nav (create, try). */
const FULLSCREEN = ["/create"];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "/";
  const full = FULLSCREEN.some((p) => path.startsWith(p));
  const landing = path === "/";
  return (
    <StatusProvider>
      <InAppBar />
      <header
        className="sticky top-0 z-40 border-b border-white/[0.07] bg-bg/80 backdrop-blur-xl"
        style={DEFAULT_CHAIN.testnet ? { boxShadow: "inset 0 2px 0 var(--test)" } : undefined}
      >
        <div className="mx-auto flex h-16 max-w-app items-center justify-between gap-6 px-4 md:px-8">
          <Link href="/" className="text-tx no-underline" aria-label="Alloy home">
            <BrandMark />
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Main">
            {TABS.map((t) => {
              const on = t.match(path);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={
                    "rounded-full px-4 py-2 text-[14px] font-medium no-underline transition " +
                    (on ? "bg-white/[0.08] text-tx" : "text-tx2 hover:bg-white/[0.04] hover:text-tx")
                  }
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <span className={landing ? "hidden sm:inline-flex" : "inline-flex"}>
              <AccountButton />
            </span>
            {landing && (
              <Link href="/explore" className="c-btn c-btn--primary c-btn--auto c-btn--sm !h-10 !rounded-full !px-5 !text-[14px]">
                Launch app
              </Link>
            )}
          </div>
        </div>
        {!landing && <StatusStrip />}
      </header>
      <main className={full ? "min-h-[calc(100dvh-64px)]" : landing ? "min-h-[calc(100dvh-64px)]" : "min-h-[calc(100dvh-64px)] pb-24 md:pb-8"}>{children}</main>
      {!full && !landing && (
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
      {!full && (
        <div className={landing ? "" : "hidden md:block"}>
          <SiteFooter />
        </div>
      )}
    </StatusProvider>
  );
}

function AccountButton() {
  const w = useWallet();
  if (!w.ready) return <span className="h-9 w-20" aria-hidden />;
  if (!w.authenticated || !w.address)
    return (
      <button type="button" className="c-btn c-btn--secondary c-btn--auto c-btn--sm !h-10 !rounded-full !px-5 !text-[14px]" onClick={() => w.login()}>
        Sign in
      </button>
    );
  return (
    <Link href="/me" className="t-num rounded-full bg-white/[0.06] px-3 py-2 text-tx3 no-underline hover:text-tx" aria-label="Your account">
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

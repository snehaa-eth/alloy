"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, Compass, PieChart, User, X } from "lucide-react";
import { useWallet } from "@/lib/hooks/use-wallet";
import { DEFAULT_CHAIN } from "@/lib/chains";
import { StatusProvider, StatusStrip } from "./status";
import { BrandMark, SiteFooter } from "./v5/parts";
import { NetworkChip, WalletMenu } from "./NetworkChip";
import { useAccount } from "./hooks";

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
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-app items-center justify-between gap-3 px-4 md:gap-6 md:px-8">
          <Link href="/" className="flex h-9 items-center text-tx no-underline" aria-label="Alloy home">
            <BrandMark />
          </Link>
          <nav className="hidden h-full flex-1 items-center gap-1 md:flex" aria-label="Main">
            {TABS.map((t) => {
              const on = t.match(path);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={
                    "relative flex h-9 items-center rounded-full px-3.5 text-[14px] font-medium no-underline transition-colors " +
                    (on ? "text-tx" : "text-tx2 hover:text-tx")
                  }
                >
                  {t.label}
                  {/* Active: 2px burgundy underline sitting on the header's bottom edge */}
                  {on && <span aria-hidden className="absolute inset-x-3.5 -bottom-[14px] h-[2px] rounded-full" style={{ background: "var(--acc)" }} />}
                </Link>
              );
            })}
          </nav>
          {/* Same actions everywhere: signed out → Sign in; signed in → network + wallet. Home adds Launch app. */}
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <AccountButton />
            {landing && (
              <Link href="/explore" className="c-btn c-btn--primary c-btn--auto c-btn--sm !h-9 flex-none !rounded-full !px-3 !text-[13px] sm:!px-4 sm:!text-[14px]">
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
  const acct = useAccount();
  // Dev-only preview (?preview=holder) renders the signed-in menu without Privy, for review screenshots.
  const signedIn = (address: `0x${string}`) => (
    <>
      <NetworkChip />
      <WalletMenu address={address} />
    </>
  );
  if (acct.preview && !w.address) return signedIn("0xc7000000000000000000000000000000000a1aeb");
  if (!w.ready) return <span className="h-9 w-[76px]" aria-hidden />;
  if (!w.authenticated || !w.address)
    return (
      <button type="button" className="c-btn c-btn--secondary c-btn--auto c-btn--sm !h-9 !rounded-full !px-4 !text-[14px]" onClick={() => w.login()}>
        Sign in
      </button>
    );
  return signedIn(w.address);
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

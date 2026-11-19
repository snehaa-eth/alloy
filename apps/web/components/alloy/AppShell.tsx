"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, Compass, PieChart, User, X } from "lucide-react";
import { useWallet } from "@/lib/hooks/use-wallet";
import { StatusProvider, StatusStrip } from "./status";
import { BrandMark, SiteFooter } from "./v5/parts";
import { MetalCanvasProvider } from "./metal";
import { NetworkChip, WalletMenu } from "./NetworkChip";
import { useAccount } from "./hooks";

const TABS = [
  { href: "/explore", label: "Explore", icon: Compass, match: (p: string) => p.startsWith("/explore") || p.startsWith("/b/") },
  { href: "/portfolio", label: "Portfolio", icon: PieChart, match: (p: string) => p.startsWith("/portfolio") },
  { href: "/activity", label: "Activity", icon: Activity, match: (p: string) => p.startsWith("/activity") },
  { href: "/me", label: "Me", icon: User, match: (p: string) => p.startsWith("/me") || p.startsWith("/create") },
];

/** Desktop nav links (liquid-metal nav: wordmark · Explore / Portfolio / Activity / Create · Test mode · account). */
const LINKS = [
  { href: "/explore", label: "Explore", match: (p: string) => p.startsWith("/explore") || p.startsWith("/b/") },
  { href: "/portfolio", label: "Portfolio", match: (p: string) => p.startsWith("/portfolio") },
  { href: "/activity", label: "Activity", match: (p: string) => p.startsWith("/activity") },
  { href: "/create", label: "Create", match: (p: string) => p.startsWith("/create") || p.startsWith("/me") },
];

/** Nav turns solid once the page scrolls (landing: once the scroll story is over). */
function useSolidNav(landing: boolean) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => {
      const story = landing ? document.getElementById("story") : null;
      setSolid(story ? story.getBoundingClientRect().bottom < window.innerHeight * 0.2 : window.scrollY > 20);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, [landing]);
  return solid;
}

/** Full-screen flows hide the nav (create, try). */
const FULLSCREEN: string[] = []; // /create shows the nav now (creator studio design)

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "/";
  const full = FULLSCREEN.some((p) => path.startsWith(p));
  const landing = path === "/";
  const solid = useSolidNav(landing);
  return (
    <StatusProvider>
      <MetalCanvasProvider>
        <InAppBar />
        <header className="a-nav" data-over={landing ? "true" : undefined} data-solid={solid || !landing ? "true" : "false"}>
          <div className="relative flex h-16 items-center justify-between gap-3 px-[var(--gut)] md:h-[76px]">
            <Link href="/" className="flex h-9 items-center no-underline" aria-label="Alloy home">
              <BrandMark />
            </Link>
            <nav className="a-links absolute left-1/2 hidden -translate-x-1/2 items-center gap-1.5 text-[13.5px] lg:flex" aria-label="Main">
              {LINKS.map((t) => (
                <Link key={t.href} href={t.href} aria-current={t.match(path) ? "page" : undefined}>
                  {t.label}
                </Link>
              ))}
            </nav>
            {/* Same actions on every page and size: Test mode pill + Sign in, or Test mode pill + wallet menu. */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              <AccountButton />
            </div>
          </div>
          {!landing && <StatusStrip />}
        </header>
        <main className={"relative z-[1] " + (full || landing ? "min-h-[calc(100dvh-64px)]" : "min-h-[calc(100dvh-64px)] pb-24 md:pb-8")}>{children}</main>
        {/* Phone tab bar on app pages (not on the landing or full-screen flows). */}
        {!full && !landing && (
          <nav className="c-nav fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
            {TABS.map((t) => {
              const I = t.icon;
              return (
                <Link key={t.href} href={t.href} aria-current={t.match(path) ? "page" : undefined}>
                  <I size={20} strokeWidth={1.5} aria-hidden />
                  {t.label}
                </Link>
              );
            })}
          </nav>
        )}
        {/* The landing draws its own footer. */}
        {!full && !landing && (
          <div className="hidden md:block">
            <SiteFooter />
          </div>
        )}
      </MetalCanvasProvider>
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
  if (!w.ready)
    return (
      <>
        <NetworkChip />
        <span className="h-10 w-[84px]" aria-hidden />
      </>
    );
  if (!w.authenticated || !w.address)
    return (
      <>
        <NetworkChip />
        <button type="button" className="a-btn a-btn--line a-btn--nav" onClick={() => w.login()}>
          Sign in
        </button>
      </>
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

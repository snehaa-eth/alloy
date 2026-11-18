"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { MobileMenu } from "@/components/mobile-menu";
import { DEFAULT_CHAIN } from "@/lib/chains";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./nav-links";

export default function Navbar() {
  const pathname = usePathname();
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#272727] bg-black/90 py-4 font-chakra backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-4 md:gap-10">
          {/* TODO(brand): replace /assets/logo_crates.svg with Alloy artwork */}
          <Link href="/" className="flex items-center gap-2 text-white">
            <img src="/assets/logo_crates.svg" alt="Alloy logo" className="h-8 w-auto md:h-10" />
            <span className="text-lg md:text-xl">Alloy</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm md:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "transition-colors",
                  pathname === l.href ? "text-white" : "text-gray-400 hover:text-white",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded border border-[#2a2a2a] px-2 py-1 text-xs text-gray-400 lg:inline">
            {DEFAULT_CHAIN.name}
          </span>
          <div className="hidden md:flex">
            <ConnectButton />
          </div>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

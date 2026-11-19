import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Manrope, Sora } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/alloy/AppShell";

/* Alloy type: Sora 200/300 for display + numbers, Manrope for UI (tabular digits via .num / tabular-nums). */
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-ui", display: "swap" });
const sora = Sora({ subsets: ["latin"], weight: ["200", "300", "400"], variable: "--font-sora", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crates-ui.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Alloy — Invest in stories, not symbols", template: "%s · Alloy" },
  description: "Curated baskets of tokenized U.S. stock exposure on Base. You own a token that tracks these stocks, not the shares themselves.",
  openGraph: { siteName: "Alloy", type: "website" },
  twitter: { card: "summary_large_image", site: "@alloy_fi" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`dark ${manrope.variable} ${sora.variable}`}>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Anton, Inter } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/alloy/AppShell";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crates-ui.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Alloy — Invest in stories, not symbols", template: "%s · Alloy" },
  description: "Curated baskets of tokenized U.S. stock exposure on Base. Tokenized stock exposure, not shares.",
  openGraph: { siteName: "Alloy", type: "website" },
  twitter: { card: "summary_large_image", site: "@alloy_fi" },
};

export const viewport: Viewport = {
  themeColor: "#0C0A0A",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${anton.variable}`}>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

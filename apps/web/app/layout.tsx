import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Chakra_Petch, DM_Sans, Ropa_Sans } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/commons/navbar";
import Footer from "@/components/commons/footer";

const chakra = Chakra_Petch({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-chakra" });
const ropa = Ropa_Sans({ subsets: ["latin"], weight: ["400"], variable: "--font-ropa" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-dm-sans" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crates-ui.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Alloy — Invest in stories, not symbols", template: "%s · Alloy" },
  description:
    "Creator-curated baskets of tokenized U.S. stock exposure on Base. Followers are auto-rebalanced; creators earn a fee.",
  openGraph: { siteName: "Alloy", type: "website" },
  twitter: { card: "summary_large_image", site: "@alloy_fi" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${ropa.variable} ${chakra.variable} ${dmSans.variable} bg-[#0e0e0e] text-white`}>
        <Providers>
          <div className="flex min-h-screen flex-col font-chakra">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}

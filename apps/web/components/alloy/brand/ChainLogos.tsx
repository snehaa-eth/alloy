/**
 * Official chain / stablecoin marks, unaltered, as inline SVG (no network, crisp at any size).
 * - Base: "The Square" from Base's brand kit (github.com/base/brand-kit, logo/TheSquare/Digital/Base_square_blue.svg),
 *   colour #0000FF. Base brand guidelines: use the mark as supplied, don't recolour or alter it.
 * - USDC: Circle's USDC token mark (#2775CA), as distributed in Circle's brand assets (copy via cryptologos.cc).
 *   USDC is a trademark of Circle Internet Financial; used to identify the token our app settles in.
 * - USDT: Tether's USD₮ token mark (#50AF95, white ₮), as distributed by Tether (copy via cryptologos.cc). Trademark of
 *   Tether; shown only where we explain where to get USDC/USDT. Alloy itself accepts USDC only (AlloyRouter is USDC-only).
 * Size tokens keep every mark on the same grid as the text it sits next to.
 */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export const MARK_SIZE = { xs: 12, sm: 14, md: 16, lg: 20 } as const;
export type MarkSize = keyof typeof MARK_SIZE;

type P = { size?: MarkSize; className?: string; style?: CSSProperties; title?: string };

const box = (size: MarkSize, className?: string) => ({
  width: MARK_SIZE[size],
  height: MARK_SIZE[size],
  className: cn("inline-block flex-none align-[-0.15em]", className),
});

/** Base "The Square" (official). */
export function BaseLogo({ size = "sm", className, style, title }: P) {
  return (
    <svg viewBox="0 0 1280 1280" {...box(size, className)} style={style} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d="M0,101.12c0-34.64,0-51.95,6.53-65.28,6.25-12.76,16.56-23.07,29.32-29.32C49.17,0,66.48,0,101.12,0h1077.76c34.63,0,51.96,0,65.28,6.53,12.75,6.25,23.06,16.56,29.32,29.32,6.52,13.32,6.52,30.64,6.52,65.28v1077.76c0,34.63,0,51.96-6.52,65.28-6.26,12.75-16.57,23.06-29.32,29.32-13.32,6.52-30.65,6.52-65.28,6.52H101.12c-34.64,0-51.95,0-65.28-6.52-12.76-6.26-23.07-16.57-29.32-29.32-6.53-13.32-6.53-30.65-6.53-65.28V101.12Z" fill="#0000FF" />
    </svg>
  );
}

/** USDC (Circle) token mark (official). */
export function UsdcLogo({ size = "sm", className, style, title }: P) {
  return (
    <svg viewBox="0 0 2000 2000" {...box(size, className)} style={style} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d="M1000 2000c554.17 0 1000-445.83 1000-1000S1554.17 0 1000 0 0 445.83 0 1000s445.83 1000 1000 1000z" fill="#2775CA" />
      <path d="M1275 1158.33c0-145.83-87.5-195.83-262.5-216.66-125-16.67-150-50-150-108.34s41.67-95.83 125-95.83c75 0 116.67 25 137.5 87.5 4.17 12.5 16.67 20.83 29.17 20.83h66.66c16.67 0 29.17-12.5 29.17-29.16v-4.17c-16.67-91.67-91.67-162.5-187.5-170.83v-100c0-16.67-12.5-29.17-33.33-33.34h-62.5c-16.67 0-29.17 12.5-33.34 33.34v95.83c-125 16.67-204.16 100-204.16 204.17 0 137.5 83.33 191.66 258.33 212.5 116.67 20.83 154.17 45.83 154.17 112.5s-58.34 112.5-137.5 112.5c-108.34 0-145.84-45.84-158.34-108.34-4.16-16.66-16.66-25-29.16-25h-70.84c-16.66 0-29.16 12.5-29.16 29.17v4.17c16.66 104.16 83.33 179.16 220.83 200v100c0 16.66 12.5 29.16 33.33 33.33h62.5c16.67 0 29.17-12.5 33.34-33.33v-100c125-20.84 208.33-108.34 208.33-220.84z" fill="#FFF" />
      <path d="M787.5 1595.83c-325-116.66-491.67-479.16-370.83-800 62.5-175 200-308.33 370.83-370.83 16.67-8.33 25-20.83 25-41.67V325c0-16.67-8.33-29.17-25-33.33-4.17 0-12.5 0-16.67 4.16-395.83 125-612.5 545.84-487.5 941.67 75 233.33 254.17 412.5 487.5 487.5 16.67 8.33 33.34 0 37.5-16.67 4.17-4.16 4.17-8.33 4.17-16.66v-58.34c0-12.5-12.5-29.16-25-37.5zM1229.17 295.83c-16.67-8.33-33.34 0-37.5 16.67-4.17 4.17-4.17 8.33-4.17 16.67v58.33c0 16.67 12.5 33.33 25 41.67 325 116.66 491.67 479.16 370.83 800-62.5 175-200 308.33-370.83 370.83-16.67 8.33-25 20.83-25 41.67V1700c0 16.67 8.33 29.17 25 33.33 4.17 0 12.5 0 16.67-4.16 395.83-125 612.5-545.84 487.5-941.67-75-237.5-258.34-416.67-487.5-491.67z" fill="#FFF" />
    </svg>
  );
}

/** USD₮ (Tether) token mark (official); viewBox padded to a square so it sits on the same grid as the others. */
export function UsdtLogo({ size = "sm", className, style, title }: P) {
  return (
    <svg viewBox="0 -22.08 339.43 339.43" {...box(size, className)} style={style} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d="M62.15,1.45l-61.89,130a2.52,2.52,0,0,0,.54,2.94L167.95,294.56a2.55,2.55,0,0,0,3.53,0L338.63,134.4a2.52,2.52,0,0,0,.54-2.94l-61.89-130A2.5,2.5,0,0,0,275,0H64.45a2.5,2.5,0,0,0-2.3,1.45h0Z" fill="#50AF95" fillRule="evenodd" />
      <path d="M191.19,144.8v0c-1.2.09-7.4,0.46-21.23,0.46-11,0-18.81-.33-21.55-0.46v0c-42.51-1.87-74.24-9.27-74.24-18.13s31.73-16.25,74.24-18.15v28.91c2.78,0.2,10.74.67,21.74,0.67,13.2,0,19.81-.55,21-0.66v-28.9c42.42,1.89,74.08,9.29,74.08,18.13s-31.65,16.24-74.08,18.12h0Zm0-39.25V79.68h59.2V40.23H89.21V79.68H148.4v25.86c-48.11,2.21-84.29,11.74-84.29,23.16s36.18,20.94,84.29,23.16v82.9h42.78V151.83c48-2.21,84.12-11.73,84.12-23.14s-36.09-20.93-84.12-23.15h0Zm0,0h0Z" fill="#FFF" fillRule="evenodd" />
    </svg>
  );
}

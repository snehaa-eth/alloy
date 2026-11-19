"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom sheet (mobile) / centred 440px panel (desktop). 4px top corners, grab bar, inset 16.
 * Holds one certificate body (use `<Certificate flat>` inside). No sheets over sheets except the add-money detour.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  className,
  hideTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
  /** Screen-reader-only title when the certificate inside already names the subject. */
  hideTitle?: boolean;
}) {
  // Focus lands on the close button at mount, so the trap always has a focusable element even while
  // the body is still loading (no "no focusable elements" warning, no focus jump into an input).
  const closeRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 animate-fade-in" style={{ background: "var(--scrim)" }} />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            closeRef.current?.focus({ preventScroll: true });
          }}
          className={cn(
            "c-sheet fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto animate-sheet-in outline-none",
            "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[440px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[var(--r-sm)] md:border-b",
            className,
          )}
        >
          <div className="c-grab md:hidden" aria-hidden />
          <div className={cn("flex items-center justify-between", hideTitle && "-mb-2 justify-end")}>
            <Dialog.Title className={hideTitle ? "sr-only" : "t-body t-strong"}>{title}</Dialog.Title>
            <Dialog.Close ref={closeRef} className="c-iconbtn !h-9 !w-9" aria-label="Close">
              <X size={18} strokeWidth={1.75} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

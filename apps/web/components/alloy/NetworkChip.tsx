"use client";

/**
 * Navbar menus (every pill is interactive):
 * - NetworkChip: shown signed in AND signed out. Real chain (wagmi, populated by @privy-io/wagmi) → popover with
 *   networks, "prices are real, money is test USDC", and the test-money action (signed out: sign in to get it).
 * - WalletMenu: address (copy), explorer, balances, add test money, portfolio, sign out.
 * Radix Popover: click + keyboard, closes on outside click / Esc.
 */
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { useWallets } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { DEFAULT_CHAIN, DEFAULT_CHAIN_ID, SUPPORTED_CHAINS } from "@/lib/chains";
import { useWallet } from "@/lib/hooks/use-wallet";
import { useFaucet } from "@/lib/hooks/use-basket-tx";
import { useFaucetStatus } from "@/lib/hooks/use-reads";
import { formatFixed, formatUsd6 } from "@/lib/units";
import { cn } from "@/lib/utils";
import { BaseLogo, UsdcLogo } from "./brand/ChainLogos";
import { CreatorAvatar } from "./v5/parts";

const TIP = "Test mode: prices are real, money is pretend.";

const explorer = (addr: string) => `${DEFAULT_CHAIN.blockExplorers?.default.url ?? "https://sepolia.basescan.org"}/address/${addr}`;

function Panel({ children, label, align = "end" }: { children: ReactNode; label: string; align?: "start" | "center" | "end" }) {
  return (
    <Popover.Portal>
      {/* collisionPadding keeps a 16px gutter on phones instead of pinning the menu to the screen edge */}
      <Popover.Content
        align={align}
        sideOffset={10}
        collisionPadding={16}
        aria-label={label}
        className="nc-menu z-[60] w-[min(300px,calc(100vw-32px))] rounded-[20px] border border-line2 bg-[rgba(10,10,10,0.92)] p-2 text-tx shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] outline-none backdrop-blur-[20px]"
      >
        {children}
      </Popover.Content>
    </Popover.Portal>
  );
}

function Item({ icon: I, mark, children, onClick, href, external, disabled, primary, hint }: { icon?: typeof Copy; mark?: ReactNode; children: ReactNode; onClick?: () => void; href?: string; external?: boolean; disabled?: boolean; primary?: boolean; hint?: ReactNode }) {
  const cls = cn(
    "flex w-full items-center gap-3 rounded-[12px] px-3.5 py-[11px] text-left text-[13.5px] no-underline transition-colors",
    disabled ? "cursor-not-allowed text-dim" : "text-tx hover:bg-white/[0.04] focus-visible:bg-white/[0.06] focus-visible:outline-none",
    primary && "bg-ink font-semibold !text-black hover:bg-white",
  );
  const body = (
    <>
      {I && <I size={16} strokeWidth={1.5} className={primary ? "text-black" : "text-tx2"} aria-hidden />}
      {mark}
      <span className="flex-1">{children}</span>
      {hint && <small className="text-[11.5px] text-dim">{hint}</small>}
      {external && <ExternalLink size={13} strokeWidth={1.75} className="text-tx2" aria-hidden />}
    </>
  );
  if (href && external)
    return (
      <a className={cls} href={href} target="_blank" rel="noreferrer">
        {body}
      </a>
    );
  if (href)
    return (
      <Popover.Close asChild>
        <Link className={cls} href={href}>
          {body}
        </Link>
      </Popover.Close>
    );
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled}>
      {body}
    </button>
  );
}

function useFaucetAction() {
  const w = useWallet();
  const faucet = useFaucet();
  const run = async () => {
    if (!w.authenticated) return w.login();
    // useFaucet already shows the success and error toasts; don't add a second one here.
    try {
      await faucet.mutateAsync();
    } catch {
      /* already reported by useFaucet */
    }
  };
  return { run, pending: faucet.isPending };
}

export function NetworkChip() {
  const w = useWallet();
  const { chain } = useAccount();
  const { wallets } = useWallets();
  const faucet = useFaucetAction();
  const connected = w.authenticated && !!w.address;
  const wrong = connected && (w.wrongChain || !w.supportedChain);
  const c = (connected && !wrong && (chain ?? SUPPORTED_CHAINS.find((x) => x.id === w.chainId))) || DEFAULT_CHAIN;
  const testnet = "testnet" in c && c.testnet === true;

  const fix = async () => {
    try {
      await w.switchToDefault();
    } catch {
      // Privy embedded wallets: switch the active wallet directly.
      await wallets[0]?.switchChain(DEFAULT_CHAIN_ID).catch(() => {});
    }
  };

  return (
    <Popover.Root>
      <Popover.Trigger
        title={wrong ? `Switch to ${DEFAULT_CHAIN.name}` : TIP}
        aria-label={wrong ? `Wrong network. Switch to ${DEFAULT_CHAIN.name}` : testnet ? "Test mode" : c.name}
        className={cn(
          "inline-flex h-8 flex-none items-center gap-2 whitespace-nowrap rounded-full border px-[11px] text-[11.5px] font-medium transition-colors sm:h-9 sm:px-3.5 sm:text-[12.5px]",
          wrong
            ? "border-[var(--warnbd)] bg-[var(--warnbg)] text-[var(--warn)] hover:border-[var(--warn)] data-[state=open]:border-[var(--warn)]"
            : "border-line2 text-ink hover:border-white/50 data-[state=open]:border-white/50",
        )}
      >
        {wrong ? (
          <span className="h-1.5 w-1.5 flex-none rounded-full bg-[var(--warn)]" aria-hidden />
        ) : (
          <BaseLogo size="sm" className="rounded-[3px]" />
        )}
        <span>{wrong ? (w.switching ? "Switching…" : "Wrong network") : testnet ? "Test mode" : c.name}</span>
      </Popover.Trigger>
      <Panel label="Test mode" align="center">
        {wrong && (
          <div className="px-1 pb-1 pt-1">
            <Item icon={RefreshCw} onClick={fix} primary>
              Switch to {DEFAULT_CHAIN.name}
            </Item>
          </div>
        )}
        <div className="px-3.5 pb-3 pt-3.5">
          <b className="block font-display text-[17px] font-light tracking-[-0.01em]">Test mode</b>
          <span className="mt-[3px] block text-[12.5px] text-mute">Prices are real. The money is pretend.</span>
        </div>
        <div className="mx-2 my-1.5 h-px bg-line" />
        <div className="px-3.5 pb-1.5 pt-3 text-[10.5px] uppercase tracking-[0.24em] text-dim">Network</div>
        <div className="flex items-center justify-between gap-2.5 rounded-[12px] px-3.5 py-[11px] text-[13.5px]">
          <span className="inline-flex items-center gap-2.5">
            <BaseLogo size="md" />
            <span>
              {DEFAULT_CHAIN.name} <small className="text-[11.5px] text-dim">· test</small>
            </span>
          </span>
          {!wrong && <Check size={15} strokeWidth={1.75} aria-label="Active" />}
        </div>
        <div className="flex items-center justify-between gap-2.5 rounded-[12px] px-3.5 py-[11px] text-[13.5px] text-dim" aria-disabled>
          <span className="inline-flex items-center gap-2.5">
            <BaseLogo size="md" className="opacity-50" />
            <span>Base</span>
          </span>
          <small className="text-[11.5px]">Soon</small>
        </div>
        <div className="mx-2 my-1.5 h-px bg-line" />
        {/* Signed out: the one next step is signing in. Signed in: a plain row. */}
        <div className={w.authenticated ? undefined : "px-1 pb-1"}>
          <Item onClick={faucet.run} disabled={faucet.pending} primary={!w.authenticated} mark={<UsdcLogo size="md" />} hint={w.authenticated && !faucet.pending ? "Free" : undefined}>
            {faucet.pending ? "Adding test money…" : w.authenticated ? "Get test money" : "Sign in to get test money"}
          </Item>
        </div>
        {w.address && (
          <Item href={explorer(w.address)} external>
            <span className="text-mute">View on BaseScan</span>
          </Item>
        )}
      </Panel>
    </Popover.Root>
  );
}

export function WalletMenu({ address }: { address: `0x${string}` }) {
  const w = useWallet();
  const status = useFaucetStatus();
  const faucet = useFaucetAction();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="Your account"
        className="inline-flex h-9 w-9 flex-none items-center justify-center gap-2 rounded-full border border-line2 text-[12.5px] font-medium text-ink transition-colors hover:border-white/50 data-[state=open]:border-white/50 sm:w-auto sm:justify-start sm:pl-1.5 sm:pr-3.5"
      >
        <span className="a-av" aria-hidden />
        <span className="hidden tabular-nums tracking-[0.02em] sm:inline">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        {status.data && (
          <span className="hidden items-center gap-1.5 border-l border-line pl-[9px] tabular-nums text-mute md:inline-flex">
            <UsdcLogo size="xs" title="USDC" />
            {formatUsd6(status.data.usdcBalance)}
          </span>
        )}
      </Popover.Trigger>
      <Panel label="Account">
        <div className="flex items-center gap-3 px-3 pb-2 pt-2">
          <CreatorAvatar handle={address.slice(2)} seed={address} size={32} />
          <span className="t-num min-w-0 flex-1 break-all text-[12px] leading-snug text-tx3">{address}</span>
          <button type="button" onClick={copy} aria-label="Copy address" className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-s2 hover:bg-white/[0.1]">
            <Copy size={14} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        <div className="mx-2 my-1.5 h-px bg-line" />
        <div className="grid grid-cols-2 gap-2 px-1.5 pb-1 pt-1">
          <div className="px-2 py-1.5">
            <span className="block text-[10.5px] uppercase tracking-[0.22em] text-dim">Test money</span>
            <span className="mt-1 flex items-center gap-2 font-display text-[22px] font-extralight tabular-nums tracking-[-0.02em]">
              <UsdcLogo size="md" title="USDC" />
              {status.data ? formatUsd6(status.data.usdcBalance) : "—"}
            </span>
          </div>
          <div className="px-2 py-1.5">
            <span className="block text-[10.5px] uppercase tracking-[0.22em] text-dim">Gas</span>
            <span className="mt-1 block font-display text-[22px] font-extralight tabular-nums tracking-[-0.02em]">{status.data ? formatFixed(status.data.ethBalance, 18, 4) : "—"}</span>
          </div>
        </div>
        <div className="mx-2 my-1.5 h-px bg-line" />
        <Item onClick={faucet.run} disabled={faucet.pending} mark={<UsdcLogo size="md" />} hint={faucet.pending ? undefined : "Free"}>
          {faucet.pending ? "Adding test money…" : "Add test money"}
        </Item>
        <Item href="/portfolio">
          Your shelf
        </Item>
        <Item href={explorer(address)} external>
          <span className="text-mute">View on BaseScan</span>
        </Item>
        <div className="mx-2 my-1.5 h-px bg-line" />
        <Item onClick={() => w.logout()}>
          Sign out
        </Item>
      </Panel>
    </Popover.Root>
  );
}

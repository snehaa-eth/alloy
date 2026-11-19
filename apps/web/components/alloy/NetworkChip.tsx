"use client";

/**
 * Navbar menus (every pill is interactive):
 * - NetworkChip: real chain (wagmi, populated by @privy-io/wagmi) → popover with networks, test-money action, explorer.
 * - WalletMenu: address (copy), explorer, balances, add test money, portfolio, sign out.
 * Radix Popover: click + keyboard, closes on outside click / Esc.
 */
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { useWallets } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { Check, ChevronDown, Copy, Droplets, ExternalLink, LogOut, PieChart, RefreshCw, ScanSearch } from "lucide-react";
import type { ReactNode } from "react";
import { DEFAULT_CHAIN, DEFAULT_CHAIN_ID, SUPPORTED_CHAINS } from "@/lib/chains";
import { useWallet } from "@/lib/hooks/use-wallet";
import { useFaucet } from "@/lib/hooks/use-basket-tx";
import { useFaucetStatus } from "@/lib/hooks/use-reads";
import { formatFixed, formatUsd6 } from "@/lib/units";
import { cn } from "@/lib/utils";
import { CreatorAvatar } from "./v5/parts";

const TIP = "Test network: prices are real, money is test USDC.";

function BaseMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#0052FF" />
      <path d="M11.95 20.4a8.4 8.4 0 1 0-8.36-9.2h11.1v1.6H3.59a8.4 8.4 0 0 0 8.36 7.6Z" fill="#fff" />
    </svg>
  );
}

const explorer = (addr: string) => `${DEFAULT_CHAIN.blockExplorers?.default.url ?? "https://sepolia.basescan.org"}/address/${addr}`;

function Panel({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Popover.Portal>
      <Popover.Content
        align="end"
        sideOffset={10}
        aria-label={label}
        className="z-[60] w-[300px] rounded-[16px] border border-white/[0.08] bg-s1 p-2 text-tx shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)] outline-none animate-fade-in"
      >
        {children}
      </Popover.Content>
    </Popover.Portal>
  );
}

function Item({ icon: I, children, onClick, href, external, disabled, primary }: { icon: typeof Copy; children: ReactNode; onClick?: () => void; href?: string; external?: boolean; disabled?: boolean; primary?: boolean }) {
  const cls = cn(
    "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[14px] no-underline transition-colors",
    disabled ? "cursor-not-allowed text-tx2 opacity-60" : "text-tx hover:bg-[rgba(var(--brand-rgb),0.35)] focus-visible:bg-[rgba(var(--brand-rgb),0.35)] focus-visible:outline-none",
    primary && "bg-[var(--btn)] !text-[var(--on-btn)] hover:bg-[var(--btn-hover)]",
  );
  const body = (
    <>
      <I size={16} strokeWidth={1.75} className={primary ? "text-[var(--on-btn)]" : "text-tx2"} aria-hidden />
      <span className="flex-1">{children}</span>
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
        aria-label={wrong ? `Wrong network. Switch to ${DEFAULT_CHAIN.name}` : testnet ? `Test mode on ${c.name}` : c.name}
        className={cn(
          "inline-flex h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[13px] font-medium transition-colors sm:px-3",
          wrong || testnet
            ? "border-[var(--warnbd)] bg-[var(--warnbg)] text-[var(--warn)] hover:border-[var(--warn)] data-[state=open]:border-[var(--warn)]"
            : "border-white/10 text-tx3 hover:border-white/25 hover:text-tx data-[state=open]:border-[var(--acc)]",
        )}
      >
        {wrong || testnet ? <span className="h-1.5 w-1.5 flex-none rounded-full bg-[var(--warn)]" aria-hidden /> : <BaseMark />}
        <span>{wrong ? (w.switching ? "Switching…" : "Wrong network") : testnet ? "Test mode" : c.name}</span>
        <ChevronDown size={13} strokeWidth={1.75} className="hidden sm:block" aria-hidden />
      </Popover.Trigger>
      <Panel label="Network">
        <p className="px-3 pb-1 pt-2 text-[12px] font-medium text-tx2">Network</p>
        {wrong && (
          <div className="px-1 pb-2">
            <Item icon={RefreshCw} onClick={fix} primary>
              Switch to {DEFAULT_CHAIN.name}
            </Item>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px]">
          <BaseMark size={16} />
          <span className="flex-1">
            {DEFAULT_CHAIN.name} <span className="text-tx2">· testnet</span>
          </span>
          {!wrong && <Check size={16} strokeWidth={2} style={{ color: "var(--acc)" }} aria-label="Active" />}
        </div>
        <div className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] text-tx2 opacity-60" aria-disabled>
          <BaseMark size={16} />
          <span className="flex-1">Base · mainnet</span>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px]">Coming soon</span>
        </div>
        <p className="mx-3 my-2 border-t border-white/[0.07] pt-2.5 text-[13px] text-tx2">Prices are real. Money is test USDC.</p>
        <Item icon={Droplets} onClick={faucet.run} disabled={faucet.pending}>
          {faucet.pending ? "Adding test money…" : w.authenticated ? "Get test money" : "Sign in to get test money"}
        </Item>
        {w.address && (
          <Item icon={ScanSearch} href={explorer(w.address)} external>
            View on BaseScan
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
        className="inline-flex h-9 flex-none items-center gap-2 rounded-full border border-white/10 pl-1.5 pr-2.5 sm:pr-3 text-[14px] font-medium text-tx3 transition-colors hover:border-white/25 hover:text-tx data-[state=open]:border-[var(--acc)]"
      >
        <CreatorAvatar handle={address.slice(2)} seed={address} size={22} />
        <span className="hidden tabular-nums sm:inline">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <ChevronDown size={13} strokeWidth={1.75} aria-hidden />
      </Popover.Trigger>
      <Panel label="Account">
        <div className="flex items-center gap-3 px-3 pb-2 pt-2">
          <CreatorAvatar handle={address.slice(2)} seed={address} size={32} />
          <span className="t-num min-w-0 flex-1 break-all text-[12px] leading-snug text-tx3">{address}</span>
          <button type="button" onClick={copy} aria-label="Copy address" className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-s2 hover:bg-[rgba(var(--brand-rgb),0.45)]">
            <Copy size={14} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        <div className="mx-1 mb-1 grid grid-cols-2 gap-2">
          <div className="rounded-[12px] bg-s2 px-3 py-2">
            <span className="block text-[11px] text-tx2">Test USDC</span>
            <span className="text-[15px] font-semibold tabular-nums">{status.data ? formatUsd6(status.data.usdcBalance) : "—"}</span>
          </div>
          <div className="rounded-[12px] bg-s2 px-3 py-2">
            <span className="block text-[11px] text-tx2">Test ETH (gas)</span>
            <span className="text-[15px] font-semibold tabular-nums">{status.data ? formatFixed(status.data.ethBalance, 18, 4) : "—"}</span>
          </div>
        </div>
        <Item icon={Droplets} onClick={faucet.run} disabled={faucet.pending}>
          {faucet.pending ? "Adding test money…" : "Add test money"}
        </Item>
        <Item icon={ScanSearch} href={explorer(address)} external>
          View on BaseScan
        </Item>
        <Item icon={PieChart} href="/portfolio">
          Portfolio
        </Item>
        <div className="mx-3 my-1 border-t border-white/[0.07]" />
        <Item icon={LogOut} onClick={() => w.logout()}>
          Sign out
        </Item>
      </Panel>
    </Popover.Root>
  );
}

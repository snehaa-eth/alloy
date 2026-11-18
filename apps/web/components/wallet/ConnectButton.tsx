"use client";

import { Copy, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DEFAULT_CHAIN } from "@/lib/chains";
import { useWallet } from "@/lib/hooks/use-wallet";

export function ConnectButton() {
  const w = useWallet();

  if (!w.ready) {
    return (
      <Button variant="secondary" disabled>
        Loading…
      </Button>
    );
  }

  if (!w.authenticated || !w.address) {
    return (
      <Button variant="metal" onClick={() => w.login()}>
        Sign in
      </Button>
    );
  }

  const short = `${w.address.slice(0, 6)}…${w.address.slice(-4)}`;
  return (
    <div className="flex items-center gap-2">
      {w.wrongChain && (
        <Button
          size="sm"
          className="bg-yellow-500 text-black hover:bg-yellow-400"
          disabled={w.switching}
          onClick={() => w.switchToDefault().catch(() => toast.error(`Switch to ${DEFAULT_CHAIN.name} in your wallet.`))}
        >
          Switch to {DEFAULT_CHAIN.name}
        </Button>
      )}
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => {
          await navigator.clipboard.writeText(w.address!);
          toast("Address copied");
        }}
      >
        {short}
        <Copy className="ml-2 h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="secondary" aria-label="Sign out" onClick={() => w.logout()}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

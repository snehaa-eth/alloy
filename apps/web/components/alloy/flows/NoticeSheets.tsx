"use client";

import { useState } from "react";
import { Download, FlaskConical, RefreshCw } from "lucide-react";
import type { Address } from "viem";
import { useClaimOwed, useFaucet } from "@/lib/hooks/use-basket-tx";
import { useFaucetStatus } from "@/lib/hooks/use-reads";
import { useAccount } from "../hooks";
import { TxProgress } from "./shared";
import type { RebalanceEvent } from "@/lib/types";
import type { StrategyMode } from "@/lib/types";
import { STYLES, STYLE_ORDER } from "../styles";
import { formatUsd6 } from "@/lib/units";
import { Certificate } from "../Certificate";
import { Countdown, LocalTime } from "../Countdown";
import { Sheet } from "../Sheet";
import { Button, Figure, InlineToast, QuietLink, Stamp } from "../primitives";
import { AlloyBarMorph } from "../motion/AlloyBarMorph";
import { clock, recipeAfter, type BasketView } from "../basket-view";

/** I-04 Amendment notice: now → after, exact time, Keep is primary. Doing nothing = staying in. */
export function ChangeSheet({
  v,
  change,
  heldUsd6,
  open,
  onOpenChange,
  onExit,
}: {
  v: BasketView;
  change: RebalanceEvent;
  /** Value of the viewer's position (0 if not holding). */
  heldUsd6: bigint;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onExit: () => void;
}) {
  const b = v.basket;
  const [kept, setKept] = useState(false);
  const after = recipeAfter(b, change);
  // Share of the basket that moves = half the sum of absolute weight changes.
  const movedBps = change.changes.reduce((a, c) => a + Math.abs(c.toBps - c.fromBps), 0) / 2;
  const moves = (heldUsd6 * BigInt(Math.round(movedBps))) / 10_000n;
  const at = change.executableAt ?? change.at;
  const holding = heldUsd6 > 0n;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Recipe change" hideTitle>
      <Certificate
        flat
        serial={v.id.serial}
        stamp={
          <Stamp icon={RefreshCw} intent="accent">
            Change
          </Stamp>
        }
        art={{ series: v.artSeries, weightsBps: v.weightsBps, seed: b.address, tone: v.id.tone }}
        title={b.name}
        label={holding ? "Of yours that moves" : "Of the basket that moves"}
        figure={holding ? `≈ ${formatUsd6(moves, 0)}` : `${Math.round(movedBps / 100)}%`}
        bar={<AlloyBarMorph before={v.target} after={after} tone={v.id.tone} />}
        ledger={[
          { k: "Runs", v: <LocalTime at={at} /> },
          {
            k: change.aiGenerated ? "Reason · AI" : "Reason",
            v: <span className="q truncate">“{change.reason ?? "No reason given"}”</span>,
          },
        ]}
        action={
          kept ? (
            <InlineToast>You&apos;re staying in.</InlineToast>
          ) : (
            <Button
              onClick={() => {
                // TODO(lib): persist the follower's choice (POST /baskets/:a/choice) once the API exposes it.
                setKept(true);
              }}
            >
              Keep my basket
            </Button>
          )
        }
        footLink={holding ? <QuietLink onClick={onExit}>Exit before it runs</QuietLink> : undefined}
        footMeta={<Countdown to={at} dueLabel="due · runs at market open" />}
      />
      {change.aiGenerated && <p className="t-mono c2">AI-generated reason, not investment advice.</p>}
    </Sheet>
  );
}

/** Add test money detour (testnet only). Relayer drip first (no gas needed), wallet drip as fallback. */
export function AddMoneySheet({ open, onOpenChange, backLabel }: { open: boolean; onOpenChange: (o: boolean) => void; backLabel?: string }) {
  const acct = useAccount();
  const faucet = useFaucet();
  const status = useFaucetStatus();
  const wait = status.data?.availableInSeconds ?? 0;
  const drip = status.data?.dripUsd6 ?? 1_000_000_000n;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Add test money">
      <Figure label="Test dollars · not real money" figure={formatUsd6(drip, 0)} />
      {status.data && <span className="t-mono c2">Balance {formatUsd6(status.data.usdcBalance)}</span>}
      {faucet.step !== "idle" && faucet.step !== "done" && faucet.step !== "error" ? (
        <TxProgress step={faucet.step} skip={["approve"]} />
      ) : faucet.step === "done" ? (
        <InlineToast>Test dollars added.</InlineToast>
      ) : (
        <Button
          icon={FlaskConical}
          disabled={acct.signedIn && wait > 0}
          onClick={() => (acct.signedIn ? faucet.mutate() : acct.login())}
        >
          {!acct.signedIn ? "Sign in" : wait > 0 ? `Next refill in ${clock(wait)}` : `Get ${formatUsd6(drip, 0)} test dollars`}
        </Button>
      )}
      {faucet.step === "error" && <span className="t-mono down">{faucet.errorMessage ?? "Didn't work. Try again."}</span>}
      <p className="t-mono c2">Once every 24h per address.</p>
      {backLabel && <QuietLink onClick={() => onOpenChange(false)}>{backLabel}</QuietLink>}
    </Sheet>
  );
}

/** Strategy explainer: one line per mode. */
export function StrategySheet({ mode, open, onOpenChange }: { mode: StrategyMode; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Creator style">
      <div className="flex flex-col">
        <p className="t-small c2 pb-1">Each basket follows its creator&apos;s plan. You don&apos;t lift a finger.</p>
        {STYLE_ORDER.map((m) => (
          <div key={m} className="c-row">
            <span className="c-rowicon" aria-hidden>
              {(() => {
                const I = STYLES[m].icon;
                return <I size={18} strokeWidth={1.75} />;
              })()}
            </span>
            <div className="c-row__main">
              <span className="c-row__title t-strong">{STYLES[m].label}</span>
              <span className="t-small c2 !whitespace-normal">{STYLES[m].line}</span>
            </div>
            {m === mode && <Stamp>This one</Stamp>}
          </div>
        ))}
      </div>
    </Sheet>
  );
}

export type HeldItem = { basket: Address; token: Address; ticker: string; amount: string; valueUsd6: bigint; basketSerial: string };

/** I-06 Held voucher: one tap per token (caller-only claimOwed), no expiry. */
export function ClaimSheet({ item, open, onOpenChange }: { item: HeldItem; open: boolean; onOpenChange: (o: boolean) => void }) {
  const claim = useClaimOwed(item.basket);
  const running = claim.step !== "idle" && claim.step !== "done" && claim.step !== "error";
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Held for you">
      <Certificate
        flat
        serial={item.basketSerial}
        stamp={
          <Stamp icon={Download} intent="gold">
            Held
          </Stamp>
        }
        title={item.ticker}
        label="Value held"
        figure={formatUsd6(item.valueUsd6)}
        ledger={[
          { k: "Amount", v: item.amount },
          { k: "Expires", v: "Never" },
        ]}
        action={
          claim.step === "done" ? (
            <InlineToast>Claimed to your wallet.</InlineToast>
          ) : running ? (
            <TxProgress step={claim.step} skip={["quote", "approve"]} />
          ) : (
            <Button onClick={() => claim.mutate({ token: item.token })}>Claim</Button>
          )
        }
        footLink={<span className="t-mono c2">transfer was blocked, not lost</span>}
        footMeta={claim.step === "error" ? <span className="down">Still held. Try later.</span> : "no expiry"}
      />
    </Sheet>
  );
}

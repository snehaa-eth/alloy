"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Pencil, RefreshCw } from "lucide-react";
import type { Performance, RebalanceEvent } from "@/lib/types";
import { useCancelRecipe, useProposeRecipe } from "@/lib/hooks/use-basket-tx";
import { describeTxError } from "@/lib/tx";
import { formatUsd6, validateWeightsBps } from "@/lib/units";
import { Certificate } from "../Certificate";
import { Countdown } from "../Countdown";
import { AlloyBarPair, Banner, Button, Field, InlineToast, Ledger, QuietLink, Stamp } from "../primitives";
import { compactUsd6, pendingChange, type BasketView } from "../basket-view";
import { WeightsEditor, type WeightRow } from "../flows/WeightsEditor";
import { TxProgress } from "../flows/shared";

export function ProposeScreen({ v, perf, events }: { v: BasketView; perf: Performance; events: RebalanceEvent[] }) {
  const b = v.basket;
  const pending = pendingChange(events, b);
  const propose = useProposeRecipe(b.address);
  const cancel = useCancelRecipe(b.address);
  const [rows, setRows] = useState<WeightRow[]>(v.target.map((p) => ({ ticker: p.ticker, bps: p.bps })));
  const [reason, setReason] = useState("");
  const [stage, setStage] = useState<"edit" | "running" | "sent" | "error">("edit");
  const [err, setErr] = useState("");
  const changed = rows.some((r, i) => r.bps !== v.target[i].bps);
  const valid = validateWeightsBps(rows.map((r) => r.bps)).ok && changed && reason.trim().length >= 4;
  const notice = b.noticeSeconds >= 3600 ? `${b.noticeSeconds / 3600}h` : `${b.noticeSeconds / 60} min`;

  async function send() {
    setStage("running");
    try {
      await propose.mutateAsync({ weightsBps: rows.map((r) => r.bps), reason: reason.trim() });
      setStage("sent");
    } catch (e) {
      setErr(describeTxError(e));
      setStage("error");
    }
  }

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-6 px-4 pb-10 pt-4 md:px-6">
      <div className="c-top">
        <Link href="/me" className="c-iconbtn" aria-label="Back to your baskets">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </Link>
        <h1 className="t-body t-strong">{b.name}</h1>
        <span className="w-11" />
      </div>

      <Ledger
        cells={[
          { k: "In basket", v: compactUsd6(v.nav) },
          { k: "Fees earned", v: formatUsd6(perf.feesEarnedUsd6) },
        ]}
      />

      {pending && (
        <Banner
          intent="notice"
          icon={RefreshCw}
          action={
            cancel.step === "done" ? (
              <span className="t-mono">Cancelled</span>
            ) : (
              <QuietLink onClick={() => cancel.mutate()}>{cancel.step !== "idle" && cancel.step !== "error" ? "Cancelling…" : "Cancel it"}</QuietLink>
            )
          }
        >
          A change is pending · <Countdown to={pending.executableAt ?? pending.at} dueLabel="due" />
        </Banner>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="t-body t-strong">Propose a change</h2>
        <WeightsEditor rows={rows} onChange={setRows} tone={v.id.tone} />
      </section>

      <Field label="Reason" htmlFor="reason" help={`${reason.length}/140 · followers see this`}>
        <textarea id="reason" className="c-field__box" maxLength={140} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Less single-stock risk." />
      </Field>

      {/* I-10 Creator amendment: exactly what followers will see */}
      <Certificate
        serial={v.id.serial}
        stamp={
          <Stamp icon={Pencil} intent={pending ? "accent" : "neutral"}>
            {pending ? "Replace" : "Propose"}
          </Stamp>
        }
        title="Follower preview"
        label="Followers notified"
        figure={String(b.followers)}
        bar={<AlloyBarPair before={v.target} after={rows.map((r) => ({ ticker: r.ticker, bps: r.bps }))} tone={v.id.tone} />}
        ledger={[
          { k: "Notice", v: notice },
          { k: "Reason", v: <span className="q truncate">“{reason || "…"}”</span> },
        ]}
        action={
          stage === "sent" ? (
            <InlineToast>Notice sent. Followers can stay or leave.</InlineToast>
          ) : stage === "running" ? (
            <TxProgress step={propose.step} skip={["quote", "approve"]} />
          ) : (
            <Button disabled={!valid} onClick={send}>
              Send {notice} notice
            </Button>
          )
        }
        footMeta={`@${b.creator.handle}`}
      />
      {pending && <span className="t-mono warn">This restarts the {notice} notice and resets followers&apos; choices.</span>}
      {stage === "error" && (
        <Banner intent="error">
          Not sent. Nothing changed. <span className="t-mono c2 block break-words">{err}</span>
        </Banner>
      )}
    </div>
  );
}

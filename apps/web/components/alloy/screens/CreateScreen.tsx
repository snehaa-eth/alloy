"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, Check, FlaskConical } from "lucide-react";
import type { Address } from "viem";
import type { StrategyMode } from "@/lib/types";
import { useCreateBasket } from "@/lib/hooks/use-basket-tx";
import { DEFAULT_FEE_BPS, DEFAULT_SLIPPAGE_BPS, MAX_FEE_BPS, MIN_SEED_USDC, STRATEGY_MODES, STRATEGY_MODE_LIST } from "@/lib/strategy";
import { describeTxError } from "@/lib/tx";
import { formatUsd6, parseUsdc, validateWeightsBps } from "@/lib/units";
import { Certificate } from "../Certificate";
import { Banner, Button, ButtonLink, Field, Figure, IconButton, ProgressBar, QuietLink, Stamp, StockLogo } from "../primitives";
import { basketCode, TONES, type Tone } from "../identity";
import { useAccount, useAttestation } from "../hooks";
import { AmountPad, AttestBlock, TxProgress } from "../flows/shared";
import { WeightsEditor, type WeightRow } from "../flows/WeightsEditor";

export type PickStock = { ticker: string; name: string; token: Address };

const STEPS = ["Idea", "Stocks", "Weights", "Strategy", "Seed"] as const;
const DRAFT_KEY = "alloy.create.draft.v1";

type Draft = {
  name: string;
  symbol: string;
  thesis: string;
  story: boolean;
  source: string;
  date: string;
  picked: string[];
  weights: WeightRow[];
  mode: StrategyMode;
  feeBps: number;
  demo: boolean;
  seed: string;
  tone: Tone;
};

const EMPTY: Draft = {
  name: "",
  symbol: "",
  thesis: "",
  story: false,
  source: "",
  date: "",
  picked: [],
  weights: [],
  mode: "balanced",
  feeBps: DEFAULT_FEE_BPS,
  demo: true,
  seed: "25",
  tone: "sapp",
};

export function CreateScreen({ stocks }: { stocks: PickStock[] }) {
  const acct = useAccount();
  const attest = useAttestation();
  const create = useCreateBasket();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(EMPTY);
  const [stage, setStage] = useState<"edit" | "attest" | "running" | "done" | "error">("edit");
  const [err, setErr] = useState("");

  // Draft autosave: back never loses input; kept if the seed tx fails.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setD({ ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) });
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* ignore */
    }
  }, [d]);

  const up = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const seedUsd6 = (() => {
    try {
      return parseUsdc(d.seed || "0");
    } catch {
      return 0n;
    }
  })();

  const okIdea = d.name.trim().length >= 3 && /^[A-Z]{2,6}$/.test(d.symbol) && d.thesis.trim().length >= 10 && (!d.story || (d.source.trim() && d.date));
  const okStocks = d.picked.length >= 2;
  const okWeights = validateWeightsBps(d.weights.map((w) => w.bps)).ok;
  const okSeed = seedUsd6 >= MIN_SEED_USDC;
  const ok = [okIdea, okStocks, okWeights, true, okSeed][step];

  function togglePick(t: string) {
    const picked = d.picked.includes(t) ? d.picked.filter((x) => x !== t) : [...d.picked, t];
    const even = picked.length ? Math.floor(10_000 / picked.length) : 0;
    const weights = picked.map((tk, i) => ({ ticker: tk, bps: i === 0 ? 10_000 - even * (picked.length - 1) : even }));
    up({ picked, weights });
  }

  async function launch() {
    if (!acct.signedIn) return acct.login();
    if (!attest.attested) return setStage("attest");
    setStage("running");
    try {
      await create.mutateAsync({
        name: d.name.trim(),
        symbol: d.symbol,
        components: d.weights.map((w) => stocks.find((s) => s.ticker === w.ticker)!.token),
        targetBps: d.weights.map((w) => w.bps),
        mode: d.mode,
        feeBps: d.feeBps,
        demo: d.demo,
        usdcSeed: seedUsd6,
        slippageBps: DEFAULT_SLIPPAGE_BPS,
        thesis: d.thesis.trim(),
        tags: d.story ? ["story"] : undefined,
      });
      // TODO(lib): persist story source/date + tone with the basket meta.
      setStage("done");
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      setErr(describeTxError(e));
      setStage("error");
    }
  }

  const previewParts = useMemo(() => d.weights.map((w) => ({ ticker: w.ticker, bps: Math.max(1, w.bps) })), [d.weights]);

  if (stage === "done")
    return (
      <Shell step={STEPS.length} onBack={undefined}>
        <Certificate
          serial={`No. — · ${d.symbol || basketCode(d.name)}`}
          stamp={
            <Stamp icon={Award} intent="gold">
              Founding
            </Stamp>
          }
          art={{ series: [1, 1.01, 0.99, 1.02, 1.03], weightsBps: d.weights.map((w) => w.bps), seed: d.name + d.symbol, tone: d.tone }}
          watermark={
            <Stamp icon={FlaskConical} intent="test">
              Test
            </Stamp>
          }
          title={d.name}
          label="Founding creator"
          // TODO(lib): Founding Creator # from the API.
          figure="#—"
          ledger={[
            { k: "Seed", v: formatUsd6(seedUsd6) },
            { k: "Notice", v: d.demo ? "10 min" : "24h" },
          ]}
          action={
            <a
              className="c-btn c-btn--primary"
              target="_blank"
              rel="noreferrer"
              href={`https://x.com/intent/post?text=${encodeURIComponent(`I just launched ${d.name} on Alloy (Base Sepolia test).`)}`}
            >
              Share on X
            </a>
          }
          footLink={create.result?.basket ? <QuietLink href={`/b/${create.result.basket}`}>Go to basket</QuietLink> : <QuietLink href="/me">Your baskets</QuietLink>}
          footMeta="Base Sepolia"
        />
      </Shell>
    );

  return (
    <Shell step={step} onBack={step > 0 ? () => setStep(step - 1) : undefined}>
      {step === 0 && (
        <div className="flex flex-col gap-4">
          <h1 className="t-body t-strong">Name your idea</h1>
          <Field label="Name" htmlFor="c-name" help="What followers will see.">
            <input id="c-name" className="c-field__box" maxLength={40} value={d.name} placeholder="The AI Build-Out" onChange={(e) => up({ name: e.target.value })} />
          </Field>
          <Field label="Ticker" htmlFor="c-sym" help="2–6 letters." error={d.symbol && !/^[A-Z]{2,6}$/.test(d.symbol) ? "2–6 letters, A–Z." : undefined}>
            <input
              id="c-sym"
              className="c-field__box t-mono"
              maxLength={6}
              value={d.symbol}
              placeholder="AIB"
              onChange={(e) => up({ symbol: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })}
            />
          </Field>
          <Field label="Thesis" htmlFor="c-thesis" help={`${d.thesis.length}/140`}>
            <textarea id="c-thesis" className="c-field__box" maxLength={140} value={d.thesis} placeholder="Why these stocks, in one line." onChange={(e) => up({ thesis: e.target.value })} />
          </Field>
          <div className="flex flex-col gap-2">
            <span className="c-field__label">Colour</span>
            <div className="flex gap-2" role="radiogroup" aria-label="Basket colour">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={d.tone === t}
                  aria-label={t}
                  onClick={() => up({ tone: t })}
                  className="h-9 w-9 rounded-[2px]"
                  style={{ background: `var(--j-${t}-d)`, boxShadow: d.tone === t ? "inset 0 0 0 2px var(--tx)" : `inset 0 0 0 1px var(--j-${t})` }}
                />
              ))}
            </div>
          </div>
          <button type="button" className="c-choice" aria-pressed={d.story} onClick={() => up({ story: !d.story })}>
            <span className="flex-1">
              <span className="t-body t-strong block">Based on a story</span>
              <span className="t-small c2">A public filing or disclosure.</span>
            </span>
            {d.story && <Check size={16} aria-hidden />}
          </button>
          {d.story && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Source" htmlFor="c-src">
                <input id="c-src" className="c-field__box" value={d.source} placeholder="Public filing" onChange={(e) => up({ source: e.target.value })} />
              </Field>
              <Field label="Date" htmlFor="c-date">
                <input id="c-date" type="date" className="c-field__box" value={d.date} onChange={(e) => up({ date: e.target.value })} />
              </Field>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h1 className="t-body t-strong">Pick stocks</h1>
            <span className="t-mono c2">{d.picked.length} of {stocks.length}</span>
          </div>
          <div className="flex flex-col">
            {stocks.map((s) => {
              const on = d.picked.includes(s.ticker);
              return (
                <button key={s.ticker} type="button" className="c-row w-full bg-transparent text-left" aria-pressed={on} onClick={() => togglePick(s.ticker)}>
                  <StockLogo ticker={s.ticker} size="lg" />
                  <div className="c-row__main">
                    <span className="c-row__title">{s.ticker}</span>
                    <span className="c-row__meta">{s.name}</span>
                  </div>
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-[2px]"
                    style={{ boxShadow: on ? "none" : "inset 0 0 0 1.5px var(--bdi)", background: on ? "var(--tx)" : "transparent", color: "var(--on-pri)" }}
                    aria-hidden
                  >
                    {on && <Check size={14} strokeWidth={2.5} />}
                  </span>
                </button>
              );
            })}
          </div>
          <span className="t-mono c2">At least 2. Test stocks on Base Sepolia.</span>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <h1 className="t-body t-strong">Set weights</h1>
          <WeightsEditor rows={d.weights} onChange={(weights) => up({ weights })} tone={d.tone} />
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <h1 className="t-body t-strong">Strategy and fee</h1>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Strategy">
            {STRATEGY_MODE_LIST.map((m) => (
              <button key={m} type="button" className="c-choice" aria-pressed={d.mode === m} onClick={() => up({ mode: m })}>
                <span className="flex-1">
                  <span className="t-body t-strong block">{STRATEGY_MODES[m].label}</span>
                  <span className="t-small c2">{STRATEGY_MODES[m].oneLiner}</span>
                </span>
                {d.mode === m && <Check size={16} aria-hidden />}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <span className="c-field__label">Fee per year · you keep 80%</span>
            <div className="c-presets !justify-start" role="group" aria-label="Fee">
              {[50, 100, 150, MAX_FEE_BPS].map((f) => (
                <button key={f} type="button" className="c-preset" aria-pressed={d.feeBps === f} onClick={() => up({ feeBps: f })}>
                  {f / 100}%
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="c-choice" aria-pressed={d.demo} onClick={() => up({ demo: !d.demo })}>
            <span className="flex-1">
              <span className="t-body t-strong block">Demo basket</span>
              <span className="t-small c2">10-minute change notice. Shown as Demo.</span>
            </span>
            {d.demo && <Check size={16} aria-hidden />}
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          {stage === "attest" ? (
            <AttestBlock
              onConfirm={() => {
                attest.confirm();
                setStage("edit");
              }}
              onCancel={() => setStage("edit")}
            />
          ) : (
            <>
              <h1 className="t-body t-strong">Seed it</h1>
              <Figure label="You put in · test" figure={formatUsd6(seedUsd6)} />
              <div className="flex flex-col gap-2">
                <div className="c-alloy__legend">
                  {previewParts.map((p) => (
                    <span key={p.ticker}>
                      {p.ticker} {p.bps / 100}
                    </span>
                  ))}
                </div>
              </div>
              {stage === "edit" && <AmountPad value={d.seed} onChange={(seed) => up({ seed })} presets={[10, 25, 100]} showKeys={false} />}
              {!okSeed && <span className="t-mono down">Minimum $10</span>}
              {stage === "error" && (
                <Banner intent="error">
                  Not created. Nothing spent; draft kept. <span className="t-mono c2 block break-words">{err}</span>
                </Banner>
              )}
              {stage === "running" && <TxProgress step={create.step} />}
            </>
          )}
        </div>
      )}

      {stage !== "attest" && (
        <div className="sticky bottom-0 mt-6 bg-bg pb-4 pt-2">
          {step < 4 ? (
            <Button disabled={!ok} onClick={() => setStep(step + 1)}>
              Next
            </Button>
          ) : (
            <Button disabled={!ok} loading={stage === "running"} onClick={launch}>
              {acct.signedIn ? `Create with ${formatUsd6(seedUsd6, 0)}` : "Sign in to create"}
            </Button>
          )}
        </div>
      )}
    </Shell>
  );
}

function Shell({ step, onBack, children }: { step: number; onBack?: () => void; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[480px] flex-col gap-4 px-4 pt-4">
      <div className="flex items-center gap-3">
        {onBack ? (
          <IconButton label="Back" icon={ArrowLeft} onClick={onBack} />
        ) : (
          <Link href="/me" className="c-iconbtn" aria-label="Close">
            <ArrowLeft size={20} strokeWidth={1.75} />
          </Link>
        )}
        <div className="flex-1">
          <ProgressBar value={(Math.min(step + 1, STEPS.length) / STEPS.length) * 100} />
        </div>
        <span className="t-mono c2">{step < STEPS.length ? `${step + 1}/${STEPS.length}` : "Live"}</span>
      </div>
      {children}
      {step >= STEPS.length && <ButtonLink href="/" variant="secondary">Explore</ButtonLink>}
    </div>
  );
}

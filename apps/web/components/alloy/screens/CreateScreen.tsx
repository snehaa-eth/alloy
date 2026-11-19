"use client";

/**
 * Creator studio, "Cast a basket." (docs/design/artdir/wow/app/create.html).
 * The transaction is unchanged from the previous flow: useCreateBasket with the same args, the same validation
 * (name ≥ 3, ticker A–Z 2–6, story ≥ 10, optional public-filing source + date, ≥ 2 stocks, weights = 100%,
 * seed ≥ MIN_SEED_USDC), the not-for-US-persons attestation, draft autosave, and the error path that keeps the draft.
 * Only the presentation changed: five steps on the left, a live metal stage on the right, "Cast it" fuses on success.
 */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Address } from "viem";
import type { StrategyMode } from "@/lib/types";
import { useCreateBasket } from "@/lib/hooks/use-basket-tx";
import { useUsdcBalance } from "@/lib/hooks/use-reads";
import { DEFAULT_FEE_BPS, DEFAULT_SLIPPAGE_BPS, MAX_FEE_BPS, MIN_SEED_USDC } from "@/lib/strategy";
import { describeTxError } from "@/lib/tx";
import { formatPrice8, formatUsd6, parseUsdc, usd6ToChartNumber, validateWeightsBps } from "@/lib/units";
import { STYLES, STYLE_ORDER } from "../styles";
import { basketCode } from "../identity";
import { useAccount, useAttestation } from "../hooks";
import { AttestBlock, TxProgress } from "../flows/shared";
import { tintCss } from "../metal/palette";
import { MetalBasket } from "../metal/MetalBasket";
import { WordReveal } from "../motion/alloy-motion";
import { Stage, type CastPhase } from "../create/Stage";

export type PickStock = { ticker: string; name: string; token: Address; price8?: string | null };

const DRAFT_KEY = "alloy.create.draft.v2";
const MIN_SEED = usd6ToChartNumber(MIN_SEED_USDC);

type Draft = {
  name: string;
  symbol: string;
  symbolTouched: boolean;
  thesis: string;
  story: boolean;
  source: string;
  date: string;
  picked: string[];
  /** whole percent per picked ticker */
  w: Record<string, number>;
  touched: boolean;
  mode: StrategyMode | null;
  feeBps: number;
  demo: boolean;
  seed: string;
};

const EMPTY: Draft = { name: "", symbol: "", symbolTouched: false, thesis: "", story: false, source: "", date: "", picked: [], w: {}, touched: false, mode: null, feeBps: DEFAULT_FEE_BPS, demo: true, seed: "" };

const even = (picked: string[]) => {
  const n = picked.length;
  const b = n ? Math.floor(100 / n) : 0;
  let rem = 100 - b * n;
  return Object.fromEntries(picked.map((t) => [t, b + (rem-- > 0 ? 1 : 0)]));
};

const OK_ICON = (
  <svg viewBox="0 0 12 12" fill="none" aria-hidden>
    <path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const STYLE_ART: Record<StrategyMode, React.ReactNode> = {
  "let-winners-run": (
    <svg viewBox="0 0 44 30" fill="none" aria-hidden>
      <circle cx="14" cy="17" r="7" stroke="currentColor" strokeOpacity=".5" />
      <circle cx="29" cy="14" r="11" stroke="currentColor" />
    </svg>
  ),
  "trend-aware": (
    <svg viewBox="0 0 44 30" fill="none" aria-hidden>
      <circle cx="12" cy="18" r="5" stroke="currentColor" strokeOpacity=".5" />
      <circle cx="29" cy="13" r="12" stroke="currentColor" />
      <path d="M4 26l8-5" stroke="currentColor" strokeOpacity=".5" />
    </svg>
  ),
  balanced: (
    <svg viewBox="0 0 44 30" fill="none" aria-hidden>
      <circle cx="15" cy="15" r="9" stroke="currentColor" />
      <circle cx="29" cy="15" r="9" stroke="currentColor" />
    </svg>
  ),
};

export function CreateScreen({ stocks }: { stocks: PickStock[] }) {
  const acct = useAccount();
  const attest = useAttestation();
  const create = useCreateBasket();
  const usdc = useUsdcBalance();
  const [d, setD] = useState<Draft>(EMPTY);
  const [stage, setStage] = useState<"edit" | "attest" | "running" | "done" | "error">("edit");
  const [err, setErr] = useState("");
  const [fused, setFused] = useState(false);
  const [live, setLive] = useState(false);
  const [active, setActive] = useState(1);
  const [hoverStyle, setHoverStyle] = useState<StrategyMode | null>(null);
  const [autoStyle, setAutoStyle] = useState<StrategyMode>("let-winners-run");
  const [pvLine, setPvLine] = useState<{ style: StrategyMode; line: string } | null>(null);
  const [seedKey, setSeedKey] = useState(0);
  const [pool, setPool] = useState(10);
  const loaded = useRef(false);

  // Draft autosave: never lose input; kept if the create tx fails.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setD({ ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) });
    } catch {
      /* ignore */
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current || stage === "done") return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* ignore */
    }
  }, [d, stage]);

  const up = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const symbol = d.symbolTouched ? d.symbol : d.name.trim() ? basketCode(d.name).slice(0, 6).replace(/[^A-Z]/g, "") : "";
  const seedUsd6 = (() => {
    try {
      return parseUsdc(d.seed || "0");
    } catch {
      return 0n;
    }
  })();
  const seedNum = usd6ToChartNumber(seedUsd6);
  const sum = d.picked.reduce((a, t) => a + (d.w[t] ?? 0), 0);
  const weightsBps = d.picked.map((t) => (d.w[t] ?? 0) * 100);

  const okName = d.name.trim().length >= 3 && /^[A-Z]{2,6}$/.test(symbol) && d.thesis.trim().length >= 10 && (!d.story || (!!d.source.trim() && !!d.date));
  const okStocks = d.picked.length >= 2;
  const okWeights = okStocks && validateWeightsBps(weightsBps).ok;
  const okStyle = !!d.mode;
  const okSeed = seedUsd6 >= MIN_SEED_USDC;
  const why = !d.name.trim()
    ? "Give it a name."
    : d.name.trim().length < 3
      ? "The name needs at least 3 letters."
      : !/^[A-Z]{2,6}$/.test(symbol)
        ? "The ticker needs 2 to 6 letters."
        : d.thesis.trim().length < 10
          ? "Tell the story in a few more words."
          : d.story && (!d.source.trim() || !d.date)
            ? "Add the filing's source and date."
            : !okStocks
              ? "Pick at least 2 stocks."
              : sum !== 100
                ? `Weights add to ${sum}%. They need to make 100%.`
                : d.picked.some((t) => !d.w[t])
                  ? "Every stock needs some weight."
                  : !okStyle
                    ? "Choose a style."
                    : !okSeed
                      ? `Put in at least ${formatUsd6(MIN_SEED_USDC, 0)} of your own.`
                      : "";
  const done = [okName, okStocks, okWeights, okStyle, okSeed];

  function toggle(t: string) {
    if (stage === "running") return;
    setD((x) => {
      const has = x.picked.includes(t);
      if (!has && x.picked.length >= 10) return x;
      const picked = has ? x.picked.filter((p) => p !== t) : [...x.picked, t];
      const w = x.touched ? Object.fromEntries(picked.map((p) => [p, x.w[p] ?? 0])) : even(picked);
      return { ...x, picked, w };
    });
  }
  const setW = (t: string, v: number) => setD((x) => ({ ...x, touched: true, w: { ...x.w, [t]: v } }));
  function fit() {
    setD((x) => {
      const s = x.picked.reduce((a, t) => a + (x.w[t] ?? 0), 0);
      if (!x.picked.length) return x;
      if (!s) return { ...x, w: even(x.picked), touched: false };
      let acc = 0;
      const w: Record<string, number> = {};
      x.picked.forEach((t) => {
        w[t] = Math.round(((x.w[t] ?? 0) / s) * 100);
        acc += w[t];
      });
      const big = x.picked.reduce((a, t) => (w[t] > w[a] ? t : a), x.picked[0]);
      w[big] += 100 - acc;
      return { ...x, w, touched: true };
    });
  }
  const setSeed = (v: string) => {
    up({ seed: v.replace(/[^0-9.]/g, "") });
    setSeedKey((k) => k + 1);
  };

  // Dev only: window.__alloyCastPreview() plays the cast fuse + live card without a transaction (review screenshots).
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __alloyCastPreview?: () => void };
    w.__alloyCastPreview = () => setStage("done");
    return () => void delete w.__alloyCastPreview;
  }, []);
  // the sticky stage sits right under the nav (its height changes with the status strip)
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>("header.a-nav");
    const root = document.querySelector<HTMLElement>(".cs");
    if (!nav || !root) return;
    const upd = () => root.style.setProperty("--cs-top", `${Math.round(nav.getBoundingClientRect().height)}px`);
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);
  // which step is in view drives the stage (style preview on step 4)
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.s) || 1)), { rootMargin: "-45% 0px -45% 0px" });
    document.querySelectorAll<HTMLElement>(".cs-stp").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  // no style chosen yet: cycle the three previews
  useEffect(() => {
    if (d.mode || active !== 4) return;
    const id = window.setInterval(() => setAutoStyle((s) => STYLE_ORDER[(STYLE_ORDER.indexOf(s) + 1) % 3]), 6000);
    return () => window.clearInterval(id);
  }, [d.mode, active]);

  async function launch() {
    if (why) return;
    if (!acct.signedIn) return acct.login();
    if (!attest.attested) return setStage("attest");
    if (window.innerWidth < 1000) document.querySelector(".cs-stage-w")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setStage("running");
    setErr("");
    try {
      await create.mutateAsync({
        name: d.name.trim(),
        symbol,
        components: d.picked.map((t) => stocks.find((s) => s.ticker === t)!.token),
        targetBps: weightsBps,
        mode: d.mode!,
        feeBps: d.feeBps,
        demo: d.demo,
        usdcSeed: seedUsd6,
        slippageBps: DEFAULT_SLIPPAGE_BPS,
        thesis: d.thesis.trim(),
        tags: d.story ? ["story"] : undefined,
      });
      // TODO(lib): persist story source/date with the basket meta.
      setStage("done");
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      setErr(describeTxError(e));
      setStage("error");
    }
  }

  const phase: CastPhase = stage === "running" ? "running" : stage === "done" ? "fused" : "edit";
  const picks = useMemo(() => d.picked.map((t) => ({ t, w: d.w[t] ?? 0 })), [d.picked, d.w]);
  const previewStyle = hoverStyle ?? d.mode ?? autoStyle;
  const basketAddr = create.result?.basket;
  const shareUrl = typeof window !== "undefined" && basketAddr ? `${window.location.origin}/b/${basketAddr}` : "";
  const feePct = d.feeBps / 100;
  const poolUsd = pool * 1000;

  function again() {
    setLive(false);
    setFused(false);
    setStage("edit");
    setD(EMPTY);
    create.resetStep?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function demo() {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const go = (sel: string) => document.querySelector(sel)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setD(EMPTY);
    go('[data-s="1"]');
    await sleep(600);
    const name = "Cloud Landlords", story = "The companies renting out the internet's computers.";
    for (let i = 1; i <= name.length; i++) {
      up({ name: name.slice(0, i) });
      await sleep(40);
    }
    for (let i = 1; i <= story.length; i += 2) {
      up({ thesis: story.slice(0, i) });
      await sleep(25);
    }
    up({ thesis: story });
    go('[data-s="2"]');
    await sleep(700);
    const want = ["MSFT", "AMZN", "GOOGL", "NVDA"].filter((t) => stocks.some((s) => s.ticker === t));
    for (const t of want) {
      toggle(t);
      await sleep(650);
    }
    go('[data-s="3"]');
    await sleep(800);
    const tgt: Record<string, number> = { MSFT: 35, AMZN: 30, GOOGL: 20, NVDA: 15 };
    setD((x) => ({ ...x, touched: true, w: Object.fromEntries(x.picked.map((t) => [t, tgt[t] ?? 0])) }));
    fit();
    await sleep(900);
    go('[data-s="4"]');
    await sleep(6500);
    up({ mode: "balanced" });
    await sleep(1500);
    go('[data-s="5"]');
    await sleep(700);
    setSeed("25");
    await sleep(1200);
    go(".cs-cast");
  }

  return (
    <div className="cs">
      <div className="cs-col">
        <div className="cs-intro">
          <div className="a-eyebrow">Creator studio</div>
          <WordReveal as="h1" className="a-h1 mt-4 block" immediate>
            Cast a <em>basket.</em>
          </WordReveal>
          <p className="a-lede mt-4">Up to 10 stocks, your weights, your rules. You put in your own money first, then others can follow.</p>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <button type="button" className="a-btn a-btn--line a-btn--sm" onClick={demo} disabled={stage === "running"}>
              ▶&nbsp; Watch it build itself
            </button>
            <span className="text-[12px] text-dim">or start below</span>
          </div>
        </div>

        <Step n={1} title="Name the idea" done={done[0]}>
          <div className="cs-lbl">
            <label htmlFor="cs-name">Name</label>
            <span className="num">{d.name.length}/40</span>
          </div>
          <input id="cs-name" className="cs-field" maxLength={40} value={d.name} placeholder="e.g. Cloud Landlords" autoComplete="off" onChange={(e) => up({ name: e.target.value })} />
          <div className="cs-lbl">
            <label htmlFor="cs-story">The story, in one line</label>
            <span className="num">{d.thesis.length}/140</span>
          </div>
          <input id="cs-story" className="cs-field" maxLength={140} value={d.thesis} placeholder="What do these companies have in common?" autoComplete="off" onChange={(e) => up({ thesis: e.target.value })} />
          <div className="mt-3 grid grid-cols-[120px_1fr] items-end gap-3">
            <div>
              <div className="cs-lbl !mt-0">
                <label htmlFor="cs-sym">Ticker</label>
              </div>
              <input
                id="cs-sym"
                className="cs-field num !h-11 uppercase tracking-[0.12em]"
                maxLength={6}
                value={symbol}
                placeholder="CLD"
                onChange={(e) => up({ symbol: e.target.value.toUpperCase().replace(/[^A-Z]/g, ""), symbolTouched: true })}
              />
            </div>
            <button type="button" className="cs-link" aria-pressed={d.story} onClick={() => up({ story: !d.story })}>
              {d.story ? "✓ Based on a public filing" : "Based on a public filing?"}
            </button>
          </div>
          {d.story && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <input aria-label="Source" className="cs-field !h-11" value={d.source} placeholder="Source, e.g. 13F filing" onChange={(e) => up({ source: e.target.value })} />
              <input aria-label="Date" type="date" className="cs-field !h-11" value={d.date} onChange={(e) => up({ date: e.target.value })} />
            </div>
          )}
        </Step>

        <Step n={2} title="Pick the stocks" done={done[1]}>
          <p className="cs-sub">
            Tap to drop one in. Two or more, up to 10. {d.picked.length > 0 && <span className="num">· {d.picked.length} picked</span>}
          </p>
          <div className="cs-picks">
            {stocks.map((s) => {
              const on = d.picked.includes(s.ticker);
              return (
                <button key={s.ticker} type="button" className={`cs-pk ${on ? "on" : ""}`} aria-pressed={on} onClick={() => toggle(s.ticker)}>
                  <div className="t">
                    <i style={{ background: tintCss(s.ticker) }} />
                    {s.ticker}
                  </div>
                  <div className="n">{s.name}</div>
                  <div className="p num">{s.price8 && BigInt(s.price8) > 0n ? formatPrice8(BigInt(s.price8)) : " "}</div>
                  <i className="c">{OK_ICON}</i>
                </button>
              );
            })}
          </div>
        </Step>

        <Step n={3} title="Set the weights" done={done[2]}>
          <p className="cs-sub">Slide, or drag a drop up and down on the stage.</p>
          {d.picked.length === 0 ? (
            <p className="text-[13.5px] text-dim">Pick stocks first.</p>
          ) : (
            d.picked.map((t) => (
              <div key={t} className="cs-wt">
                <div className="t">
                  <i style={{ background: tintCss(t) }} />
                  {t}
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  aria-label={`${t} weight`}
                  value={d.w[t] ?? 0}
                  style={{ "--p": `${d.w[t] ?? 0}%` } as React.CSSProperties}
                  onChange={(e) => setW(t, Number(e.target.value))}
                />
                <div className="v num">{d.w[t] ?? 0}%</div>
              </div>
            ))
          )}
          <Sum sum={sum} n={d.picked.length} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className="a-btn a-btn--line a-btn--sm" onClick={() => up({ w: even(d.picked), touched: false })}>
              Even split
            </button>
            <button type="button" className="a-btn a-btn--line a-btn--sm" onClick={fit}>
              Fit to 100%
            </button>
          </div>
        </Step>

        <Step n={4} title="Choose a style" done={done[3]}>
          <p className="cs-sub">What happens when one stock jumps. Watch the stage.</p>
          <div className="grid gap-2.5" role="radiogroup" aria-label="Style">
            {STYLE_ORDER.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={d.mode === m}
                className={`cs-sy ${d.mode === m ? "on" : ""} ${active === 4 && previewStyle === m && d.mode !== m ? "pv" : ""}`}
                onClick={() => up({ mode: m })}
                onPointerEnter={() => setHoverStyle(m)}
                onPointerLeave={() => setHoverStyle(null)}
              >
                {STYLE_ART[m]}
                <div>
                  <b>{STYLES[m].label}</b>
                  <span>{STYLES[m].line}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <em className="tagpv">Preview</em>
                  <i className="r" />
                </div>
              </button>
            ))}
          </div>
        </Step>

        <Step n={5} title="Put in your own money" done={done[4]}>
          <p className="cs-sub">Followers see you&apos;re in with them. From {formatUsd6(MIN_SEED_USDC, 0)}.</p>
          <label className="cs-money">
            <span>$</span>
            <input inputMode="decimal" value={d.seed} placeholder="25" autoComplete="off" aria-label="Your own money, in test dollars" onChange={(e) => setSeed(e.target.value)} />
          </label>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {[25, 100, 500].map((v) => (
              <button key={v} type="button" className="a-btn a-btn--line a-btn--sm" onClick={() => setSeed(String(v))}>
                ${v}
              </button>
            ))}
            {usdc.data !== undefined && usdc.data !== null && (
              <span className="ml-1 text-[12px] text-dim">
                You have {formatUsd6(usdc.data)} test money
                {usdc.data < seedUsd6 && (
                  <>
                    {" · "}
                    <Link href="/portfolio#money" className="text-mute underline underline-offset-4">
                      add more
                    </Link>
                  </>
                )}
              </span>
            )}
          </div>
          <div className="cs-fee">
            <div className="ln">
              <span>If followers put in</span>
              <b className="num">${poolUsd.toLocaleString("en-US")}</b>
            </div>
            <input type="range" min={1} max={100} value={pool} aria-label="Followers' money" style={{ "--p": `${((pool - 1) / 99) * 100}%` } as React.CSSProperties} onChange={(e) => setPool(Number(e.target.value))} />
            <div className="ln">
              <span className="flex flex-wrap items-center gap-1.5">
                They pay
                {[50, 100, 150, MAX_FEE_BPS].map((f) => (
                  <button key={f} type="button" className={`cs-fchip ${d.feeBps === f ? "on" : ""}`} aria-pressed={d.feeBps === f} onClick={() => up({ feeBps: f })}>
                    {f / 100}%
                  </button>
                ))}
                a year
              </span>
              <b className="num">${Math.round((poolUsd * feePct) / 100).toLocaleString("en-US")}</b>
            </div>
            <div className="ln big">
              <span>Your share</span>
              <b className="num">${Math.round((poolUsd * feePct * 0.8) / 100).toLocaleString("en-US")} / yr</b>
            </div>
            <small>80% of the yearly fee goes to you, 20% to Alloy.</small>
          </div>
        </Step>

        <section className="cs-cast">
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
              <div className="sm">
                {d.picked.length ? (
                  <>
                    <b>{d.name.trim() || "Untitled"}</b>
                    {symbol && <span className="num"> · {symbol}</span>} · {d.picked.map((t) => `${t} ${d.w[t] ?? 0}%`).join(", ")}
                    {d.mode ? ` · ${STYLES[d.mode].label}` : ""}
                    {okSeed ? ` · ${formatUsd6(seedUsd6)} in` : ""}
                  </>
                ) : (
                  "Fill in the steps above."
                )}
              </div>
              <label className="cs-demo">
                <input type="checkbox" checked={d.demo} onChange={(e) => up({ demo: e.target.checked })} disabled={stage === "running"} />
                <span>
                  Demo basket <span className="text-dim">· 10-minute change notice, shown as Demo</span>
                </span>
              </label>
              <button type="button" className="a-btn a-btn--buy cs-cast__btn" disabled={!!why || stage === "running" || stage === "done"} onClick={launch}>
                {stage === "running" ? "Casting…" : stage === "done" ? "Cast" : !acct.signedIn && !why ? "Sign in to cast it" : "Cast it"}
              </button>
              <div className="why">{why || "Everyone who follows gets this exact shape."}</div>
              {stage === "running" && (
                <div className="mt-4">
                  <TxProgress step={create.step} />
                </div>
              )}
              {stage === "error" && (
                <p className="mt-4 rounded-[14px] border border-[rgba(240,84,92,.35)] px-4 py-3 text-[13px]">
                  <span className="loss">Not cast.</span> Nothing was spent and your draft is kept. <span className="mt-1 block break-words text-dim">{err}</span>
                </p>
              )}
            </>
          )}
        </section>
      </div>

      <div className="cs-stage-w">
        <Stage
          picks={picks}
          style={d.mode}
          previewOn={active === 4}
          previewStyle={previewStyle}
          seedKey={seedKey}
          seedUsd={seedNum}
          phase={phase}
          hidden={live}
          recipeSeed={basketAddr?.toLowerCase() ?? d.name}
          onWeight={setW}
          onFused={() => {
            setFused(true);
            setLive(true);
          }}
          onPreview={setPvLine}
        >
          <div className="cs-cap">
            <div className="a-eyebrow flex justify-between">
              <span>Preview</span>
              <span>{d.mode ? STYLES[d.mode].label : ""}</span>
            </div>
            <h2 className={d.name ? "" : "ph"}>{d.name || "Your basket"}</h2>
            <p>{d.thesis}</p>
          </div>
          <div className="cs-empty" style={{ opacity: d.picked.length ? 0 : 1 }}>
            <div>
              <b>An empty mould.</b>Pick a stock and it drops in here.
            </div>
          </div>
          <div className="cs-pv" style={{ opacity: pvLine ? 1 : 0 }}>
            <small>{pvLine ? STYLES[pvLine.style].label : ""}</small>
            {pvLine?.line}
          </div>
          <div className="cs-foot">
            <Sum sum={sum} n={d.picked.length} />
          </div>
        </Stage>
      </div>

      {live && fused && (
        <LiveCard
          name={d.name.trim()}
          story={d.thesis.trim()}
          style={d.mode!}
          seed={formatUsd6(seedUsd6, 0)}
          picks={picks}
          address={basketAddr}
          url={shareUrl}
          onAgain={again}
        />
      )}
    </div>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section className={`cs-stp ${done ? "done" : ""}`} data-s={n} aria-labelledby={`cs-h${n}`}>
      <div className="cs-stp-h">
        <span className="n">{String(n).padStart(2, "0")}</span>
        <h3 id={`cs-h${n}`}>{title}</h3>
        <i className="ok" aria-label={done ? "Done" : undefined}>
          {OK_ICON}
        </i>
      </div>
      <div className="cs-stp-b">{children}</div>
    </section>
  );
}

function Sum({ sum, n }: { sum: number; n: number }) {
  const cls = n && sum === 100 ? "ok" : sum > 100 ? "over" : "";
  return (
    <div className={`cs-sum ${cls}`}>
      <div className="bar">
        <i style={{ width: `${Math.min(100, sum)}%` }} />
        <b />
      </div>
      <div className="txt num">
        {!n ? (
          <span className="text-dim">0%</span>
        ) : sum === 100 ? (
          <>
            100% <span className="text-mute">· ready</span> ✓
          </>
        ) : sum > 100 ? (
          <>
            <span className="loss">{sum}%</span> <span className="text-mute">· remove {sum - 100}</span>
          </>
        ) : (
          <>
            {sum}% <span className="text-mute">· add {100 - sum}</span>
          </>
        )}
      </div>
    </div>
  );
}

function LiveCard({
  name,
  story,
  style,
  seed,
  picks,
  address,
  url,
  onAgain,
}: {
  name: string;
  story: string;
  style: StrategyMode;
  seed: string;
  picks: { t: string; w: number }[];
  address?: Address;
  url: string;
  onAgain: () => void;
}) {
  const recipe = useMemo(() => ({ weights: picks.map((p) => ({ ticker: p.t, w: p.w / 100 })), style, seed: address?.toLowerCase() ?? name }), [picks, style, address, name]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied", { description: "Anyone with it can follow your basket." });
    } catch {
      toast.error("Couldn't copy");
    }
  };
  const x = `https://x.com/intent/post?text=${encodeURIComponent(`I just cast ${name} on Alloy (Base Sepolia test). ${url}`)}`;
  return (
    <div className="cs-live" role="dialog" aria-modal="true" aria-label="Your basket is live">
      <div className="cs-live__in">
        <div className="a-eyebrow">Cast</div>
        <WordReveal as="h2" className="a-h1 mt-3 block whitespace-nowrap !text-[clamp(34px,4.2vw,58px)]" immediate>
          Your basket is <em>live.</em>
        </WordReveal>
        <div className="cs-share">
          <MetalBasket recipe={recipe} state="breathe" zoom={4.2} className="a-sculpt h-[230px]" />
          <div className="px-[22px] pb-[22px] pt-[18px]">
            <h4 className="font-display text-[22px] font-light tracking-[-0.01em]">{name}</h4>
            <div className="mt-0.5 text-[12.5px] text-mute">
              by <b className="font-medium text-ink">you</b> · {STYLES[style].label} · <span className="num">{seed}</span> of your own in
            </div>
            {story && <p className="mt-2.5 text-[13.5px] text-mute">{story}</p>}
            <div className="mt-3.5 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11.5px] tracking-[0.04em] text-mute">
              {picks.map((p) => (
                <span key={p.t} className="flex items-center gap-1.5">
                  <i className="h-1.5 w-1.5 rounded-full" style={{ background: tintCss(p.t) }} />
                  {p.t} {p.w}%
                </span>
              ))}
            </div>
            {url && (
              <div className="cs-url">
                <span className="num truncate">{url.replace(/^https?:\/\//, "")}</span>
                <button type="button" className="a-btn a-btn--line a-btn--sm" onClick={copy}>
                  Copy link
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="mt-[18px] flex flex-wrap justify-center gap-2.5">
          <a className="a-btn a-btn--buy a-btn--lg" href={x} target="_blank" rel="noreferrer">
            Share it
          </a>
          {address ? (
            <Link className="a-btn a-btn--line a-btn--lg" href={`/b/${address}`}>
              Go to basket
            </Link>
          ) : null}
          <button type="button" className="a-btn a-btn--line a-btn--lg" onClick={onAgain}>
            Make another
          </button>
        </div>
      </div>
    </div>
  );
}

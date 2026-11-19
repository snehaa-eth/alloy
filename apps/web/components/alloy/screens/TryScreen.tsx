"use client";

import { ArrowDownLeft, ArrowUpRight, FlaskConical, Github, RefreshCw, Timer } from "lucide-react";
import { formatUsd6 } from "@/lib/units";
import { GLOBAL_DISCLAIMER, US_PERSON_ATTESTATION } from "@/components/compliance/copy";
import { Certificate } from "../Certificate";
import { Countdown } from "../Countdown";
import { AlloyBar, Banner, Button, ButtonLink, QuietLink, Stamp } from "../primitives";
import { pendingChange } from "../basket-view";
import { useAccount } from "../hooks";
import type { LoadedBasket } from "../load";

export function TryScreen({ demo, others }: { demo: LoadedBasket; others: LoadedBasket[] }) {
  const acct = useAccount();
  const v = demo.v;
  const b = v.basket;
  const change = pendingChange(demo.events, demo.v.basket);
  const notice = b.noticeSeconds >= 3600 ? `${b.noticeSeconds / 3600}h` : `${b.noticeSeconds / 60}-min`;
  const base = `/b/${b.address}`;

  const tour = [
    { icon: ArrowUpRight, title: "Buy $100", meta: "router.buy on Base Sepolia", href: `${base}?buy=100` },
    { icon: RefreshCw, title: "Open the pending change", meta: "RecipeProposed · exact time", href: `${base}?sheet=change` },
    { icon: ArrowDownLeft, title: "Get the stocks, 30%", meta: "in-kind redeem · never paused", href: `${base}?sheet=stocks` },
    { icon: Timer, title: "Watch it execute", meta: "keeper · or waits for market open", href: base },
  ];

  return (
    <div className="mx-auto max-w-app px-4 pb-10 pt-5 md:px-6 md:pt-8">
      <div className="c-top">
        <h1 className="t-body t-strong md:text-[20px]">2-minute tour</h1>
        <Stamp icon={FlaskConical} intent="test">
          Test
        </Stamp>
      </div>

      <div className="mt-3">
        {acct.signedIn ? (
          // TODO(lib): confirm the automatic drip (relayer dripTo) happened; show the faucet tx link.
          <Banner intent="test" icon={FlaskConical}>
            1,000 test dollars added. Not real money.
          </Banner>
        ) : (
          <Banner intent="test" icon={FlaskConical} action={<QuietLink onClick={() => acct.login()}>Start</QuietLink>}>
            Sign in with email. Test dollars arrive automatically.
          </Banner>
        )}
      </div>

      <div className="mt-4 grid gap-8 md:grid-cols-[400px_1fr] md:gap-12">
        <Certificate
          serial={v.id.serial}
          stamp={
            <Stamp icon={FlaskConical} intent="test">
              Demo
            </Stamp>
          }
          art={{ series: v.artSeries, weightsBps: v.weightsBps, seed: b.address, tone: v.id.tone }}
          title={b.name}
          label="Value per token"
          figure={formatUsd6(v.navPerShare)}
          bar={<AlloyBar parts={v.target} tone={v.id.tone} />}
          ledger={[
            { k: "Change", v: notice },
            { k: "Then", v: "get stocks" },
          ]}
          action={<ButtonLink href={`${base}?buy=100`}>Buy $100</ButtonLink>}
          footLink={others.length ? <QuietLink href="/explore">Other demos</QuietLink> : undefined}
          footMeta={change ? <Countdown to={change.executableAt ?? change.at} dueLabel="due · market open" /> : "Base Sepolia"}
        />

        <section className="flex flex-col gap-6" aria-labelledby="lab">
          <div className="flex flex-col">
            <h2 id="lab" className="t-label pb-2">
              Demo lab
            </h2>
            <ol className="flex flex-col">
              {tour.map((s, i) => (
                <li key={s.title}>
                  <a href={s.href} className="c-row">
                    <span className="c-rowicon">
                      <s.icon size={18} strokeWidth={1.75} aria-hidden />
                    </span>
                    <div className="c-row__main">
                      <span className="c-row__title">
                        <span className="t-mono c2 mr-2">{i + 1}</span>
                        {s.title}
                      </span>
                      <span className="c-row__meta">{s.meta}</span>
                    </div>
                  </a>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col gap-3">
            <ButtonLink href="/create" variant="secondary">
              Build your own
            </ButtonLink>
            <a className="c-link self-start" href="https://github.com/snehaa-eth/crates" target="_blank" rel="noreferrer">
              <Github size={14} aria-hidden /> Source code
            </a>
            {!acct.signedIn && (
              <Button variant="secondary" onClick={() => acct.login()}>
                Sign in
              </Button>
            )}
          </div>

          <div id="legal" className="flex flex-col gap-2 border-t border-bd pt-4">
            <h2 className="t-label">Legal</h2>
            <p className="t-small c2">{GLOBAL_DISCLAIMER}</p>
            <p className="t-small c2">{US_PERSON_ATTESTATION}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

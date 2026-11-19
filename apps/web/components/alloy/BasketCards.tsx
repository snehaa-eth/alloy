/**
 * Basket compositions: the Holding certificate (I-01) and the 64px list row.
 * A full certificate is never repeated in a list.
 */
import Link from "next/link";
import { Layers, FlaskConical } from "lucide-react";
import { formatUsd6 } from "@/lib/units";
import { Certificate } from "./Certificate";
import { RosetteTile } from "./Guilloche";
import { AlloyBar, ButtonLink, QuietLink, Signed, Stamp } from "./primitives";
import { compactUsd6, shortDate, type BasketView } from "./basket-view";

export function HoldingCertificate({ v, action }: { v: BasketView; action?: React.ReactNode }) {
  const b = v.basket;
  return (
    <Certificate
      serial={v.id.serial}
      stamp={
        b.demo ? (
          <Stamp icon={FlaskConical} intent="test">
            Demo
          </Stamp>
        ) : (
          <Stamp icon={Layers}>Basket</Stamp>
        )
      }
      art={{ series: v.artSeries, weightsBps: v.weightsBps, seed: b.address, tone: v.id.tone, label: `${b.name} engraving, drawn from its value history` }}
      title={b.name}
      label="Value per token"
      figure={formatUsd6(v.navPerShare)}
      bar={<AlloyBar parts={v.target} tone={v.id.tone} />}
      ledger={[
        { k: `Since ${shortDate(v.sinceDate)}`, v: <Signed bps={v.sinceBps} /> },
        {
          k: "Creator in",
          v: (
            <span className="gold">
              {compactUsd6(v.creatorStakeUsd6)} · {Math.round(v.creatorStakeBps / 100)}%
            </span>
          ),
        },
      ]}
      action={action ?? <ButtonLink href={`/b/${b.address}?buy=25`}>Buy</ButtonLink>}
      footLink={<QuietLink href={`/b/${b.address}`}>See inside</QuietLink>}
      footMeta={`@${b.creator.handle}`}
    />
  );
}

export function BasketRow({ v, href, value, changeBps, meta }: { v: BasketView; href?: string; value?: string; changeBps?: number; meta?: string }) {
  const b = v.basket;
  const body = (
    <>
      <RosetteTile series={v.artSeries} weightsBps={v.weightsBps} seed={b.address} tone={v.id.tone} />
      <div className="flex min-w-0 flex-col gap-2">
        <span className="c-mini__name">{b.name}</span>
        <AlloyBar parts={v.target} tone={v.id.tone} size="sm" legend={false} />
      </div>
      <div className="c-row__end">
        <span className="t-body">{value ?? formatUsd6(v.navPerShare)}</span>
        {meta ? <span className="c2">{meta}</span> : <Signed bps={changeBps ?? v.sinceBps} />}
      </div>
    </>
  );
  return href ? (
    <Link href={href} className="c-mini">
      {body}
    </Link>
  ) : (
    <div className="c-mini">{body}</div>
  );
}

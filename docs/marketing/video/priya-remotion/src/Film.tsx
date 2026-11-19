import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { Background, Finish } from "./components/Finish";
import { CertificateFrame } from "./components/CertificateFrame";
import { Caption, EXIT_FRAMES } from "./components/Caption";
import { AlloySweep, SheenPass } from "./components/AlloySweep";
import { CAPTIONS, CUT, SHEENS, SWEEPS } from "./timeline";
import { ensureFonts } from "./fonts";
import { S01Chip } from "./scenes/S01Chip";
import { S02Tickers } from "./scenes/S02Tickers";
import { S03Card } from "./scenes/S03Card";
import { S04Bars } from "./scenes/S04Bars";
import { S06Chart } from "./scenes/S06Chart";
import { S07Buy } from "./scenes/S07Buy";
import { S08Trim } from "./scenes/S08Trim";
import { S11Sell } from "./scenes/S11Sell";
import { S12Wordmark } from "./scenes/S12Wordmark";
import { Soundtrack, type MusicId } from "./Soundtrack";

ensureFonts();

export type FilmProps = { music: MusicId; sound?: boolean };

// Layer stack (bottom → top): background → visuals → captions → certificate frame → metal transitions → grade/grain.
export const Film: React.FC<FilmProps> = ({ music, sound = true }) => {
  const { fps } = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  const TAIL = 12; // scenes stay alive under the next cut's sweep
  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0A0A" }}>
      <Background />
      <Sequence name="Visuals" layout="none">
        <Sequence name="C1 · Chip" from={f(CUT.c1)} durationInFrames={f(CUT.c2) + TAIL} premountFor={fps}>
          <S01Chip />
        </Sequence>
        <Sequence name="C2 · Tickers + fold" from={f(CUT.c2)} durationInFrames={f(CUT.c3) - f(CUT.c2)} premountFor={fps}>
          <S02Tickers />
        </Sequence>
        <Sequence name="C3 · Certificate on phone" from={f(CUT.fold)} durationInFrames={f(CUT.c4) - f(CUT.fold) + TAIL} premountFor={fps}>
          <S03Card exitAt={f(CUT.c4) - f(CUT.fold)} />
        </Sequence>
        <Sequence name="C4 · Five alloy ingots" from={f(CUT.c4)} durationInFrames={f(CUT.c6) - f(CUT.c4) + TAIL} premountFor={fps}>
          <S04Bars dur={f(CUT.c6) - f(CUT.c4)} />
        </Sequence>
        <Sequence name="C6 · Followers vs creator" from={f(CUT.c6)} durationInFrames={f(CUT.c7) - f(CUT.c6) + TAIL} premountFor={fps}>
          <S06Chart dur={f(CUT.c7) - f(CUT.c6)} exitAt={f(CUT.c7) - f(CUT.c6)} />
        </Sequence>
        <Sequence name="C7 · $5 buy" from={f(CUT.c7)} durationInFrames={f(CUT.c8) - f(CUT.c7) + TAIL} premountFor={fps}>
          <S07Buy />
        </Sequence>
        <Sequence name="C8–C9 · Drift + trim" from={f(CUT.c8)} durationInFrames={f(CUT.c11) - f(CUT.c8) + TAIL} premountFor={fps}>
          <S08Trim trimAt={f(CUT.c9) - f(CUT.c8)} dur={f(CUT.c11) - f(CUT.c8)} />
        </Sequence>
        <Sequence name="C11 · Sell slider" from={f(CUT.c11)} durationInFrames={f(CUT.c12) - f(CUT.c11) + TAIL} premountFor={fps}>
          <S11Sell />
        </Sequence>
        <Sequence name="C12–C13 · Wordmark + end card" from={f(CUT.c12)} durationInFrames={f(CUT.end) - f(CUT.c12)} premountFor={fps}>
          <S12Wordmark endAt={f(CUT.c13) - f(CUT.c12)} />
        </Sequence>
      </Sequence>
      <Sequence name="Captions" layout="none">
        {CAPTIONS.map((c, i) => (
          <Sequence
            key={c.id}
            name={`${c.id} · ${c.lines.map((l) => l.text).join(" ")}`}
            from={f(c.from)}
            durationInFrames={f(c.to) - f(c.from) + (i === CAPTIONS.length - 1 ? 0 : EXIT_FRAMES)}
          >
            <Caption c={c} holdFrames={f(c.to) - f(c.from)} startAt={4} isLast={i === CAPTIONS.length - 1} />
          </Sequence>
        ))}
      </Sequence>
      <CertificateFrame />
      <Sequence name="Metal transitions" layout="none">
        {SWEEPS.map((s, i) => (
          <AlloySweep key={`sw${s}`} name={`Alloy sweep @${s}s`} from={f(s)} flip={i % 2} />
        ))}
        {SHEENS.map((s) => (
          <Sequence key={`sh${s}`} name={`Sheen @${s}s`} from={f(s) - 3} durationInFrames={18}>
            <SheenPass dur={18} />
          </Sequence>
        ))}
      </Sequence>
      <Finish />
      {sound ? <Soundtrack music={music} /> : null}
    </AbsoluteFill>
  );
};

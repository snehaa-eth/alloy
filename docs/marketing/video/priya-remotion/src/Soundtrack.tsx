import { Audio } from "@remotion/media";
import { interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CAPTIONS, CUT, SHEENS, SWEEPS } from "./timeline";
import { BUY } from "./scenes/S07Buy";
import { SELL } from "./scenes/S11Sell";

export type MusicId = "electronica" | "elegant" | "refined";

// Music is pre-stretched to exactly 120 BPM (ffmpeg atempo, pitch kept): every locked cut (multiples of 0.5 s)
// then falls on a beat, and trimBefore puts a downbeat at 0.5 s. Volume brings each bed to ≈ −18 LUFS.
export const MUSIC: Record<MusicId, { file: string; trim: number; vol: number; credit: string }> = {
  electronica: { file: "music/minimal-electronica-120.wav", trim: 0.673, vol: 0.4, credit: "Minimal Electronica · Kulakovka (Pixabay)" },
  elegant: { file: "music/elegant-minimal-120.wav", trim: 0.159, vol: 0.5, credit: "Elegant Minimal · penguinmusic (Pixabay)" },
  refined: { file: "music/refined-motion-120.wav", trim: 0.129, vol: 0.76, credit: "Refined Motion · u_98673jp944 (Pixabay)" },
};

type Cue = { at: number; sfx: string; vol: number; duck?: boolean };

export const useCues = (fps: number): Cue[] => {
  const f = (s: number) => Math.round(s * fps);
  const cues: Cue[] = [];
  CAPTIONS.forEach((c, i) => cues.push({ at: f(c.from) + (i === 0 ? 2 : 2), sfx: "decode", vol: 0.5 }));
  SWEEPS.forEach((s) => cues.push({ at: f(s) - 2, sfx: "whoosh", vol: 0.75, duck: true }));
  SHEENS.forEach((s) => cues.push({ at: f(s) - 3, sfx: "sheen", vol: 0.55 }));
  // C1: die seats, then a sheen crosses the chip
  cues.push({ at: f(1.85), sfx: "impact", vol: 0.28 });
  cues.push({ at: f(2.33), sfx: "sheen", vol: 0.5 });
  // fold: the cloud collapses into one line → soft impact, card opens
  cues.push({ at: f(CUT.fold) + 12, sfx: "impact", vol: 0.7, duck: true });
  cues.push({ at: f(CUT.fold) + 76, sfx: "sheen", vol: 0.45 });
  // C7 buy
  cues.push({ at: f(CUT.c7) + BUY.tap5 - 1, sfx: "click", vol: 0.7 });
  cues.push({ at: f(CUT.c7) + BUY.press - 1, sfx: "click", vol: 0.6 });
  cues.push({ at: f(CUT.c7) + BUY.press, sfx: "hold", vol: 0.6 });
  cues.push({ at: f(CUT.c7) + BUY.check - 1, sfx: "check", vol: 0.7, duck: true });
  // C8 calendar flip, NVDA runs ahead
  cues.push({ at: f(CUT.c8) + 8, sfx: "flip", vol: 0.6 });
  cues.push({ at: f(CUT.c8) + 26, sfx: "slide", vol: 0.45 });
  // C9 trim: sliver peels, receipt lands
  cues.push({ at: f(CUT.c9) + 7, sfx: "flake", vol: 0.8 });
  cues.push({ at: f(CUT.c9) + 45, sfx: "click", vol: 0.45 });
  // C11 sell slider
  cues.push({ at: f(CUT.c11) + SELL.start - 1, sfx: "slide", vol: 0.55 });
  cues.push({ at: f(CUT.c11) + SELL.end - 1, sfx: "click", vol: 0.6 });
  // C12 wordmark engraves, sheen
  cues.push({ at: f(CUT.c12) + 6, sfx: "impact", vol: 0.55, duck: true });
  cues.push({ at: f(CUT.c12) + 43, sfx: "sheen", vol: 0.5 });
  return cues.sort((a, b) => a.at - b.at);
};

const MusicBed: React.FC<{ music: MusicId }> = ({ music }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const m = MUSIC[music];
  const cues = useCues(fps).filter((c) => c.duck);
  // gentle sidechain-style dips (≈ −3 dB, 300 ms) under the big hits
  let duck = 1;
  cues.forEach((c) => {
    const d = frame - c.at;
    if (d >= -2 && d < 12) duck = Math.min(duck, interpolate(d, [-2, 1, 11], [1, 0.7, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  });
  const fade = interpolate(frame, [0, 0.5 * fps, durationInFrames - 3 * fps, durationInFrames - 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <Audio name={`Music · ${music}`} src={staticFile(m.file)} trimBefore={Math.round(m.trim * fps)} volume={m.vol * fade * duck} />;
};

export const Soundtrack: React.FC<{ music: MusicId }> = ({ music }) => {
  const { fps } = useVideoConfig();
  const cues = useCues(fps);
  return (
    <>
      <Sequence name="Music" layout="none">
        <MusicBed music={music} />
      </Sequence>
      <Sequence name="SFX" layout="none">
        {cues.map((c, i) => (
          <Sequence key={i} name={`${c.sfx} @${(c.at / fps).toFixed(2)}s`} from={c.at} durationInFrames={Math.round(1.6 * fps)} layout="none">
            <Audio src={staticFile(`sfx/${c.sfx}.wav`)} volume={c.vol} />
          </Sequence>
        ))}
      </Sequence>
    </>
  );
};

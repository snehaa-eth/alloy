import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RECIPE, theme } from "../theme";
import { engraveMat, hex, U } from "./engrave";
import { CameraRig, type CamSpec } from "./rig";
import { rng } from "../util";

// The basket as five engraved alloy ingots: length = weight. Shared by C4 (open), C8 (drift) and C9 (trim).
export const BAR = { u: 0.066, h: 0.36, d: 0.55, gap: 0.2, x0: -1.9, excessW: 8 };
export const barY = (k: number) => (2 - k) * (BAR.h + BAR.gap);
export const barEnd = (k: number, extraW = 0) => BAR.x0 + (RECIPE[k].w + extraW) * BAR.u;

export type BarsProps = {
  cam: CamSpec;
  grow: number[]; // per bar 0..1
  reveal: number; // 0..1.15 engraving draw-on
  sheen: number; // world sheen position (-99 = off)
  excess: number; // 0..1 of BAR.excessW extra NVDA weight
  dim: number; // 0..1 dims the other four bars
  target: number; // 0..1 dotted target line visibility
  flakeT: number; // seconds since the trim (-1 = intact)
  excessAlpha?: number;
};

export const Bars3D: React.FC<BarsProps> = ({ cam, grow, reveal, sheen, excess, dim, target, flakeT, excessAlpha = 1 }) => {
  const parts = useMemo(() => {
    const bars = RECIPE.map((r, k) => {
      const L = r.w * BAR.u;
      const geo = new RoundedBoxGeometry(L, BAR.h, BAR.d, 4, 0.03);
      geo.translate(L / 2, 0, 0);
      const fade = 1 - (0.45 * k) / 4;
      const mat = engraveMat(4, { spacing: 0.03, sweepDir: [1 / 2.8, 0.08, 0], sweepOff: 0.02 + k * 0.03 });
      U(mat).uBright.value = fade;
      return { geo, mat, fade };
    });
    const exL = BAR.excessW * BAR.u;
    const exGeo = new RoundedBoxGeometry(exL, BAR.h, BAR.d, 4, 0.03);
    exGeo.translate(exL / 2, 0, 0);
    const exMat = engraveMat(4, { spacing: 0.03, sweepDir: [1, 0, 0], sweepOff: 0, lo: "#24467F", hi: "#C9D9F2" });
    U(exMat).uReveal.value = 1.2;
    // dotted target line
    const dots: THREE.Vector3[] = [];
    for (let i = 0; i < 9; i++) dots.push(new THREE.Vector3(0, -BAR.h / 2 - 0.2 + i * ((BAR.h + 0.4) / 8), BAR.d / 2 + 0.02));
    const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...hex(theme.colors.text).toArray()), transparent: true });
    // flakes: the trimmed sliver breaks into engraved chips that drift off
    const r = rng(77);
    const NF = 48;
    const flakeGeo = new THREE.BoxGeometry(exL / 8, BAR.h / 6, BAR.d / 5);
    const flakeMat = engraveMat(4, { spacing: 0.012, lo: "#24467F", hi: "#C9D9F2" });
    U(flakeMat).uReveal.value = 1.2;
    const flakes = new THREE.InstancedMesh(flakeGeo, flakeMat, NF);
    const seeds = Array.from({ length: NF }, (_, i) => ({
      p: new THREE.Vector3((i % 8) / 8 * exL + exL / 16, ((Math.floor(i / 8) % 6) - 2.5) * (BAR.h / 6), (r() - 0.5) * BAR.d * 0.6),
      v: new THREE.Vector3(0.5 + r() * 1.2, 0.2 + r() * 0.9, (r() - 0.3) * 0.8),
      ax: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
      spin: 2 + r() * 5,
      delay: (1 - ((i % 8) + 0.5) / 8) * 0.8 + r() * 0.06,
    }));
    return { bars, exGeo, exMat, dots, dotMat, flakes, flakeMat, seeds };
  }, []);

  parts.bars.forEach((b, k) => {
    U(b.mat).uReveal.value = reveal;
    U(b.mat).uSheen.value = sheen;
    U(b.mat).uBright.value = b.fade * (k === 0 ? 1 : 1 - 0.6 * dim);
    U(b.mat).uLightPos.value.set(-1.6, 2.6, 3.4);
    U(b.mat).uKey.value = 5;
  });
  U(parts.exMat).uKey.value = 5;
  U(parts.flakeMat).uKey.value = 5;
  U(parts.exMat).uSheen.value = sheen;
  U(parts.exMat).uLightPos.value.set(-1.6, 2.6, 3.4);
  U(parts.exMat).uOpacity.value = excessAlpha;
  parts.dotMat.opacity = target * 0.85;

  // flakes
  const showFlakes = flakeT >= 0 && flakeT < 2.4;
  if (showFlakes) {
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion();
    parts.seeds.forEach((s, i) => {
      const lt0 = flakeT - s.delay;
      if (lt0 < 0) {
        m.makeScale(0.0001, 0.0001, 0.0001);
        parts.flakes.setMatrixAt(i, m);
        return;
      }
      const lt = lt0;
      const k = 1 - Math.exp(-lt * 2.2);
      const pos = s.p.clone().addScaledVector(s.v, k * 1.1).add(new THREE.Vector3(0, -0.25 * lt * lt, 0));
      q.setFromAxisAngle(s.ax, lt * s.spin);
      const sc = Math.max(0.001, 1 - lt / 1.6);
      m.compose(pos, q, new THREE.Vector3(sc, sc, sc));
      parts.flakes.setMatrixAt(i, m);
    });
    parts.flakes.instanceMatrix.needsUpdate = true;
    U(parts.flakeMat).uOpacity.value = Math.max(0, 1 - Math.max(0, flakeT - 0.6) / 1.6);
    U(parts.flakeMat).uSheen.value = sheen;
    U(parts.flakeMat).uLightPos.value.set(-1.6, 2.6, 3.4);
  }
  const x35 = barEnd(0);
  return (
    <>
      <CameraRig {...cam} />
      {parts.bars.map((b, k) => (
        <mesh key={k} geometry={b.geo} material={b.mat} position={[BAR.x0, barY(k), 0]} scale={[Math.max(0.0001, grow[k]), 1, 1]} />
      ))}
      {excess > 0.001 ? (
        <mesh geometry={parts.exGeo} material={parts.exMat} position={[x35 + 0.012, barY(0), 0]} scale={[excess, 1, 1]} />
      ) : null}
      {showFlakes ? <primitive object={parts.flakes} position={[x35 + 0.012, barY(0), 0]} /> : null}
      {target > 0
        ? parts.dots.map((p, i) => (
            <mesh key={i} position={[x35 + 0.006, barY(0) + p.y, p.z]} material={parts.dotMat}>
              <boxGeometry args={[0.016, 0.034, 0.016]} />
            </mesh>
          ))
        : null}
    </>
  );
};

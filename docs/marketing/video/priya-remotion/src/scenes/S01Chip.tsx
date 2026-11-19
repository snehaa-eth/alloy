import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { engraveMat, U } from "../three/engrave";
import { CameraRig } from "../three/rig";
import { Stage, ThreeZone } from "../components/Stage";
import { inter } from "../components/UI";
import { theme } from "../theme";
import { prog, lerp } from "../util";
import { useLayout } from "../layout";

// C1 · "Priya wants to invest in AI." — an AI chip engraves itself into existence while the camera pushes in.
const PIN_N = 14,
  PIN_PITCH = 0.115;
const pinGeometry = () => {
  const a = new THREE.BoxGeometry(0.17, 0.028, 0.055);
  a.translate(0.085, 0, 0);
  const b = new THREE.BoxGeometry(0.028, 0.15, 0.055);
  b.translate(0.17, -0.061, 0);
  const c = new THREE.BoxGeometry(0.15, 0.028, 0.055);
  c.translate(0.235, -0.122, 0);
  return mergeGeometries([a, b, c].map((g) => g.toNonIndexed()));
};

const Chip: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const L = useLayout();
  const parts = useMemo(() => {
    const pkgGeo = new RoundedBoxGeometry(2.0, 0.2, 2.0, 4, 0.035);
    const stepGeo = new RoundedBoxGeometry(1.38, 0.03, 1.38, 2, 0.012);
    stepGeo.translate(0, 0.115, 0);
    const dieGeo = new RoundedBoxGeometry(1.16, 0.1, 1.16, 4, 0.02);
    dieGeo.translate(0, 0.18, 0);
    const capGeo = new THREE.BoxGeometry(0.075, 0.045, 0.04);
    capGeo.translate(0, 0.1225, 0);
    const mats = {
      pkg: engraveMat(0),
      step: engraveMat(0),
      die: engraveMat(1),
      pin: engraveMat(2),
      cap: engraveMat(3),
    };
    // pins: rest matrices + slide-in vectors
    const pinRest: THREE.Matrix4[] = [];
    const pinSlide: { v: THREE.Vector3; at: number }[] = [];
    const q = new THREE.Quaternion(),
      up = new THREE.Vector3(0, 1, 0);
    for (let side = 0; side < 4; side++) {
      q.setFromAxisAngle(up, (side * Math.PI) / 2);
      for (let j = 0; j < PIN_N; j++) {
        const z = (j - (PIN_N - 1) / 2) * PIN_PITCH;
        const pos = new THREE.Vector3(1.0, 0, z).applyQuaternion(q);
        pinRest.push(new THREE.Matrix4().compose(pos, q.clone(), new THREE.Vector3(1, 1, 1)));
        const out = new THREE.Vector3(1, 0, 0).applyQuaternion(q).multiplyScalar(0.9).add(new THREE.Vector3(0, 0.55, 0));
        const order = side * PIN_N + (side % 2 ? PIN_N - 1 - j : j);
        pinSlide.push({ v: out, at: 0.7 + order * 0.0135 });
      }
    }
    const pins = new THREE.InstancedMesh(pinGeometry(), mats.pin, PIN_N * 4);
    const capPos: [number, number, number][] = [];
    for (let k = 0; k < 6; k++) {
      const z = -0.5 + k * 0.2;
      capPos.push([0.82, z, 0], [-0.82, z, 0], [z, 0.82, 1], [z, -0.82, 1]);
    }
    const caps = new THREE.InstancedMesh(capGeo, mats.cap, capPos.length);
    capPos.forEach(([x, z, r], i) => {
      const m = new THREE.Matrix4().makeRotationY(r ? 0 : Math.PI / 2);
      m.setPosition(x, 0, z);
      caps.setMatrixAt(i, m);
    });
    return { pkgGeo, stepGeo, dieGeo, mats, pins, pinRest, pinSlide, caps };
  }, []);

  // pins slide in (deterministic per frame)
  const m = new THREE.Matrix4();
  parts.pinRest.forEach((rest, i) => {
    const { v, at } = parts.pinSlide[i];
    const k = Math.min(1, Math.max(0, (t - at) / 0.8));
    const e = 1 - Math.pow(1 - k, 3);
    m.copy(rest);
    m.elements[12] += v.x * (1 - e);
    m.elements[13] += v.y * (1 - e);
    m.elements[14] += v.z * (1 - e);
    parts.pins.setMatrixAt(i, m);
  });
  parts.pins.instanceMatrix.needsUpdate = true;

  const rev = (a: number, b: number) => prog(frame, a * fps, b * fps, (x) => x) * 1.15;
  U(parts.mats.pkg).uReveal.value = rev(0.2, 1.7);
  U(parts.mats.step).uReveal.value = rev(0.5, 2.0);
  U(parts.mats.pin).uReveal.value = rev(0.7, 2.2);
  U(parts.mats.cap).uReveal.value = rev(1.5, 2.4);
  U(parts.mats.die).uReveal.value = rev(1.05, 2.4);
  U(parts.mats.die).uOffset.value.set(0, 0.9 * (1 - prog(frame, 0.95 * fps, 1.9 * fps)), 0);
  const sh = prog(frame, 2.35 * fps, 3.35 * fps, theme.ease.inOut);
  Object.values(parts.mats).forEach((mt) => {
    U(mt).uSheen.value = sh > 0 && sh < 1 ? -3.2 + sh * 6.4 : -99;
    U(mt).uLightPos.value.set(-1.45, 2.65, 1.45);
  });

  // camera: slow push-in + orbit (motion lives in the object, never over the text)
  const push = prog(frame, 0, 3.9 * fps, theme.ease.soft);
  const dist = L.square ? lerp(7.9, 7.0, push) : lerp(10.4, 8.5, push);
  const az = lerp(-0.5, -0.18, push);
  const el = 0.83;
  const camPos: [number, number, number] = [Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist];
  const aspect = L.W / L.zone.height;
  const fov = aspect > 1.5 ? 20 : 26;
  return (
    <>
      <CameraRig pos={camPos} target={[0, -0.05 + (L.square ? 0 : 0.1), 0]} fov={fov} />
      <group position={[0, 0.04 * Math.sin(t * 0.9), 0]}>
        <mesh geometry={parts.pkgGeo} material={parts.mats.pkg} />
        <mesh geometry={parts.stepGeo} material={parts.mats.step} />
        <mesh geometry={parts.dieGeo} material={parts.mats.die} />
        <primitive object={parts.pins} />
        <primitive object={parts.caps} />
      </group>
    </>
  );
};

export const S01Chip: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const tagIn = prog(frame, 0.55 * fps, 1.0 * fps);
  return (
    <AbsoluteFill>
      <ThreeZone>
        <Chip />
      </ThreeZone>
      <Stage>
        <div
          style={{
            position: "absolute",
            left: L.square ? 0 : 540,
            top: L.square ? 110 : 950,
            whiteSpace: "nowrap",
            translate: `${L.square ? "0%" : "-50%"} ${(1 - tagIn) * 14}px`,
            opacity: tagIn,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "12px 20px",
            border: `1px solid ${theme.colors.border}`,
            borderRadius: 2,
            background: "rgba(10,10,10,0.6)",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text3} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span style={{ ...inter, fontWeight: 600, fontSize: 40, color: theme.colors.text }}>Priya, Pune</span>
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

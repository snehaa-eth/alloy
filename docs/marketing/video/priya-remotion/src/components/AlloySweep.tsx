import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { JEWELS, RECIPE } from "../theme";
import { hex } from "../three/engrave";

// The metallic "alloy bar" transition: five polished jewel bands (thickness = AI Build-Out weights)
// sweep across in alternating directions with a molten leading edge and 8-sample 180° shutter blur.
// Starts exactly at the cut, so no hold is shortened; the next card is revealed by the trailing edge.
const FRAG = (W: number, H: number) => /* glsl */ `
uniform float uT; uniform float uFlip; uniform vec3 uDeep[5]; uniform vec3 uMid[5]; uniform float uEdges[6];
varying vec2 vUv;
float eio(float x){ x = clamp(x, 0.0, 1.0); return x < 0.5 ? 4.0*x*x*x : 1.0 - pow(-2.0*x + 2.0, 3.0) / 2.0; }
vec4 bars(float t, vec2 uv){
  float y = 1.0 - uv.y;
  int bi = 0; float y0 = 0.0, y1 = 1.0;
  for (int i = 0; i < 5; i++) { if (y >= uEdges[i] && y < uEdges[i+1]) { bi = i; y0 = uEdges[i]; y1 = uEdges[i+1]; } }
  float fi = float(bi);
  float d = fi * 0.012;
  float lead  = eio((t - d) / 0.24) * 1.25 - 0.02;
  float trail = eio((t - 0.2 - d) / 0.24) * 1.25 - 0.08;
  float x = mod(fi + uFlip, 2.0) < 0.5 ? uv.x : 1.0 - uv.x;
  if (x > lead || x < trail) return vec4(0.0);
  float v = (y - y0) / (y1 - y0);
  float hpx = (y1 - y0) * ${H.toFixed(1)};
  float body = pow(sin(3.14159 * clamp(v, 0.0, 1.0)), 0.6);
  float env = 0.30 + 0.70 * smoothstep(0.05, 0.4, v) * (1.0 - smoothstep(0.55, 0.98, v));
  env -= 0.35 * exp(-pow((v - 0.52) * hpx / (hpx * 0.06 + 6.0), 2.0));
  vec3 c = mix(uDeep[bi] * 0.9, uMid[bi] * 1.05, body * env);
  c += vec3(0.96, 0.94, 0.90) * exp(-pow((v - 0.2) * hpx / 4.0, 2.0)) * 0.75;
  c += vec3(0.96, 0.94, 0.90) * exp(-pow((v - 0.2) * hpx / 26.0, 2.0)) * 0.12;
  c += uMid[bi] * exp(-pow((v - 0.82) * hpx / 40.0, 2.0)) * 0.22;
  float row = floor(y * ${H.toFixed(1)} / 1.5);
  c *= 0.93 + 0.1 * fract(sin(row * 12.9898 + fi * 7.0) * 43758.5453);
  c *= 0.92 + 0.08 * sin(y * ${H.toFixed(1)} * 3.14159 / 3.0);
  float sx = x - (lead - 0.35);
  c += vec3(0.95, 0.92, 0.86) * exp(-pow(sx / 0.08, 2.0)) * 0.22;
  float edge = exp(-max(lead - x, 0.0) * ${W.toFixed(1)} / 26.0);
  c = mix(c, vec3(0.98, 0.95, 0.88), edge * 0.75);
  float tail = smoothstep(trail, trail + 0.12, x);
  float seam = smoothstep(0.0, 2.0, min(v * hpx, (1.0 - v) * hpx));
  c *= mix(0.25, 1.0, seam);
  return vec4(c * tail, tail);
}
void main(){
  vec4 acc = vec4(0.0);
  for (int k = 0; k < 8; k++) acc += bars(uT - (float(k) / 8.0) * (1.0 / 60.0), vUv);
  gl_FragColor = acc / 8.0;
}`;

const SweepQuad: React.FC<{ flip: number }> = ({ flip }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const mat = useMemo(() => {
    let acc = 0;
    const edges: number[] = [];
    RECIPE.forEach((b) => {
      edges.push(acc / 100);
      acc += b.w;
    });
    edges.push(1);
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uT: { value: 0 },
        uFlip: { value: flip },
        uDeep: { value: JEWELS.map((j) => hex(j.deep)) },
        uMid: { value: JEWELS.map((j) => hex(j.mid)) },
        uEdges: { value: edges },
      },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: FRAG(width, height),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    });
    return m;
  }, [flip, width, height]);
  mat.uniforms.uT.value = frame / fps;
  return (
    <mesh frustumCulled={false} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
};

export const AlloySweep: React.FC<{ from: number; flip?: number; name?: string }> = ({ from, flip = 0, name }) => {
  const { width, height, fps } = useVideoConfig();
  return (
    <ThreeCanvas
      name={name ?? "Alloy sweep"}
      from={from}
      durationInFrames={Math.round(0.62 * fps)}
      premountFor={fps}
      width={width}
      height={height}
      linear
      flat
      gl={{ alpha: true, premultipliedAlpha: true, antialias: false }}
      style={{ position: "absolute", inset: 0 }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <SweepQuad flip={flip} />
    </ThreeCanvas>
  );
};

// Soft turn: a single diagonal light pass across the frame (metal catching light), 0.55 s.
export const SheenPass: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = Math.min(1, Math.max(0, frame / dur));
  const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const x = -0.6 + e * 2.2; // band centre in frame widths
  const a = Math.sin(Math.PI * t);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        mixBlendMode: "screen",
        opacity: a,
        background: `linear-gradient(115deg, transparent ${(x - 0.16) * 100}%, rgba(169,195,236,0.10) ${(x - 0.06) * 100}%, rgba(242,240,237,0.32) ${x * 100}%, rgba(227,204,156,0.10) ${(x + 0.05) * 100}%, transparent ${(x + 0.14) * 100}%)`,
        maskImage: `repeating-linear-gradient(180deg, #000 0px, #000 2px, rgba(0,0,0,0.35) 2px, rgba(0,0,0,0.35) 4px)`,
        width,
        height,
      }}
    />
  );
};

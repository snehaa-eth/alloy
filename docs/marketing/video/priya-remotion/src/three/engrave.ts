// Engraving shader: real 3D geometry drawn as banknote-style intaglio lines in one jewel colour.
// Ported from docs/marketing/video/style-test-3d/scene.js (FRAG), moved to world-space lighting so any
// object/camera transform works, plus derivative keylines (no extra render pass needed).
// Deterministic: every uniform is set from useCurrentFrame(); nothing animates on its own.
import * as THREE from "three";

export const hex = (h: string) =>
  new THREE.Vector3(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);

const VERT = /* glsl */ `
uniform vec3 uOffset;
varying vec3 vP; varying vec3 vRN; varying vec3 vWN; varying vec3 vWP;
void main(){
  vec3 restP = position; vec3 restN = normal;
  #ifdef USE_INSTANCING
    restP = (instanceMatrix * vec4(position,1.0)).xyz; restN = normalize(mat3(instanceMatrix) * normal);
  #endif
  vP = restP; vRN = restN;
  vec4 wp = modelMatrix * vec4(restP + uOffset, 1.0);
  vWP = wp.xyz;
  vWN = normalize(mat3(modelMatrix) * restN);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */ `
uniform float uReveal, uSpacing, uSheen, uBright, uKey, uOpacity;
uniform vec3 uLightPos, uLight2, uColLo, uColHi, uPaper, uSweepDir, uSheenDir;
uniform float uSweepOff;
varying vec3 vP; varying vec3 vRN; varying vec3 vWN; varying vec3 vWP;
float hash(float n){ return fract(sin(n * 127.1 + 11.7) * 43758.5453); }
float lineCov(float c, float w){
  float d = abs(fract(c) - 0.5);
  float aa = max(fwidth(c), 1e-4) * 0.8;
  float cov = 1.0 - smoothstep(w - aa, w + aa, 0.5 - d);
  return mix(cov, clamp(2.0 * w, 0.0, 1.0), smoothstep(0.35, 0.8, aa));
}
void main(){
  vec3 p = vP; vec3 rn = vRN;
  float g = clamp(dot(p, uSweepDir) + uSweepOff, 0.0, 1.0);
  vec3 n = normalize(vWN);
  vec3 v = normalize(cameraPosition - vWP);
  vec3 lv = uLightPos - vWP;
  vec3 l = normalize(lv);
  float dif = max(dot(n, l), 0.0);
  float dif2 = max(dot(n, normalize(uLight2)), 0.0);
  vec3 h = normalize(l + v);
  float spec = pow(max(dot(n, h), 0.0), 70.0);
  float fall = 1.0 / (1.0 + 0.09 * dot(lv, lv) / max(uKey, 0.01));
  float L = 0.03 + 1.9 * dif * fall + 0.18 * dif2;
  vec3 rf = reflect(-v, n);
  L += 0.22 * smoothstep(0.55, 0.95, dot(rf, normalize(l + vec3(0.0, 0.6, 0.0))));
  L = pow(L, 1.2) * uBright;
  float s = dot(vWP, uSheenDir);
  float sh = exp(-pow((s - uSheen) / 0.36, 2.0));
  float Lc = clamp(L + spec * 0.7 + sh * 0.6, 0.0, 1.3);

  float sp = uSpacing;
  float w = mix(0.05, 0.40, pow(smoothstep(0.0, 1.0, Lc), 1.15));
  float c = 0.0; float cov = 0.0; float c2 = -1.0;
  bool top = rn.y > 0.7;
#if PATTERN == 0
  if (top) {
    c = max(abs(p.x), abs(p.z)) / sp;
    cov = lineCov(c, w);
    float dm = length(p.xz - vec2(-0.78, -0.78));
    cov = max(cov, (1.0 - smoothstep(0.05, 0.05 + fwidth(dm) * 1.2, dm)) * 0.9);
    c2 = (p.x - p.z) / (sp * 1.6);
  } else if (rn.y < -0.7) { c = p.x / sp; cov = lineCov(c, w); }
  else { c = p.y / (sp * 0.75); cov = lineCov(c, w); }
#elif PATTERN == 1
  if (top) {
    float r = length(p.xz); float th = atan(p.z, p.x);
    if (r < 0.47) {
      float A = 0.018 + 0.010 * smoothstep(0.1, 0.45, r);
      float spr = sp * 1.25;
      float ca = (r + A * sin(15.0 * th + r * 10.0)) / spr;
      float cb = (r + A * sin(-15.0 * th + r * 10.0)) / spr;
      float wr = w * 0.62;
      cov = max(lineCov(ca, wr), lineCov(cb, wr));
      c = ca;
      float ring = abs(r - 0.47);
      cov = max(cov, 1.0 - smoothstep(0.004, 0.004 + fwidth(r) * 1.5, ring));
    } else {
      c = max(abs(p.x), abs(p.z)) / (sp * 0.9);
      cov = lineCov(c, w);
    }
  } else { c = p.y / (sp * 0.6); cov = lineCov(c, w); }
#elif PATTERN == 4
  // alloy ingot: lines run along the bar; end caps get concentric frames; highlights cross-hatch
  if (abs(rn.x) > 0.7) { c = max(abs(p.y) * 1.6, abs(p.z)) / (sp * 0.9); cov = lineCov(c, w); }
  else if (top) { c = p.z / (sp * 0.8); cov = lineCov(c, w); c2 = (p.x * 0.7 + p.z) / (sp * 1.7); }
  else { c = p.y / (sp * 0.55); cov = lineCov(c, w); c2 = (p.x * 0.5 - p.y) / (sp * 1.7); }
#else
  c = max(abs(p.x), abs(p.z)) / (sp * 0.8);
  if (!top && rn.y > -0.7 && abs(rn.y) < 0.7 && PATTERN == 3) c = p.y / (sp * 0.5);
  cov = lineCov(c, w);
#endif
  if (c2 > -0.5) cov = max(cov, lineCov(c2, clamp((Lc - 0.72) * 0.6, 0.0, 0.3)) * step(0.72, Lc));

  // engraving reveal: every line draws on at its own moment, with a hot leading tip
  float thr = g * 0.72 + hash(floor(c) + float(PATTERN) * 91.0) * 0.28;
  float vis = smoothstep(thr, thr + 0.015, uReveal);
  float tip = smoothstep(0.07, 0.0, uReveal - thr) * vis;

  vec3 col = mix(uColLo, uColHi, smoothstep(0.25, 1.05, Lc));
  col = mix(col, uPaper, clamp(spec * 0.55, 0.0, 0.85));
  col = mix(col, vec3(0.93, 0.88, 0.78), sh * 0.6);
  col += uPaper * tip * 0.9;
  // keylines at creases (screen-space normal derivative), arrive once the part has drawn
  float ek = length(fwidth(n));
  float edge = smoothstep(0.45, 1.1, ek) * smoothstep(0.85, 1.1, uReveal);
  vec3 fill = uColLo * 0.05 * (0.4 + L) * smoothstep(g * 0.75, g * 0.75 + 0.1, uReveal);
  vec3 outc = col * cov * vis + fill + mix(uColHi, uPaper, 0.3) * edge * 0.45;
  gl_FragColor = vec4(outc * uOpacity, 1.0);
}`;

export type EngraveUniforms = {
  uReveal: { value: number };
  uOffset: { value: THREE.Vector3 };
  uSpacing: { value: number };
  uSheen: { value: number };
  uBright: { value: number };
  uKey: { value: number };
  uOpacity: { value: number };
  uLightPos: { value: THREE.Vector3 };
  uLight2: { value: THREE.Vector3 };
  uColLo: { value: THREE.Vector3 };
  uColHi: { value: THREE.Vector3 };
  uPaper: { value: THREE.Vector3 };
  uSweepDir: { value: THREE.Vector3 };
  uSweepOff: { value: number };
  uSheenDir: { value: THREE.Vector3 };
};

export const engraveMat = (
  pattern: number,
  o: { lo?: string; hi?: string; spacing?: number; sweepDir?: [number, number, number]; sweepOff?: number } = {},
) => {
  const uniforms: EngraveUniforms = {
    uReveal: { value: 0 },
    uOffset: { value: new THREE.Vector3() },
    uSpacing: { value: o.spacing ?? 0.021 },
    uSheen: { value: -99 },
    uBright: { value: 1 },
    uKey: { value: 1 },
    uOpacity: { value: 1 },
    uLightPos: { value: new THREE.Vector3(-1.8, 3.2, 1.8) },
    uLight2: { value: new THREE.Vector3(0.9, 0.35, -0.2).normalize() },
    uColLo: { value: hex(o.lo ?? "#1D3B6E") },
    uColHi: { value: hex(o.hi ?? "#A9C3EC") },
    uPaper: { value: hex("#F2F0ED") },
    uSweepDir: { value: new THREE.Vector3(...(o.sweepDir ?? [1 / 3, 0.4, 1 / 3])) },
    uSweepOff: { value: o.sweepOff ?? 0.5 },
    uSheenDir: { value: new THREE.Vector3(0.87, -0.3, 0.48) },
  };
  return new THREE.ShaderMaterial({
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    vertexShader: VERT,
    fragmentShader: FRAG,
    defines: { PATTERN: pattern },
  });
};

export const U = (m: THREE.ShaderMaterial) => m.uniforms as unknown as EngraveUniforms;

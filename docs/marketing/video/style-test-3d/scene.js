// Alloy · style test 3D — engraved microchip → ticker cloud.
// Deterministic: nothing animates on its own. window.renderFrame(t) draws the frame for time t (seconds).
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

THREE.ColorManagement.enabled = false; // we author display-space values directly

const W = 1080, H = 1920, SS = 2, FPS = 30, DUR = 10;
const RW = W * SS, RH = H * SS;

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lin = (t, a, b) => clamp((t - a) / (b - a));
const eOut = (x) => 1 - Math.pow(1 - x, 3);
const eInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const hex = (h) => new THREE.Vector3(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- timeline (seconds) ----------
const T = {
  frameIn: [0.0, 0.6],
  pkgReveal: [0.4, 1.9], pinsStart: 0.85, capsReveal: [1.7, 2.6], dieReveal: [1.25, 2.6], dieDrop: [1.15, 2.1],
  sheen: [2.55, 3.65],
  line1: 1.0, line1Out: 4.25,
  streak: 4.0, swap: 4.2667,
  line2: 5.3,
};

// ---------- renderer ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, alpha: false });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.setClearColor(0x000000, 0);
renderer.autoClear = true;

const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
const rtCol = new THREE.WebGLRenderTarget(RW, RH, rtOpts);
const rtNrm = new THREE.WebGLRenderTarget(RW, RH, rtOpts);
const rtComb = new THREE.WebGLRenderTarget(RW, RH, { ...rtOpts, depthBuffer: false });

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(26, W / H, 0.1, 100);
camera.position.set(0, 10.6, 9.4);
camera.lookAt(0, -1.55, 0);
scene.add(camera);

// ---------- engraving material ----------
const shared = {
  uMode: { value: 0 },
  uT: { value: 0 },
  uLight: { value: new THREE.Vector3() },
  uLight2: { value: new THREE.Vector3() },
  uCamC: { value: new THREE.Vector3() },
  uSheen: { value: -9 },
  uSpacing: { value: 0.021 },
  uColLo: { value: hex('#1D3B6E') },
  uColHi: { value: hex('#A9C3EC') },
  uPaper: { value: hex('#F2F0ED') },
  uLife: { value: -1 },
};

const VERT = /* glsl */`
uniform float uT; uniform float uLife; uniform vec3 uOffset;
varying vec3 vP; varying vec3 vRN; varying vec3 vN; varying vec3 vC; varying vec3 vWorld; varying float vFade;
#ifdef PINS
attribute vec4 aSlide;
#endif
#ifdef FRAGS
attribute vec4 aFrag; attribute vec4 aAxis;
#endif
vec3 rotA(vec3 v, vec3 k, float a){ return v*cos(a) + cross(k,v)*sin(a) + k*dot(k,v)*(1.0-cos(a)); }
void main(){
  vec3 restP = position; vec3 restN = normal;
  #ifdef USE_INSTANCING
    restP = (instanceMatrix * vec4(position,1.0)).xyz; restN = normalize(mat3(instanceMatrix) * normal);
  #endif
  vec3 cur = restP + uOffset; vec3 curN = restN; vFade = 1.0;
  #ifdef PINS
    float k = clamp((uT - aSlide.w) / 0.8, 0.0, 1.0); k = 1.0 - pow(1.0 - k, 3.0);
    cur += aSlide.xyz * (1.0 - k);
  #endif
  #ifdef FRAGS
    vec3 center = (instanceMatrix * vec4(0.0,0.0,0.0,1.0)).xyz;
    vec3 local = restP - center;
    float seed = aAxis.w;
    float life = max(uLife - seed * 0.12, 0.0);
    float b = 1.0 - exp(-life * (2.2 + seed));          // fast crack, long glide
    float ang = b * (1.4 + 2.6 * seed) + life * 0.25;
    float fs = 1.0 - smoothstep(0.05 + seed * 0.2, 0.32 + seed * 0.33, life);
    vFade = fs;
    vec3 ax = normalize(aAxis.xyz);
    cur = center + aFrag.xyz * aFrag.w * b + rotA(local, ax, ang) * fs;
    curN = rotA(restN, ax, ang);
  #endif
  vP = restP; vRN = restN; vN = curN; vC = cur;
  vec4 wp = modelMatrix * vec4(cur, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */`
uniform float uMode, uReveal, uSpacing, uSheen, uLife;
uniform vec3 uLight, uLight2, uCamC, uColLo, uColHi, uPaper;
varying vec3 vP; varying vec3 vRN; varying vec3 vN; varying vec3 vC; varying vec3 vWorld; varying float vFade;
float hash(float n){ return fract(sin(n * 127.1 + 11.7) * 43758.5453); }
// anti-aliased line coverage. c in periods, w = half width in periods (0..0.5)
float lineCov(float c, float w){
  float d = abs(fract(c) - 0.5);
  float aa = max(fwidth(c), 1e-4) * 0.8;
  float cov = 1.0 - smoothstep(w - aa, w + aa, 0.5 - d);
  // too dense to resolve -> settle to the average tone instead of moiré
  return mix(cov, clamp(2.0 * w, 0.0, 1.0), smoothstep(0.35, 0.8, aa));
}
void main(){
  vec3 p = vP; vec3 rn = vRN;
  float g = clamp((p.x + p.z) / 3.0 + 0.5 + p.y * 0.4, 0.0, 1.0); // reveal sweep (rest space)
  if (vFade < 0.02) discard;
  vec3 n = normalize(vN);
  if (uMode > 0.5) {
    // keylines arrive as each part completes (alpha = per-part edge weight)
    gl_FragColor = vec4(n * 0.5 + 0.5, smoothstep(0.8, 1.12, uReveal) * vFade);
    return;
  }
  vec3 v = normalize(uCamC - vC);
  vec3 l = normalize(uLight * 3.2 - vC);
  float dif = max(dot(n, l), 0.0);
  float dif2 = max(dot(n, normalize(uLight2)), 0.0);
  vec3 h = normalize(l + v);
  float spec = pow(max(dot(n, h), 0.0), 70.0);
  float fall = 1.0 / (1.0 + 0.09 * dot(uLight * 3.2 - vC, uLight * 3.2 - vC));
  float L = 0.03 + 1.9 * dif * fall + 0.18 * dif2;
  // soft studio reflection: a broad bright band mirrored in flat faces
  vec3 rf = reflect(-v, n);
  L += 0.22 * smoothstep(0.55, 0.95, dot(rf, normalize(uLight + vec3(0.0, 0.6, 0.0)))) ;
  L = pow(L, 1.2);
  float s = dot(vWorld.xz, normalize(vec2(1.0, 0.55))) - vWorld.y * 0.3;
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
    // pin-1 mark: solid engraved dot
    float dm = length(p.xz - vec2(-0.78, -0.78));
    cov = max(cov, (1.0 - smoothstep(0.05, 0.05 + fwidth(dm) * 1.2, dm)) * 0.9);
    c2 = (p.x - p.z) / (sp * 1.6);
  } else if (rn.y < -0.7) { c = p.x / sp; cov = lineCov(c, w); }
  else { c = p.y / (sp * 0.75); cov = lineCov(c, w); }
#elif PATTERN == 1
  if (top) {
    float r = length(p.xz); float th = atan(p.z, p.x);
    if (r < 0.47) {
      // epitrochoid-style rosette: two crossing wave families (15 lobes)
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
#else
  c = max(abs(p.x), abs(p.z)) / (sp * 0.8);
  if (!top && rn.y > -0.7 && abs(rn.y) < 0.7 && PATTERN == 3) c = p.y / (sp * 0.5);
  cov = lineCov(c, w);
#endif
  // highlights: a second, crossing family (intaglio cross-hatch)
  if (c2 > -0.5) cov = max(cov, lineCov(c2, clamp((Lc - 0.72) * 0.6, 0.0, 0.3)) * step(0.72, Lc));

  // engraving reveal: every line draws on at its own moment
  float thr = g * 0.72 + hash(floor(c) + float(PATTERN) * 91.0) * 0.28;
  float vis = smoothstep(thr, thr + 0.015, uReveal);
  float tip = smoothstep(0.07, 0.0, uReveal - thr) * vis;

  vec3 col = mix(uColLo, uColHi, smoothstep(0.25, 1.05, Lc));
  col = mix(col, uPaper, clamp(spec * 0.55, 0.0, 0.85));
  col = mix(col, vec3(0.93, 0.88, 0.78), sh * 0.6);
  col += uPaper * tip * 0.9;
  vec3 fill = uColLo * 0.05 * (0.4 + L) * smoothstep(g * 0.75, g * 0.75 + 0.1, uReveal);
  gl_FragColor = vec4((col * cov * vis + fill) * vFade, 1.0);
}`;

function engraveMat(pattern, defines = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared, uReveal: { value: 0 }, uOffset: { value: new THREE.Vector3() } },
    vertexShader: VERT, fragmentShader: FRAG,
    defines: { PATTERN: pattern, ...defines },
  });
}

// ---------- the microchip (procedural) ----------
const chip = new THREE.Group();
scene.add(chip);
const parts = new THREE.Group();
chip.add(parts);

const pkgGeo = new RoundedBoxGeometry(2.0, 0.2, 2.0, 4, 0.035);
const pkgMat = engraveMat(0);
parts.add(new THREE.Mesh(pkgGeo, pkgMat));

const stepGeo = new RoundedBoxGeometry(1.38, 0.03, 1.38, 2, 0.012); stepGeo.translate(0, 0.115, 0);
const stepMat = engraveMat(0);
parts.add(new THREE.Mesh(stepGeo, stepMat));

const dieGeo = new RoundedBoxGeometry(1.16, 0.1, 1.16, 4, 0.02); dieGeo.translate(0, 0.18, 0);
const dieMat = engraveMat(1);
parts.add(new THREE.Mesh(dieGeo, dieMat));

// gull-wing pins
function pinGeometry() {
  const a = new THREE.BoxGeometry(0.17, 0.028, 0.055); a.translate(0.085, 0, 0);
  const b = new THREE.BoxGeometry(0.028, 0.15, 0.055); b.translate(0.17, -0.061, 0);
  const c = new THREE.BoxGeometry(0.15, 0.028, 0.055); c.translate(0.235, -0.122, 0);
  return mergeGeometries([a, b, c].map((g) => g.toNonIndexed()));
}
const PIN_N = 14, PIN_PITCH = 0.115;
const pinGeo = pinGeometry();
const pinMat = engraveMat(2, { PINS: 1 });
const pins = new THREE.InstancedMesh(pinGeo, pinMat, PIN_N * 4);
const pinSlide = new Float32Array(PIN_N * 4 * 4);
const pinMatrices = [];
{
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  let i = 0;
  for (let side = 0; side < 4; side++) {
    q.setFromAxisAngle(up, side * Math.PI / 2);
    for (let j = 0; j < PIN_N; j++) {
      const z = (j - (PIN_N - 1) / 2) * PIN_PITCH;
      const pos = new THREE.Vector3(1.0, 0, z).applyQuaternion(q);
      m.compose(pos, q, new THREE.Vector3(1, 1, 1));
      pins.setMatrixAt(i, m); pinMatrices.push(m.clone());
      const out = new THREE.Vector3(1, 0.0, 0).applyQuaternion(q).multiplyScalar(0.9).add(new THREE.Vector3(0, 0.55, 0));
      const order = side * PIN_N + (side % 2 ? PIN_N - 1 - j : j);
      pinSlide.set([out.x, out.y, out.z, T.pinsStart + order * 0.0135], i * 4);
      i++;
    }
  }
  pinGeo.setAttribute('aSlide', new THREE.InstancedBufferAttribute(pinSlide, 4));
}
parts.add(pins);

// SMD capacitors around the lid
const capGeo = new THREE.BoxGeometry(0.075, 0.045, 0.04); capGeo.translate(0, 0.1225, 0);
const capMat = engraveMat(3);
const capPos = [];
for (let k = 0; k < 6; k++) { const z = -0.5 + k * 0.2; capPos.push([0.82, z, 0], [-0.82, z, 0], [z, 0.82, 1], [z, -0.82, 1]); }
const caps = new THREE.InstancedMesh(capGeo, capMat, capPos.length);
capPos.forEach(([x, z, r], i) => {
  const m = new THREE.Matrix4().makeRotationY(r ? 0 : Math.PI / 2); m.setPosition(x, 0, z); caps.setMatrixAt(i, m);
});
parts.add(caps);

// ---------- fragments (the shatter) ----------
const frags = new THREE.Group(); frags.visible = false; chip.add(frags);
const fragMats = [];
function fragMesh(geo, pattern, centers, seed, extra = {}) {
  const mat = engraveMat(pattern, { FRAGS: 1, ...extra }); fragMats.push(mat);
  const mesh = new THREE.InstancedMesh(geo, mat, centers.length);
  const r = rng(seed);
  const aFrag = new Float32Array(centers.length * 4), aAxis = new Float32Array(centers.length * 4);
  centers.forEach((m, i) => {
    mesh.setMatrixAt(i, m);
    const c = new THREE.Vector3().setFromMatrixPosition(m);
    const d = new THREE.Vector3(c.x + (r() - 0.5) * 0.5, 0.25 + r() * 0.7, c.z + (r() - 0.5) * 0.5).normalize();
    aFrag.set([d.x, d.y, d.z, 0.35 + r() * 0.85], i * 4);
    aAxis.set([r() - 0.5, r() - 0.5, r() - 0.5, r()], i * 4);
  });
  geo.setAttribute('aFrag', new THREE.InstancedBufferAttribute(aFrag, 4));
  geo.setAttribute('aAxis', new THREE.InstancedBufferAttribute(aAxis, 4));
  frags.add(mesh);
}
{
  const body = [], die = [];
  // the chip is hidden under the alloy-bar sweep when it breaks, so the pieces can be thin engraved flakes
  const n = 14, cs = 2.0 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) body.push(new THREE.Matrix4().makeTranslation(-1 + cs * (i + 0.5), 0.085, -1 + cs * (j + 0.5)));
  const nd = 7, ds = 1.16 / nd;
  for (let i = 0; i < nd; i++) for (let j = 0; j < nd; j++) die.push(new THREE.Matrix4().makeTranslation(-0.58 + ds * (i + 0.5), 0.215, -0.58 + ds * (j + 0.5)));
  fragMesh(new THREE.BoxGeometry(cs * 0.9, 0.03, cs * 0.9), 0, body, 11);
  fragMesh(new THREE.BoxGeometry(ds * 0.9, 0.03, ds * 0.9), 1, die, 23);
  fragMesh(pinGeometry(), 2, pinMatrices, 37);
}

// ---------- ticker cloud ----------
const TICKERS = ['NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AAPL', 'AMD', 'AVGO', 'TSM', 'ORCL', 'PLTR', 'SMCI', 'ARM', 'INTC', 'CRM', 'ASML', 'MU', 'QCOM', 'IBM', 'SNOW', 'NOW', 'DELL', 'ADBE', 'ANET', 'MRVL', 'NVDA', 'MSFT', 'GOOGL', 'META', 'AMZN', 'TSM', 'AMD', 'AVGO'];
const tickerGroup = new THREE.Group(); camera.add(tickerGroup);
const tickers = [];
const TICK_FRAG = /* glsl */`
uniform sampler2D map; uniform float uOpacity; uniform vec3 uColor; uniform float uStripe; uniform vec2 uBand;
varying vec2 vUv;
void main(){
  float a = texture2D(map, vUv).a;
  float f = abs(fract(gl_FragCoord.y / uStripe) - 0.5) * 2.0;    // 0 = line centre
  float aa = 1.0 / uStripe * 2.0;
  float cov = 1.0 - smoothstep(0.58 - aa, 0.58 + aa, f);
  float yOut = (${RH.toFixed(1)} - gl_FragCoord.y) / ${SS.toFixed(1)};
  float band = mix(1.0, 0.16, 1.0 - smoothstep(uBand.y, uBand.y + 120.0, abs(yOut - uBand.x)));
  gl_FragColor = vec4(uColor * a * cov * uOpacity * band, 1.0);
}`;
function makeTickerTex(txt) {
  const cv = document.createElement('canvas'); const ctx = cv.getContext('2d');
  const fs = 120; ctx.font = `600 ${fs}px JBM`;
  const tw = Math.ceil(ctx.measureText(txt).width);
  cv.width = tw + 24; cv.height = fs + 24;
  ctx.font = `600 ${fs}px JBM`; ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
  ctx.letterSpacing = '0px';
  ctx.fillText(txt, 12, cv.height / 2 + 6);
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 4; tex.generateMipmaps = true;
  return { tex, aspect: cv.width / cv.height };
}
function buildTickers() {
  const r = rng(2026);
  // three depth tiers. near = the AI basket (paper), mid/far = the noise (sapphire)
  const tiers = [
    { names: ['NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META'], hpx: 78, depth: 9, color: '#F2F0ED', bright: 0.92 },
    { names: ['TSLA', 'AAPL', 'AMD', 'AVGO', 'TSM', 'ORCL', 'PLTR', 'ASML', 'ARM'], hpx: 54, depth: 12, color: '#6E95D2', bright: 0.95 },
    { names: ['SMCI', 'INTC', 'CRM', 'MU', 'QCOM', 'IBM', 'SNOW', 'NOW', 'DELL', 'ANET', 'MRVL', 'ADBE'], hpx: 38, depth: 16, color: '#6E95D2', bright: 0.5 },
  ];
  const boxes = [];
  const free = (x, y, w, h) => boxes.every((b) => x + w / 2 + 26 < b.x - b.w / 2 || x - w / 2 - 26 > b.x + b.w / 2 || y + h / 2 + 22 < b.y - b.h / 2 || y - h / 2 - 22 > b.y + b.h / 2);
  tiers.forEach((tier) => tier.names.forEach((txt) => {
    const { tex, aspect } = makeTickerTex(txt);
    const hpx = tier.hpx, wpx = hpx * aspect;
    let x, y, tries = 0;
    do {
      x = 100 + wpx / 2 + r() * (W - 200 - wpx);
      // keep clear of the frame header (y<190), the text block (1240–1530) and the footer (y>1770)
      y = r() < 0.8 ? 210 + hpx / 2 + r() * (1190 - 210 - hpx) : 1580 + hpx / 2 + r() * (1740 - 1580 - hpx);
      tries++;
    } while (!free(x, y, wpx, hpx) && tries < 4000);
    boxes.push({ x, y, w: wpx, h: hpx });
    const depth = tier.depth;
    const halfH = depth * Math.tan(THREE.MathUtils.degToRad(13)), halfW = halfH * (W / H);
    const toCam = (px, py) => new THREE.Vector3(((px / W) * 2 - 1) * halfW, (1 - (py / H) * 2) * halfH, -depth);
    const size = (hpx / H) * 2 * halfH;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, uOpacity: { value: 0 }, uColor: { value: hex(tier.color) }, uStripe: { value: 3.0 * SS }, uBand: { value: new THREE.Vector2(1385, 150) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: TICK_FRAG, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size * aspect, size), mat);
    mesh.visible = false;
    tickerGroup.add(mesh);
    // drift: a few px/s, upward, nearer = faster (parallax)
    const pxs = (12 / depth) * 26;
    tickers.push({
      mesh, mat, depth, bright: tier.bright,
      final: toCam(x, y),
      drift: toCam(x + (r() - 0.5) * pxs * 0.3, y - pxs * (0.85 + r() * 0.3)).sub(toCam(x, y)),
      delay: 0.1 + r() * 0.5 + (tier.depth - 9) * 0.03,
    });
  }));
}

// ---------- composite passes ----------
const quadGeo = new THREE.PlaneGeometry(2, 2);
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
function pass(frag, uniforms) {
  const m = new THREE.ShaderMaterial({ uniforms, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }', fragmentShader: frag, depthTest: false, depthWrite: false });
  const s = new THREE.Scene(); s.add(new THREE.Mesh(quadGeo, m)); return { scene: s, mat: m };
}
const edgePass = pass(/* glsl */`
uniform sampler2D tCol, tNrm; uniform vec2 uTx; uniform float uEdge; uniform vec3 uEdgeCol;
varying vec2 vUv;
vec4 S(float x, float y){ return texture2D(tNrm, vUv + vec2(x, y) * uTx); }
void main(){
  vec4 gx = -S(-1.,-1.) - 2.*S(-1.,0.) - S(-1.,1.) + S(1.,-1.) + 2.*S(1.,0.) + S(1.,1.);
  vec4 gy = -S(-1.,-1.) - 2.*S(0.,-1.) - S(1.,-1.) + S(-1.,1.) + 2.*S(0.,1.) + S(1.,1.);
  float a = S(0.,0.).a;
  float e = (length(gx.rgb) + length(gy.rgb)) * a + abs(gx.a) + abs(gy.a);
  e = smoothstep(0.55, 1.6, e);
  vec3 c = texture2D(tCol, vUv).rgb;
  gl_FragColor = vec4(c + uEdgeCol * e * uEdge, 1.0);
}`, { tCol: { value: rtCol.texture }, tNrm: { value: rtNrm.texture }, uTx: { value: new THREE.Vector2(1 / RW, 1 / RH) }, uEdge: { value: 0.55 }, uEdgeCol: { value: hex('#7FA2DA') } });

const finalPass = pass(/* glsl */`
uniform sampler2D tComb; uniform vec2 uTx; uniform float uFrame; uniform vec3 uBg;
varying vec2 vUv;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32 + uFrame * 0.618); return fract(p.x * p.y); }
void main(){
  // 2x supersample resolve: 4 taps inside the output pixel (bilinear = 16 RT texels, mild filter)
  vec3 c = vec3(0.0);
  c += texture2D(tComb, vUv + vec2(-0.25, -0.25) * uTx).rgb;
  c += texture2D(tComb, vUv + vec2( 0.25, -0.25) * uTx).rgb;
  c += texture2D(tComb, vUv + vec2(-0.25,  0.25) * uTx).rgb;
  c += texture2D(tComb, vUv + vec2( 0.25,  0.25) * uTx).rgb;
  c *= 0.25;
  vec2 q = vUv - 0.5; q.x *= ${(W / H).toFixed(4)};
  float vig = 1.0 - smoothstep(0.35, 0.95, length(q)) * 0.55;
  vec3 col = uBg * vig + c * mix(0.92, 1.0, vig);
  col += (h21(gl_FragCoord.xy) - 0.5) * (2.2 / 255.0);
  gl_FragColor = vec4(col, 1.0);
}`, { tComb: { value: rtComb.texture }, uTx: { value: new THREE.Vector2(1 / W, 1 / H) }, uFrame: { value: 0 }, uBg: { value: hex('#0A0A0A') } });

// ---------- the "alloy bar" streak (top layer, its own context so it covers the DOM text) ----------
const fxCanvas = document.getElementById('fx');
const fxR = new THREE.WebGLRenderer({ canvas: fxCanvas, antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
fxR.setPixelRatio(1); fxR.setSize(W, H, false); fxR.setClearColor(0x000000, 0);
// AI Build-Out recipe: NVDA 35 · MSFT 25 · GOOGL 20 · AMZN 12 · META 8 → band thickness = weight
const BANDS = [
  { w: 35, deep: '#10223F', mid: '#3E6FB8' },
  { w: 25, deep: '#0F2E24', mid: '#2E8B6A' },
  { w: 20, deep: '#2A1433', mid: '#8E5BA6' },
  { w: 12, deep: '#3A2A08', mid: '#C98A2E' },
  { w: 8, deep: '#3A0010', mid: '#B5304F' },
];
const streakPass = (() => {
  let acc = 0; const edges = [], deeps = [], mids = [];
  BANDS.forEach((b) => { edges.push(acc / 100); acc += b.w; deeps.push(hex(b.deep)); mids.push(hex(b.mid)); });
  edges.push(1.0);
  const frag = /* glsl */`
  uniform float uT; uniform vec3 uDeep[5]; uniform vec3 uMid[5]; uniform float uEdges[6];
  varying vec2 vUv;
  float eio(float x){ x = clamp(x, 0.0, 1.0); return x < 0.5 ? 4.0*x*x*x : 1.0 - pow(-2.0*x + 2.0, 3.0) / 2.0; }
  vec4 bars(float t, vec2 uv){
    float y = 1.0 - uv.y;               // 0 = top
    int bi = 0; float y0 = 0.0, y1 = 1.0;
    for (int i = 0; i < 5; i++) { if (y >= uEdges[i] && y < uEdges[i+1]) { bi = i; y0 = uEdges[i]; y1 = uEdges[i+1]; } }
    float fi = float(bi);
    float d = fi * 0.015;
    float lead  = eio((t - ${T.streak.toFixed(3)} - d) / 0.27) * 1.25 - 0.02;
    float trail = eio((t - ${T.streak.toFixed(3)} - 0.30 - d) / 0.27) * 1.25 - 0.08;
    float x = mod(fi, 2.0) < 0.5 ? uv.x : 1.0 - uv.x;   // alternate direction: interleaved metal
    if (x > lead || x < trail) return vec4(0.0);
    float v = (y - y0) / (y1 - y0);
    float hpx = (y1 - y0) * ${H.toFixed(1)};
    // polished bar profile: dark rims, broad body, a crisp specular line high on the bar
    float body = pow(sin(3.14159 * clamp(v, 0.0, 1.0)), 0.6);
    // polished metal: environment band reflections (dark horizon, bright sky line) across the bar
    float env = 0.30 + 0.70 * smoothstep(0.05, 0.4, v) * (1.0 - smoothstep(0.55, 0.98, v));
    env -= 0.35 * exp(-pow((v - 0.52) * hpx / (hpx * 0.06 + 6.0), 2.0));
    vec3 c = mix(uDeep[bi] * 0.9, uMid[bi] * 1.05, body * env);
    c += vec3(0.96, 0.94, 0.90) * exp(-pow((v - 0.2) * hpx / 4.0, 2.0)) * 0.75;
    c += vec3(0.96, 0.94, 0.90) * exp(-pow((v - 0.2) * hpx / 26.0, 2.0)) * 0.12;
    c += uMid[bi] * exp(-pow((v - 0.82) * hpx / 40.0, 2.0)) * 0.22;
    // brushed grain: per-row random gain, plus engraved line every 3px
    float row = floor(y * ${H.toFixed(1)} / 1.5);
    c *= 0.93 + 0.1 * fract(sin(row * 12.9898 + fi * 7.0) * 43758.5453);
    c *= 0.92 + 0.08 * sin(y * ${H.toFixed(1)} * 3.14159 / 3.0);
    // travelling sheen + molten leading edge
    float sx = x - (lead - 0.35);
    c += vec3(0.95, 0.92, 0.86) * exp(-pow(sx / 0.08, 2.0)) * 0.22;
    float edge = exp(-max(lead - x, 0.0) * ${W.toFixed(1)} / 26.0);
    c = mix(c, vec3(0.98, 0.95, 0.88), edge * 0.75);
    float tail = smoothstep(trail, trail + 0.12, x);
    // hairline seam between bands
    float seam = smoothstep(0.0, 2.0, min(v * hpx, (1.0 - v) * hpx));
    c *= mix(0.25, 1.0, seam);
    float a = tail;
    return vec4(c * a, a);
  }
  void main(){
    vec4 acc = vec4(0.0);
    for (int k = 0; k < 8; k++) acc += bars(uT - (float(k) / 8.0) * (1.0 / 60.0), vUv);  // 180° shutter blur
    gl_FragColor = acc / 8.0;
  }`;
  const p = pass(frag, { uT: { value: 0 }, uDeep: { value: deeps }, uMid: { value: mids }, uEdges: { value: edges } });
  p.mat.transparent = true;
  p.mat.blending = THREE.NoBlending;
  return p;
})();

// ---------- DOM overlay: certificate frame + type ----------
const ui = document.getElementById('ui');
const el = (cls, css = {}, html = '') => { const d = document.createElement('div'); d.className = cls; Object.assign(d.style, css); d.innerHTML = html; ui.appendChild(d); return d; };
const O = 44, I = 56; // outer / inner frame insets
const frameLines = [];
function hline(x, y, len, horiz, alpha, t0, t1, rev = false) {
  const d = el('hl', horiz ? { left: x + 'px', top: y + 'px', width: len + 'px', height: '1px', opacity: alpha } : { left: x + 'px', top: y + 'px', width: '1px', height: len + 'px', opacity: alpha });
  if (rev) d.style.transformOrigin = horiz ? '100% 0' : '0 100%';
  frameLines.push({ d, horiz, t0, t1 });
}
// outer frame: draws clockwise from top-left
hline(O, O, W - 2 * O, true, 0.34, 0.00, 0.30);
hline(W - O - 1, O, H - 2 * O, false, 0.34, 0.12, 0.52);
hline(O, H - O - 1, W - 2 * O, true, 0.34, 0.20, 0.50, true);
hline(O, O, H - 2 * O, false, 0.34, 0.08, 0.48, true);
// inner frame: fainter, counter-direction
hline(I, I, W - 2 * I, true, 0.14, 0.10, 0.45, true);
hline(I, I, H - 2 * I, false, 0.14, 0.14, 0.55);
hline(I, H - I - 1, W - 2 * I, true, 0.14, 0.18, 0.58);
hline(W - I - 1, I, H - 2 * I, false, 0.14, 0.12, 0.60, true);
const rings = [[O, O], [W - O, O], [O, H - O], [W - O, H - O]].map(([x, y]) => el('ring', { left: x - 6 + 'px', top: y - 6 + 'px' }));
const serialTxt = 'No. 0001 · ALLOY';
const serial = el('mono', { left: '84px', top: '86px', color: '#C9C7C3' });
const sceneTag = el('mono', { right: '84px', top: '86px', textAlign: 'right' });
const rule = el('', { left: '84px', top: '132px', width: (W - 168) + 'px' }); rule.id = 'rule';
const footL = el('mono', { left: '84px', bottom: '84px', fontSize: '20px' });
const footR = el('mono', { right: '84px', bottom: '84px', fontSize: '20px', textAlign: 'right' });

const GLYPHS = '0123456789$§#%&¤№+=<>/';
function makeLine(rows, top, cls = '') {
  const d = el('line', { top: top + 'px' });
  const chars = [];
  rows.forEach((row) => {
    const r = document.createElement('span'); r.className = 'row ' + (row.cls || '');
    for (const ch of row.text) {
      const c = document.createElement('span'); c.className = 'ch';
      const g = document.createElement('span'); g.className = 'g'; g.textContent = ch;
      const s = document.createElement('span'); s.className = 's';
      c.append(g, s); r.appendChild(c);
      chars.push({ g, s, ch });
    }
    d.appendChild(r);
  });
  return { d, chars };
}
// decode: scramble ≤0.4s, left→right, then perfectly still
function decode(line, t, t0, frame) {
  const n = line.chars.length;
  line.chars.forEach((c, i) => {
    const appear = t0 + (i / n) * 0.14;
    const settle = t0 + 0.12 + (i / n) * 0.26;
    if (c.ch === ' ' || t < appear) { c.g.style.visibility = 'hidden'; c.s.textContent = ''; return; }
    if (t >= settle) { c.g.style.visibility = 'visible'; c.s.textContent = ''; return; }
    c.g.style.visibility = 'hidden';
    const k = Math.floor(frame / 2) * 7 + i * 13;
    c.s.textContent = GLYPHS[(k * 2654435761 >>> 0) % GLYPHS.length];
  });
}
const line1 = makeLine([{ text: 'Priya wants to' }, { text: 'invest in AI.' }], 1290);
const line2 = makeLine([{ text: 'But which stocks?' }, { text: 'She has no idea.', cls: 'dim' }], 1290);

// ---------- per-frame ----------
const tmpQ = new THREE.Quaternion();
const LIGHT_W = new THREE.Vector3(-0.55, 1.0, 0.55).normalize();
const LIGHT2_W = new THREE.Vector3(0.9, 0.35, -0.2).normalize();
const chipScreen = new THREE.Vector3();

function renderFrame(t) {
  const frame = Math.round(t * FPS);
  // --- chip transform
  chip.rotation.set(0, -0.62 + t * 0.11, 0);
  chip.position.y = 0.06 * Math.sin(t * 0.9);
  chip.updateMatrixWorld(true);
  tmpQ.copy(chip.quaternion).invert();
  shared.uLight.value.copy(LIGHT_W).applyQuaternion(tmpQ);
  shared.uLight2.value.copy(LIGHT2_W).applyQuaternion(tmpQ);
  shared.uCamC.value.copy(camera.position).sub(chip.position).applyQuaternion(tmpQ);
  shared.uT.value = t;
  const sh = lin(t, ...T.sheen);
  shared.uSheen.value = sh > 0 && sh < 1 ? -3.2 + eInOut(sh) * 6.4 : -9;

  pkgMat.uniforms.uReveal.value = lin(t, ...T.pkgReveal) * 1.15;
  stepMat.uniforms.uReveal.value = lin(t, T.pkgReveal[0] + 0.3, T.pkgReveal[1] + 0.3) * 1.15;
  pinMat.uniforms.uReveal.value = lin(t, T.pinsStart, T.pinsStart + 1.5) * 1.15;
  capMat.uniforms.uReveal.value = lin(t, ...T.capsReveal) * 1.15;
  dieMat.uniforms.uReveal.value = lin(t, ...T.dieReveal) * 1.15;
  dieMat.uniforms.uOffset.value.set(0, 0.9 * (1 - eOut(lin(t, ...T.dieDrop))), 0);

  const shattered = t >= T.swap;
  parts.visible = !shattered;
  frags.visible = shattered && t < 6.0;
  shared.uLife.value = shattered ? t - T.swap : -1;
  fragMats.forEach((m) => { m.uniforms.uReveal.value = 2; });

  // --- tickers
  chipScreen.set(0, 0.1, 0).applyMatrix4(chip.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
  tickers.forEach((k, i) => {
    const lt = t - (T.swap + 0.05 + k.delay);
    k.mesh.visible = lt > 0;
    if (lt <= 0) return;
    const fly = eOut(clamp(lt / 1.4));
    const start = chipScreen.clone().multiplyScalar(k.depth / -chipScreen.z);
    // drift decelerates to a calm stop by the end (integral of an exp decay)
    const dt = Math.max(0, t - (T.swap + 0.6));
    const settle = (1 - Math.exp(-dt * 0.3)) / 0.3;
    k.mesh.position.copy(start).lerp(k.final, fly).addScaledVector(k.drift, settle);
    k.mesh.scale.setScalar(0.4 + 0.6 * eOut(clamp(lt / 0.9)));
    k.mat.uniforms.uOpacity.value = k.bright * clamp(lt / 0.5);
  });

  // --- 3D passes
  shared.uMode.value = 0; tickerGroup.visible = true;
  renderer.setRenderTarget(rtCol); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
  shared.uMode.value = 1; tickerGroup.visible = false;
  renderer.setRenderTarget(rtNrm); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
  tickerGroup.visible = true;
  renderer.setRenderTarget(rtComb); renderer.render(edgePass.scene, quadCam);
  finalPass.mat.uniforms.uFrame.value = frame;
  renderer.setRenderTarget(null); renderer.render(finalPass.scene, quadCam);

  // --- streak layer
  streakPass.mat.uniforms.uT.value = t;
  fxR.clear();
  if (t > T.streak - 0.02 && t < T.streak + 0.75) fxR.render(streakPass.scene, quadCam);

  // --- DOM overlay
  frameLines.forEach(({ d, horiz, t0, t1 }) => { const k = eInOut(lin(t, t0, t1)); d.style.transform = horiz ? `scaleX(${k})` : `scaleY(${k})`; });
  rings.forEach((r, i) => { const k = eOut(lin(t, 0.35 + i * 0.05, 0.6 + i * 0.05)); r.style.transform = `scale(${k})`; r.style.opacity = k; });
  const nSer = Math.floor(lin(t, 0.12, 0.6) * serialTxt.length + 0.001);
  serial.textContent = serialTxt.slice(0, nSer) + (t < 0.75 && nSer < serialTxt.length && frame % 4 < 2 ? '▌' : '');
  const tagTxt = t < T.swap ? 'I-01  PRIYA' : 'I-02  PRIYA';
  sceneTag.textContent = tagTxt.slice(0, Math.floor(lin(t, 0.3, 0.6) * tagTxt.length));
  rule.style.transform = `scaleX(${eInOut(lin(t, 0.25, 0.75))})`;
  footL.textContent = 'SHARE CERTIFICATE · AI'.slice(0, Math.floor(lin(t, 0.4, 0.8) * 22));
  const sec = Math.min(t, 9.999);
  footR.textContent = t < 0.45 ? '' : `T+${sec.toFixed(2).padStart(5, '0')}`;

  line1.d.style.display = t >= T.line1 && t < T.swap ? 'block' : 'none';
  if (t >= T.line1) decode(line1, t, T.line1, frame);
  line2.d.style.display = t >= T.line2 ? 'block' : 'none';
  if (t >= T.line2) decode(line2, t, T.line2, frame);
}

window.renderFrame = renderFrame;
window.ready = (async () => {
  await document.fonts.load('600 88px Inter');
  await document.fonts.load('400 24px JBM');
  await document.fonts.load('600 120px JBM');
  await document.fonts.ready;
  buildTickers();
  // compile everything once
  renderFrame(5.5); renderFrame(0);
  return true;
})();

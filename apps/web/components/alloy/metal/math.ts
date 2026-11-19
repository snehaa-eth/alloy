/** Small math kit shared by the metal renderer, the landing story and the motion helpers (pure, no DOM). */
export type V3 = [number, number, number];

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** smoothstep(a, b, x) */
export const ss = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** 0 → 1 → 0 over [a, b] */
export const bump = (a: number, b: number, x: number) => Math.sin(clamp((x - a) / (b - a)) * Math.PI);
/** Frame-rate independent exponential approach (k = fraction left after 1s). */
export const damp = (a: number, b: number, k: number, dt: number) => lerp(a, b, 1 - Math.pow(k, dt));

export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

export type Cam = { ro: V3; ta: V3; tan: number };

/** World point → CSS px inside a region of size w × h (z = depth). */
export function project(cam: Cam, p: V3, w: number, h: number): V3 {
  const f = norm(sub(cam.ta, cam.ro));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const q = sub(p, cam.ro);
  const z = dot(q, f);
  const x = dot(q, r) / z / cam.tan / (w / h);
  const y = dot(q, u) / z / cam.tan;
  return [((x + 1) / 2) * w, ((1 - y) / 2) * h, z];
}

/** Deterministic 32-bit hash of a string or number (FNV-1a). */
export function hashSeed(seed: string | number): number {
  const s = String(seed);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Tiny seeded PRNG (mulberry32) → [0, 1). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

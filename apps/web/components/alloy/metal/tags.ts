/**
 * Ticker labels next to the metal (DOM), ported from the designer's core.js:
 * placeTag anchors a .a-tag on the silhouette in the direction of the stock's zone; resolveTags balances sides,
 * keeps a 22px minimum gap and hides the lowest-weight labels when a side is too crowded.
 */
import { project, type Cam, type V3 } from "./math";

export type TagEl = HTMLElement & {
  _w?: number; _x?: number; _xm?: number; _y?: number; _ay?: number; _left?: boolean; _op?: number; _tw?: number; _adx?: number; _wt?: number;
};

export function placeTag(tag: TagEl, cam: Cam, d: { p: V3; r: number }, ctr: V3, w: number, h: number, op: number, push = 1.22) {
  let dx = d.p[0] - ctr[0], dy = d.p[1] - ctr[1];
  let l = Math.hypot(dx, dy);
  if (l < 0.08) [dx, dy, l] = [0, 1, 1];
  const ext = (Math.hypot(d.p[0] - ctr[0], d.p[1] - ctr[1], d.p[2] - ctr[2]) + d.r) * push;
  const pr = project(cam, [ctr[0] + (dx / l) * ext, ctr[1] + (dy / l) * ext, ctr[2]], w, h);
  const left = dx < 0;
  const pm = project(cam, [ctr[0] - (dx / l) * ext, ctr[1] + (dy / l) * ext, ctr[2]], w, h); // mirrored anchor if the label flips side
  tag.classList.toggle("l", left);
  tag.style.opacity = String(op);
  const tw = tag._w || (tag._w = tag.offsetWidth || 90), m = 10;
  let x = left ? pr[0] - 6 - tw : pr[0] + 6;
  x = Math.max(m, Math.min(w - tw - m, x));
  const y = Math.max(46, Math.min(h - 30, pr[1] - 8));
  let xm = !left ? pm[0] - 6 - tw : pm[0] + 6;
  xm = Math.max(m, Math.min(w - tw - m, xm));
  Object.assign(tag, { _x: x, _xm: xm, _y: y, _ay: y, _left: left, _op: op, _tw: tw, _adx: Math.abs(dx / l) });
  tag.style.transform = `translate3d(${x}px,${y}px,0)`;
}

export function resolveTags(tags: TagEl[], w: number, h: number, o: { gap?: number; top?: number; bottom?: number } = {}) {
  const gap = o.gap ?? 22, top = o.top ?? 46, bot = h - (o.bottom ?? 30);
  const vis = tags.filter((t) => (t._op ?? 0) > 0.02 && t._y != null);
  for (let guard = 0; guard < 10; guard++) {
    const L = vis.filter((t) => t._left), R = vis.filter((t) => !t._left);
    const [big, small] = L.length > R.length ? [L, R] : [R, L];
    if (big.length - small.length <= 1) break;
    const f = big.sort((p, q) => (p._adx ?? 0) - (q._adx ?? 0))[0];
    f._left = !f._left;
    [f._x, f._xm] = [f._xm, f._x];
    f.classList.toggle("l", !!f._left);
  }
  for (const side of [true, false]) {
    let a = vis.filter((t) => !!t._left === side).sort((p, q) => (p._ay ?? 0) - (q._ay ?? 0));
    const cap = Math.max(1, Math.floor((bot - top) / gap) + 1);
    if (a.length > cap) {
      const drop = [...a].sort((p, q) => (p._wt ?? 0) - (q._wt ?? 0)).slice(0, a.length - cap);
      drop.forEach((t) => {
        t.style.opacity = "0";
        t._op = 0;
      });
      a = a.filter((t) => !drop.includes(t));
    }
    const y = a.map((t) => t._ay ?? 0);
    for (let i = 1; i < y.length; i++) y[i] = Math.max(y[i], y[i - 1] + gap);
    if (y.length && y[y.length - 1] > bot) {
      y[y.length - 1] = bot;
      for (let i = y.length - 2; i >= 0; i--) y[i] = Math.min(y[i], y[i + 1] - gap);
    }
    if (y.length && y[0] < top) {
      y[0] = top;
      for (let i = 1; i < y.length; i++) y[i] = Math.max(y[i], y[i - 1] + gap);
    }
    a.forEach((t, i) => {
      t._y = y[i];
      t.style.transform = `translate3d(${t._x}px,${y[i]}px,0)`;
    });
  }
  const L = vis.filter((t) => t._left && (t._op ?? 0) > 0.02), Rr = vis.filter((t) => !t._left && (t._op ?? 0) > 0.02);
  Rr.forEach((r) =>
    L.forEach((l) => {
      if ((l._x ?? 0) + (l._tw ?? 0) + 6 > (r._x ?? 0) && Math.abs((l._y ?? 0) - (r._y ?? 0)) < gap) {
        r._y = Math.min(bot, (l._y ?? 0) + gap);
        r.style.transform = `translate3d(${r._x}px,${r._y}px,0)`;
      }
    }),
  );
}

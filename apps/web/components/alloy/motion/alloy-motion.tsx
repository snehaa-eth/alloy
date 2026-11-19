"use client";

/**
 * Alloy motion helpers (docs/design/artdir/wow):
 * - <WordReveal>: word-by-word blur-up, once, when it scrolls into view (CSS transitions, [data-rv]).
 * - splitWords(el): imperative split for scroll-driven reveals (wordsAt sets each word's progress).
 * - <Odometer>: rolling digit columns; re-rolls when the string changes.
 * - useReducedMotion, useScrollProgress (damped, frame-synced), useInView.
 * Everything respects prefers-reduced-motion (instant, no blur).
 */
import { Children, Fragment, cloneElement, isValidElement, useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode, type RefObject } from "react";
import { clamp, damp, easeOut } from "../metal/math";

export function useReducedMotion(): boolean {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setRm(mq.matches);
    const on = () => setRm(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return rm;
}

/** Adds `.in` once the element enters the viewport (for [data-rv] / [data-up]). */
export function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin = "0px 0px -8% 0px") {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, seen]);
  return seen;
}

/** Split string children into .a-w spans (keeps <em> and other elements as single words). */
function splitNodes(children: ReactNode, counter: { i: number }): ReactNode {
  return Children.map(children, (c) => {
    if (typeof c === "string" || typeof c === "number") {
      return String(c)
        .split(/(\s+)/)
        .map((p, k) =>
          !p ? null : /^\s+$/.test(p) ? (
            <Fragment key={k}>{p}</Fragment>
          ) : (
            <span key={k} className="a-w" style={{ "--i": counter.i++ } as CSSProperties}>
              {p}
            </span>
          ),
        );
    }
    if (isValidElement<{ className?: string; style?: CSSProperties; children?: ReactNode }>(c)) {
      if (c.type === "em" || c.type === "b") return cloneElement(c, { className: `${c.props.className ?? ""} a-w`, style: { ...c.props.style, "--i": counter.i++ } as CSSProperties });
      return cloneElement(c, {}, splitNodes(c.props.children, counter));
    }
    return c;
  });
}

/** Word-by-word blur-up reveal, once, on enter. `delay` in ms. */
export function WordReveal({ as: Tag = "span", children, className, delay = 0, immediate }: { as?: ElementType; children: ReactNode; className?: string; delay?: number; immediate?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const on = immediate ? mounted : seen;
  return (
    <Tag ref={ref} data-rv="" className={`${className ?? ""}${on ? " in" : ""}`} style={{ "--d": `${delay}ms` } as CSSProperties}>
      {splitNodes(children, { i: 0 })}
    </Tag>
  );
}

/** Fade-up block, once, on enter. */
export function Rise({ as: Tag = "div", children, className, delay = 0, style }: { as?: ElementType; children: ReactNode; className?: string; delay?: number; style?: CSSProperties }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref);
  return (
    <Tag ref={ref} data-up="" className={`${className ?? ""}${seen ? " in" : ""}`} style={{ ...style, "--d": `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}

/** Imperative split for scroll-driven reveals. Returns the word spans. */
export function splitWords(el: HTMLElement): HTMLElement[] {
  if (el.dataset.split) return [...el.querySelectorAll<HTMLElement>(".a-w")];
  el.dataset.split = "1";
  const walk = (n: Node) => {
    [...n.childNodes].forEach((c) => {
      if (c.nodeType === 3) {
        const fr = document.createDocumentFragment();
        (c.textContent ?? "").split(/(\s+)/).forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) return void fr.appendChild(document.createTextNode(p));
          const s = document.createElement("span");
          s.className = "a-w";
          s.textContent = p;
          fr.appendChild(s);
        });
        (c as ChildNode).replaceWith(fr);
      } else if (c instanceof HTMLElement && !c.classList.contains("a-w")) {
        if (c.tagName === "EM") c.classList.add("a-w");
        else walk(c);
      }
    });
  };
  walk(el);
  return [...el.querySelectorAll<HTMLElement>(".a-w")];
}

/** Set word reveal progress 0..1 (scroll-driven, staggered). */
export function wordsAt(ws: HTMLElement[], pr: number, reduced = false) {
  const n = ws.length || 1;
  ws.forEach((w, i) => {
    const l = reduced ? 1 : easeOut(clamp(pr * 1.5 - (i / n) * 0.5));
    w.style.opacity = String(l);
    w.style.transform = `translate3d(0,${(1 - l) * 0.45}em,0)`;
    w.style.filter = l > 0.99 ? "none" : `blur(${(1 - l) * 10}px)`;
  });
}

/** Rolling-digit number. Non-digits are static; digits roll from their previous value. */
export function Odometer({ value, className, roll = true }: { value: string; className?: string; roll?: boolean }) {
  const chars = [...value];
  return (
    <span className={`a-odo ${className ?? ""}`} aria-label={value}>
      {chars.map((c, i) =>
        /\d/.test(c) ? (
          <span key={`${chars.length}-${i}`} className="oc" aria-hidden>
            <span className="ot" style={{ transform: `translateY(${-Number(c)}em)`, transition: roll ? undefined : "none", "--i": i } as CSSProperties}>
              {Array.from({ length: 10 }, (_, k) => (
                <span key={k}>{k}</span>
              ))}
            </span>
          </span>
        ) : (
          <span key={`${chars.length}-${i}`} className="os" aria-hidden>
            {c}
          </span>
        ),
      )}
    </span>
  );
}

/** Odometer that starts at `from` and rolls to `value` the first time it scrolls into view. */
export function OdometerOnView({ value, from, className }: { value: string; from?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, "0px 0px -15% 0px");
  const start = from ?? value.replace(/\d/g, "0");
  return (
    <span ref={ref}>
      <Odometer value={seen ? value : start} className={className} />
    </span>
  );
}

/**
 * Scroll progress of `ref` through the viewport, damped (smoothed) and frame-synced.
 * progress = 0 when the element's top hits the viewport bottom ... 1 when its bottom leaves the top
 * (mode "through"), or 0..1 across a tall sticky section (mode "pin": top at 0 → bottom at viewport bottom).
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, onProgress: (p: number, raw: number) => void, opts: { mode?: "through" | "pin"; smooth?: number } = {}) {
  const cb = useRef(onProgress);
  cb.current = onProgress;
  const { mode = "through", smooth = 0.0009 } = opts;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = performance.now(), s = -1;
    const read = () => {
      const r = el.getBoundingClientRect();
      const H = window.innerHeight;
      return mode === "pin" ? clamp(-r.top / Math.max(1, el.offsetHeight - H)) : clamp((H - r.top) / (H + r.height));
    };
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const raw = read();
      s = s < 0 || rm ? raw : damp(s, raw, smooth, dt);
      cb.current(s, raw);
      if (!rm) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onScroll = () => rm && requestAnimationFrame(loop);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [ref, mode, smooth]);
}

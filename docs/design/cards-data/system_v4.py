"""Alloy component system v4: "Certificate" + "Alloy bars".
Builds on system.py tokens/helpers but replaces the visual language:
  - sharp corners (2px controls, 4px certificates/sheets), hairline frames, square-edged buttons, stamps not chips
  - certificate header art = GUILLOCHE line work generated from each basket's REAL price series + recipe weights
  - recipe = "alloy bar": layered bands, one per stock, thickness = weight, jewel tone with a sheen
Every colour / size / radius still comes from :root tokens (checked by check_consistency.py).
"""
import math, hashlib, html as H
from system import TOKENS_CSS as _T, COMPONENT_CSS as _C, PAGE_CSS as _P, FONTS, ICONS, ico, load_baskets, logo, stack, LOGO_CH, HERE

TOKENS_CSS = _T.replace("--r-md:12px; --r-lg:20px; --r-pill:999px;",
    "--r-md:12px; --r-lg:20px; --r-pill:999px; /* v3 only */\n  --r-xs:2px; --r-sm:4px; /* v4: controls 2px, certificates + sheets 4px, avatars/logos 50% */\n  --sheen:rgba(242,240,237,.28); --engrave:.55; --rule:2px;")

# v4 component CSS: start from v3 and square everything off, then add certificate parts
C = _C.replace("var(--r-pill)", "var(--r-xs)").replace("var(--r-lg)", "var(--r-sm)").replace("var(--r-md)", "var(--r-xs)")
C += r"""
/* ===== v4 overrides: square, engraved ===== */
.c-btn{height:48px;letter-spacing:.01em}
.c-btn--quiet{justify-content:flex-start;padding:0;color:var(--tx2);text-decoration:underline;text-underline-offset:3px}
.c-btn--icon{border-radius:50%}
.c-tag{background:transparent;box-shadow:inset 0 0 0 1px var(--bdi);height:22px}
.c-tag--accent{box-shadow:inset 0 0 0 1px var(--acc);background:transparent}
.c-tag--warn{box-shadow:inset 0 0 0 1px var(--warnbd);background:transparent}
.c-pill{height:32px}
/* tabs = underline, not a track */
.c-seg{background:transparent;padding:0;border-bottom:var(--hair);border-radius:0}
.c-seg span{height:40px;border-radius:0;color:var(--tx2)}
.c-seg span.is-on{background:transparent;color:var(--tx);box-shadow:inset 0 -2px 0 var(--acc)}
.c-nav span.is-on::after{display:none}
.c-nav span.is-on{box-shadow:inset 0 2px 0 var(--acc)}
.c-nav{padding-top:0}
.c-nav span{padding-top:var(--s2x)}
.c-toast{border-left:var(--rule) solid var(--gain)} .c-toast--error{border-left-color:var(--loss)}
.c-banner{border-left:var(--rule) solid var(--tx2)}
.c-banner--notice{border-left-color:var(--acc)} .c-banner--closed{border-left-color:var(--warn)} .c-banner--test{border-left-color:var(--test)}
.c-badge{border-radius:var(--r-xs)}
/* ===== certificate ===== */
.c-cert{color:var(--tx);background:var(--s1);border:var(--hair);border-radius:var(--r-sm);display:flex;flex-direction:column;position:relative}
.c-cert__head{display:flex;justify-content:space-between;align-items:center;gap:var(--s2x);min-height:36px;padding:0 var(--s3x);border-bottom:var(--hair)}
.c-cert__serial{font-family:var(--mono);font-size:var(--fs-small);color:var(--tx2);letter-spacing:.06em}
.c-cert__art{position:relative;height:104px;border-bottom:var(--rule) solid var(--acc)}
.c-cert__art .c-guil{position:absolute;inset:0}
.c-cert__wm{position:absolute;right:var(--s3x);bottom:var(--s2x)}
.c-cert__body{padding:var(--s3x) var(--s3x) var(--s3x);display:flex;flex-direction:column;gap:var(--s3x)}
.c-cert__title{display:flex;justify-content:space-between;align-items:baseline;gap:var(--s2x)}
.c-cert__label{font-family:var(--mono);font-size:var(--fs-small);text-transform:uppercase;letter-spacing:.08em;color:var(--tx2)}
.c-cert__figure{display:flex;align-items:baseline;gap:var(--s2x)}
.c-cert__figure .t-display{letter-spacing:.02em;text-transform:none}
.c-cert__foot{display:flex;justify-content:space-between;align-items:center;min-height:36px;padding:0 var(--s3x);border-top:var(--hair)}
.c-cert--flat{border:0;background:transparent}
.c-cert--flat .c-cert__head,.c-cert--flat .c-cert__foot{padding-left:0;padding-right:0}
.c-cert--flat .c-cert__body{padding-left:0;padding-right:0}
.c-guil{display:block;width:100%;height:100%}
.c-guil path,.c-guil rect,.c-guil circle{fill:none;stroke:currentColor;vector-effect:non-scaling-stroke}
/* ledger: two engraved fields side by side */
.c-ledger{display:grid;grid-template-columns:1fr 1fr;border-top:var(--hair);border-bottom:var(--hair)}
.c-ledger__cell{display:flex;flex-direction:column;gap:2px;padding:var(--s2x) 0}
.c-ledger__cell + .c-ledger__cell{border-left:var(--hair);padding-left:var(--s3x)}
.c-ledger__k{font-family:var(--mono);font-size:var(--fs-small);text-transform:uppercase;letter-spacing:.06em;color:var(--tx2)}
.c-ledger__v{font-size:var(--fs-body);font-weight:600;display:inline-flex;align-items:center;gap:6px}
/* alloy bar: layered bands, thickness = weight */
.c-alloy{display:flex;flex-direction:column;gap:1px;height:32px;border-radius:var(--r-xs);overflow:hidden}
.c-alloy i{display:block;width:100%;position:relative;background:currentColor}
.c-alloy i::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,var(--sheen) 38%,transparent 62%)}
.c-alloy--lg{height:56px}
.c-alloy--sm{height:10px;gap:0}
.c-alloy__legend{display:flex;flex-wrap:wrap;gap:var(--s1x) var(--s3x);font-family:var(--mono);font-size:var(--fs-small);color:var(--tx2)}
.c-alloy-pair{display:grid;grid-template-columns:1fr auto 1fr;gap:var(--s2x);align-items:center}
.q{font-style:italic;color:var(--tx3)}
/* compact certificate row (lists) */
.c-mini{display:grid;grid-template-columns:44px 1fr auto;gap:var(--s3x);align-items:center;min-height:64px;border-top:var(--hair)}
.c-mini:first-child{border-top:0}
.c-mini__art{width:44px;height:44px;border:var(--hair);border-radius:var(--r-xs);overflow:hidden}
"""
COMPONENT_CSS = C
PAGE_CSS = _P.replace("var(--r-pill)", "var(--r-xs)").replace("var(--r-lg)", "var(--r-sm)").replace("var(--r-md)", "var(--r-xs)") + r"""
.p-reg{display:grid;grid-template-columns:200px 360px 1fr;gap:var(--s6x);align-items:start;padding:var(--s6x) 0;border-top:1px solid var(--p-line)}
.p-reg:first-child{border-top:0}
.p-reg__no{font:500 var(--fs-small) var(--mono);color:var(--p-ink2);letter-spacing:.08em}
.p-reg__name{font:400 var(--p-fs-h2)/1 var(--display);text-transform:uppercase;margin:var(--s1x) 0 var(--s2x)}
.p-reg__fields{font-size:var(--fs-small);color:var(--p-ink2)}
.p-reg__fields dt{font-family:var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--p-ink);margin-top:var(--s2x)}
.p-reg__fields dd{margin:0}
@media (max-width:900px){.p-reg{grid-template-columns:1fr}}
"""

def page(title, body):
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{title}</title>{FONTS}<style>{TOKENS_CSS}{COMPONENT_CSS}{PAGE_CSS}</style></head><body class="p-page">{body}</body></html>'

# ---------------------------------------------------------------- guilloche (seeded by REAL data)
def _norm(series, n):
    vals = [v for _, v in series]; lo, hi = min(vals), max(vals); sp = (hi - lo) or 1
    out = []
    for k in range(n):
        t = k / (n - 1) * (len(vals) - 1); i = int(t); f = t - i
        v = vals[i] if i + 1 >= len(vals) else vals[i] * (1 - f) + vals[i + 1] * f
        out.append((v - lo) / sp)
    return out

def seed_of(b):
    """Deterministic parameters from the basket's real series + recipe."""
    vals = [v for _, v in b['series']]
    rets = [vals[i] / vals[i - 1] - 1 for i in range(1, len(vals))]
    vol = (sum(r * r for r in rets) / len(rets)) ** .5            # daily volatility
    w = sorted(b['recipe'].values(), reverse=True)
    h = int(hashlib.sha256(json_key(b).encode()).hexdigest(), 16)
    return {'petals': 5 + 2 * len(w), 'k2': max(2, round(w[0] / 6)), 'vol': vol, 'lines': 9 + len(w) * 2,
            'freq': 2 + w[0] / 18, 'phase': (h % 360) / 57.3, 'serial': h % 10000}
def json_key(b): return b['name'] + '|' + ','.join(f'{k}{v}' for k, v in sorted(b['recipe'].items())) + '|' + ','.join(f'{v:.3f}' for _, v in b['series'])

def guilloche(b, w=358, h=104, rosette=True, frame=True, label=None):
    s = seed_of(b); env = _norm(b['series'], 121)
    P = []
    # 1. wave lattice: two crossing families whose centre line follows the REAL price path
    amp = 3 + min(6, s['vol'] * 400); top, bot = 14, h - 14
    for fam in (1, -1):
        for i in range(s['lines']):
            ph = s['phase'] + i * math.pi / s['lines']
            pts = []
            for k in range(121):
                x = 10 + k / 120 * (w - 20)
                y = bot - 10 - env[k] * (bot - top - 20) + fam * amp * math.sin(2 * math.pi * s['freq'] * x / w + ph) + (i - s['lines'] / 2) * .8
                y = min(bot, max(top, y))
                pts.append(f'{x:.1f},{y:.1f}')
            P.append(f'<path d="M{" L".join(pts)}" stroke-width=".5" opacity=".42"/>')
    # 2. rosette (hypotrochoid family): petals from the number of stocks, harmonic from the top weight
    if rosette:
        cx, cy, R = (w - 50, h / 2, 34) if w > 120 else (w / 2, h / 2, w * .62)
        p = s['petals']
        for j in range(5):                                   # epitrochoid family: p smooth loops, nested by pen distance
            d = (p + 1) * (.16 + .07 * j); rot = j * math.pi / p / 2.5; k = (p + 1)
            scale = R / (p + 1 + d)
            pts = []
            for q in range(721):
                t = q / 720 * 2 * math.pi
                x = (p + 1) * math.cos(t) - d * math.cos(k * t); y = (p + 1) * math.sin(t) - d * math.sin(k * t)
                xr, yr = x * math.cos(rot) - y * math.sin(rot), x * math.sin(rot) + y * math.cos(rot)
                pts.append(f'{cx + xr * scale:.1f},{cy + yr * scale:.1f}')
            P.append(f'<path d="M{" L".join(pts)}Z" stroke-width=".5" opacity="{.3 + .12 * (j % 3):.2f}"/>')
        for j in range(3):                                   # inner hypotrochoid rings tied to the top weight
            m = s['k2'] + 3; rr = R * (.28 + .08 * j); pts = []
            for q in range(361):
                t = q / 360 * 2 * math.pi
                r = rr * (1 + .18 * math.cos(m * t + j))
                pts.append(f'{cx + r * math.cos(t):.1f},{cy + r * math.sin(t):.1f}')
            P.append(f'<path d="M{" L".join(pts)}Z" stroke-width=".5" opacity=".45"/>')
    # 3. engraved frame: double hairline with corner ticks
    if frame:
        P.append(f'<rect x="5" y="5" width="{w-10}" height="{h-10}" stroke-width=".6" opacity=".55"/><rect x="9" y="9" width="{w-18}" height="{h-18}" stroke-width=".4" opacity=".35"/>')
        for x, y in [(5, 5), (w - 5, 5), (5, h - 5), (w - 5, h - 5)]:
            P.append(f'<circle cx="{x}" cy="{y}" r="2.5" stroke-width=".6" opacity=".6"/>')
    lab = f' role="img" aria-label="{H.escape(label)}"' if label else ' aria-hidden="true"'
    return f'<svg class="c-guil t-{b["tone"]}" viewBox="0 0 {w} {h}" preserveAspectRatio="none"{lab}>{"".join(P)}</svg>'

def mini_guil(b): return guilloche(b, w=44, h=44, frame=False, rosette=True).replace(f'viewBox="0 0 44 44"', 'viewBox="0 0 44 44"')

# ---------------------------------------------------------------- alloy bar
def alloy(recipe, tone, lg=False, legend=True, sm=False, order=None):
    tot = sum(recipe.values()); items = [(k, recipe.get(k, 0)) for k in order] if order else sorted(recipe.items(), key=lambda kv: -kv[1]); n = len(items)
    bands = ''.join(f'<i style="flex:{w/tot:.3f};opacity:{1 - .55 * k / max(n - 1, 1):.2f}"></i>' for k, (t, w) in enumerate(items))
    leg = ('<div class="c-alloy__legend">' + ''.join(f'<span>{t} {w:g}</span>' for t, w in items) + '</div>') if legend else ''
    return f'<div class="stack-2"><div class="c-alloy t-{tone}{" c-alloy--lg" if lg else ""}{" c-alloy--sm" if sm else ""}" role="img" aria-label="Recipe: ' + ', '.join(f'{t} {w:g}%' for t, w in items) + f'">{bands}</div>{leg}</div>'

def alloy_pair(before, after, tone):
    order = sorted(before, key=lambda k: -before[k])
    diff = ''.join(f'<span>{k} {before[k]:g}→{after.get(k, 0):g}</span>' for k in order if before[k] != after.get(k, 0))
    return f'<div class="stack-2"><div class="c-alloy-pair">{alloy(before, tone, legend=False, order=order)}{ico("arrow-right")}{alloy(after, tone, legend=False, order=order)}</div><div class="c-alloy__legend">{diff}</div></div>'

# ---------------------------------------------------------------- primitives
def stamp(text, icon=None, mod=''): return f'<span class="c-tag{" c-tag--"+mod if mod else ""}">{ico(icon) if icon else ""}{text}</span>'
def btn(text, kind='primary', state='', icon=None):
    return f'<span class="c-btn c-btn--{kind}{" "+state if state else ""}">{ico(icon) if icon else ""}{text}</span>'
def link(text): return f'<span class="c-btn c-btn--quiet">{text} →</span>'
def ledger(cells): return '<div class="c-ledger">' + ''.join(f'<div class="c-ledger__cell"><span class="c-ledger__k">{k}</span><span class="c-ledger__v">{v}</span></div>' for k, v in cells) + '</div>'
def signed(pct):
    cls = 'up' if pct >= 0 else 'down'
    return f'<span class="{cls}">{"▲ +" if pct >= 0 else "▼ −"}{abs(pct):.1f}%</span>'

def cert(b, serial, kind, title, label, figure, unit='', cells=(), bar=None, primary=None, secondary=None, lnk=None, foot='', wm='', budget=16, art=True):
    """One certificate. Order: head (serial + stamp) → guilloche (real data) + burgundy rule → title → label + Anton figure → alloy bar → ledger → action → foot."""
    acts = (btn(primary) if primary else '') + (btn(secondary, 'secondary') if secondary else '')
    art_html = f'<div class="c-cert__art">{guilloche(b, label=b["name"] + " certificate pattern, drawn from its real price history")}<span class="c-cert__wm">{wm}</span></div>' if art else ''
    return f'''<div class="c-cert" data-budget="{budget}" data-kind="Certificate"><div class="c-cert__head"><span class="c-cert__serial">{serial}</span>{kind}</div>{art_html}
<div class="c-cert__body"><div class="c-cert__title"><span class="t-body t-strong">{title}</span></div>
<div class="stack-2"><span class="c-cert__label">{label}</span><div class="c-cert__figure"><span class="t-display">{figure}</span>{f'<span class="t-mono c2">{unit}</span>' if unit else ''}</div></div>
{bar or ''}{ledger(cells) if cells else ''}{acts}</div>
<div class="c-cert__foot">{link(lnk) if lnk else '<span></span>'}<span class="t-mono c2">{foot}</span></div></div>'''

def mini(b, sym, value, change):
    return f'''<div class="c-mini"><div class="c-mini__art">{guilloche(b, w=44, h=44, frame=False)}</div><div class="stack-2"><span class="t-body t-strong">{b["name"]}</span>{alloy(b["recipe"], b["tone"], legend=False, sm=True)}</div><div class="c-row__end"><span class="t-body">{value}</span>{signed(change)}</div></div>'''

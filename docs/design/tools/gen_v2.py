# Generates docs/design/wireframes-v2.html (self-contained). Run: python3 -I gen_v2.py OUTPATH
import sys, html
OUT = sys.argv[1]

CSS = r"""
:root{--bg:#0A0A0A;--s1:#141416;--s2:#1C1C1F;--sheet:#0F0F10;--bd:#26262A;--bdi:#6B6B70;--tx:#F2F0ED;--tx2:#9A9894;--tx3:#C9C7C3;
--brand:#6D001A;--acc:#C41A42;--tint:#2A000A;--gold:#C9A96E;--gold6:#A07D3E;--gain:#3DBE8B;--loss:#FF6A3D;--warn:#F2B33D;--warnbg:#1F1806;--test:#3E6FB8;
--display:'Anton',Impact,'Arial Narrow',sans-serif;--ui:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;--mono:'JetBrains Mono',ui-monospace,monospace}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:#E9E8E5;color:#0A0A0A;font:15px/1.45 var(--ui);font-feature-settings:"tnum" 1,"cv11" 1}
p{margin:0}a{color:inherit}
.wrap{max-width:1360px;margin:0 auto;padding:0 16px}
/* page chrome (light paper so dark frames pop) */
.top{background:var(--bg);color:var(--tx);padding:36px 0 26px}
.top h1{font:400 56px/.9 var(--display);text-transform:uppercase;margin:0 0 10px}
.top p{color:var(--tx3);max-width:820px;margin:0 0 16px}
.idx{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:0;padding:0}
.idx a{display:inline-block;padding:6px 12px;border:1px solid var(--bdi);border-radius:999px;color:var(--tx);text-decoration:none;font-size:13px}
.idx a:hover{background:var(--tx);color:var(--bg)}
section.s{padding:40px 0 20px;border-bottom:1px solid #d4d3cf}
.s h2{font:400 36px/1 var(--display);text-transform:uppercase;margin:0 0 4px}
.s .lede{color:#444;max-width:860px;margin:0 0 20px}
.row{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}
.cap{font:600 12px var(--ui);text-transform:uppercase;letter-spacing:.06em;color:#555;margin:0 0 8px;max-width:390px}
.cap em{font-style:normal;color:#8a8a8a;font-weight:500;text-transform:none;letter-spacing:0}
.notes{max-width:380px;font-size:13px;color:#222;background:#fff;border:1px solid #d4d3cf;border-radius:12px;padding:14px 16px}
.notes h4{margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--brand)}
.notes ol{margin:0;padding:0;list-style:none;counter-reset:n}
.notes li{margin:0 0 8px;padding-left:28px;position:relative}
.notes li::before{counter-increment:n;content:counter(n);position:absolute;left:0;top:1px}
.notes li::before,.n{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#0A0A0A;color:#fff;font:700 10px/1 var(--ui)}
.f .n{background:#3A3A40;box-shadow:0 0 0 1.5px var(--tx);vertical-align:middle;margin-left:4px;font-size:10px}
.checks{font-size:12px;color:#333;margin-top:16px}
.checks table{border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden}
.checks td,.checks th{padding:4px 10px;border-bottom:1px solid #eee;text-align:left}
.checks .bad{color:#C2410C;font-weight:700}.checks .ok{color:#0E7A52;font-weight:700}
/* ===== FRAME (dark, final tokens). Only 3 type sizes inside: 36 hero / 15 body / 12 small ===== */
.f{background:var(--bg);color:var(--tx);font-size:15px;line-height:1.4;position:relative;overflow:hidden;border:8px solid #232326;border-radius:34px;width:390px;max-width:100%;min-height:800px;display:flex;flex-direction:column}
.f.short{min-height:0}
.f.test{box-shadow:inset 0 3px 0 var(--test)}
.f.d{width:1200px;border-radius:14px;border-width:6px;min-height:0}
.scrollx{max-width:100%;overflow-x:auto;padding-bottom:8px}
.sb{height:34px;display:flex;justify-content:space-between;align-items:center;padding:0 22px;font:600 12px var(--ui)}
.sb i{font-style:normal;letter-spacing:2px}
.scr{padding:10px 16px 16px;display:flex;flex-direction:column;gap:14px;flex:1}
.hero{font:400 36px/1 var(--display);text-transform:uppercase;letter-spacing:.3px;margin:0}
.big{font:600 36px/1 var(--ui);letter-spacing:-.5px}
.t{font-size:15px;font-weight:600}
.sm{font-size:12px}
.mut{color:var(--tx2)}
.gain{color:var(--gain)}.loss{color:var(--loss)}.warn{color:var(--warn)}.goldt{color:var(--gold)}
.row2{display:flex;justify-content:space-between;align-items:center;gap:8px}
.fx{display:flex;align-items:center;gap:8px}
.col{display:flex;flex-direction:column;gap:6px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.btn{display:inline-flex;align-items:center;justify-content:center;height:48px;padding:0 18px;border-radius:10px;border:1.5px solid var(--tx);color:var(--tx);background:transparent;font:600 15px var(--ui);white-space:nowrap}
.btn.p{background:var(--tx);color:var(--bg)}
.btn.blk{display:flex;width:100%;height:52px}
.btn.g{border-color:var(--bdi)}
.btn.sm{height:34px;font-size:12px;padding:0 12px;border-radius:999px}
.link{text-decoration:underline;text-underline-offset:3px;font-weight:600}
.chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--bdi);border-radius:999px;font-size:12px;white-space:nowrap}
.chip.on{background:var(--tx);color:var(--bg);border-color:var(--tx)}
.chip.am{border-color:#5A4410;background:var(--warnbg);color:var(--warn)}
.chip.ch{border-color:var(--brand);background:var(--tint)}
.chip.ch::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--acc)}
.chips{display:flex;gap:8px;overflow:hidden}
.card{background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:14px}
.hr{height:1px;background:var(--bd)}
.ico{width:32px;height:32px;border-radius:50%;border:1.5px solid var(--bdi);display:inline-flex;align-items:center;justify-content:center;font-size:12px;flex:none}
/* logos (full colour, content) */
.lg{width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:700 12px/1 var(--ui);color:#fff;flex:none;box-shadow:0 0 0 2px var(--bg)}
.lg.l{width:32px;height:32px}
.lgs{display:inline-flex}.lgs .lg+.lg{margin-left:-6px}
/* jewel covers (content colour) */
.cov{position:relative;overflow:hidden;border-radius:14px 14px 0 0;height:88px}
.cov svg{position:absolute;inset:0;width:100%;height:100%}
.tile{width:44px;height:44px;border-radius:10px;position:relative;overflow:hidden;flex:none}
.j-burg{background:radial-gradient(120% 90% at 85% 0%,#B5304F59,transparent 60%),linear-gradient(160deg,#3A0010,#0A0A0A 85%)}
.j-emer{background:radial-gradient(120% 90% at 85% 0%,#2E8B6A59,transparent 60%),linear-gradient(160deg,#0F2E24,#0A0A0A 85%)}
.j-sapp{background:radial-gradient(120% 90% at 85% 0%,#3E6FB859,transparent 60%),linear-gradient(160deg,#10223F,#0A0A0A 85%)}
.j-amb{background:radial-gradient(120% 90% at 85% 0%,#C98A2E59,transparent 60%),linear-gradient(160deg,#3A2A08,#0A0A0A 85%)}
.j-plum{background:radial-gradient(120% 90% at 85% 0%,#8E5BA659,transparent 60%),linear-gradient(160deg,#2A1433,#0A0A0A 85%)}
/* gold (rare) */
.badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font:600 12px var(--ui);color:var(--gold);box-shadow:inset 0 0 0 1px var(--gold6)}
.badge::before{content:"";width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#E3CC9C,#C9A96E 45%,#A07D3E)}
.ring{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--gold)}
.av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#5C5C62,#2A2A2E);flex:none}
/* glow behind hero numbers */
.glow{position:relative}
.glow::before{content:"";position:absolute;left:50%;top:50%;width:300px;height:150px;transform:translate(-50%,-50%);background:radial-gradient(closest-side,rgba(109,0,26,.35),transparent);pointer-events:none}
.glow>*{position:relative}
/* status strip (ONE), in-app bar, tab bar */
.strip{display:flex;align-items:center;gap:8px;padding:8px 16px;font-size:12px;border-bottom:1px solid var(--bd)}
.strip::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
.strip.closed{color:var(--warn);background:var(--warnbg)}
.strip.change{color:var(--tx);background:var(--tint)}.strip.change::before{background:var(--acc)}
.strip.held{color:var(--tx);background:var(--s2)}.strip.held::before{background:var(--gold)}
.strip.pause{color:var(--tx);background:var(--s2)}
.strip b{margin-left:auto;font-weight:600;text-decoration:underline;text-underline-offset:3px}
.inapp{display:flex;align-items:center;gap:8px;background:#000;border-bottom:1px solid var(--bd);padding:8px 14px;font-size:12px}
.inapp .x{font-weight:700}
.inapp b{margin-left:auto;background:var(--tx);color:var(--bg);padding:5px 10px;border-radius:999px}
.tabbar{display:flex;justify-content:space-around;border-top:1px solid var(--bd);padding:10px 0 18px;font-size:12px;color:var(--tx2);background:var(--bg);margin-top:auto}
.tabbar span{display:flex;flex-direction:column;align-items:center;gap:4px}
.tabbar span::before{content:"";width:20px;height:20px;border-radius:6px;border:1.5px solid currentColor}
.tabbar .on{color:var(--tx);font-weight:600}.tabbar .on::before{border-color:var(--tx);background:var(--tx)}
.tabbar .on::after{content:"";width:16px;height:2px;background:var(--acc);border-radius:2px}
.tabbar .dot{position:relative}
/* sheets */
.dim{flex:1;display:flex;flex-direction:column;justify-content:flex-end;background:linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.75))}
.under{opacity:.35;padding:10px 16px;display:flex;flex-direction:column;gap:12px}
.sheet{background:var(--sheet);border-top:1px solid var(--bd);border-radius:22px 22px 0 0;padding:10px 16px 22px;display:flex;flex-direction:column;gap:14px}
.grab{width:40px;height:4px;border-radius:2px;background:var(--bdi);margin:0 auto}
.seg{display:grid;grid-template-columns:1fr 1fr;background:var(--s2);border-radius:10px;padding:3px}
.seg span{text-align:center;padding:8px 0;border-radius:8px;font-weight:600}
.seg .on{background:var(--tx);color:var(--bg)}
.keypad{display:grid;grid-template-columns:repeat(3,1fr);text-align:center;font-size:15px;font-weight:600}
.keypad span{padding:9px 0}
.slider{position:relative;height:28px}
.slider .tr{position:absolute;left:0;right:0;top:12px;height:4px;background:var(--s2);border-radius:2px}
.slider .fl{position:absolute;left:0;top:12px;height:4px;background:var(--acc);border-radius:2px}
.slider .th{position:absolute;top:2px;width:24px;height:24px;border-radius:50%;background:var(--tx);margin-left:-12px}
.ticks{display:flex;justify-content:space-between;font-size:12px;color:var(--tx2)}
.ticks .on{color:var(--tx);font-weight:600}
.wbar{display:flex;height:10px;border-radius:5px;overflow:hidden;gap:2px}
.wbar i{display:block}
.feed{border-left:2px solid var(--bd);margin-left:6px;padding-left:14px;display:flex;flex-direction:column;gap:14px}
.feed .it{position:relative}
.feed .it::before{content:"";position:absolute;left:-21px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--bg);border:2px solid var(--tx2)}
.feed .it.rc::before{background:var(--acc);border-color:var(--acc)}
.feed .it.pd::before{border-color:var(--acc);border-style:dashed}
.q{border-left:3px solid var(--acc);padding:2px 0 2px 10px;font-style:italic}
.field{border:1.5px solid var(--bdi);border-radius:10px;padding:12px;font-size:15px}
.field.ph{color:var(--tx2)}
.otp{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.otp span{height:48px;border:1.5px solid var(--bdi);border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:600}
.steps{display:flex;gap:4px}.steps i{flex:1;height:3px;border-radius:2px;background:var(--s2)}.steps i.on{background:var(--acc)}
.radio{border:1.5px solid var(--bdi);border-radius:12px;padding:12px;display:flex;gap:10px;align-items:center}
.radio.on{border-color:var(--tx)}
.radio .o{width:18px;height:18px;border-radius:50%;border:2px solid var(--bdi);flex:none}
.radio.on .o{border:6px solid var(--acc)}
.sticky{border-top:1px solid var(--bd);padding:12px 16px 18px;background:var(--bg);display:flex;gap:10px;align-items:center;margin-top:auto}
.list .li{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--bd)}
.list .li:last-child{border-bottom:0}
.ta{margin-left:auto;text-align:right}
.empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;padding:24px}
.mark{width:96px;height:96px}
.share{border-radius:16px;overflow:hidden;border:1px solid var(--bd);position:relative}
.share .wm{position:absolute;right:12px;top:10px;font:700 12px var(--ui);letter-spacing:.2em;color:var(--tx);opacity:.75;border:1px solid var(--tx2);padding:2px 6px;border-radius:4px}
.ok{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto}
.bust{position:absolute;right:-30px;bottom:0;height:85%;opacity:.95}
.d .dnav{display:flex;justify-content:space-between;align-items:center;padding:16px 40px;border-bottom:1px solid var(--bd)}
.d .dnav nav{display:flex;gap:28px}
.logo{font:400 15px/1 var(--display);text-transform:uppercase;letter-spacing:1px}
.logo i{display:inline-block;width:8px;height:8px;background:var(--acc);margin-left:3px;vertical-align:top}
.chart{display:block;width:100%}
@media (max-width:700px){.top h1{font-size:40px}}
"""

LOGO = {'NVDA':('#76B900','N'),'MSFT':('#00A4EF','M'),'GOOGL':('#4285F4','G'),'AMZN':('#FF9900','a'),'META':('#0866FF','M'),
        'TSLA':('#E31937','T'),'AAPL':('#8E8E93',''),'MSTR':('#F7931A','M'),'SPCX':('#2B2B30','X'),'SNDK':('#D11F2E','S')}
def lg(t, l=False):
    c, ch = LOGO[t]
    return f'<span class="lg{" l" if l else ""}" style="background:{c}" title="{t}">{ch}</span>'
def lgs(ts): return '<span class="lgs">' + ''.join(lg(t) for t in ts) + '</span>'
TONE = {'burg':'#B5304F','emer':'#2E8B6A','sapp':'#3E6FB8','amb':'#C98A2E','plum':'#8E5BA6'}
def wave(tone, op=.35):
    m = TONE[tone]
    return f'<svg viewBox="0 0 390 88" preserveAspectRatio="none" aria-hidden="true"><path d="M0,66 C70,30 130,96 210,56 C270,28 330,62 390,40" stroke="{m}" stroke-width="12" fill="none" opacity="{op}"/><path d="M0,78 C90,52 150,100 230,70 C300,46 350,74 390,60" stroke="{m}" stroke-width="4" fill="none" opacity="{op*.7:.2f}"/></svg>'
DEEP = {'burg':'#3A0010','emer':'#0F2E24','sapp':'#10223F','amb':'#3A2A08','plum':'#2A1433'}
THEME = {'sapp':'chips','burg':'capitol','emer':'racks','amb':'shovel','plum':'space'}
def motif(theme, m):
    P = 'stroke-linecap="round" fill="none"'
    if theme == 'chips':   # AI: chip + circuit traces + data-centre glow
        tr = ''.join(f'<path d="M{x},88 V{y} H{x+40}" stroke="{m}" stroke-width="2" {P} opacity=".6"/><circle cx="{x+40}" cy="{y}" r="3" fill="{m}"/>' for x,y in [(10,40),(60,60),(330,30),(280,55)])
        pins = ''.join(f'<rect x="{150+i*16}" y="8" width="6" height="10" fill="{m}" opacity=".8"/><rect x="{150+i*16}" y="70" width="6" height="10" fill="{m}" opacity=".8"/>' for i in range(6))
        return tr + pins + f'<rect x="140" y="18" width="104" height="52" rx="6" fill="{m}" opacity=".35" stroke="#F2F0ED" stroke-opacity=".35"/><rect x="170" y="32" width="44" height="24" rx="3" fill="#F2F0ED" opacity=".18"/>'
    if theme == 'capitol': # dome + columns + filing lines
        cols = ''.join(f'<rect x="{150+i*14}" y="48" width="6" height="30" fill="{m}" opacity=".75"/>' for i in range(7))
        docs = ''.join(f'<path d="M{20},{20+i*12} H{90-i*8}" stroke="#F2F0ED" stroke-opacity=".22" stroke-width="3" {P}/>' for i in range(5))
        return docs + cols + f'<path d="M140,48 H250 L240,40 H150 Z" fill="{m}"/><path d="M160,40 A35,30 0 0 1 230,40 Z" fill="{m}" opacity=".9"/><rect x="192" y="0" width="6" height="12" fill="{m}"/><rect x="136" y="78" width="118" height="5" fill="{m}"/>'
    if theme == 'racks':   # big tech: server racks with LEDs
        out = ''
        for i, x in enumerate([60, 120, 180, 240, 300]):
            out += f'<rect x="{x}" y="14" width="44" height="66" rx="3" fill="{m}" opacity="{.25+.1*(i%3)}" stroke="#F2F0ED" stroke-opacity=".18"/>'
            out += ''.join(f'<rect x="{x+6}" y="{20+j*12}" width="32" height="6" rx="2" fill="#0A0A0A" opacity=".55"/><circle cx="{x+34}" cy="{23+j*12}" r="1.6" fill="#F2F0ED" opacity=".7"/>' for j in range(5))
        return out
    if theme == 'shovel':  # picks & shovels: mountain + crossed tools
        return f'<path d="M0,88 L90,30 L150,70 L220,20 L320,74 L390,40 V88 Z" fill="{m}" opacity=".35"/><path d="M170,80 L240,14" stroke="#F2F0ED" stroke-opacity=".55" stroke-width="5" {P}/><path d="M226,8 C240,2 256,10 252,26" stroke="{m}" stroke-width="7" {P}/><path d="M250,80 L190,20" stroke="#F2F0ED" stroke-opacity=".55" stroke-width="5" {P}/><path d="M180,6 L198,24 L190,30 L172,14 Z" fill="{m}"/>'
    if theme == 'space':   # planet + ring + stars + launch trail
        stars = ''.join(f'<circle cx="{x}" cy="{y}" r="1.4" fill="#F2F0ED" opacity=".7"/>' for x,y in [(30,14),(80,40),(120,10),(330,20),(360,60),(260,12),(200,70)])
        return stars + f'<circle cx="290" cy="50" r="26" fill="{m}" opacity=".85"/><ellipse cx="290" cy="50" rx="44" ry="9" stroke="#F2F0ED" stroke-opacity=".5" stroke-width="2" fill="none" transform="rotate(-15 290 50)"/><path d="M20,88 C80,70 120,40 170,20" stroke="{m}" stroke-width="3" {P} stroke-dasharray="2 6"/><path d="M168,14 l10,4 -6,8 z" fill="#F2F0ED" opacity=".85"/>'
    return ''
def art(tone, theme=None, op=1):
    """Duotone cover art: jewel deep→#0A0A0A gradient (CSS class) + themed motif in the jewel mid + paper highlights + grain."""
    theme = theme or THEME[tone]
    return f'<svg viewBox="0 0 390 88" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="opacity:{op}">{motif(theme, TONE[tone])}<rect width="390" height="88" filter="url(#grain)" opacity=".18"/></svg>'
def tile(tone): return f'<span class="tile j-{tone}" role="img" aria-label="{THEME[tone]} cover">{art(tone)}</span>'
AVC = {'kavya':('#3E6FB8','#8E5BA6'),'hill':('#B5304F','#C98A2E'),'ade':('#2E8B6A','#3E6FB8'),'lua':('#8E5BA6','#B5304F'),'raj':('#C98A2E','#2E8B6A'),'asha':('#2E8B6A','#C98A2E')}
def av(handle, size=28, ring=True):
    a, b = AVC.get(handle, ('#5C5C62','#2A2A2E'))
    return f'<span class="av{" ring" if ring else ""}" role="img" aria-label="@{handle}" style="width:{size}px;height:{size}px;background:radial-gradient(circle at 50% 38%,#F2F0ED55 0 18%,transparent 19%),radial-gradient(ellipse at 50% 100%,#F2F0ED40 0 38%,transparent 39%),linear-gradient(135deg,{a},{b})"></span>'
MOON = '''<svg viewBox="0 0 64 64" width="44" height="44" aria-label="Market closed"><circle cx="32" cy="32" r="22" fill="none" stroke="#F2B33D" stroke-width="2"/><path d="M32 18 V32 L41 37" stroke="#F2B33D" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M50 8 a9 9 0 1 0 8 12 a7 7 0 1 1 -8 -12z" fill="#F2B33D"/></svg>'''
def trimviz(before=41, after=40, band=40):
    return f'''<svg viewBox="0 0 96 28" width="96" height="28" aria-label="Trimmed {before} to {after} percent"><rect x="0" y="9" width="{before*2}" height="10" rx="3" fill="#76B900" opacity=".35"/><rect x="0" y="9" width="{after*2}" height="10" rx="3" fill="#76B900"/><line x1="{band*2}" y1="3" x2="{band*2}" y2="25" stroke="#F2B33D" stroke-width="1.5" stroke-dasharray="2 2"/></svg>'''
def stackviz(ts):
    return '<span class="lgs" role="img" aria-label="Your stock tokens">' + ''.join(lg(t, True) for t in ts) + '</span>'
def chart(tone, w=358, h=120, closed=False, ticks=(150,), creator=True, gid='g'):
    m = TONE[tone]
    pts = [(0,95),(30,90),(60,92),(90,80),(120,84),(150,70),(180,72),(210,60),(240,64),(270,48),(300,52),(330,38),(358,30)]
    sx = w/358; sy = h/120
    P = ' '.join(f'{x*sx:.0f},{y*sy:.0f}' for x,y in pts)
    C = ' '.join(f'{x*sx:.0f},{(y-4-x/60)*sy:.0f}' for x,y in pts)
    area = f'M0,{h} L' + ' L'.join(f'{x*sx:.0f},{y*sy:.0f}' for x,y in pts) + f' L{w},{h} Z'
    tk = ''.join(f'<line x1="{t*sx:.0f}" y1="0" x2="{t*sx:.0f}" y2="{h}" stroke="#C41A42" stroke-dasharray="2 4" opacity=".8"/>' for t in ticks)
    cl = ''
    if closed:
        cl = f'<line x1="{300*sx:.0f}" y1="{52*sy:.0f}" x2="{w}" y2="{52*sy:.0f}" stroke="#F2F0ED" stroke-dasharray="3 4"/>'
        P = ' '.join(f'{x*sx:.0f},{y*sy:.0f}' for x,y in pts if x<=300)
    cr = f'<polyline fill="none" stroke="#9A9894" stroke-width="1.5" stroke-dasharray="4 3" points="{C}"/>' if creator else ''
    return f'''<svg class="chart" viewBox="0 0 {w} {h}" height="{h}" aria-label="Value chart"><defs><linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{m}" stop-opacity=".18"/><stop offset="1" stop-color="{m}" stop-opacity="0"/></linearGradient></defs><path d="{area}" fill="url(#{gid})"/>{tk}{cr}<polyline fill="none" stroke="#F2F0ED" stroke-width="2" points="{P}"/>{cl}</svg>'''
def wbar(ws, cols=('#76B900','#00A4EF','#4285F4','#FF9900','#0866FF')):
    return '<div class="wbar">' + ''.join(f'<i style="width:{w}%;background:{c}"></i>' for w,c in zip(ws,cols)) + '</div>'
def n(i): return f'<span class="n">{i}</span>'
SB = '<div class="sb"><span>9:41</span><i>●●● ▮</i></div>'
def tabbar(on):
    return '<div class="tabbar x">' + ''.join(f'<span class="{"on" if t==on else ""}">{t}</span>' for t in ['Explore','Portfolio','Activity','Me']) + '</div>'
def strip(kind, text, act=''):
    return f'<div class="strip {kind}">{text}{f"<b>{act}</b>" if act else ""}</div>'
INAPP = '<div class="inapp x"><span class="x">✕</span><span class="mut">alloy.app/b/0x7a3…</span><b>Open in browser</b></div>'

FRAMES = []  # (section, html)
def frame(cap, body, budget=None, cls='', kind='', note=''):
    b = f' data-budget="{budget}" data-kind="{kind}"' if budget else ''
    return f'<div><p class="cap">{cap}</p><div class="f {cls}"{b} data-name="{html.escape(cap)}">{SB}{body}</div></div>'

AI = dict(name='The AI Build-Out', tone='sapp', st=['NVDA','MSFT','GOOGL','AMZN','META'], w=[35,25,20,12,8])

# ---------------------------------------------------------------- sections
S = []
def section(id_, title, lede, frames, notes, desktop=''):
    nl = ''.join(f'<li>{x}</li>' for x in notes)
    S.append((id_, title, f'''<section class="s" id="{id_}"><div class="wrap"><h2>{title}</h2><p class="lede">{lede}</p>
<div class="row">{''.join(frames)}<div class="notes"><h4>UX notes</h4><ol>{nl}</ol></div></div>{desktop}</div></section>'''))

def bcard(name, tone, st, fol, cre, who, stake, extra='', budget=12, story=False):
    folc = 'gain' if fol.startswith('+') else 'loss'
    arrow = '▲' if fol.startswith('+') else '▼'
    tag = '<span class="chip" style="position:absolute;left:12px;top:10px;background:rgba(10,10,10,.6)">Story</span>' if story else ''
    return f'''<div class="card" style="padding:0" data-budget="{budget}" data-kind="Basket card"><div class="cov j-{tone}" role="img" aria-label="{name} cover">{art(tone)}{tag}{extra}</div>
<div style="padding:12px 14px 14px" class="col"><div class="row2"><span class="t">{name}</span>{lgs(st[:3])}</div>
<div class="row2"><span><span class="sm mut">Followers</span> <span class="t {folc}">{arrow} {fol}</span></span><span class="sm mut">Creator {cre}</span></div>
<div class="fx sm">{av(who,20)}<span>@{who}</span><span class="goldt">{stake} in</span></div></div></div>'''

# 1 LANDING ---------------------------------------------------------
BUST = '''<svg class="bust" viewBox="0 0 520 760" aria-hidden="true"><defs><linearGradient id="mb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2F0ED"/><stop offset=".6" stop-color="#9A9894"/><stop offset="1" stop-color="#3A3A40"/></linearGradient><linearGradient id="vs" x1="0" x2="1"><stop offset="0" stop-color="#141416"/><stop offset=".55" stop-color="#3A3A40"/><stop offset="1" stop-color="#0A0A0A"/></linearGradient></defs><path d="M60,760 C70,640 150,590 210,575 L215,500 C170,470 150,420 150,350 C150,230 210,150 270,150 C340,150 390,220 390,330 C390,420 365,470 325,500 L330,575 C395,590 470,640 480,760 Z" fill="url(#mb)"/><rect x="138" y="268" width="262" height="78" rx="22" fill="url(#vs)" stroke="#6D001A" stroke-width="3"/><rect x="150" y="286" width="238" height="8" rx="4" fill="#C41A42"/></svg>'''
SMOKE = '<div aria-hidden="true" style="position:absolute;inset:0;background:radial-gradient(40% 30% at 70% 30%,rgba(242,240,237,.16),transparent 70%),radial-gradient(50% 30% at 30% 80%,rgba(242,240,237,.08),transparent 70%)"></div>'
SILK = '<svg aria-hidden="true" viewBox="0 0 390 200" style="position:absolute;left:0;bottom:120px;width:100%;height:160px"><path d="M0,120 C80,60 160,170 250,110 C310,70 350,110 390,90 L390,120 C350,140 310,100 250,140 C160,200 80,90 0,150 Z" fill="#6D001A" opacity=".9"/></svg>'
def bust_small(h=120, label="Alloy mascot"):
    return f'<svg viewBox="0 0 520 760" height="{h}" role="img" aria-label="{label}">{BUST[BUST.index(">")+1:-6]}</svg>'
SILKBAND = '<svg aria-hidden="true" viewBox="0 0 390 60" preserveAspectRatio="none" style="display:block;width:100%;height:46px;border-radius:12px"><rect width="390" height="60" fill="#0F0F10"/><path d="M0,40 C80,8 160,58 250,26 C310,6 350,30 390,18 L390,34 C350,46 310,22 250,44 C160,70 80,24 0,56 Z" fill="#6D001A"/><rect width="390" height="60" filter="url(#grain)" opacity=".15"/></svg>'
land_m = frame('1a · Landing (direct visit) <em>budget 20</em>', f'''
<div style="position:relative;height:430px;overflow:hidden">{SMOKE}{SILK}{BUST}
<div style="position:absolute;left:16px;top:12px;right:16px" class="row2"><span class="logo">Alloy<i></i></span><span class="btn sm g">Sign in</span></div>
<div style="position:absolute;left:16px;bottom:16px;right:150px"><p class="hero" style="font-size:36px">Invest in stories, not symbols.</p></div></div>
<div class="scr" style="padding-top:4px">
<div class="g3" style="text-align:center"><div><p class="t">$5</p><p class="sm mut">minimum</p></div><div><p class="t">24h</p><p class="sm mut">notice</p></div><div><p class="t">Anytime</p><p class="sm mut">exit</p></div></div>
<span class="btn p blk">Explore baskets {n(1)}</span><span class="btn blk g">Build a basket</span>
<p class="sm mut x legal" style="text-align:center">Tokenized stock exposure, not shares. Not for US persons. <span class="link">Legal</span></p>
</div>''', 20, 'test', 'Landing hero')
land_m2 = frame('1b · Landing, scrolled: live baskets', f'''<div class="scr">
<div class="row2" data-budget="8" data-kind="Section header"><span class="t">Live baskets</span><span class="sm mut">Most followed</span></div>
{bcard('The AI Build-Out','sapp',AI['st'],'+11.8%','+12.4%','kavya','$1.2k')}
{bcard('Capitol Tech','burg',['MSFT','NVDA','AAPL'],'−2.1%','−1.6%','hill','$800', story=True)}
<div class="g2" style="grid-template-columns:repeat(4,1fr);text-align:center" data-budget="8" data-kind="Trust chips">
<span class="chip" style="justify-content:center">PnL</span><span class="chip" style="justify-content:center">Stake</span><span class="chip" style="justify-content:center">Exit</span><span class="chip" style="justify-content:center">Notice</span></div>
</div>''', None, 'test')
desk_land = f'''<p class="cap" style="margin-top:28px;max-width:none">1c · Desktop landing · 1200 <em>budget 20 above the fold</em></p><div class="scrollx"><div class="f d test" data-budget="20" data-kind="Landing hero" data-name="1c Desktop landing">
<div class="dnav x"><span class="logo" style="font-size:22px">Alloy<i></i></span><nav class="sm"><span>Explore</span><span>Portfolio</span><span>Activity</span><span>Me</span></nav><span class="btn sm">Sign in</span></div>
<div style="position:relative;height:540px;overflow:hidden">{SMOKE}
<svg aria-hidden="true" viewBox="0 0 1200 300" style="position:absolute;left:0;bottom:30px;width:100%;height:200px"><path d="M0,190 C200,90 400,260 650,170 C820,110 980,200 1200,140 L1200,180 C980,240 820,150 650,215 C400,300 200,140 0,235 Z" fill="#6D001A" opacity=".9"/></svg>
<svg aria-hidden="true" viewBox="0 0 520 760" style="position:absolute;right:80px;bottom:0;height:96%">{BUST[BUST.index(">")+1:-6]}</svg>
<div style="position:absolute;left:40px;top:60px;max-width:640px"><p class="hero" style="font-size:36px;font-size:clamp(36px,9vw,112px);line-height:.88">Invest in stories, not symbols.</p>
<div class="fx" style="margin-top:28px;gap:12px"><span class="btn p">Explore baskets</span><span class="btn g">Build a basket</span></div></div></div>
<div class="g3" style="padding:28px 40px;border-top:1px solid var(--bd);text-align:left"><div><p class="t">$5</p><p class="sm mut">minimum</p></div><div><p class="t">24h</p><p class="sm mut">notice before changes</p></div><div><p class="t">Anytime</p><p class="sm mut">exit, even weekends</p></div></div>
<div style="padding:0 40px 32px"><div class="g3" style="gap:16px">
{bcard('The AI Build-Out','sapp',AI['st'],'+11.8%','+12.4%','kavya','$1.2k')}
{bcard('Big Tech, Trimmed','emer',['AAPL','MSFT','GOOGL'],'+4.0%','+4.3%','ade','$500')}
{bcard('Space Race','plum',['SPCX','TSLA','NVDA'],'+6.2%','+6.9%','lua','$300')}</div>
<p class="sm mut x legal" style="margin-top:16px">Tokenized stock exposure, not shares. Not for US persons. Test network. <span class="link">Legal</span></p></div></div></div>'''
section('landing','1 · Landing','Direct visits only. X links skip this and land on the basket page. Headline plus the Caesar-in-VR bust carry the brand; three proof numbers do the talking.',
 [land_m, land_m2],
 ['Anton once (headline). The bust and burgundy silk are the only decorative art in the product, and only here and on share cards.',
  'Primary is off-white on dark. "Build a basket" is outline. The thin blue top edge marks the test network on every frame.',
  'Cards: cover colour, name, 3 logos, follower PnL first, creator stake in gold. 12 words or fewer.',
  '"How it works" and "No black boxes" collapse into 4 trust chips that open sheets.'], desk_land)

# 2 BASKET PAGE -----------------------------------------------------
top = frame('2a · Basket page from X: in-app browser + status strip <em>budget 25 above the fold</em>', f'''{INAPP}{strip('change','Changes in 14h 22m','See')}
<div class="cov j-sapp" style="border-radius:0;height:120px">{art('sapp')}<div style="position:absolute;left:16px;bottom:12px;right:16px" class="row2"><span class="t">The AI Build-Out</span><span class="badge">Seed basket</span></div></div>
<div class="scr" style="padding-top:12px">
<div class="row2"><div class="glow" style="text-align:left"><p class="sm mut">Value</p><p class="big">$10.84</p><p class="sm"><span class="gain">▲ +8.4%</span> <span class="mut">3M</span></p></div>{lgs(AI['st'])}</div>
{chart('sapp')}
<div class="chips"><span class="chip">1W</span><span class="chip">1M</span><span class="chip on">3M</span><span class="chip">1Y</span><span class="chip">All</span></div>
<div class="card"><p class="sm mut">Did followers win? {n(1)}</p><div class="g2" style="margin-top:6px"><div><p class="t gain">▲ +11.8%</p><p class="sm mut">Followers</p></div><div><p class="t">+12.4%</p><p class="sm mut">Creator</p></div></div></div>
<div class="fx sm">{av("kavya")}<span>@kavya</span><span class="goldt">$1.2k in · 28%</span>{n(2)}</div>
</div><div class="sticky"><span class="btn g" style="flex:1">Exit</span><span class="btn p" style="flex:2">Buy</span></div>''', 25, 'test', 'Basket above the fold')
scroll = frame('2b · Basket page, scrolled sections', f'''<div class="scr">
<div class="card" style="border-color:var(--brand);background:var(--tint)" data-budget="12" data-kind="Pending change card"><div class="row2"><span class="t">Change in 14h 22m</span><span class="sm link">See</span></div><p class="q sm" style="margin-top:6px">"Moving to the company renting the GPUs."</p><div class="fx sm" style="margin-top:6px">{lg('TSLA')}<span class="loss">15→0%</span>{lg('AMZN')}<span class="gain">10→25%</span></div></div>
<div data-budget="8" data-kind="Section header"><div class="row2"><span class="t">What's inside</span><span class="chip">Balanced ⓘ</span></div></div>
{wbar(AI['w'])}
<div class="list sm">''' + ''.join(f'<div class="li">{lg(t)}<span>{t}</span><span class="ta"><span class="mut">{w}%</span> → {cn}%</span></div>' for t,w,cn in zip(AI['st'],AI['w'],[37.1,24.0,19.6,11.5,7.8])) + f'''</div>
<div data-budget="8" data-kind="Section header"><span class="t">Changes</span></div>
<div class="feed">
<div class="it" data-budget="12" data-kind="Feed item"><p class="sm"><span class="mut">Nov 14</span> · Trim {lg('NVDA')}</p><div class="fx">{trimviz()}<span class="sm mut">41→40% · $1.90</span></div></div>
<div class="it rc" data-budget="12" data-kind="Feed item"><p class="sm"><span class="mut">Oct 30</span> · Recipe change {lg('TSLA')} 25→15%</p><p class="q sm">"Robotaxi is priced in."</p></div></div>
<div class="row2 sm"><span class="link">Details</span><span class="mut">Contract · feeds · bands</span>{n(3)}</div>
<p class="sm mut x legal">Past performance isn't a promise. Exposure, not shares.</p>
</div><div class="sticky"><div class="col" style="flex:1"><span class="sm mut">You have</span><span class="t">$126.40 <span class="gain sm">▲ $6.40</span></span></div><span class="btn g">Exit</span><span class="btn p">Buy more</span></div>''', None, 'test')
newb = frame('2c · New basket, 0 followers', f'''<div class="cov j-amb" style="border-radius:0;height:120px">{art('amb')}<div style="position:absolute;left:16px;bottom:12px" class="t">Picks &amp; Shovels</div></div>
<div class="scr"><div class="glow"><p class="sm mut">Value</p><p class="big">$10.00</p><p class="sm mut">New · 5 days</p></div>
{chart('amb', creator=False, ticks=(), gid='g2')}
<div class="card" data-budget="10" data-kind="Empty state"><p class="t">Be Founding Follower #1</p><div class="fx sm" style="margin-top:6px">{av("raj")}<span>@raj</span><span class="goldt">$250 in</span></div></div>
</div><div class="sticky"><span class="btn p blk">Buy</span></div>''', None, 'test')
desk_b = f'''<p class="cap" style="margin-top:28px;max-width:none">2d · Desktop basket page · 1200</p><div class="scrollx"><div class="f d test" data-name="2d Desktop basket" data-budget="25" data-kind="Basket above the fold">
<div class="dnav x"><span class="logo" style="font-size:22px">Alloy<i></i></span><nav class="sm"><span>Explore</span><span>Portfolio</span><span>Activity</span><span>Me</span></nav><span class="chip">TEST $1,000</span></div>
{strip('change','Changes in 14h 22m','See change')}
<div class="cov j-sapp" style="border-radius:0;height:150px">{art('sapp')}<div style="position:absolute;left:40px;bottom:18px;right:40px" class="row2"><span class="t">The AI Build-Out</span><span class="fx">{lgs(AI['st'])}<span class="badge">Seed basket</span></span></div></div>
<div style="display:grid;grid-template-columns:1fr 360px;gap:32px;padding:24px 40px 32px">
<div class="col" style="gap:16px"><div class="row2"><div class="glow"><p class="sm mut">Value</p><p class="big">$10.84</p><p class="sm"><span class="gain">▲ +8.4%</span> <span class="mut">3M</span></p></div>
<div class="chips"><span class="chip">1W</span><span class="chip">1M</span><span class="chip on">3M</span><span class="chip">1Y</span></div></div>
{chart('sapp', w=740, h=220, ticks=(300,540), gid='g3')}
<div class="g2"><div class="card"><p class="sm mut">Did followers win?</p><div class="g2" style="margin-top:6px"><p class="t gain">▲ +11.8% <span class="sm mut">Followers</span></p><p class="t">+12.4% <span class="sm mut">Creator</span></p></div></div>
<div class="card"><div class="fx">{av("kavya")}<span>@kavya</span><span class="goldt">$1.2k in · 28%</span></div></div></div></div>
<div class="card col" style="gap:12px"><div class="seg"><span class="on">Buy</span><span>Exit</span></div><p class="big" style="text-align:center">$25</p>
<div class="chips" style="justify-content:center"><span class="chip">$10</span><span class="chip on">$25</span><span class="chip">$100</span></div>
<div class="row2 sm"><span class="mut">≈ you get</span><span>2.30 AIB</span></div><div class="fx"><span class="chip">Fee 1%/yr</span><span class="chip">Cost ≈ $0.03</span></div>
<span class="btn p blk">Buy $25</span><p class="sm mut x legal">Test dollars. Exposure, not shares.</p></div></div></div></div>'''
section('basket','2 · Basket page','Where X links land. Above the fold: identity, Value, chart, the PnL pair and the stake.',
 [top, scroll, newb],
 ['The PnL pair is the hero card. Follower return is coloured; the creator number is neutral.',
  'Creator stake and the Seed basket badge are the gold moments (one or two per viewport).',
  '"Details" holds contract, roles, bands, feeds and Value vs fill for the Tunde persona.',
  'The status strip is the only banner. Highest priority wins: change < 24h → held for you → market closed.',
  'The "Open in browser" bar shows on every basket page inside X, Instagram and Telegram webviews.',
  'With 0 followers, the PnL card is hidden and "Be Founding Follower #1" replaces it.', 'Images carry meaning: the themed duotone cover (chip = AI, dome = Capitol, racks = Big Tech, tools = Picks &amp; Shovels, planet = Space). Stock logos come from the <code>icon_url</code> field of Coinbase\'s tokenized-stocks API; the coloured monograms here are placeholders. Creator avatars appear wherever a creator acts. See IMAGERY.md.'], desk_b)

# 3 EXPLORE --------------------------------------------------------
ex = frame('3a · Explore', f'''<div class="scr">
<div class="row2"><p class="hero">Explore</p><span class="btn sm g">Build</span></div>
<div class="field ph">Search baskets, stocks, creators</div>
<div class="chips"><span class="chip on">All</span><span class="chip">AI</span><span class="chip">Big tech</span><span class="chip">Space</span><span class="chip">Story</span></div>
{bcard('The AI Build-Out','sapp',AI['st'],'+11.8%','+12.4%','kavya','$1.2k', extra='<span class="chip ch" style="position:absolute;right:12px;top:10px">14h</span>')}
{bcard('Big Tech, Trimmed','emer',['AAPL','MSFT','GOOGL'],'+4.0%','+4.3%','ade','$500')}
</div>{tabbar('Explore')}''', 20, 'test', 'Explore chrome')
ex0 = frame('3b · Search, no results', f'''<div class="scr"><div class="field">nuclear</div>
<div class="empty" data-budget="10" data-kind="Empty state"><svg class="mark" viewBox="0 0 96 96"><circle cx="48" cy="48" r="30" fill="none" stroke="#2E8B6A" stroke-width="2"/><path d="M30 70 L66 26" stroke="#9A9894" stroke-width="2"/></svg>
<p class="t">No "nuclear" basket yet</p><span class="btn p cta">Build "nuclear"</span></div></div>{tabbar('Explore')}''', None, 'test')
section('explore','3 · Explore','Covers, logos and two numbers. Thesis lives on the basket page.', [ex, ex0],
 ['Anton once: the "Explore" title. Card names are Inter.',
  'Default sort is Most followed until there are 20+ baskets with 30+ days of history.',
  'A pending change appears as a 14h pill on the cover. "Story" baskets get a chip; the date and "not affiliated" show on tap.',
  'No results turns into a prefilled create link.'])

# 4 BUY ------------------------------------------------------------
UNDER = f'<div class="under"><div class="cov j-sapp" style="height:70px;border-radius:12px">{art("sapp")}</div><p class="t">The AI Build-Out</p></div>'
def sheetf(cap, inner, budget, kind, extra_cls='test'):
    return frame(cap, f'{UNDER}<div class="dim"><div class="sheet" data-budget="{budget}" data-kind="{kind}"><div class="grab"></div>{inner}</div></div>', None, extra_cls)
signin = sheetf('4a · Sign in (first money action) <em>in-app: Google hidden</em>', f'''<p class="t">Make an account</p><div class="field ph">you@email.com</div><span class="btn p blk">Send code</span>
<span class="btn blk g">Use a passkey</span><span class="chip" style="align-self:center">No seed phrase {n(1)}</span>''', 20, 'Sign-in sheet')
code = sheetf('4b · Code + one-sentence attestation', f'''<p class="t">Enter the code</p><div class="otp"><span>4</span><span>8</span><span>1</span><span>9</span><span></span><span></span></div>
<div class="fx sm" style="align-items:flex-start"><span style="width:20px;height:20px;border:2px solid var(--bdi);border-radius:5px;flex:none"></span><span>I'm not a US person, and this is allowed where I live.</span></div>
<span class="btn p blk">Continue</span><p class="sm mut" style="text-align:center"><span class="link">Why we ask</span></p>''', 20, 'Sign-in sheet')
buy = sheetf('4c · Buy sheet <em>budget 20</em>', f'''<div class="row2"><span class="t">Buy</span><span class="sm mut">TEST $1,000</span></div>
<div class="glow" style="text-align:center"><p class="big">$25</p><p class="sm mut">≈ 2.30 AIB</p></div>
<div class="chips" style="justify-content:center"><span class="chip">$10</span><span class="chip on">$25</span><span class="chip">$100</span></div>
<div class="row2 sm">{lg('NVDA')}<span>$8.75</span>{lg('MSFT')}<span>$6.25</span>{lg('GOOGL')}<span>$5.00</span><span class="mut">+2</span></div>
<div class="fx" style="justify-content:center"><span class="chip">Fee 1%/yr</span><span class="chip">Cost ≈ $0.03 {n(2)}</span></div>
<div class="keypad"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>.</span><span>0</span><span>⌫</span></div>
<span class="btn p blk">Buy $25 {n(3)}</span><p class="sm mut x legal" style="text-align:center">Test dollars. Exposure, not shares.</p>''', 20, 'Buy sheet')
short = sheetf('4d · Short balance → add test money detour', f'''<div class="row2"><span class="t">Buy</span><span class="sm mut">TEST $4</span></div>
<div style="text-align:center"><p class="big">$25</p><p class="sm warn">You have $4</p></div>
<div class="chips" style="justify-content:center"><span class="chip">$10</span><span class="chip on">$25</span><span class="chip">$100</span></div>
<span class="btn p blk">Add test money</span><p class="sm mut" style="text-align:center">Minimum $5</p>''', 20, 'Buy sheet')
faucet = sheetf('4e · Add test money (sheet over Buy)', f'''<div class="glow" style="text-align:center"><p class="big">$1,000</p><p class="sm mut">Test dollars · not real money</p></div>
<span class="btn p blk">Get 1,000 test dollars {n(4)}</span><p class="sm mut" style="text-align:center">Back to Buy $25 after</p>''', 20, 'Add money sheet')
gap = sheetf('4f · Off-hours: fill vs Value gap + pending change', f'''<div class="row2"><span class="t">Buy</span><span class="chip ch">Changes in 14h</span></div>
<div style="text-align:center"><p class="big">$100</p><p class="sm mut">≈ 9.13 AIB</p></div>
<div class="chips" style="justify-content:center"><span class="chip">$10</span><span class="chip">$25</span><span class="chip on">$100</span></div>
<div class="fx" style="justify-content:center"><span class="chip am">Fills ~0.8% lower now · Why?</span></div>
<span class="btn p blk">Buy $100</span>''', 20, 'Buy sheet')
pend = sheetf('4g · Buying…', f'''<div style="text-align:center" class="col"><div style="margin:0 auto">{bust_small(110,"Loading")}</div><div style="height:3px;background:var(--s2);border-radius:2px;overflow:hidden"><i style="display:block;width:60%;height:100%;background:var(--acc)"></i></div>
<p class="t">Buying $25</p><p class="sm mut">Usually 5 seconds. Safe to leave.</p></div>''', 12, 'Error / edge state')
fail = sheetf('4h · Failed: nothing spent', f'''<div class="col" style="text-align:center"><div class="ok" style="background:var(--s2)">!</div><p class="t">Prices moved. Nothing spent.</p></div><span class="btn p blk cta">Try again</span>''', 12, 'Error / edge state')
section('buy','4 · Sign in, Buy, Add test money','Sheets over the basket page. Tap to confirm with the amount on the button; presets $10/$25/$100, no Max.',
 [signin, code, buy, short, faucet, gap, pend, fail],
 ['Email code is the default. Google is hidden in webviews. Test dollars drip automatically at first sign-in.',
  '"≈ you get" comes from the live quote. "Cost ≈ $x" is pool fees plus impact.',
  'The sheet is the review, so there is no second confirm. The amount sits on the button.',
  'The detour returns to Buy with the amount kept (also in the URL, ?buy=25).',
  'An amber gap chip only when fill and Value differ by more than 0.5%. The pending change is a chip, not a block.'])

# 5 SUCCESS + SHARE --------------------------------------------------
def sharecard(title, line, who, tone='sapp', founding='Founding Follower #212'):
    return f'''<div class="share xt"><div class="j-{tone}" style="height:150px;position:relative">{art(tone)}<span class="wm">TEST</span>
<svg viewBox="0 0 520 760" style="position:absolute;right:-10px;bottom:0;height:120%;opacity:.9">{BUST[BUST.index(">")+1:-6]}</svg>
<div style="position:absolute;left:14px;bottom:12px"><p class="t">{title}</p>{line}</div></div>
<div class="row2" style="padding:10px 14px;background:var(--s1)"><span class="badge">{founding}</span><span class="sm mut">{who}</span></div></div>'''
succ = frame('5a · Buy success <em>budget 10</em>', f'''<div class="scr" style="justify-content:center;background:radial-gradient(60% 35% at 50% 18%,rgba(242,240,237,.12),transparent 70%),radial-gradient(50% 30% at 20% 60%,rgba(62,111,184,.14),transparent 70%)" data-budget="10" data-kind="Success">
<div class="ok j-sapp" style="box-shadow:0 0 0 2px var(--gold)"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M5 12.5l4.5 4.5L19 7" stroke="#F2F0ED" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg></div>
<p class="hero" style="text-align:center">#212</p><p class="t" style="text-align:center">Founding Follower {n(1)}</p>
<div class="fx" style="justify-content:center">{lgs(AI['st'])}<span class="sm mut">Your slice: 5 stocks</span></div>
<p class="sm mut" style="text-align:center">Refunded $0.42</p>
{sharecard('The AI Build-Out', lgs(AI['st']), 'alloy.app/b/…?ref=asha')}
<span class="btn p blk">Share {n(2)}</span><span class="btn blk g">Done</span></div>''', None, 'test')
cre_s = frame('5b · Share sheet (TEST-watermarked card)', f'''{UNDER}<div class="dim"><div class="sheet" data-budget="12" data-kind="Share sheet"><div class="grab"></div>
{sharecard('The AI Build-Out', lgs(AI['st']), '@asha')}
<div class="g3"><span class="btn g">Post on X</span><span class="btn g">Copy link</span><span class="btn g">Save</span></div></div></div>''', None, 'test')
section('success','5 · Success + share','The share card is the primary post-buy action. The Founding # is the hero. No confetti.',
 [succ, cre_s],
 ['The Founding # is ordered by the indexer from the first Issued event per address (no extra contract). It shows only on the first buy into a basket.',
  'Share is primary. The link carries ref and s=x, and X links land on /b/:addr. Every share and OG image is watermarked TEST on testnet.',
  'The success check fills with the basket colour and a gold ring, using the "colour from content" rule.'])

# 6 EXIT + CLAIM ----------------------------------------------------
usdc = sheetf('6a · Exit → Get USDC <em>budget 20</em>', f'''<div class="seg"><span class="on">Get USDC</span><span>Get the stocks</span></div>
<div class="glow" style="text-align:center"><p class="big">$37.92</p><p class="sm mut">30% · you keep $88.48</p></div>
<div class="slider"><div class="tr"></div><div class="fl" style="width:30%"></div><div class="th" style="left:30%"></div></div>
<div class="ticks"><span>25%</span><span>50%</span><span>75%</span><span>All</span></div>
<div class="fx" style="justify-content:center"><span class="chip">Cost ≈ $0.05</span></div><span class="btn p blk">Sell 30%</span>''', 20, 'Exit sheet')
stocks = sheetf('6b · Exit → Get the stocks', f'''<div class="seg"><span>Get USDC</span><span class="on">Get the stocks</span></div><div style="text-align:center">{stackviz(AI['st'])}</div>
<div class="slider"><div class="tr"></div><div class="fl" style="width:100%"></div><div class="th" style="left:100%"></div></div>
<div class="list sm">''' + ''.join(f'<div class="li">{lg(t)}<span>{t}c</span><span class="ta">≈ ${v}</span></div>' for t,v in zip(AI['st'],['46.90','30.30','24.80','14.50','9.90'])) + f'''</div>
<div class="fx" style="justify-content:center"><span class="chip">Won't rebalance</span><span class="chip">No price impact</span></div><span class="btn p blk">Get the stocks</span>''', 20, 'Exit sheet')
partial = frame('6c · Partial: held for you', f'''{strip('held','AMZNc held for you','Claim')}<div class="scr" style="justify-content:center" data-budget="12" data-kind="Error / edge state">
<p class="t" style="text-align:center">4 of 5 came through</p><div class="list sm">''' + ''.join(f'<div class="li">{lg(t)}<span>{t}c</span><span class="ta {"warn" if t=="AMZN" else "gain"}">{"Held" if t=="AMZN" else "✓"}</span></div>' for t in AI['st']) + f'''</div>
<span class="btn p blk cta">Claim AMZNc</span></div>''', None, 'test')
claim = sheetf('6d · Claim sheet (one tap per token)', f'''<div class="row2">{lg('AMZN', True)}<span class="t">AMZNc</span><span class="ta"><span class="t">0.0651</span><br><span class="sm mut">≈ $14.50</span></span></div>
<span class="btn p blk">Claim</span><p class="sm mut" style="text-align:center">Kept for you. No expiry.</p>''', 20, 'Claim sheet')
section('exit','6 · Exit + claim','One Exit sheet with two equal options. Works 24/7, and Get the stocks works even when paused.',
 [usdc, stocks, partial, claim],
 ['The segmented control puts Get the stocks on equal footing, so it reads as a feature, not an escape hatch.',
  'Slider stops at 25/50/75/All. The result number is the hero, with "you keep" right under it.',
  '"Held for you", never "failed". Claim is caller-only, so each token takes one sponsored tap.'])

# 7 CHANGE NOTICE ---------------------------------------------------
def bars(before, after):
    return '<div class="col sm">' + ''.join(f'<div class="fx">{lg(t)}<span style="width:44px">{t}</span><div style="flex:1;height:8px;background:var(--s2);border-radius:4px;position:relative"><i style="position:absolute;left:0;top:0;bottom:0;width:{b*2}%;background:#3A3A40;border-radius:4px"></i><i style="position:absolute;left:0;top:2px;height:4px;width:{a*2}%;background:{LOGO[t][0]};border-radius:2px"></i></div><span style="width:66px;text-align:right">{b}→{a}%</span></div>' for t,b,a in zip(['NVDA','MSFT','GOOGL','AMZN','TSLA'],before,after)) + '</div>'
chg = sheetf('7a · Change notice sheet <em>budget 30, quote excluded</em>', f'''{SILKBAND}<div class="row2"><span class="t">Recipe change</span><span class="chip ch">14h 22m</span></div>
{bars([35,25,15,10,15],[35,25,15,25,0])}
<div class="fx sm">{av("kavya")}<p class="q">"Robotaxi is priced in. Moving to the company renting the GPUs."</p></div>
<div class="g2"><div class="card"><p class="t">≈ $14</p><p class="sm mut">of yours moves</p></div><div class="card"><p class="t">Fri 9:45 PM</p><p class="sm mut">your time</p></div></div>
<span class="btn p blk">Keep my basket {n(1)}</span><div class="g2"><span class="btn g">Sell</span><span class="btn g">Get the stocks</span></div>''', 30, 'Change sheet')
rep = sheetf('7b · Replaced proposal: diff + reset', f'''<div class="row2"><span class="t">@kavya updated the change</span><span class="chip ch">24h 00m</span></div>
<div class="col sm"><div class="fx">{lg('AMZN')}<span>AMZN</span><span class="ta"><s class="mut">25%</s> → 20%</span></div><div class="fx">{lg('META')}<span>META</span><span class="ta"><s class="mut">8%</s> → 13%</span></div></div>
<p class="q sm">"Splitting the AMZN add with META."</p>
<div class="fx"><span class="chip am">Timer restarted · choose again</span>{n(2)}</div>
<span class="btn p blk">Keep my basket</span><div class="g2"><span class="btn g">Sell</span><span class="btn g">Get the stocks</span></div>''', 30, 'Change sheet')
email = frame('7c · Change-notice email (Resend) <em>budget 40</em>', f'''<div class="scr" data-budget="40" data-kind="Email"><p class="sm mut">From Alloy · to asha@…</p>
<div class="cov j-sapp" style="border-radius:12px;height:80px">{art('sapp')}</div>
<p class="t">The AI Build-Out changes in 24h</p><p class="q sm">"Robotaxi is priced in."</p>
<div class="fx sm">{lg('TSLA')}<span class="loss">15→0%</span>{lg('AMZN')}<span class="gain">10→25%</span></div>
<p class="sm mut">Do nothing to stay in. Or leave before Fri 9:45 PM.</p><span class="btn p blk">See the change</span>
<p class="sm mut x legal">Phone-only accounts see this in Activity only.</p></div>''', None, '')
states = frame('7d · After the window: due / executed / cancelled', f'''<div class="scr"><p class="t">Changes</p><div class="feed">
<div class="it pd" data-budget="12" data-kind="Feed item"><p class="sm">Due · runs at market open</p><p class="sm mut">Opens 8:00 PM</p></div>
<div class="it rc" data-budget="12" data-kind="Feed item"><p class="sm">Done · cost $6.10</p><p class="sm mut">Your $126 is on the new recipe</p></div>
<div class="it" data-budget="12" data-kind="Feed item"><p class="sm">Cancelled · nothing changes</p><p class="q sm">"Waiting for earnings."</p></div>
<div class="it" data-budget="12" data-kind="Feed item"><p class="sm">Changing · day 1 of 2</p><p class="sm mut">Large change, run in parts</p></div></div></div>''', None, 'test')
section('notice','7 · Recipe-change notice','The one time we interrupt holders. Doing nothing means staying in. The countdown is the exact executableAt in local time.',
 [chg, rep, email, states],
 ['Keep is the default and needs no tap. The two exits are equal outline buttons, so there\'s no nudge either way.',
  'A replacement shows only the diff, restarts the timer and resets every follower\'s choice (a Keep on version A doesn\'t carry to B).',
  'Email goes only to holders with an email address. Phone-only users see the notice in Activity and the status strip.'])

# 8 ACTIVITY --------------------------------------------------------
act = frame('8a · Activity', f'''<div class="scr"><p class="hero">Activity</p>
<div class="chips"><span class="chip on">Needs you · 1</span><span class="chip">Updates</span><span class="chip">Receipts</span></div>
<div class="card" style="border-color:var(--brand);background:var(--tint)" data-budget="12" data-kind="Activity item"><div class="row2"><span class="fx">{tile('sapp')}<span class="t">Change in 14h</span></span><span class="sm link">Open</span></div><div class="fx sm" style="margin-top:8px">{lg('TSLA')}<span>15→0%</span>{lg('AMZN')}<span>10→25%</span></div></div>
<p class="sm mut">Updates</p>
<div class="list">
<div class="li" data-budget="12" data-kind="Activity item">{tile('sapp')}<div class="col"><span class="sm">Trimmed {lg('NVDA')} · no action needed</span><div class="fx">{trimviz()}<span class="sm mut">$0.06</span></div></div></div>
<div class="li" data-budget="12" data-kind="Activity item">{tile('emer')}<div class="col"><span class="sm">Bought $25 · Big Tech, Trimmed</span><span class="sm mut link">Receipt</span></div></div>
<div class="li" data-budget="12" data-kind="Activity item">{av('hill',44,False)}<div class="col"><span class="sm">@hill cancelled a change</span><span class="sm mut">Nothing changes</span></div></div></div>
</div>{tabbar('Activity')}''', None, 'test')
act0 = frame('8b · Activity, empty', f'''<div class="scr"><p class="hero">Activity</p><div class="empty" data-budget="10" data-kind="Empty state">{bust_small(130,"Empty")}<p class="t">Changes to your baskets land here</p></div></div>{tabbar('Activity')}''', None, 'test')
section('activity','8 · Activity','The lasting home for "we explain changes": Needs you, Updates and Receipts.', [act, act0],
 ['Every item: basket tile (colour from content), before→after chips and $ cost. 12 words or fewer.',
  'Trims say "No action needed" first. Receipts link to basescan.'])

# 9 PORTFOLIO -------------------------------------------------------
pf = frame('9a · Portfolio (home if any balance)', f'''{strip('closed','US market closed · opens 8:00 PM')}<div class="scr">
<div class="glow" style="text-align:center"><p class="sm mut">TEST · since you joined</p><p class="big">$342.18</p><p class="sm"><span class="gain">▲ $22.18</span> <span class="mut">today ▲ $4.21</span></p></div>
<div class="chips"><span class="chip on">Baskets</span><span class="chip">Stocks</span><span class="chip">Cash</span></div>
<div class="list">
<div class="li">{tile('sapp')}<div class="col"><span class="t">The AI Build-Out</span><span class="chip ch" style="align-self:flex-start">14h</span></div><div class="ta"><p class="t">$126.40</p><p class="sm gain">▲ 5.3%</p></div></div>
<div class="li">{tile('emer')}<div class="col"><span class="t">Big Tech, Trimmed</span>{lgs(['AAPL','MSFT','GOOGL'])}</div><div class="ta"><p class="t">$3.78</p><p class="sm loss">▼ 2.4%</p></div></div>
<div class="li">{lg('AMZN', True)}<div class="col"><span class="t">AMZNc</span><span class="badge" style="align-self:flex-start">Held for you</span></div><div class="ta"><span class="btn sm p">Claim</span></div></div>
<div class="li"><span class="lg l" style="background:#2775CA">$</span><div class="col"><span class="t">Cash</span><span class="sm mut">Test dollars</span></div><div class="ta"><p class="t">$212.00</p><span class="sm link">Add</span></div></div></div>
</div>{tabbar('Portfolio')}''', 25, 'test', 'Portfolio')
pfs = frame('9b · Portfolio › Stocks (view-only)', f'''<div class="scr"><div class="chips"><span class="chip">Baskets</span><span class="chip on">Stocks</span><span class="chip">Cash</span></div>
<div class="list">''' + ''.join(f'<div class="li">{lg(t, True)}<span class="t">{t}c</span><span class="ta"><span class="t">${v}</span></span></div>' for t,v in zip(AI['st'],['46.90','30.30','24.80','14.50','9.90'])) + f'''</div>
<div class="fx"><span class="chip">Won't rebalance</span><span class="chip">Sell on a Base DEX</span></div></div>{tabbar('Portfolio')}''', 20, 'test', 'Portfolio')
pf0 = frame('9c · Portfolio, cash only', f'''<div class="scr"><div class="empty" data-budget="10" data-kind="Empty state"><div class="glow"><p class="big">$1,000</p></div><p class="t">Test dollars ready</p><span class="btn p cta">Explore baskets</span></div></div>{tabbar('Portfolio')}''', None, 'test')
section('portfolio','9 · Portfolio','Home for returning users. "Since you joined" first; day change is secondary.', [pf, pfs, pf0],
 ['The burgundy glow sits behind the hero number. Balances carry TEST.',
  'Held-for-you rows use the one gold badge on this screen, with Claim inline.',
  'Withdrawn stocks are view-only for Dec 4. We say so honestly with "Sell on a Base DEX".'])

# 10 ME + CREATOR ---------------------------------------------------
me = frame('10a · Me', f'''<div class="scr"><div class="fx">{av("asha",48)}<div class="col"><p class="hero">@asha</p></div></div>
<div class="fx"><span class="badge">Founding Follower #212</span></div>
<div class="list">
<div class="li"><span class="t">Your baskets</span><span class="ta sm mut">1 ›</span></div>
<div class="li"><span class="t">Build a basket</span><span class="ta sm mut">›</span></div>
<div class="li"><span class="t">Add test money</span><span class="ta sm mut">›</span></div>
<div class="li"><span class="t">Email for change notices</span><span class="ta sm mut">asha@… ›</span></div>
<div class="li"><span class="t">How Alloy works</span><span class="ta sm mut">›</span></div>
<div class="li"><span class="t">Legal · Not for US persons</span><span class="ta sm mut">›</span></div>
<div class="li"><span class="t mut">Sign out</span></div></div></div>{tabbar('Me')}''', 25, 'test', 'Me')
yb = frame('10b · Me › Your baskets', f'''<div class="scr"><p class="t">Your baskets</p>
<div class="card col" style="padding:0"><div class="cov j-sapp" style="height:64px">{art('sapp')}</div><div style="padding:12px 14px" class="col">
<div class="row2"><span class="t">The AI Build-Out</span><span class="badge">Founding Creator #07</span></div>
<div class="g3"><div><p class="t">$4,210</p><p class="sm mut">In basket</p></div><div><p class="t">212</p><p class="sm mut">Followers</p></div><div><p class="t">$11.62</p><p class="sm mut">Fees ⓘ</p></div></div>
<div class="card" style="background:var(--tint);border-color:var(--brand)"><div class="row2"><span class="sm">Pending · 14h 22m</span><span class="sm link">Cancel</span></div></div>
<div class="g2"><span class="btn g sm">Propose change</span><span class="btn g sm">Share</span></div></div></div></div>{tabbar('Me')}''', 25, 'test', 'Your baskets')
def cstep(i, title, inner, budget=15):
    st = ''.join(f'<i class="{"on" if k<i else ""}"></i>' for k in range(5))
    return frame(f'10{"cdefg"[i-1]} · Create {i}/5 <em>budget 15</em>', f'''<div class="scr" data-budget="{budget}" data-kind="Create step"><div class="steps">{st}</div><p class="t">{title}</p>{inner}</div>''', None, 'test')
prev = f'''<div class="share xt"><div class="j-sapp" style="height:90px;position:relative">{art('sapp')}<span class="wm">TEST</span><div style="position:absolute;left:12px;bottom:10px"><p class="t">The AI Build-Out</p><p class="sm mut">AIB</p></div></div></div>'''
c1 = cstep(1,'The idea', f'''{prev}<div class="field">The AI Build-Out</div><div class="g2"><div class="field">AIB</div><div class="fx" style="gap:6px">''' + ''.join(f'<span class="tile j-{t}" style="width:28px;height:28px;border-radius:50%{";box-shadow:0 0 0 2px #F2F0ED" if t=="sapp" else ""}"></span>' for t in ['burg','emer','sapp','amb','plum']) + f'''</div></div>
<div class="field ph" style="height:72px">Why this basket? 140 max</div><div class="radio"><span class="o"></span><span>Story basket</span>{n(1)}</div><span class="btn p blk" style="margin-top:auto">Next</span>''')
c2 = cstep(2,'Pick 2–10 stocks', '<div class="list">' + ''.join(f'<div class="li">{lg(t, True)}<span class="t">{t}</span><span class="ta"><span class="btn sm {"p" if t in ("NVDA","MSFT","GOOGL","AMZN") else "g"}">{"✓" if t in ("NVDA","MSFT","GOOGL","AMZN") else "+"}</span></span></div>' for t in ['NVDA','MSFT','GOOGL','AMZN','TSLA','META','AAPL']) + '</div><span class="btn p blk" style="margin-top:auto">Next · 4 picked</span>')
c3 = cstep(3,'Set weights', f'''{wbar([40,25,20,15])}<div class="list">''' + ''.join(f'<div class="li">{lg(t)}<span>{t}</span><span class="ta"><span class="field" style="padding:6px 12px">{w}%</span></span></div>' for t,w in zip(['NVDA','MSFT','GOOGL','AMZN'],[40,25,20,15])) + f'''</div><div class="row2"><span class="gain">100% ✓</span><span class="sm link">Split evenly</span></div><span class="btn p blk" style="margin-top:auto">Next</span>''')
c4 = cstep(4,'Strategy', f'''<div class="radio on"><span class="o"></span><div class="col"><span class="t">Balanced</span><span class="sm mut">Trims big drifts</span></div></div>
<div class="radio"><span class="o"></span><div class="col"><span class="t">Let Winners Run</span><span class="sm mut">Trims above 40%</span></div></div>
<div class="radio"><span class="o"></span><div class="col"><span class="t">Trend-aware</span><span class="sm mut">Trims when trends break</span></div></div>
<div class="fx"><span class="chip">1%/yr · you keep 80%</span><span class="chip">Demo · 10-min notice</span></div><span class="btn p blk" style="margin-top:auto">Next</span>''')
c5 = cstep(5,'Seed it', f'''<div class="glow" style="text-align:center"><p class="big">$50</p><p class="sm mut">TEST · min $10</p></div><div class="chips" style="justify-content:center"><span class="chip">$10</span><span class="chip on">$50</span><span class="chip">$250</span></div>{prev}
<span class="chip" style="align-self:center">Draft saved {n(2)}</span><span class="btn p blk" style="margin-top:auto">Create basket</span>''')
csucc = frame('10h · Create success', f'''<div class="scr" style="justify-content:center;background:radial-gradient(60% 35% at 50% 15%,rgba(242,240,237,.12),transparent 70%)" data-budget="10" data-kind="Success"><p class="hero" style="text-align:center">#07</p><p class="t" style="text-align:center">Founding Creator</p>
{sharecard('The AI Build-Out', wbar([40,25,20,15]), '@kavya · $50 in', founding='Founding Creator #07')}
<span class="btn p blk">Share on X</span><span class="btn blk g">Go to basket</span><p class="sm" style="text-align:center"><span class="link">Propose a change later</span></p></div>''', None, 'test')
prop = frame('10i · Propose a change', f'''<div class="scr" data-budget="30" data-kind="Propose"><p class="t">Change the recipe</p>
<div class="list">''' + ''.join(f'<div class="li">{lg(t)}<span>{t}</span><span class="ta"><span class="mut">{a}%</span> → <span class="field" style="padding:4px 10px">{b}</span></span></div>' for t,a,b in zip(['NVDA','MSFT','GOOGL','AMZN','TSLA'],[35,25,15,10,15],[35,25,15,25,0])) + f'''</div>
<div class="field">Robotaxi is priced in. Moving to the company renting the GPUs.</div><p class="sm mut" style="text-align:right">62/140</p>
<div class="g2"><div class="card"><p class="t">24h</p><p class="sm mut">Notice</p></div><div class="card"><p class="t">≈ 0.14%</p><p class="sm mut">Cost</p></div></div>
<span class="btn blk g">Preview follower view</span><span class="btn p blk">Send 24h notice</span></div>''', None, 'test')
pendc = frame('10j · Pending: cancel / edit', f'''{UNDER}<div class="dim"><div class="sheet" data-budget="20" data-kind="Pending sheet"><div class="grab"></div><div class="row2"><span class="t">Pending change</span><span class="chip ch">14h 22m</span></div>
<span class="btn blk g">Edit</span><div class="fx"><span class="chip am">Edit restarts 24h · resets choices</span>{n(3)}</div>
<div class="field ph">Reason for cancelling</div><span class="btn p blk">Cancel change</span></div></div>''', None, 'test')
section('creator','10 · Me, Your baskets, Create, Propose','Creator tools live in Me for Dec 4. Create is five full-screen steps with a live share-card preview.',
 [me, yb, c1, c2, c3, c4, c5, csucc, prop, pendc],
 ['A story basket requires a source and date, and adds "not affiliated" automatically.',
  'The draft survives a failed seed transaction. Sign-in happens at step 5, not step 1.',
  'Edit warns that it restarts the notice and resets followers\' choices. Cancel requires a reason that followers see.',
  'Founding Creator #N goes to the first 50 creators. Gold is used for the badge only.'])

# 11 STATES ---------------------------------------------------------
closed = frame('11a · Market closed (weekend)', f'''{strip('closed','US market closed · opens Mon 8:00 PM')}<div class="scr">
<div class="row2"><div class="glow"><p class="sm mut">Value</p><p class="big">$10.84</p></div><span class="chip am">Fills ~0.8% lower</span></div>
{chart('sapp', closed=True, gid='g4')}
<div class="fx" style="justify-content:center">{MOON}<span class="t warn">Opens Mon 8:00 PM</span></div><div class="g2" data-budget="12" data-kind="Error / edge state"><div class="card"><p class="t gain">Buy · Sell</p><p class="sm mut">Open 24/7</p></div><div class="card"><p class="t warn">Rebalances</p><p class="sm mut">Wait for open</p></div></div>
</div><div class="sticky"><span class="btn g" style="flex:1">Exit</span><span class="btn p" style="flex:2">Buy</span></div>''', None, 'test')
stale = sheetf('11b · Details: feed stale / paused', f'''<p class="t">Details</p><div class="list sm">
<div class="li"><span>Contract</span><span class="ta" style="font-family:var(--mono)">0x7a3…e91</span></div>
<div class="li"><span>Rebalances</span><span class="ta warn">Paused · AMZN price</span></div>
<div class="li"><span>Bands</span><span class="ta">5 pts / 25%</span></div>
<div class="li"><span>Value vs fill</span><span class="ta">−0.8%</span></div><div class="li"><span>Notice</span><span class="ta">24h</span></div></div>''', 30, 'Details sheet')
pause = frame('11c · Global pause', f'''{strip('pause','New buys paused')}<div class="scr"><div class="empty" data-budget="12" data-kind="Error / edge state"><p class="t">New buys paused</p><p class="sm mut">Selling and Get the stocks still work</p><span class="btn p cta">Exit</span></div></div>{tabbar('Portfolio')}''', None, 'test')
nf = frame('11d · 404 / not found', f'''<div class="scr"><div class="empty" data-budget="10" data-kind="Empty state">{bust_small(170,"Lost")}<p class="hero">404</p><p class="t">This basket isn't here</p><span class="btn p cta">Explore baskets</span></div></div>{tabbar('Explore')}''', None, 'test')
section('states','11 · Market and feed states','Buy and sell work 24/7. Only rebalances wait. One status strip states the condition.',
 [closed, stale, pause, nf],
 ['The moon-and-clock visual replaces repeated copy. The chart goes flat and dashed after close. The amber gap chip appears only when the gap is real.',
  'Stale or paused feeds show only in Details and on a due change ("waiting for healthy prices").'])

# 12 TRY ------------------------------------------------------------
t1 = frame('12a · /try start', f'''<div class="scr" style="justify-content:center" data-budget="20" data-kind="Try">
<p class="hero" style="text-align:center">2 minutes</p><p class="t" style="text-align:center">Try Alloy with test money</p>
<div class="list sm">{''.join(f'<div class="li"><span class="lg" style="background:#26262A">{i}</span><span>{s}</span></div>' for i,s in [(1,'Buy a basket'),(2,'See a live change'),(3,'Get the stocks')])}</div>
<span class="btn p blk">Start</span><p class="sm mut x legal" style="text-align:center">Base Sepolia · every step links to basescan</p></div>''', None, 'test')
t2 = frame('12b · Demo lab (3 demo baskets, 10-min notice)', f'''<div class="scr"><div class="row2"><p class="t">Demo lab</p><span class="chip">TEST $1,000</span></div>
''' + ''.join(f'''<div class="card" style="padding:0" data-budget="12" data-kind="Basket card"><div class="cov j-{tone}" style="height:60px">{art(tone)}<span class="chip ch" style="position:absolute;right:12px;top:10px">{m}</span></div><div style="padding:10px 14px" class="row2"><span class="t">{nm}</span><span class="chip">Demo</span></div></div>''' for tone,nm,m in [('sapp','Demo · AI','8 min'),('emer','Demo · Big Tech','3 min'),('plum','Demo · Space','Due')]) + f'''
<span class="btn p blk">Buy $100 in Demo · AI</span></div>''', 20, 'test', 'Try')
t3 = frame('12c · /try end card', f'''<div class="scr" style="justify-content:center" data-budget="25" data-kind="Try"><p class="hero" style="text-align:center">Done</p>
<div class="list sm">''' + ''.join(f'<div class="li"><span class="gain">✓</span><span>{s}</span><span class="ta link" style="font-family:var(--mono)">0x{h}…</span></div>' for s,h in [('Test dollars','a1f'),('Bought $100','9c2'),('Change notice seen','4be'),('Got the stocks','d07')]) + f'''</div>
<span class="btn p blk">Build your own</span><span class="btn blk g">GitHub repo</span></div>''', None, 'test')
section('try','12 · /try judge path + Demo lab','Two minutes, no setup: Privy email code, automatic faucet drip, three demo baskets on the keeper\'s 10-minute notice.',
 [t1, t2, t3],
 ['Decided: /try uses Privy email-code login with an automatic faucet drip (no guest wallets).',
  'Demo lab: 3 pre-made demo baskets, each with seeded history and a live 10-minute change. No shared-feed manipulation.',
  'The end card lists every on-chain action with a basescan link.'])

# --------------------------------------------------------------- page
idx = ''.join(f'<li><a href="#{i}">{t}</a></li>' for i,t,_ in S)
page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Alloy Wireframes v2</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .95 0 0 0 0 .94 0 0 0 0 .93 0 0 0 .9 0"/></filter></svg>
<header class="top"><div class="wrap"><h1>Alloy wireframes · v2</h1>
<p>Drawn from UX_MAP v2 with final tokens (TOKENS v0.3): dark default, colour from content, gold ≤ 3%, burgundy ≤ 10%, one Anton hero per screen, 3 type sizes, word budgets. The test network is marked by the thin blue top edge and TEST on balances. v1 is kept in <a href="wireframes.html">wireframes.html</a>. Motion is in <a href="motion-prototype.html">motion-prototype.html</a>. Imagery rules, image list and AI prompts are in <a href="IMAGERY.md">IMAGERY.md</a>. All images here are original CSS/SVG art, with no external images and no brand photos. The coloured logo monograms are placeholders for Coinbase API <code>icon_url</code> logos.</p>
<p style="font-size:13px">Decided defaults (founder can override): email via Resend · phone-only users see change notices in Activity only · Founding # from the indexer (first Issued event order) · /try uses Privy email code + auto faucet · Demo lab = 3 demo baskets on 10-min notice.</p>
<ul class="idx">{idx}<li><a href="#checks">Checks</a></li></ul></div></header>
{''.join(h for _,_,h in S)}
<section class="s" id="checks"><div class="wrap"><h2>Checks</h2><p class="lede">Filled in by the headless check script: burgundy and gold pixel share per frame, Anton count, type sizes and word count vs budget.</p><div class="checks" id="checkout">Run pending.</div></div></section>
</body></html>'''
open(OUT, 'w').write(page)
print('frames:', page.count('data-name='), 'bytes', len(page))

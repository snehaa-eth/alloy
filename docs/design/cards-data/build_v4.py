#!/usr/bin/env python3
"""Build components-v4.html, cards-v4.html (the certificate register) and wireframes-v4.html.
Visual language v4 = "Certificate" (guilloche from real data, sharp corners, engraved hairlines, square buttons,
burgundy signature rule, Anton figure) + "Alloy bars" (recipe as layered bands). Run: python3 -I build_v4.py
"""
import os, sys, json, datetime, html as H
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from system_v4 import *
from system import fact, nav_chart   # shared helpers (fact rows used only in Details lists)

OUT = os.path.dirname(HERE)
B = load_baskets()
AI, BT, CT, PS, CB = (B[n] for n in ['The AI Build-Out', 'Big Tech, Trimmed', 'Capitol Tech', 'Picks & Shovels', 'Conviction Bets'])
SYM = {'The AI Build-Out': 'AIB', 'Big Tech, Trimmed': 'BTT', 'Capitol Tech': 'CPT', 'Picks & Shovels': 'PNS', 'Conviction Bets': 'CVB'}
FEEDS = json.load(open(os.path.join(HERE, 'feeds.json')))['feeds']
def fmt_day(d): return datetime.date.fromisoformat(d).strftime('%b %-d')
def value(b): return 10 * b['series'][-1][1] / 100
def drift(b):
    first = {k: dict(FEEDS[k]['series'])[min(d for d, _ in FEEDS[k]['series'] if d >= b['from'])] for k in b['recipe']}
    raw = {k: w * FEEDS[k]['series'][-1][1] / first[k] for k, w in b['recipe'].items()}; t = sum(raw.values())
    return {k: round(raw[k] / t * 100, 1) for k in raw}
def serial(b): return f'No. {seed_of(b)["serial"]:04d} · {SYM[b["name"]]}'
AIV, BTV, CBV = value(AI), value(BT), value(CB)
AID = drift(AI)
TRIMMED = dict(AID); TRIMMED['NVDA'] = 30.0
rest = sum(v for k, v in AID.items() if k != 'NVDA'); TRIMMED.update({k: round(v * (70 / rest), 1) for k, v in AID.items() if k != 'NVDA'})
CB_NEW = {'MSTR': 30, 'TSLA': 40, 'NVDA': 30}
WK = AI['series'][-1][1] / AI['series'][-6][1] - 1
Q = lambda t: f'<span class="q">“{t}”</span>'
TEST = stamp('Test', 'flask')

# ================================================================ INSTRUMENTS (certificates)
INSTR = [
 ('I-01', 'Holding', 'A basket as you first meet it: its engraving is drawn from its own price history; the alloy bar shows the recipe before you read a word.',
  {'Issued when': 'Explore, shared links', 'Action': 'Buy', 'Data': 'real index, real recipe'},
  cert(AI, serial(AI), stamp('Basket', 'layers'), AI['name'], 'Value per token', f'${AIV:.2f}', '', [(f'Since {fmt_day(AI["from"])}', signed(AI['change'])), ('Creator in', '<span class="gold">$1.2k · 28%</span>')],
       alloy(AI['recipe'], AI['tone']), 'Buy', lnk='See inside', foot='@kavya')),
 ('I-02', 'Buy order', 'The review and the confirmation are the same object. The amount sits on the button.',
  {'Issued when': 'Buy sheet', 'Action': 'Buy $25', 'Data': 'live quote'},
  cert(AI, serial(AI), stamp('Buy', 'arrow-up-right'), AI['name'], 'You pay', '$25.00', 'test', [('You get', f'≈ {25/AIV:.2f} AIB'), ('Cost', '≈ $0.03')],
       None, 'Buy $25', lnk='Change amount', foot='quote 0:12', art=False)),
 ('I-03', 'Redemption', 'Leaving is a first-class document, not a menu item. Getting the stocks is the other face of the same form.',
  {'Issued when': 'Exit sheet', 'Action': 'Sell 30%', 'Data': 'live quote'},
  cert(AI, serial(AI), stamp('Exit', 'arrow-down-left'), AI['name'], 'You receive · 30%', '$37.92', 'USDC', [('You keep', '$88.48'), ('Cost', '≈ $0.05')],
       None, 'Sell 30%', lnk='Get the stocks instead', foot='any day', art=False)),
 ('I-04', 'Amendment notice', 'The one interruption. The alloy bar shows the recipe now and after, side by side; doing nothing keeps you in.',
  {'Issued when': 'Creator proposes', 'Action': 'Keep my basket', 'Data': 'exact executableAt'},
  cert(CB, serial(CB), stamp('Change', 'refresh', 'accent'), CB['name'], 'Of yours that moves', '≈ $14', '', [('Runs', 'Fri 9:45 PM'), ('Reason', Q('Less single-coin risk'))],
       alloy_pair(CB['recipe'], CB_NEW, CB['tone']), 'Keep my basket', lnk='Exit before it runs', foot='<span class="c-countdown">14:22:05</span>')),
 ('I-05', 'Rebalance receipt', 'After the fact. The bands move back toward target: real drift since launch, shown not told.',
  {'Issued when': 'Keeper trims', 'Action': 'none needed', 'Data': 'real drift'},
  cert(AI, serial(AI), stamp('Trim', 'scissors'), AI['name'], 'Your cost', '$0.06', '', [('Moved', f'NVDA {AID["NVDA"]} → 30%'), ('Reason', f'{35-AID["NVDA"]:.1f} pts under')],
       alloy_pair(AID, TRIMMED, AI['tone']), secondary='See the trade', foot='Nov 18')),
 ('I-06', 'Held voucher', 'A transfer the token refused is held for you, with no expiry. One tap per token.',
  {'Issued when': 'Partial exit', 'Action': 'Claim', 'Data': 'owed ledger'},
  cert(AI, serial(AI), stamp('Held', 'download', 'gold'), 'AMZNc', 'Value held', f'${0.0651*FEEDS["AMZN"]["series"][-1][1]:.2f}', '', [('Amount', '0.0651'), ('Network fee', 'On us')],
       None, 'Claim', lnk='Why held', foot='no expiry', art=False)),
 ('I-07', 'Guard notice', 'Plain reason, then the option that still works. Variants: a blocked token, a stale price.',
  {'Issued when': 'Market closed / feed stale / blocked', 'Action': 'Get the stocks', 'Data': 'market clock, feed health'},
  cert(BT, serial(BT), stamp('Waiting', 'moon', 'warn'), BT['name'], 'US market opens in', '3h 12m', '', [('Why', 'Market closed'), ('Sell fills now', '~0.8% lower')],
       None, 'Get the stocks', lnk='Sell anyway', foot='rebalance paused', art=False)),
 ('I-08', 'Founding certificate', 'The share moment, styled like the thing it is: a numbered certificate. TEST on testnet.',
  {'Issued when': 'First buy into a basket', 'Action': 'Share on X', 'Data': 'first Issued order (indexer)'},
  cert(AI, serial(AI), stamp('Founding', 'award', 'gold'), AI['name'], 'Founding follower', '#212', '', [('Issued', 'Nov 19, 2026'), ('Holder', '@asha')],
       alloy(AI['recipe'], AI['tone']), 'Share on X', lnk='Save image', foot='Base Sepolia', wm=TEST)),
 ('I-09', 'Weekly statement', 'The one document that is only for reading. The weekly move is real.',
  {'Issued when': 'Sunday', 'Action': 'See the week', 'Data': 'real 5-day change'},
  cert(AI, serial(AI), stamp('Statement', 'calendar'), 'Your baskets', 'This week', f'{"+" if WK>=0 else "−"}${abs(WK*126.4):.2f}', 'on $126', [('Trims', '1 · $0.06'), ('Change', 'in 14h')],
       None, secondary='See the week', foot=f'{fmt_day(AI["series"][-6][0])}–{fmt_day(AI["to"])}', art=False)),
 ('I-10', 'Creator amendment', 'The creator signs the same form followers receive. The reason is required and shown verbatim.',
  {'Issued when': 'Me → Your baskets', 'Action': 'Send 24h notice', 'Data': 'proposal + reason hash'},
  cert(CB, serial(CB), stamp('Propose', 'pencil'), CB['name'], 'Followers notified', '212', '', [('Notice', '24h'), ('Reason', Q('Less single-coin risk'))],
       alloy_pair(CB['recipe'], CB_NEW, CB['tone']), 'Send 24h notice', lnk='Preview follower view', foot='@lua')),
]

def register_page():
    rows = ''
    for no, name, purpose, fields, c in INSTR:
        dl = ''.join(f'<dt>{k}</dt><dd>{v}</dd>' for k, v in fields.items())
        rows += f'<div class="p-reg"><div><span class="p-reg__no">{no}</span><h3 class="p-reg__name">{name}</h3><p class="p-reg__fields">{purpose}</p></div><div>{c}</div><dl class="p-reg__fields">{dl}</dl></div>'
    body = f'''<header class="p-head"><div class="p-wrap"><h1 class="p-h1">The Alloy register</h1>
<p class="p-lede">Tokenized stocks are digital share certificates, so Alloy's documents look like certificates: an engraved guilloche drawn from each basket's real prices, a burgundy signature rule, a serial, the figure in Anton, and the recipe as an alloy bar. Ten instruments cover every moment, from holding to amending.</p>
<ul class="p-idx"><li><a href="components-v4.html">Components v4</a></li><li><a href="wireframes-v4.html">Wireframes v4</a></li><li><a href="CARDS.md">CARDS.md</a></li></ul></div></header>
<section class="p-sec"><div class="p-wrap">{rows}<p class="p-note">Engravings and alloy bars come from real Chainlink daily closes on Base mainnet (cards-data/feeds.json, Aug 20 to Nov 18, 2026) and the seed recipes (baskets.json); the pattern is seeded by the series and weights, so every basket's engraving is unique and reproducible. Holder amounts, stakes and counts are illustrative.</p></div></section>'''
    return page('Alloy Register v4', body)

# ================================================================ COMPONENTS v4
def spec(rows): return '<div class="p-spec"><table>' + ''.join(f'<tr><td>{k}</td><td>{v}</td></tr>' for k, v in rows) + '</table></div>'
def st(label, inner): return f'<div class="p-state"><span class="t-mono">{label}</span>{inner}</div>'
def comp(id_, title, panel, rows, do, dont):
    return f'''<section class="p-sec" id="{id_}"><div class="p-wrap"><h2 class="p-h2">{title}</h2><p class="p-dd"><span class="p-do">Do</span> {do} · <span class="p-dont">Don't</span> {dont}</p><div class="p-grid" style="margin-top:16px"><div class="p-panel ui">{panel}</div>{spec(rows)}</div></div></section>'''

def components_page():
    S = []
    S.append(comp('foundations', 'Foundations', f'''<div class="stack"><span class="t-display">$8.86</span><span class="t-body">Body 15 · Inter</span><span class="t-label">Label 12 · JetBrains Mono</span>
<div class="row">{''.join(f'<span class="c-pill">{s}</span>' for s in ['4','8','12','16','24','32'])}</div><div class="row">{ico('layers','ico ico-lg')}{ico('refresh','ico ico-lg')}{ico('scissors','ico ico-lg')}{ico('moon','ico ico-lg')}{ico('award','ico ico-lg')}</div></div>''',
        [('Type', '3 sizes per screen: 32 · 15 · 12. Anton = the ONE figure per screen (a certificate figure or a page headline). Inter for text; JetBrains Mono for serials, labels, meta, numbers in rows.'),
         ('Radii', '<b>2px</b> controls (buttons, fields, stamps, bars) · <b>4px</b> certificates, sheets, banners · 50% avatars and logos. No pills.'),
         ('Lines', 'Hairline 1px <code>--bd</code> frames everywhere; the burgundy signature rule is 2px <code>--acc</code> under every engraving.'),
         ('Spacing', '4-pt: 4 · 8 · 12 · 16 · 24 · 32; certificate inset 12; screen gutter 16'),
         ('Icons', 'Lucide, 1.75 stroke (ISC; already in apps/web)'), ('Colour', 'tokens only; burgundy ≤ 10%, gold ≤ 3%; colour from content (engraving tone, logos)')],
        'engrave, frame and number things', 'round pills, soft shadows, a 4th type size'))
    S.append(comp('buttons', 'Buttons', '<div class="stack" style="width:300px">' + ''.join(st(n, btn('Buy $25', 'primary', s)) for n, s in [('default', ''), ('hover', 'is-hover'), ('pressed', 'is-pressed'), ('focus', 'is-focus'), ('disabled', 'is-disabled'), ('loading', 'is-loading')]) +
        st('secondary', btn('See the trade', 'secondary')) + st('link', link('See inside')) + st('icon', '<span class="c-btn c-btn--icon">' + ico('share') + '</span>') + '</div>',
        [('Primary', 'Square-edged (2px), 48px, full width, paper fill, ink text, Inter 15/600; one per surface; amount on the label'), ('Secondary', 'Same box, hairline outline'), ('Link', '12 underlined, left-aligned with →, lives in the certificate foot'),
         ('States', 'hover tx3 · pressed .98 · focus 2px accent ring · disabled s2 · loading spinner')], 'verb + number', 'pills, two primaries, burgundy fills on dark'))
    S.append(comp('stamps', 'Stamps (category marks)', '<div class="stack">' + ' '.join([stamp('Basket','layers'), stamp('Change','refresh','accent'), stamp('Waiting','moon','warn'), stamp('Founding','award','gold'), TEST]) + '</div>',
        [('Stamp', 'Hairline-outlined 22px rectangle, mono 12 uppercase, 12px icon, no fill; sits in the certificate head opposite the serial'), ('Intents', 'neutral · accent (change) · warn (waiting) · gold (founding, held)')],
        'one stamp per certificate', 'filled chips'))
    S.append(comp('certificate', 'Certificate anatomy', f'<div style="width:330px">{INSTR[0][4]}</div>',
        [('1 Head', '36px: mono serial "No. 6121 · AIB" left, stamp right, hairline below'), ('2 Engraving', '104px guilloche drawn from the basket\'s REAL series (lattice centre line = price path; rosette petals = stock count; harmonic = top weight), jewel tone, double hairline frame with corner rings'),
         ('3 Signature', '2px burgundy rule under the engraving'), ('4 Title + figure', 'Inter 15/600 title; mono label; Anton 32 figure + mono unit'), ('5 Alloy bar', 'recipe as layered bands (thickness = weight); pair = before → after'),
         ('6 Ledger', 'two engraved fields side by side: mono key over Inter 15/600 value, hairline separators'), ('7 Action', 'one square primary (or one secondary for read-only)'), ('8 Foot', '36px: underlined link left, mono meta right')],
        'same order every time', 'captions, more than two ledger fields'))
    S.append(comp('alloy', 'Alloy bars', f'''<div class="stack" style="width:320px">{alloy(AI['recipe'], AI['tone'], lg=True)}{alloy_pair(AID, TRIMMED, AI['tone'])}<span class="t-mono c2">real drift → after trim</span>{alloy(CB['recipe'], CB['tone'])}{alloy(BT['recipe'], BT['tone'])}</div>''',
        [('Bar', '22px (44 on the basket page), bands stacked top-down by weight, 1px gaps, jewel tone fading by rank, a moving sheen gradient (<code>--sheen</code>) for the metal'), ('Legend', 'mono 12 tickers + weights'), ('Rebalance', 'a pair (now → after) on notices and receipts; animate band thickness 700ms in product')],
        'see the recipe before reading it', 'stock-logo colours here (logos carry those)'))
    S.append(comp('engraving', 'Engraving (guilloche)', f'''<div class="stack" style="width:340px">{''.join(f'<div style="height:104px">{guilloche(b, w=340)}</div>' for b in [AI, BT, CT, PS, CB])}</div>''',
        [('Seed', 'cards-data/system_v4.py → seed_of(): volatility sets lattice amplitude, stock count sets rosette petals, top weight sets the harmonic, a hash of the series sets phase and serial'), ('Data', 'baskets.json (real Chainlink closes)'), ('Use', 'certificate header; 44px rosette tile in lists'), ('Never', 'as a background behind text or numbers')],
        'unique per basket, reproducible', 'decorative patterns not tied to data'))
    S.append(comp('fields', 'Fields', ''.join(st(n, f'<div class="c-field {c}" style="width:280px"><div class="c-field__box{" is-ph" if c=="" else ""}">{v}</div><span class="c-field__help">{h}</span></div>') for n, c, v, h in [('default','','you@email.com','6-digit code'),('focus','is-focus','asha@','6-digit code'),('error','is-error','asha@mail','Check the address'),('disabled','is-disabled','asha@mail.com','Locked')]),
        [('Box', '48px, 2px radius, 1.5px bdi'), ('States', 'focus paper + tint halo · error vermilion · disabled s2')], 'one field per step', 'placeholder-only labels'))
    S.append(comp('rows', 'Rows · ledger · lists', f'''<div class="stack" style="width:340px">{ledger([('You get', '≈ 2.82 AIB'), ('Cost', '≈ $0.03')])}<div class="c-list">{mini(AI, 'AIB', f'${AIV:.2f}', AI['change'])}{mini(BT, 'BTT', f'${BTV:.2f}', BT['change'])}
<div class="c-row">{logo('NVDA', True)}<div class="c-row__main"><span class="c-row__title">NVIDIA</span><span class="c-row__meta">target 35%</span></div><div class="c-row__end"><span class="t-body">{AID['NVDA']}%</span><span class="down">▼ {35-AID['NVDA']:.1f} pts</span></div></div></div></div>''',
        [('Ledger', 'two fields, mono key / Inter value'), ('Basket row', '64px: 44px rosette tile (engraving) · name + alloy bar · value + signed %'), ('Stock row', '56px: logo 32 · name + mono meta · value')], 'mono for numbers you compare', 'zebra stripes'))
    S.append(comp('nav', 'Tabs · nav · strip', f'''<div class="stack" style="width:360px"><div class="c-seg"><span class="is-on">Get USDC</span><span>Get the stocks</span></div>
<div class="c-strip c-strip--change">{ico('refresh')}Changes in 14h 22m<span class="c-strip__act">See</span></div><div class="c-strip c-strip--closed">{ico('moon')}US market closed · opens 8:00 PM</div>
<div class="c-nav">{''.join(f'<span class="{"is-on" if n=="Explore" else ""}">{ico(i)}{n}</span>' for i, n in [('compass','Explore'),('pie','Portfolio'),('activity','Activity'),('user','Me')])}</div></div>''',
        [('Tabs', 'underline tabs: hairline base, active = paper text + 2px accent underline'), ('Nav', '4 tabs, active = 2px accent rule on top'), ('Strip', 'one 36px line, highest priority wins')], 'one strip', 'pill tracks'))
    S.append(comp('feedback', 'Sheets · toasts · banners · badges', f'''<div class="stack" style="width:340px"><div class="c-sheet"><div class="c-grab"></div><span class="t-body t-strong">Sheet title</span>{btn('Primary action')}</div>
<div class="c-toast">{ico('check')}Bought $25 · Refunded $0.42</div><div class="c-banner c-banner--closed">{ico('moon')}<span>Fills ~0.8% lower now.</span></div><div class="c-banner c-banner--test">{ico('flask')}<span>Test network. Not real money.</span></div>
<div class="row"><span class="c-badge">Founding Follower #212</span><span class="c-avatar c-avatar--creator"></span>{stack(list(AI['recipe']))}</div></div>''',
        [('Sheet', '4px top corners, hairline top, holds one flat certificate'), ('Toast / banner', '4px box with a 2px left rule in the status colour'), ('Badge', 'gold, 2px radius, metal dot')], 'left rules for status', 'stacked banners'))
    S.append(comp('charts', 'Value chart', nav_chart(BT['series'], w=340, ticks=(.55,), scrub=.7), [('Line', 'paper 2px, creator dashed, accent rebalance ticks, scrub dims the future'), ('Data', 'real index')], 'real data', 'green/red lines'))
    S.append(comp('states', 'Empty · error · numbers', f'''<div class="stack" style="width:320px"><div class="c-empty">{ico('activity','ico ico-lg')}<span class="t-body">Changes to your baskets land here</span>{btn('Explore baskets','secondary')}</div>
<div class="c-error">{ico('alert','ico ico-lg')}<span class="t-body">Prices moved. Nothing spent.</span>{btn('Try again')}</div><span>{signed(AI['change'])} <span class="t-mono c2">since {fmt_day(AI['from'])}</span></span></div>''',
        [('Empty', 'icon + one line + one button'), ('Error', 'what happened + "Nothing spent" + one fix'), ('Numbers', '▲/▼ + sign + one decimal; Intl.NumberFormat locale')], 'say what did not happen', 'illustrations'))
    idx = ''.join(f'<li><a href="#{i}">{t}</a></li>' for i, t in [('foundations','Foundations'),('buttons','Buttons'),('stamps','Stamps'),('certificate','Certificate'),('alloy','Alloy bars'),('engraving','Engraving'),('fields','Fields'),('rows','Rows'),('nav','Tabs + nav'),('feedback','Feedback'),('charts','Chart'),('states','States')])
    body = f'''<header class="p-head"><div class="p-wrap"><h1 class="p-h1">Alloy components v4</h1><p class="p-lede">The certificate language: engraved, framed, numbered, sharp-cornered. One anatomy per element; every screen is built from these.</p><ul class="p-idx">{idx}<li><a href="cards-v4.html">Register</a></li><li><a href="wireframes-v4.html">Wireframes v4</a></li></ul></div></header>{"".join(S)}'''
    return page('Alloy Components v4', body)

# ================================================================ WIREFRAMES v4
SB = '<div class="p-sb"><span>9:41</span><span>●●● ▮</span></div>'
def nav(on): return '<div class="c-nav">' + ''.join(f'<span class="{"is-on" if n==on else ""}">{ico(i)}{n}</span>' for i, n in [('compass','Explore'),('pie','Portfolio'),('activity','Activity'),('user','Me')]) + '</div>'
def phone(cap, body, budget=None, kind='Screen'):
    b = f' data-budget="{budget}" data-kind="{kind}"' if budget else ''
    return f'<div><p class="p-cap">{cap}</p><div class="p-phone ui"{b} data-name="{H.escape(cap)}">{SB}{body}</div></div>'
def scr(inner): return f'<div class="stack" style="padding:8px 16px 16px;flex:1">{inner}</div>'
def top(title, back=True, act=''): return f'<div class="c-top">{"<span class=\"c-btn c-btn--icon\">"+ico("arrow-left")+"</span>" if back else ""}<span class="t-body t-strong">{title}</span>{act or "<span></span>"}</div>'
def sheet(inner, title):
    inner = inner.replace('class="c-cert"', 'class="c-cert c-cert--flat"')
    return f'<div class="stack" style="padding:8px 16px">{top(title)}</div><div class="c-scrim"><div class="c-sheet"><div class="c-grab"></div>{inner}</div></div>'
COVER = '../../apps/web/public/brand/covers/big-tech-800.webp'
I = {name: c for _, name, _, _, c in INSTR}

def wf_page():
    secs = []
    def sec(id_, title, lede, frames, notes):
        secs.append(f'<section class="p-sec" id="{id_}"><div class="p-wrap"><h2 class="p-h2">{title}</h2><p class="p-lede">{lede}</p><div class="p-grid">{"".join(frames)}<div class="p-notes"><ol>{"".join(f"<li>{x}</li>" for x in notes)}</ol></div></div></div></section>')
    minis = f'<div class="c-list">{mini(BT, "BTT", f"${BTV:.2f}", BT["change"])}{mini(CT, "CPT", f"${value(CT):.2f}", CT["change"])}{mini(PS, "PNS", f"${value(PS):.2f}", PS["change"])}{mini(CB, "CVB", f"${CBV:.2f}", CB["change"])}</div>'
    land = phone('Landing', scr(f'''{top('Alloy', False, '<span class="c-btn c-btn--secondary" style="width:auto;height:44px">Sign in</span>')}<span class="t-display">Invest in stories, not symbols.</span>
{ledger([('Minimum', '$5'), ('Notice', '24h')])}{minis}<div class="c-actions">{btn('Explore baskets')}</div><span class="t-mono c2">Tokenized stock exposure, not shares.</span>'''), 25, 'Landing hero')
    ex = phone('Explore', scr(f'''{top('Explore', False, '<span class="c-btn c-btn--icon">' + ico('search') + '</span>')}<div class="c-seg"><span class="is-on">Most followed</span><span>New</span><span>Story</span></div>{I['Holding']}{minis}''') + nav('Explore'), 20, 'Explore chrome')
    bp = phone('Basket page', f'''<div class="c-inapp">{ico('x')}alloy.app/b/0x7a3…<b>Open in browser</b></div><div class="c-strip c-strip--test">{ico('flask')}Test network · test dollars</div>
<div class="c-cover"><img src="{COVER}" alt="Big Tech, Trimmed cover"><div class="c-cover__scrim"></div><div class="c-cover__title"><span class="t-body t-strong">{BT['name']}</span></div></div>
{scr(f"""<div class="stack-2"><span class="c-cert__label">Value per token · {serial(BT)}</span><span class="t-display">${BTV:.2f}</span><span>{signed(BT['change'])} <span class="t-mono c2">since {fmt_day(BT['from'])}</span></span></div>
{alloy(BT['recipe'], BT['tone'])}{nav_chart(BT['series'], ticks=(.55,))}{ledger([('Followers', '<span class="down">▼ −0.4%</span>'), ('Creator', '<span class="up">▲ +3.3%</span>')])}""")}
<div class="row" style="padding:12px 16px 20px">{btn('Exit', 'secondary')}{btn('Buy')}</div>''', 25, 'Basket above the fold')
    bp2 = phone('Basket page · inside + changes', scr(f'''<span class="t-body t-strong">What's inside</span>{alloy(drift(BT), BT['tone'], lg=True)}<span class="t-mono c2">now (real drift) · targets 20 each</span>
<div class="c-list">{''.join(f'<div class="c-row">{logo(t, True)}<div class="c-row__main"><span class="c-row__title">{t}</span><span class="c-row__meta">target {w}%</span></div><div class="c-row__end"><span class="t-body">{d}%</span><span class="{"up" if d>=w else "down"}">{"▲" if d>=w else "▼"} {abs(d-w):.1f} pts</span></div></div>' for (t, w), d in zip(BT['recipe'].items(), drift(BT).values()))}</div>
<span class="t-body t-strong">Changes</span><div class="c-list"><div class="c-row"><span class="c-btn c-btn--icon">{ico('scissors')}</span><div class="c-row__main"><span class="c-row__title">No trims yet</span><span class="c-row__meta">all within 5 pts</span></div></div></div>'''))
    buy = phone('Buy sheet', sheet(f'''{I['Buy order']}<div class="c-presets"><span class="c-pill">$10</span><span class="c-pill is-on">$25</span><span class="c-pill">$100</span></div><div class="c-keypad">{''.join(f'<span>{k}</span>' for k in '123456789.0⌫')}</div>''', AI['name']), 20, 'Buy sheet')
    add = phone('Add test money (detour)', sheet(f'''<div class="stack-2"><span class="c-cert__label">Test dollars · not real money</span><span class="t-display">$1,000</span></div>{btn('Get 1,000 test dollars')}{link('Back to Buy $25')}''', AI['name']), 20, 'Add money sheet')
    succ = phone('Bought → founding certificate', scr(f'''<div class="c-toast">{ico('check')}Bought $25 · Refunded $0.42</div>{I['Founding certificate']}''') + nav('Portfolio'))
    exs = phone('Exit sheet', sheet(f'''<div class="c-seg"><span class="is-on">Get USDC</span><span>Get the stocks</span></div>{I['Redemption'].replace(link('Get the stocks instead'), '<span></span>')}''', AI['name']))
    clm = phone('Held for you', f'<div class="c-strip c-strip--held">{ico("download")}AMZNc held for you<span class="c-strip__act">Claim</span></div>' + scr(I['Held voucher']) + nav('Portfolio'))
    grd = phone('Market closed', f'<div class="c-strip c-strip--closed">{ico("moon")}US market closed · opens 8:00 PM</div>' + scr(I['Guard notice']) + nav('Explore'))
    chg = phone('Amendment notice (sheet)', sheet(I['Amendment notice'], CB['name']))
    rep_c = cert(CB, serial(CB), stamp('Updated', 'refresh', 'accent'), CB['name'], 'Of yours that moves', '≈ $11', '', [('Runs', 'Sat 9:44 PM'), ('Choice', 'reset')],
                 alloy_pair(CB_NEW, {'MSTR': 30, 'TSLA': 45, 'NVDA': 25}, CB['tone']), 'Keep my basket', lnk='Exit before it runs', foot='<span class="c-countdown">23:59:58</span>')
    rep = phone('Replaced amendment (diff)', sheet(rep_c, CB['name']))
    act = phone('Activity', scr(f'''{top('Activity', False)}<div class="c-seg"><span class="is-on">Needs you</span><span>Updates</span><span>Receipts</span></div>{I['Amendment notice']}
<div class="c-list"><div class="c-row"><span class="c-btn c-btn--icon">{ico('scissors')}</span><div class="c-row__main"><span class="c-row__title">Trimmed NVDA</span><span class="c-row__meta">no action needed</span></div><div class="c-row__end"><span>$0.06</span><span class="c2">Nov 18</span></div></div></div>''') + nav('Activity'))
    pf = phone('Portfolio', scr(f'''{top('Portfolio', False)}<div class="stack-2"><span class="c-cert__label">TEST · since you joined</span><span class="t-hero">$342.18</span><span>{signed(-3.4)}</span></div>{I['Weekly statement']}
<div class="c-list">{mini(AI, 'AIB', '$126.40', AI['change'])}<div class="c-row">{logo('USDC', True)}<div class="c-row__main"><span class="c-row__title">Cash</span><span class="c-row__meta">test dollars</span></div><div class="c-row__end"><span class="t-body">$212.00</span></div></div></div>''') + nav('Portfolio'), 25, 'Portfolio')
    me = phone('Me → Your baskets', scr(f'''<div class="row"><span class="c-avatar c-avatar--creator"></span><span class="t-body t-strong">@lua</span><span class="c-badge">Founding Creator #07</span></div>
{ledger([('In basket', '$4,210'), ('Fees', '$11.62')])}{I['Creator amendment']}''') + nav('Me'))
    crt = phone('Create · weights (live alloy bar)', scr(f'''<div class="c-bar"><i style="width:60%"></i></div><span class="t-body t-strong">Set weights</span>{alloy({'NVDA': 40, 'MSFT': 25, 'GOOGL': 20, 'AMZN': 15}, 'sapp', lg=True)}
<div class="c-list">{''.join(f'<div class="c-row">{logo(t, True)}<div class="c-row__main"><span class="c-row__title">{t}</span></div><div class="c-field" style="width:88px"><div class="c-field__box">{w}%</div></div></div>' for t, w in [('NVDA',40),('MSFT',25),('GOOGL',20),('AMZN',15)])}</div>
<div class="spread"><span class="t-mono up">100% ✓</span>{link('Split evenly')}</div>{btn('Next')}'''), 15, 'Create step')
    demo = cert(CB, serial(CB), stamp('Demo', 'flask'), CB['name'], 'Value per token', f'${CBV:.2f}', '', [('Change', '10-min'), ('Then', 'get stocks')], alloy(CB['recipe'], CB['tone']), 'Buy $100', lnk='Other demos', foot='<span class="c-countdown">08:12</span>')
    tr = phone('/try · Demo lab', scr(f'''{top('2-minute tour', False, TEST)}<div class="c-banner c-banner--test">{ico('flask')}<span>1,000 test dollars added.</span></div>{demo}'''), 20, 'Try')
    emp = phone('Empty', scr(f'<div class="c-empty" style="flex:1;justify-content:center" data-budget="10" data-kind="Empty state">{ico("pie","ico ico-lg")}<span class="t-body">Start with $25 of test money</span>{btn("Explore baskets","secondary")}</div>') + nav('Portfolio'))
    err = phone('Error', sheet(f'<div class="c-error" data-budget="12" data-kind="Error">{ico("alert","ico ico-lg")}<span class="t-body">Prices moved. Nothing spent.</span></div>{btn("Try again")}', AI['name']))
    sec('entry', 'Landing · Explore · basket page', 'One full certificate per screen; lists use rosette tiles with alloy bars. The photo cover appears only on the basket page.', [land, ex, bp, bp2],
        ['Landing: the headline is the only Anton; baskets appear as engraved tiles with their recipe bars.', 'Explore: the most-followed basket as a full Holding certificate, the rest as rows.', 'Basket page: cover photo, Anton value, the alloy bar, the real chart, a 2-field ledger.', 'What\'s inside: the alloy bar shows real drift since launch before the rows explain it.'])
    sec('money', 'Buy · founding · exit · held', 'Sheets carry one flat certificate; the certificate is the review.', [buy, add, succ, exs, clm],
        ['Buy order certificate + presets + keypad; the button carries the amount.', 'After buying: a toast plus the Founding certificate (Share is primary, TEST mark).', 'Exit: underline tabs choose the outcome; the Redemption certificate shows it.'])
    sec('changes', 'Amendments · guards', 'The alloy bar pair shows what moves before any words.', [chg, rep, grd],
        ['Amendment notice: now → after bars, the exact time, Keep is primary.', 'Replaced: new bars and a reset choice; the countdown restarts.', 'Guard: one reason and the option that still works.'])
    sec('home', 'Activity · Portfolio · Me · Create · /try', '', [act, pf, me, crt, tr],
        ['Activity: open notices as certificates, history as rows.', 'Portfolio: Inter total (the statement holds the Anton figure).', 'Create: the alloy bar re-forms live as weights are typed.'])
    sec('edge', 'Empty · error', '', [emp, err], ['Icon, one line, one action.'])
    idx = ''.join(f'<li><a href="#{i}">{t}</a></li>' for i, t in [('entry','Entry'),('money','Money'),('changes','Changes'),('home','Home tabs'),('edge','Edge'),('checks','Checks')])
    body = f'''<header class="p-head"><div class="p-wrap"><h1 class="p-h1">Alloy wireframes v4</h1><p class="p-lede">Certificate language + alloy bars, built only from components-v4 and the register. v2/v3 kept for history.</p><ul class="p-idx">{idx}<li><a href="components-v4.html">Components</a></li><li><a href="cards-v4.html">Register</a></li></ul></div></header>{"".join(secs)}
<section class="p-sec" id="checks"><div class="p-wrap"><h2 class="p-h2">Checks</h2><div class="p-checks" id="checkout">pending</div></div></section>'''
    return page('Alloy Wireframes v4', body)

for name, h in [('cards-v4.html', register_page()), ('components-v4.html', components_page()), ('wireframes-v4.html', wf_page())]:
    open(os.path.join(OUT, name), 'w').write(h); print('wrote', name, len(h))

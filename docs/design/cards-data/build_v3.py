#!/usr/bin/env python3
"""Build components-v3.html, cards-v3.html and wireframes-v3.html from system.py + real data (baskets.json).
Run from anywhere: python3 -I docs/design/cards-data/build_v3.py
"""
import os, sys, json, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from system import *

OUTDIR = os.path.dirname(HERE)
B = load_baskets()
AI, BT, CT, PS, CB = (B[n] for n in ['The AI Build-Out', 'Big Tech, Trimmed', 'Capitol Tech', 'Picks & Shovels', 'Conviction Bets'])
FEEDS = json.load(open(os.path.join(HERE, 'feeds.json')))['feeds']

def nav_value(b, start=10.0): return start * b['series'][-1][1] / 100
def fmt_day(d): return datetime.date.fromisoformat(d).strftime('%b %-d')
def week_change(b): s = b['series']; return s[-1][1] / s[-6][1] - 1
def drift(b):
    last = {k: FEEDS[k]['series'][-1][1] for k in b['recipe']}
    first = {k: dict(FEEDS[k]['series'])[min(d for d, _ in FEEDS[k]['series'] if d >= b['from'])] for k in b['recipe']}
    raw = {k: w * last[k] / first[k] for k, w in b['recipe'].items()}; tot = sum(raw.values())
    return {k: raw[k] / tot * 100 for k in raw}

AI_V = nav_value(AI); BT_V = nav_value(BT)
AI_D = drift(AI)                         # real drift since launch
HOLD = 126.40                            # illustrative holding
WK = week_change(AI)

def art(b, label=True): return dots(b['series'], b['tone'], label=f"{b['name']} price, {fmt_day(b['from'])} to {fmt_day(b['to'])} (real Chainlink data)" if label else None)
TEST = tag('Test', 'flask')

# ================================================================ CARDS (compositions)
CARDS = [
 ('Basket', 'What Explore shows. Real price history as the art; follower PnL first, creator stake in gold.',
  card(art(AI), tag('Basket', 'layers') + '<span class="t-mono c2">5 stocks</span>', 'The AI Build-Out · by @kavya',
       f'${AI_V:.2f}', [(f'Since {fmt_day(AI["from"])}', signed(AI['change'])), ('Creator stake', '<span class="gold">$1.2k · 28%</span>')],
       'Buy', link='See inside', unit='per token')),
 ('Buy confirm', 'The sheet is the review. The amount is on the button; cost is a number, not a paragraph.',
  card(art(AI, False), tag('Buy', 'arrow-up-right') + '<span class="t-mono c2">quote 0:12</span>', 'The AI Build-Out · test dollars',
       '$25.00', [('You get', f'≈ {25/AI_V:.2f} AIB'), ('Cost', '≈ $0.03 · fee 1%/yr')], 'Buy $25', link='Change amount')),
 ('Exit', 'One exit, two equal outcomes. Getting the stocks never pauses.',
  card(art(AI, False), tag('Exit', 'arrow-down-left') + '<span class="t-mono c2">any day</span>', 'Sell 30% · The AI Build-Out',
       '$37.92', [('You keep', '$88.48'), ('Or get the stocks', stack(['NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META']))], 'Sell 30%', link='Get the stocks instead', unit='USDC')),
 ('Recipe change', 'The one interruption. Countdown to the exact time, the diff, and doing nothing means staying.',
  card(art(CB, False), tag('Change', 'refresh', 'accent') + '<span class="c-countdown">14:22:05</span>', '@lua: "Less single-coin risk."',
       '≈ $14', [(logo('MSTR') + ' MSTR', '40% → 30%'), (logo('NVDA') + ' NVDA', '20% → 30%')], 'Keep my basket', link='Exit before it runs', unit='of yours moves')),
 ('Trim receipt', 'After the fact, no action needed. What moved, what it cost you, and why.',
  card(art(AI, False), tag('Trim', 'scissors') + '<span class="t-mono c2">Nov 18</span>', 'Back inside the band · The AI Build-Out',
       '$0.06', [('Moved', f'NVDA {AI_D["NVDA"]:.1f}% → 30%'), ('Why', f'{35-AI_D["NVDA"]:.1f} pts under target')], secondary='See the trade', unit='your cost')),
 ('Claim', 'A blocked transfer is held, not lost. One tap per token.',
  card(art(AI, False), tag('Held for you', 'download', 'gold') + '<span class="t-mono c2">no expiry</span>', "AMZNc couldn't be sent",
       f'${0.0651*FEEDS["AMZN"]["series"][-1][1]:.2f}', [('Amount', '0.0651 AMZNc'), ('Network fee', 'On us')], 'Claim', link='Why held', unit='AMZNc')),
 ('Guard', 'Says why in one line and offers the choice that still works. Variants: blocked token, stale price.',
  card(art(BT, False), tag('Waiting', 'moon', 'warn') + '<span class="t-mono c2">rebalance</span>', 'Rebalance waits · Big Tech, Trimmed',
       '3h 12m', [('Why', 'US market closed'), ('Sell fills now', '~0.8% lower')], 'Get the stocks', link='Sell anyway', unit='to open')),
 ('Founding #', 'The share moment. TEST watermark on testnet; Anton only here, for the number.',
  card(art(AI, False), tag('Founding', 'award', 'gold') + '<span class="t-mono c2">Nov 19</span>', 'Founding Follower · The AI Build-Out',
       '#212', [('Your slice', stack(['NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META'])), ('Link', 'alloy.app/b/…?ref=asha')], 'Share on X', link='Save image', wm=TEST, hero=True)),
 ('Your week', "Sunday note, the one card that's just for reading.",
  card(art(AI, False), tag('Your week', 'calendar') + f'<span class="t-mono c2">{fmt_day(AI["series"][-6][0])} to {fmt_day(AI["to"])}</span>', 'Your baskets this week',
       f'{"+" if WK>=0 else "−"}${abs(WK*HOLD):.2f}', [('Trims', '1 · $0.06'), ('Change coming', 'in 14h')], secondary='See the week', unit=f'on ${HOLD:.0f}')),
 ('Creator propose', 'Creator tools are the same shape. The reason is required and followers see it verbatim.',
  card(art(CB, False), tag('Propose', 'pencil') + '<span class="t-mono c2">24h notice</span>', 'Followers notified · Conviction Bets',
       '212', [(logo('MSTR') + ' MSTR', '40% → 30%'), ('Reason', 'Less single-coin risk')], 'Send 24h notice', link='Preview follower view', unit='followers')),
]

def cards_page():
    grid = ''.join(f'<div><p class="p-cap"><b>{i+1:02d}</b> {n}</p><div style="width:320px">{c}</div><p class="p-note">{cap}</p></div>' for i, (n, cap, c) in enumerate(CARDS))
    srcs = ' · '.join(f"{k} {v['series'][0][0]}→{v['series'][-1][0]}" for k, v in FEEDS.items())
    body = f'''<header class="p-head"><div class="p-wrap"><h1 class="p-h1">Ten cards, one shape.</h1>
<p class="p-lede">Every card: real-data dot art in the basket's jewel tone → mono tag + meta → one context line → ONE number → one or two fact rows → one action and one quiet link. Colour says which basket; the tag says what kind. Built only from components-v3.</p>
<ul class="p-idx"><li><a href="components-v3.html">Components v3</a></li><li><a href="wireframes-v3.html">Wireframes v3</a></li><li><a href="CARDS.md">CARDS.md</a></li></ul></div></header>
<section class="p-sec"><div class="p-wrap"><div class="p-grid">{grid}</div>
<p class="p-note" style="max-width:900px">Dot art = real Chainlink daily closes on Base mainnet ({srcs}), weighted per recipe (cards-data/baskets.json). Feeds only have history from Aug 20, 2026, so ~63 trading days exist, not 90. Values per token assume $10.00 at launch. PnL splits, stakes and holder amounts are illustrative.</p></div></section>'''
    return page('Alloy Cards v3', body.replace('class="p-panel" style="padding:32px"', 'class="p-panel"'))

# ================================================================ COMPONENTS page
def spec(rows): return '<div class="p-spec"><table>' + ''.join(f'<tr><td>{k}</td><td>{v}</td></tr>' for k, v in rows) + '</table></div>'
def dd(do, dont): return f'<p class="p-dd"><span class="p-do">Do</span> {do} · <span class="p-dont">Don\'t</span> {dont}</p>'
def st(label, inner): return f'<div class="p-state"><span class="t-mono">{label}</span>{inner}</div>'
def comp(id_, title, panel, rows, do, dont, wide=False):
    return f'''<section class="p-sec" id="{id_}"><div class="p-wrap"><h2 class="p-h2">{title}</h2>{dd(do, dont)}<div class="p-grid" style="margin-top:16px"><div class="p-panel ui">{panel}</div>{spec(rows)}</div></div></section>'''

def components_page():
    S = []
    S.append(comp('foundations', 'Foundations', f'''<div class="stack"><span class="t-hero">$8.86 hero 32</span><span class="t-body">Body 15 · Inter</span><span class="t-label">Label 12 · JetBrains Mono</span><span class="t-display">#212</span>
<div class="row">{''.join(f'<span class="c-pill">{s}</span>' for s in ['4','8','12','16','20','24','32'])}</div>
<div class="row">{ico('arrow-up-right','ico ico-lg')}{ico('refresh','ico ico-lg')}{ico('scissors','ico ico-lg')}{ico('shield','ico ico-lg')}{ico('moon','ico ico-lg')}{ico('award','ico ico-lg')}</div></div>''',
        [('Type', '3 sizes per screen: 32 hero · 15 body · 12 label/meta. Inter 400/600, JetBrains Mono 400/500 for labels, meta and numbers in rows. Anton only for ONE hero moment (Founding #, landing headline).'),
         ('Spacing', '4-pt scale: 4 · 8 · 12 · 16 · 20 · 24 · 32. Screen gutter 16; card padding 16; gaps 8/12.'),
         ('Radii', '12 inputs + banners · 20 cards + sheets · pill (999) buttons, chips, segmented · 50% avatars, logos'),
         ('Touch', '≥ 44px for every target (buttons 48, quiet links 44, nav items 44)'),
         ('Icons', '<b>Lucide</b> (ISC licence): one 24-grid set, 1.75 stroke, rounded caps; already a dependency of apps/web (lucide-react, tree-shaken per icon). Phosphor was the alternative, but mixing weights invites inconsistency.'),
         ('Colour', 'Tokens only (TOKENS.md v0.3). Burgundy ≤ 10%, gold ≤ 3% per screen. Colour comes from content (jewel tones, logos).')],
        'one number per surface, mono for anything you compare', 'a 4th font size, a second icon set, raw hex in components'))
    states = ''.join(st(n, btn('Buy $25', 'primary', s)) for n, s in [('default', ''), ('hover', 'is-hover'), ('pressed', 'is-pressed'), ('focus', 'is-focus'), ('disabled', 'is-disabled'), ('loading', 'is-loading')])
    S.append(comp('buttons', 'Buttons', f'''<div class="stack" style="width:300px">{states}{st('secondary', btn('See the trade','secondary'))}{st('quiet link', quiet('View details'))}{st('icon', '<span class="c-btn c-btn--icon">'+ico('share')+'</span>')}{st('confirm with amount', btn('Sell 30%'))}</div>''',
        [('Primary', 'Pill 48px, full width in cards/sheets, paper fill, ink text, Inter 15/600. One per surface.'), ('Secondary', 'Outline pill, border bdi, for a non-primary action that still matters'),
         ('Quiet', 'Text 12/500 tx2 + chevron, 44px hit area; one per card'), ('Icon', '44×44 circle, s2 fill'), ('Confirm', 'Tap (not hold) with the amount on the label: "Buy $25", "Sell 30%". The sheet is the review.'),
         ('States', 'hover tx3 fill · pressed scale .98 · focus 2px accent ring + 2px gap · disabled s2 fill · loading spinner, label kept for width')],
        'verb + number labels', 'two primaries, burgundy fills on dark, "Submit"'))
    S.append(comp('tags', 'Tag chips + status pills', f'''<div class="stack">{tag('Basket','layers')} {tag('Change','refresh','accent')} {tag('Waiting','moon','warn')} {tag('Founding','award','gold')} {tag('Test','flask')}
<div class="row"><span class="c-pill is-on">3M</span><span class="c-pill">1Y</span><span class="c-pill"><span class="dot"></span>Open 24/7</span></div></div>''',
        [('Tag', '24px pill, mono 12 uppercase +.08em, 12px icon; s2 fill. Intents: neutral, accent (burgundy tint), warn, gold (outline)'), ('Meta', 'Mono 12 tx2, right-aligned on the card tag row'), ('Pill', '32px, 12 Inter, outline; "on" = paper fill')],
        'tag says WHAT kind; colour of the art says WHICH basket', 'sentences in tags, more than one tag per card'))
    S.append(comp('amount', 'Amount input + presets', f'''<div class="stack" style="width:320px"><div class="c-amount"><span class="t-hero">$25</span><span class="t-mono c2">≈ {25/AI_V:.2f} AIB</span></div>
<div class="c-presets"><span class="c-pill">$10</span><span class="c-pill is-on">$25</span><span class="c-pill">$100</span></div>
<div class="c-keypad">{''.join(f'<span>{k}</span>' for k in '123456789.0⌫')}</div></div>''',
        [('Amount', 'Hero 32, centred; the derived amount (≈ tokens) in mono 12 under it'), ('Presets', '$10 · $25 · $100 (no Max)'), ('Keypad', '44px keys, Inter 15/600'), ('Errors', 'replace the mono line ("Minimum $5"), never a modal')],
        'show what you get under what you pay', 'animate money while the user decides'))
    S.append(comp('fields', 'Form fields', ''.join(st(n, f'<div class="c-field {c}" style="width:280px"><div class="c-field__box{" is-ph" if c=="" else ""}">{v}</div><span class="c-field__help">{h}</span></div>') for n, c, v, h in [('default','','you@email.com','We send a 6-digit code'),('focus','is-focus','asha@','We send a 6-digit code'),('error','is-error','asha@mail','Check the address'),('disabled','is-disabled','asha@mail.com','Locked after sign-in')]) + st('otp', '<div class="c-otp" style="width:280px"><span>4</span><span>8</span><span>1</span><span>9</span><span></span><span></span></div>'),
        [('Box', '48px, radius 12, 1.5px bdi border, 16px inset'), ('Label/help', '12 tx2 below; error turns help + border vermilion'), ('Focus', 'paper border + 3px burgundy-tint halo')],
        'one field per step in flows', 'placeholder as the only label for important fields'))
    S.append(comp('facts', 'Fact rows', f'''<div class="c-facts" style="width:300px">{fact('You get', '≈ 2.82 AIB')}{fact('Cost', '≈ $0.03')}{fact('Since Aug 21', signed(AI['change']))}</div>''',
        [('Row', 'min 40px, hairline top, key 12 Inter tx2 left, value mono 12 right'), ('Max', '2 rows on cards, 5 in Details')], 'numbers in mono so they align', 'sentences as values'))
    rows = f'''<div class="c-list" style="width:330px"><div class="c-row">{logo('NVDA', True)}<div class="c-row__main"><span class="c-row__title">NVIDIA</span><span class="c-row__meta">NVDA · target 35%</span></div><div class="c-row__end"><span class="t-body">{AI_D['NVDA']:.1f}%</span><span class="down">▼ {35-AI_D['NVDA']:.1f} pts</span></div></div>
<div class="c-row"><span class="c-btn c-btn--icon">{ico('scissors')}</span><div class="c-row__main"><span class="c-row__title">Trimmed NVDA</span><span class="c-row__meta">No action needed</span></div><div class="c-row__end"><span>$0.06</span><span class="c2">Nov 18</span></div></div>
<div class="c-row"><span class="c-avatar c-avatar--creator"></span><div class="c-row__main"><span class="c-row__title">@kavya</span><span class="c-row__meta">creator · joined Aug 21</span></div><div class="c-row__end"><span class="gold">$1,200</span><span class="c2">28%</span></div></div></div>'''
    S.append(comp('rows', 'List rows (stock · activity · holder)', rows, [('Row', 'min 56px; lead 32 (logo / icon button / avatar); title 15; meta mono 12 tx2; trailing mono 12 (value can be 15/600)'), ('Dividers', 'hairline between rows, none above the first')],
        'logo instead of ticker text', 'two-line titles, coloured row backgrounds'))
    S.append(comp('nav', 'Tabs + bottom nav', f'''<div class="stack" style="width:340px"><div class="c-seg"><span class="is-on">Get USDC</span><span>Get the stocks</span></div><div class="c-seg"><span class="is-on">Needs you</span><span>Updates</span><span>Receipts</span></div>
<div class="c-nav">{''.join(f'<span class="{"is-on" if n=="Explore" else ""}">{ico(i)}{n}</span>' for i, n in [('compass','Explore'),('pie','Portfolio'),('activity','Activity'),('user','Me')])}</div></div>''',
        [('Segmented', 'pill track s2, 38px segments, active = paper fill'), ('Bottom nav', '4 tabs: Explore · Portfolio · Activity · Me; 24 icon + 12 label; active = paper + 2px accent bar')],
        'max 3 segments', 'colour-coded tabs, badges with counts > 9'))
    S.append(comp('bars', 'Top bar + status strip + in-app bar', f'''<div class="stack" style="width:360px"><div class="c-inapp">{ico('x')}alloy.app/b/0x7a3…<b>Open in browser</b></div>
<div class="c-top">{'<span class="c-btn c-btn--icon">'+ico('arrow-left')+'</span>'}<span class="t-body t-strong">Big Tech, Trimmed</span>{'<span class="c-btn c-btn--icon">'+ico('share')+'</span>'}</div>
<div class="c-strip c-strip--change">{ico('refresh')}Changes in 14h 22m<span class="c-strip__act">See</span></div><div class="c-strip c-strip--closed">{ico('moon')}US market closed · opens 8:00 PM</div>
<div class="c-strip c-strip--held">{ico('download')}AMZNc held for you<span class="c-strip__act">Claim</span></div><div class="c-strip c-strip--test">{ico('flask')}Test network · test dollars</div></div>''',
        [('Top bar', '52px: icon button · title 15/600 · icon button'), ('Strip', 'ONE line, 36px, highest priority wins: change < 24h → held for you → market closed → test'), ('In-app', 'Only inside X/IG/Telegram webviews')],
        'one strip at a time', 'stacked banners at 360px'))
    S.append(comp('sheets', 'Sheets + toasts + banners', f'''<div class="stack" style="width:340px"><div class="c-sheet"><div class="c-grab"></div><span class="t-body t-strong">Sheet title</span><span class="t-small c2">One helper line, 8 words or fewer.</span>{btn('Primary action')}</div>
<div class="c-toast">{ico('check')}Bought $25 · The AI Build-Out</div><div class="c-toast c-toast--error">{ico('x')}Nothing spent. Try again.</div>
<div class="c-banner c-banner--notice">{ico('refresh')}<span>Recipe change in 14h. Keep, or exit first.</span></div><div class="c-banner c-banner--closed">{ico('moon')}<span>Fills ~0.8% lower now. US market closed.</span></div><div class="c-banner c-banner--test">{ico('flask')}<span>Test network. Not real money.</span></div></div>''',
        [('Sheet', 'radius 20 top, grab 36×4, 16 inset, 16 gaps; the sheet IS the review; content = a card or card body'), ('Toast', 'pill 48px, icon + one line, 4s, bottom above nav'), ('Banner', 'radius 12, icon + one sentence; notice / closed / test')],
        'one sheet deep (the add-money detour is the only exception)', 'modals over sheets, toasts for errors that need action'))
    S.append(comp('badges', 'Badges · avatars · logos', f'''<div class="stack"><div class="row"><span class="c-badge">Founding Follower #212</span><span class="c-badge c-badge--creator">Creator</span></div>
<div class="row"><span class="c-avatar c-avatar--creator"></span><span class="c-avatar"></span><span class="c-avatar c-avatar--sm"></span></div><div class="row">{''.join(logo(t, True) for t in ['NVDA','MSFT','GOOGL','AMZN','META','TSLA','AAPL','MSTR'])}</div><div>{stack(['NVDA','MSFT','GOOGL','AMZN','META'])}</div></div>''',
        [('Badge', '24px pill, 12/600, gold text + gold6 inner ring + metal dot; max one per viewport'), ('Avatar', '32 (20 small); creator = 1.5px gold ring'), ('Logo', '24 / 32 circles, full colour, from Coinbase API icon_url (monograms are placeholders); stacks overlap −6px')],
        'gold only for earned/creator moments', 'gold on numbers, prices or PnL'))
    donut_c = 2 * 3.14159 * 38; off = 0; segs = ''
    for t, w in AI['recipe'].items():
        segs += f'<circle cx="48" cy="48" r="38" fill="none" stroke-width="14" class="dn-{t.lower()}" stroke-dasharray="{donut_c*w/100-2:.1f} {donut_c:.1f}" stroke-dashoffset="{-off:.1f}"/>'; off += donut_c * w / 100
    wb = ''.join(f'<i class="l-{t.lower()}" style="width:{w}%"></i>' for t, w in AI['recipe'].items())
    S.append(comp('progress', 'Progress · weight bar · donut · countdown', f'''<div class="stack" style="width:320px"><div class="c-bar"><i style="width:62%"></i></div><div class="c-wbar">{wb}</div>
<div class="row"><svg class="c-donut" viewBox="0 0 96 96">{segs}</svg><div class="stack-2"><span class="c-countdown">14:22:05</span><span class="t-small c2">to Fri 9:45 PM, your time</span></div></div></div>''',
        [('Bar', '4px, s2 track, accent fill'), ('Weights', '8px stacked bar in stock logo colours, 2px gaps'), ('Donut', '96px, 14 stroke, target vs now'), ('Countdown', 'mono 12, ticks each second in the last hour, no pulsing')],
        'colour = the stock', 'gain/loss colours on composition'))
    S.append(comp('charts', 'Charts', f'''<div class="stack" style="width:340px">{art(AI)}<div class="c-legend"><span>— followers</span><span>- - creator</span></div>{nav_chart(BT['series'], w=340, ticks=(.55,), scrub=.7)}</div>''',
        [('Dotted wave', 'Card header: dot-matrix area of the basket\'s REAL index (48×12 dots, 3-day smoothed, ordered dither, faint empty grid), jewel tone via currentColor, 88px'), ('NAV line', 'paper 2px; creator dashed tx2; accent rebalance ticks; scrub dims the future, number follows the finger'),
         ('Data', 'cards-data/baskets.json from Base mainnet Chainlink feeds')],
        'real data only; label synthetic if ever used', 'green/red lines that repaint the screen daily'))
    S.append(comp('states', 'Skeleton · empty · error · divider', f'''<div class="stack" style="width:320px"><div class="c-skel" style="height:88px"></div><div class="c-skel" style="height:16px;width:60%"></div>
<div class="c-empty">{ico('activity','ico ico-lg')}<span class="t-body">Changes to your baskets land here</span>{btn('Explore baskets','secondary')}</div>
<div class="c-error">{ico('alert','ico ico-lg')}<span class="t-body">Prices moved. Nothing spent.</span>{btn('Try again')}</div><hr class="c-hr"></div>''',
        [('Skeleton', 'same box as the final content, s1→s2 gradient, stops after 8s'), ('Empty', 'icon 24 + one line ≤ 10 words + one button'), ('Error', 'icon + "what happened + Nothing spent" + one fix'), ('Divider', '1px bd')],
        'say what was NOT affected ("Nothing spent")', 'error codes, illustrations of people'))
    S.append(comp('numbers', 'Numbers', f'''<div class="stack"><span class="t-hero">${AI_V:.2f}</span><span>{signed(AI['change'])} <span class="t-mono c2">since {fmt_day(AI['from'])}</span></span><span class="t-mono">₹28,740.00 · R$ 1.234,56 · Rp 13.750</span></div>''',
        [('Big', 'one per surface, 32/600 Inter, tabular'), ('Signed %', '▲ +x.x% gain jade / ▼ −x.x% loss vermilion, one decimal, real minus sign'), ('Locale', 'Intl.NumberFormat with the viewer locale (en-IN lakh, pt-BR, id-ID); USD stays the currency')],
        'always a sign and an arrow', 'colour alone for direction'))
    idx = ''.join(f'<li><a href="#{i}">{t}</a></li>' for i, t in [('foundations','Foundations'),('buttons','Buttons'),('tags','Tags'),('amount','Amount'),('fields','Fields'),('facts','Fact rows'),('rows','List rows'),('nav','Tabs + nav'),('bars','Strips'),('sheets','Sheets + toasts'),('badges','Badges + logos'),('progress','Progress'),('charts','Charts'),('states','States'),('numbers','Numbers')])
    body = f'''<header class="p-head"><div class="p-wrap"><h1 class="p-h1">Alloy components v3</h1><p class="p-lede">One anatomy per element, every state, tokens only. Cards and every screen are compositions of these. Rules: one primary per surface · 3 type sizes · mono for labels and numbers in rows · Anton for one hero · burgundy ≤ 10% · gold ≤ 3% · AA · 44px targets.</p>
<ul class="p-idx">{idx}<li><a href="cards-v3.html">Cards v3</a></li><li><a href="wireframes-v3.html">Wireframes v3</a></li></ul></div></header>{"".join(S)}'''
    return page('Alloy Components v3', body)

DONUT_CSS = ''.join(f'.dn-{t}{{stroke:var(--l-{t})}}' for t in ['nvda','msft','googl','amzn','meta'])

# ================================================================ WIREFRAMES v3 (screens = components + cards only)
SB = '<div class="p-sb"><span>9:41</span><span>●●● ▮</span></div>'
def nav(on): return '<div class="c-nav">' + ''.join(f'<span class="{"is-on" if n==on else ""}">{ico(i)}{n}</span>' for i, n in [('compass','Explore'),('pie','Portfolio'),('activity','Activity'),('user','Me')]) + '</div>'
def phone(cap, body, budget=None, kind='Screen', short=False):
    b = f' data-budget="{budget}" data-kind="{kind}"' if budget else ''
    return f'<div><p class="p-cap">{cap}</p><div class="p-phone ui{" is-short" if short else ""}"{b} data-name="{H.escape(cap)}">{SB}{body}</div></div>'
def scr(inner, gap=''): return f'<div class="stack" style="padding:8px 16px 16px;flex:1">{inner}</div>'
def sheet(inner, under=''):
    inner = inner.replace('class="c-card"', 'class="c-card c-card--flat"')   # no nested borders inside sheets
    return f'<div class="stack" style="padding:8px 16px">{under}</div><div class="c-scrim"><div class="c-sheet"><div class="c-grab"></div>{inner}</div></div>'
def card_body_only(c): return c  # cards are reused whole inside sheets
COVER_BT = '../../apps/web/public/brand/covers/big-tech-800.webp'

def wf_page():
    secs = []
    def sec(id_, title, lede, frames, notes):
        secs.append(f'<section class="p-sec" id="{id_}"><div class="p-wrap"><h2 class="p-h2">{title}</h2><p class="p-lede">{lede}</p><div class="p-grid">{"".join(frames)}<div class="p-notes"><ol>{"".join(f"<li>{x}</li>" for x in notes)}</ol></div></div></div></section>')
    C = dict((n, c) for n, _, c in CARDS)
    top_ai = f'<div class="c-top"><span class="t-display">Explore</span><span class="c-btn c-btn--icon">{ico("search")}</span></div>'
    # Landing (direct visits): Anton headline + one real basket card
    land = phone('Landing (direct visit)', scr(f'''<div class="c-top"><span class="t-body t-strong">Alloy</span><span class="c-pill">Sign in</span></div>
<span class="t-display">Invest in stories, not symbols.</span><div class="c-facts">{fact('Minimum', '$5')}{fact('Notice before changes', '24h')}{fact('Exit', 'anytime')}</div>{C['Basket']}<div class="c-actions">{quiet('All baskets')}</div>'''), 20, 'Landing hero')
    # Explore
    ex = phone('Explore', scr(top_ai + '<div class="c-seg"><span class="is-on">Most followed</span><span>New</span><span>Story</span></div>' + C['Basket'] +
        card(art(BT), tag('Basket','layers') + '<span class="t-mono c2">5 stocks</span>', 'Big Tech, Trimmed · by @ade', f'${BT_V:.2f}', [(f'Since {fmt_day(BT["from"])}', signed(BT['change'])), ('Creator stake', '<span class="gold">$500 · 9%</span>')], 'Buy', link='See inside')) + nav('Explore'), 24, 'Explore chrome')
    # Basket page with cover hero (only place a photo cover appears)
    bp = phone('Basket page (from X)', f'''<div class="c-inapp">{ico('x')}alloy.app/b/0x7a3…<b>Open in browser</b></div><div class="c-strip c-strip--test">{ico('flask')}Test network · test dollars</div>
<div class="c-cover"><img src="{COVER_BT}" alt="Big Tech, Trimmed cover"><div class="c-cover__scrim"></div><div class="c-cover__title spread"><span class="t-body t-strong">Big Tech, Trimmed</span>{stack(list(BT['recipe']))}</div></div>
{scr(f"""<div class="spread"><div class="stack-2"><span class="t-label c2">Value</span><span class="t-hero">${BT_V:.2f}</span><span>{signed(BT['change'])} <span class="t-mono c2">since {fmt_day(BT['from'])}</span></span></div></div>
{nav_chart(BT['series'], ticks=(.55,))}<div class="c-seg"><span>1M</span><span class="is-on">All</span></div>
<div class="c-facts">{fact('Followers vs creator', '<span class="down">▼ −0.4%</span> / <span class="up">▲ +3.3%</span>')}{fact('Creator stake', '<span class="gold">$500 · 9%</span>')}</div>""")}
<div class="c-actions c-actions--pair" style="padding:12px 16px 20px">{btn('Exit','secondary')}{btn('Buy')}</div>''', 25, 'Basket above the fold')
    bp2 = phone('Basket page, scrolled', scr(f'''<span class="t-body t-strong">What's inside</span><div class="c-wbar">{''.join(f'<i class="l-{t.lower()}" style="width:{w}%"></i>' for t, w in BT['recipe'].items())}</div>
<div class="c-list">{''.join(f'<div class="c-row">{logo(t, True)}<div class="c-row__main"><span class="c-row__title">{t}</span><span class="c-row__meta">target {w}%</span></div><div class="c-row__end"><span class="t-body">{d:.1f}%</span><span class="{"up" if d>=w else "down"}">{"▲" if d>=w else "▼"} {abs(d-w):.1f} pts</span></div></div>' for (t, w), d in zip(BT['recipe'].items(), drift(BT).values()))}</div>
<span class="t-body t-strong">Changes</span><div class="c-list"><div class="c-row"><span class="c-btn c-btn--icon">{ico('scissors')}</span><div class="c-row__main"><span class="c-row__title">No trims yet</span><span class="c-row__meta">every stock within 5 pts</span></div><div class="c-row__end"><span class="c2">since {fmt_day(BT['from'])}</span></div></div></div>''') , None)
    # Buy sheet + add money + success
    under = f'<div class="c-top"><span class="c-btn c-btn--icon">{ico("arrow-left")}</span><span class="t-body t-strong">The AI Build-Out</span><span></span></div>'
    buy = phone('Buy sheet', sheet(f'''<div class="c-amount"><span class="t-hero">$25</span><span class="t-mono c2">≈ {25/AI_V:.2f} AIB · TEST $1,000</span></div><div class="c-presets"><span class="c-pill">$10</span><span class="c-pill is-on">$25</span><span class="c-pill">$100</span></div>
<div class="c-facts">{fact('Your slice', stack(list(AI['recipe'])))}{fact('Cost', '≈ $0.03 · fee 1%/yr')}</div><div class="c-keypad">{''.join(f'<span>{k}</span>' for k in '123456789.0⌫')}</div>{btn('Buy $25')}''', under), 20, 'Buy sheet')
    add = phone('Add-money detour (over Buy)', sheet(f'''<div class="c-amount"><span class="t-hero">$1,000</span><span class="t-mono c2">test dollars · not real money</span></div>{btn('Get 1,000 test dollars')}<div class="c-actions">{quiet('Back to Buy $25')}</div>''', under), 20, 'Add money sheet')
    succ = phone('Buy success → share', scr(f'''<div class="c-toast">{ico('check')}Bought $25 · Refunded $0.42</div>{C['Founding #']}''') + nav('Portfolio'), None)
    # Exit + claim + guard
    exit_c = card(art(AI, False), tag('Exit', 'arrow-down-left') + '<span class="t-mono c2">any day</span>', 'Sell 30% · The AI Build-Out', '$37.92', [('You keep', '$88.48'), ('Cost', '≈ $0.05')], 'Sell 30%', unit='USDC')
    exs = phone('Exit sheet', sheet(f'''<div class="c-seg"><span class="is-on">Get USDC</span><span>Get the stocks</span></div>{exit_c}''', under), None)
    clm = phone('Claim (from status strip)', f'<div class="c-strip c-strip--held">{ico("download")}AMZNc held for you<span class="c-strip__act">Claim</span></div>' + scr(C['Claim']) + nav('Portfolio'), None)
    grd = phone('Market closed guard', f'<div class="c-strip c-strip--closed">{ico("moon")}US market closed · opens 8:00 PM</div>' + scr(C['Guard']) + nav('Explore'), None)
    # Change notice + replaced
    under_cb = under.replace('The AI Build-Out', 'Conviction Bets')
    chg = phone('Recipe change sheet', sheet(C['Recipe change'], under_cb), None)
    rep = phone('Replaced proposal (diff)', sheet(card(art(CB, False), tag('Updated', 'refresh', 'accent') + '<span class="c-countdown">23:59:58</span>', '@lua changed it again · choose again',
        '≈ $11', [(logo('NVDA') + ' NVDA', '<s class="c2">30%</s> → 25%'), (logo('TSLA') + ' TSLA', '<s class="c2">40%</s> → 45%')], 'Keep my basket', link='Exit before it runs', unit='of yours moves'), under_cb), None)
    # Activity + portfolio + me
    act = phone('Activity', scr(f'''<div class="c-top"><span class="t-display">Activity</span></div><div class="c-seg"><span class="is-on">Needs you</span><span>Updates</span><span>Receipts</span></div>{C['Recipe change']}
<div class="c-list"><div class="c-row"><span class="c-btn c-btn--icon">{ico('scissors')}</span><div class="c-row__main"><span class="c-row__title">Trimmed NVDA</span><span class="c-row__meta">No action needed</span></div><div class="c-row__end"><span>$0.06</span><span class="c2">Nov 18</span></div></div>
<div class="c-row"><span class="c-btn c-btn--icon">{ico('arrow-up-right')}</span><div class="c-row__main"><span class="c-row__title">Bought $25</span><span class="c-row__meta">Big Tech, Trimmed</span></div><div class="c-row__end"><span>0x9c2…</span><span class="c2">Nov 17</span></div></div></div>''') + nav('Activity'), None)
    pf = phone('Portfolio', scr(f'''<div class="stack-2 center" style="padding:8px 0"><span class="t-label c2">TEST · since you joined</span><span class="t-hero">$342.18</span><span>{signed(-3.4)} <span class="t-mono c2">all time</span></span></div>{C['Your week']}
<div class="c-list"><div class="c-row"><span class="c-tile t-sapp"></span><div class="c-row__main"><span class="c-row__title">The AI Build-Out</span><span class="c-row__meta">14.27 AIB</span></div><div class="c-row__end"><span class="t-body">${HOLD:.2f}</span>{signed(AI['change'])}</div></div>
<div class="c-row">{logo('USDC', True)}<div class="c-row__main"><span class="c-row__title">Cash</span><span class="c-row__meta">test dollars</span></div><div class="c-row__end"><span class="t-body">$212.00</span><span class="c2">Add</span></div></div></div>''') + nav('Portfolio'), 25, 'Portfolio')
    me = phone('Me → Your baskets', scr(f'''<div class="row"><span class="c-avatar c-avatar--creator"></span><span class="t-body t-strong">@lua</span><span class="c-badge">Founding Creator #07</span></div>
<div class="c-facts">{fact('Following you', '$4,210 · 212')}{fact('Fees earned', '$11.62 · paid in tokens')}</div>{C['Creator propose']}''') + nav('Me'), None)
    # Create (same card shape: live preview card)
    crt = phone('Create · step 3 of 5', scr(f'''<div class="c-bar"><i style="width:60%"></i></div><span class="t-body t-strong">Set weights</span>
<div class="c-list">{''.join(f'<div class="c-row">{logo(t, True)}<div class="c-row__main"><span class="c-row__title">{t}</span></div><div class="c-field" style="width:88px"><div class="c-field__box">{w}%</div></div></div>' for t, w in [('NVDA',40),('MSFT',25),('GOOGL',20),('AMZN',15)])}</div>
<div class="spread"><span class="t-mono up">100% ✓</span>{quiet('Split evenly')}</div>{btn('Next')}'''), 15, 'Create step')
    # /try
    tr = phone('/try · Demo lab', scr(f'''<div class="c-top"><span class="t-display">2 minutes</span>{TEST}</div><div class="c-banner c-banner--test">{ico('flask')}<span>1,000 test dollars added.</span></div>
{card(art(CB, False), tag('Demo','flask') + '<span class="c-countdown">08:12</span>', 'Conviction Bets · live 10-min change', f'${nav_value(CB):.2f}', [('Then', 'Buy → see change → get stocks')], 'Buy $100', link='Other demo baskets')}'''), 20, 'Try')
    # Empty + error
    emp = phone('Empty · Portfolio', scr(f'<div class="c-empty" style="flex:1;justify-content:center" data-budget="10" data-kind="Empty state">{ico("pie","ico ico-lg")}<span class="t-body">Start with $25 of test money</span>{btn("Explore baskets","secondary")}</div>') + nav('Portfolio'), None)
    err = phone('Error · nothing spent', sheet(f'<div class="c-error" data-budget="12" data-kind="Error">{ico("alert","ico ico-lg")}<span class="t-body">Prices moved. Nothing spent.</span></div>{btn("Try again")}', under), None)

    sec('entry', 'Explore + basket page', 'Cards for discovery; the basket page is the ONLY place a photo cover appears (apps/web/public/brand/covers).', [land, ex, bp, bp2],
        ['Landing: Anton once, three fact rows instead of marketing copy, one real basket card, one primary.', 'Explore is a stack of Basket cards: the dot art is the basket\'s real price history, so the image carries information.', 'Basket hero: real cover (Big Tech, Trimmed), Value, real index chart, two fact rows, one primary.', 'What\'s inside uses real drift since launch from the feeds.'])
    sec('money', 'Buy · success · exit · claim', 'Sheets hold one card or card body; the sheet is the review.', [buy, add, succ, exs, clm],
        ['Presets $10/$25/$100; amount on the button.', 'Success = toast + Founding # card (share is primary, TEST watermark).', 'Exit: the segmented control picks the outcome; the card shows the result. Get the stocks is never paused.'])
    sec('changes', 'Changes · guards', 'The one interruption, and the guards that explain a wait.', [chg, rep, grd],
        ['Change card: countdown, diff rows, Keep is primary, exit is the quiet link. Cards inside sheets drop their border (no nested boxes).', 'Replacement shows strike-through diff and restarts the countdown; choices reset.', 'Guard: plain reason + the option that still works.'])
    sec('home', 'Activity · Portfolio · Me · Create · /try', 'Same components everywhere.', [act, pf, me, crt, tr],
        ['Activity holds Needs-you cards on top, rows below.', 'Portfolio: one hero number, the week card, rows.', 'Creator tools are cards too (propose).'])
    sec('edge', 'Empty + error', 'Icon, one line, one action.', [emp, err], ['Empty states use a 24px Lucide icon, not illustrations.', 'Errors always say what did not happen.'])
    idx = ''.join(f'<li><a href="#{i}">{t}</a></li>' for i, t in [('entry','Explore + basket'),('money','Money flows'),('changes','Changes'),('home','Home tabs'),('edge','Empty + error'),('checks','Checks')])
    body = f'''<header class="p-head"><div class="p-wrap"><h1 class="p-h1">Alloy wireframes v3</h1><p class="p-lede">Built strictly from components-v3 and cards-v3 (no one-off styles; the consistency check below proves it). v2 is kept for comparison.</p>
<ul class="p-idx">{idx}<li><a href="components-v3.html">Components</a></li><li><a href="cards-v3.html">Cards</a></li><li><a href="wireframes-v2.html">v2</a></li></ul></div></header>{"".join(secs)}
<section class="p-sec" id="checks"><div class="p-wrap"><h2 class="p-h2">Checks</h2><div class="p-checks" id="checkout">pending</div></div></section>'''
    return page('Alloy Wireframes v3', body)

for name, html_ in [('cards-v3.html', cards_page()), ('components-v3.html', components_page()), ('wireframes-v3.html', wf_page())]:
    html_ = html_.replace('</style>', DONUT_CSS + '</style>', 1)
    open(os.path.join(OUTDIR, name), 'w').write(html_)
    print('wrote', name, len(html_))
